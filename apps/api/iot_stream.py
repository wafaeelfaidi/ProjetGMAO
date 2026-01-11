"""
IoT Data Streaming Simulator
Simulates real-time sensor data streaming by uploading CSV data row by row to Supabase
"""

import asyncio
import csv
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Set

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="IoT Data Stream Simulator", version="1.0.0")

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"📡 WebSocket client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        print(f"📡 WebSocket client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
        
        message_json = json.dumps(message)
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception:
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.active_connections.discard(conn)

ws_manager = ConnectionManager()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET = "documents"
CSV_TABLE = "csv_streaming_data"

# Validate environment variables
if not SUPABASE_URL:
    print("❌ ERROR: SUPABASE_URL environment variable is not set!")
    print("Please create a .env file in the apps/api directory with:")
    print("  SUPABASE_URL=your_supabase_project_url")
    print("  SUPABASE_SERVICE_KEY=your_service_role_key")
    print("\nGet these values from: https://app.supabase.com/project/_/settings/api")
    raise ValueError("SUPABASE_URL is required")

if not SUPABASE_KEY:
    print("❌ ERROR: SUPABASE_SERVICE_KEY environment variable is not set!")
    print("Please add to your .env file:")
    print("  SUPABASE_SERVICE_KEY=your_service_role_key")
    print("\nGet this from: https://app.supabase.com/project/_/settings/api")
    raise ValueError("SUPABASE_SERVICE_KEY is required")

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"✅ Connected to Supabase: {SUPABASE_URL}")
except Exception as e:
    print(f"❌ Failed to connect to Supabase: {e}")
    raise

# Global streaming state
streaming_state = {
    "active": False,
    "current_row": 0,
    "total_rows": 0,
    "file_name": "",
    "file_path": "",  # Track the storage path being updated
    "started_at": None,
    "paused": False
}


class StreamConfig(BaseModel):
    """Configuration for streaming"""
    csv_file_path: str = "../../DATA/Final copy.csv"
    chunk_size: int = 50  # Initial chunk to upload
    interval_seconds: float = 5.0  # Time between row uploads
    machine_filter: str | None = None  # Optional machine filter
    auto_start: bool = True  # Auto-start streaming on server launch


# Auto-start configuration (can be set via environment variable)
AUTO_START_STREAMING = os.getenv("AUTO_START_STREAMING", "true").lower() == "true"


class StreamStatus(BaseModel):
    """Status response"""
    active: bool
    current_row: int
    total_rows: int
    file_name: str
    started_at: str | None
    paused: bool
    progress_percentage: float


def read_csv_file(file_path: str) -> tuple[List[str], List[Dict[str, Any]]]:
    """Read CSV file and return headers and rows"""
    csv_path = Path(file_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {file_path}")
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        # Detect delimiter
        sample = f.read(1024)
        f.seek(0)
        delimiter = ';' if ';' in sample else ','
        
        reader = csv.DictReader(f, delimiter=delimiter)
        headers = reader.fieldnames or []
        rows = list(reader)
    
    return headers, rows


async def upload_to_supabase_storage(file_name: str, content: str, file_path: str = None) -> str:
    """Upload CSV content to Supabase storage"""
    try:
        # Use existing path or create new one (without timestamp for consistent naming)
        if not file_path:
            # Use simple naming: iot_streams/Final copy.csv
            # This ensures the same file is always updated
            file_path = f"iot_streams/{file_name}"
        
        # First try to remove the existing file, then upload fresh
        # This is more reliable than upsert which can have issues
        try:
            supabase.storage.from_(STORAGE_BUCKET).remove([file_path])
        except Exception as remove_err:
            pass  # File might not exist, that's fine
        
        # Upload to Supabase storage
        response = supabase.storage.from_(STORAGE_BUCKET).upload(
            path=file_path,
            file=content.encode('utf-8'),
            file_options={
                "content-type": "text/csv"
            }
        )
        
        return file_path  # Return the path, not URL
    except Exception as e:
        print(f"❌ Error uploading to storage: {e}")
        raise


async def update_csv_in_storage(file_name: str, headers: List[str], rows: List[Dict[str, Any]], file_path: str = None) -> str:
    """Update CSV file in Supabase storage with current data"""
    # Convert rows back to CSV format
    csv_content = ';'.join(headers) + '\n'
    for row in rows:
        csv_content += ';'.join(str(row.get(h, '')) for h in headers) + '\n'
    
    # Upload/update in storage (reuse file_path to update same file)
    updated_path = await upload_to_supabase_storage(file_name, csv_content, file_path)
    return updated_path


async def stream_data_worker(config: StreamConfig):
    """Background worker that streams data row by row"""
    global streaming_state
    
    try:
        # Read CSV file
        headers, all_rows = read_csv_file(config.csv_file_path)
        
        # Apply machine filter if specified
        if config.machine_filter:
            all_rows = [r for r in all_rows if r.get(config.machine_filter) == '1']
        
        # Get total rows AFTER filtering
        total_rows = len(all_rows)
        
        streaming_state.update({
            "active": True,
            "current_row": 0,
            "total_rows": total_rows,
            "file_name": os.path.basename(config.csv_file_path),
            "file_path": "",  # Will be set after first upload
            "started_at": datetime.now().isoformat(),
            "paused": False
        })
        
        # Upload initial chunk (creates the file)
        initial_chunk = all_rows[:config.chunk_size]
        file_path = await update_csv_in_storage(
            streaming_state["file_name"],
            headers,
            initial_chunk
        )
        streaming_state["file_path"] = file_path  # Track the path
        streaming_state["current_row"] = config.chunk_size
        
        print(f"✅ Initial chunk uploaded: {config.chunk_size} rows to {file_path}")
        
        # Broadcast initial data via WebSocket
        initial_progress = (config.chunk_size / total_rows * 100) if total_rows > 0 else 100
        await ws_manager.broadcast({
            "type": "data_update",
            "file_name": streaming_state["file_name"],
            "current_row": config.chunk_size,
            "total_rows": total_rows,
            "progress": initial_progress,
            "timestamp": datetime.now().isoformat()
        })
        
        # Stream remaining rows
        accumulated_rows = initial_chunk.copy()
        
        for i in range(config.chunk_size, total_rows):
            # Check if streaming should stop
            if not streaming_state["active"]:
                print("⏹️ Streaming stopped")
                break
            
            # Check if paused
            while streaming_state["paused"]:
                await asyncio.sleep(0.5)
                if not streaming_state["active"]:
                    break
            
            # Add next row
            accumulated_rows.append(all_rows[i])
            
            # Update CSV in storage with accumulated data (using same file_path)
            # Retry logic for resilience
            max_retries = 3
            upload_success = False
            for attempt in range(max_retries):
                try:
                    await update_csv_in_storage(
                        streaming_state["file_name"],
                        headers,
                        accumulated_rows,
                        streaming_state["file_path"]  # Reuse same path
                    )
                    upload_success = True
                    break  # Success, exit retry loop
                except Exception as upload_err:
                    if attempt < max_retries - 1:
                        print(f"⚠️ Upload attempt {attempt + 1} failed, retrying... ({upload_err})")
                        await asyncio.sleep(1)  # Wait before retry
                    else:
                        print(f"❌ Upload failed after {max_retries} attempts: {upload_err}")
                        # Continue streaming even if this upload fails
            
            streaming_state["current_row"] = i + 1
            
            progress = ((i + 1) / total_rows * 100) if total_rows > 0 else 100
            print(f"📊 Progress: {progress:.1f}% ({i + 1}/{total_rows} rows)")
            
            # Broadcast update via WebSocket
            if upload_success:
                await ws_manager.broadcast({
                    "type": "data_update",
                    "file_name": streaming_state["file_name"],
                    "current_row": i + 1,
                    "total_rows": total_rows,
                    "progress": progress,
                    "timestamp": datetime.now().isoformat()
                })
            
            # Wait before next update
            await asyncio.sleep(config.interval_seconds)
        
        # Broadcast completion
        await ws_manager.broadcast({
            "type": "streaming_complete",
            "file_name": streaming_state["file_name"],
            "total_rows": total_rows,
            "timestamp": datetime.now().isoformat()
        })
        
        print("✅ Streaming completed!")
        
    except Exception as e:
        print(f"❌ Error in streaming worker: {e}")
        import traceback
        traceback.print_exc()
    finally:
        streaming_state["active"] = False


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "IoT Data Stream Simulator API",
        "version": "1.0.0",
        "endpoints": {
            "/stream/start": "Start streaming data",
            "/stream/stop": "Stop streaming",
            "/stream/pause": "Pause streaming",
            "/stream/resume": "Resume streaming",
            "/stream/status": "Get streaming status"
        }
    }


@app.post("/stream/start")
async def start_streaming(config: StreamConfig, background_tasks: BackgroundTasks):
    """Start streaming CSV data to Supabase"""
    if streaming_state["active"]:
        raise HTTPException(status_code=400, detail="Streaming already active")
    
    # Start streaming in background
    background_tasks.add_task(stream_data_worker, config)
    
    return {
        "status": "started",
        "message": "Data streaming initiated",
        "config": config.dict()
    }


@app.post("/stream/stop")
async def stop_streaming():
    """Stop the streaming"""
    if not streaming_state["active"]:
        raise HTTPException(status_code=400, detail="No active streaming")
    
    streaming_state["active"] = False
    
    return {
        "status": "stopped",
        "message": "Streaming stopped",
        "final_row": streaming_state["current_row"]
    }


@app.post("/stream/pause")
async def pause_streaming():
    """Pause the streaming"""
    if not streaming_state["active"]:
        raise HTTPException(status_code=400, detail="No active streaming")
    
    streaming_state["paused"] = True
    
    return {
        "status": "paused",
        "message": "Streaming paused",
        "current_row": streaming_state["current_row"]
    }


@app.post("/stream/resume")
async def resume_streaming():
    """Resume the streaming"""
    if not streaming_state["active"]:
        raise HTTPException(status_code=400, detail="No active streaming")
    
    streaming_state["paused"] = False
    
    return {
        "status": "resumed",
        "message": "Streaming resumed",
        "current_row": streaming_state["current_row"]
    }


@app.get("/stream/status", response_model=StreamStatus)
async def get_streaming_status():
    """Get current streaming status"""
    progress = 0.0
    if streaming_state["total_rows"] > 0:
        progress = (streaming_state["current_row"] / streaming_state["total_rows"]) * 100
    
    return StreamStatus(
        active=streaming_state["active"],
        current_row=streaming_state["current_row"],
        total_rows=streaming_state["total_rows"],
        file_name=streaming_state["file_name"],
        started_at=streaming_state["started_at"],
        paused=streaming_state["paused"],
        progress_percentage=round(progress, 2)
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time streaming updates"""
    await ws_manager.connect(websocket)
    try:
        # Send initial status
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to IoT streaming server",
            "streaming_active": streaming_state["active"],
            "current_row": streaming_state["current_row"],
            "total_rows": streaming_state["total_rows"],
            "file_name": streaming_state["file_name"]
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages (ping/pong or commands)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                
                # Handle ping
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
                elif data == "status":
                    await websocket.send_json({
                        "type": "status",
                        "streaming_active": streaming_state["active"],
                        "current_row": streaming_state["current_row"],
                        "total_rows": streaming_state["total_rows"],
                        "file_name": streaming_state["file_name"],
                        "paused": streaming_state["paused"]
                    })
            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


@app.on_event("startup")
async def startup_event():
    """Auto-start streaming when server launches"""
    if AUTO_START_STREAMING:
        print("🚀 Auto-starting IoT data streaming...")
        # Give the server a moment to fully initialize
        await asyncio.sleep(1)
        
        # Start streaming with default config
        config = StreamConfig()
        asyncio.create_task(stream_data_worker(config))
        print(f"✅ Streaming auto-started with chunk_size={config.chunk_size}, interval={config.interval_seconds}s")
    else:
        print("ℹ️ Auto-start disabled. Use POST /stream/start to begin streaming.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
