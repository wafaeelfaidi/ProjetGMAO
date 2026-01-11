# IoT Data Streaming System

Real-time sensor data streaming simulation that uploads CSV data row-by-row to Supabase Storage, simulating IoT device behavior.

## Overview

This system consists of three main components:

1. **FastAPI Streaming Server** - Simulates IoT data streaming by uploading CSV rows incrementally
2. **Supabase Storage** - Stores the evolving CSV file with real-time updates
3. **Next.js Dashboard** - Displays real-time visualizations with machine filtering

## Architecture

```
┌─────────────────────┐
│  Final copy.csv     │  (Local source data)
│  (362 rows)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  FastAPI Streaming Server (Port 8001)  │
│  - Uploads initial chunk (10 rows)     │
│  - Streams remaining rows (1 per 2s)   │
│  - Updates same file in Supabase       │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Supabase Storage (documents bucket)   │
│  Path: iot_streams/{timestamp}_file.csv│
│  - File continuously updated            │
│  - No new tables created                │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Next.js Dashboard (/home/iot-dashboard)│
│  - Auto-refreshes every 3s             │
│  - Machine filtering                    │
│  - Sensor visualizations                │
└─────────────────────────────────────────┘
```

## Setup Instructions

### 1. Configure Environment

Create a `.env` file in `/apps/api/`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

### 2. Install Python Dependencies

```powershell
cd apps/api
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Apply Supabase Migration

```powershell
cd apps/web
pnpm supabase migration up
```

This creates the necessary storage policies for the `iot_streams` folder.

### 4. Start the Streaming Server

```powershell
cd apps/api
.\start_iot_stream.ps1
```

Or manually:
```powershell
cd apps/api
.\env\Scripts\Activate.ps1
python -m uvicorn iot_stream:app --reload --port 8001
```

Server will be available at:
- API: http://localhost:8001
- Docs: http://localhost:8001/docs

## Usage

### Starting a Stream

**Method 1: Via Dashboard UI**
1. Navigate to `/home/iot-dashboard`
2. Click "Start Stream" button
3. Monitor progress in real-time

**Method 2: Via API (curl)**
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/stream/start" -Method POST -ContentType "application/json" -Body '{
  "csv_file_path": "../../DATA/Final copy.csv",
  "chunk_size": 10,
  "interval_seconds": 2.0
}'
```

**Method 3: Via API (Python)**
```python
import requests

response = requests.post('http://localhost:8001/stream/start', json={
    'csv_file_path': '../../DATA/Final copy.csv',
    'chunk_size': 10,
    'interval_seconds': 2.0
})
print(response.json())
```

### Stream Control

**Pause Stream:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/stream/pause" -Method POST
```

**Resume Stream:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/stream/resume" -Method POST
```

**Stop Stream:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/stream/stop" -Method POST
```

**Check Status:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/stream/status" -Method GET
```

### Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `csv_file_path` | string | `"../../DATA/Final copy.csv"` | Path to source CSV file |
| `chunk_size` | int | `10` | Initial number of rows to upload |
| `interval_seconds` | float | `2.0` | Time between row uploads |
| `machine_filter` | string\|null | `null` | Optional machine column to filter (e.g., "Machine 1") |

## Dashboard Features

### Real-time Monitoring
- Auto-refresh every 3 seconds
- Progress bar showing streaming status
- Last update timestamp

### Machine Filtering
The dashboard supports filtering by machine:
- **Machine 1**: Rows where `Machine 1 = 1`
- **Machine 2**: Rows where `Machine 2 = 1`
- **Machine 3**: Rows where `Machine 3 = 1`
- **All Machines**: No filtering

### Visualizations

1. **KPI Cards** - Top 4 sensor averages with min/max
2. **Sensor Statistics** - Detailed stats (count, sum, avg, min, max) for each sensor
3. **Machine Distribution** - Bar charts showing machine status
4. **Sensor by Machine** - Cross-analysis of sensors grouped by machine

### Available Sensors (Captors)

Based on `Final copy.csv`:
- Captor 1 through Captor 18
- Each with numeric readings
- Visualized with statistics and trends

## Data Schema

### CSV Structure
```csv
,Time,Captor 1,Captor 2,...,Captor 18,Machine 2,Machine 1,Machine 3
0,2025-06-18 11:47:10,447,1.027,...,72,0,1,0
1,2025-06-18 13:47:10,215,1.027,...,72,0,1,0
```

### Key Columns
- **Time**: Timestamp in format `YYYY-MM-DD HH:MM:SS`
- **Captor 1-18**: Numeric sensor readings
- **Machine 1-3**: Binary flags (0 or 1) indicating machine activity

## API Endpoints

### Stream Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information |
| `/stream/start` | POST | Start streaming |
| `/stream/stop` | POST | Stop streaming |
| `/stream/pause` | POST | Pause streaming |
| `/stream/resume` | POST | Resume streaming |
| `/stream/status` | GET | Get current status |

### Next.js API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/csv-files` | GET | List all CSV files in storage |
| `/api/csv-files/download?path={path}` | GET | Download CSV file content |

## How It Works

### Streaming Process

1. **Initial Upload**: First `chunk_size` rows (default: 10) are uploaded to create the base file
2. **Row-by-Row Updates**: Every `interval_seconds` (default: 2s), one new row is added
3. **File Replacement**: The same file in Supabase is continuously updated (not appended as new file)
4. **Dashboard Refresh**: Dashboard polls for updates every 3 seconds
5. **Completion**: When all rows are uploaded, streaming stops automatically

### Storage Structure

```
documents/                          (Supabase Storage Bucket)
└── iot_streams/                   (Folder)
    └── 20260111_154030_Final copy.csv
        ├── Initial: 10 rows
        ├── After 2s: 11 rows
        ├── After 4s: 12 rows
        └── ... (continues until all 362 rows)
```

### No New Tables

✅ **Important**: The system uses only Supabase Storage, no new database tables are created. The CSV file itself is the "table" that gets updated.

## Troubleshooting

### Server Won't Start
```powershell
# Check if port 8001 is in use
Get-NetTCPConnection -LocalPort 8001

# Kill process using port
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8001).OwningProcess
```

### Environment Variables Missing
```powershell
# Verify .env file exists
Test-Path apps/api/.env

# Check variables are set
Get-Content apps/api/.env
```

### Supabase Connection Issues
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
2. Check Supabase project is active
3. Ensure `documents` bucket exists
4. Verify storage policies are applied (run migration)

### Dashboard Not Updating
1. Check streaming server is running (http://localhost:8001/stream/status)
2. Verify auto-refresh is enabled
3. Check browser console for errors
4. Ensure Supabase API routes are accessible

## Performance Considerations

### Streaming Speed
- Default: 1 row per 2 seconds = 362 rows in ~12 minutes
- Adjust `interval_seconds` for faster/slower streaming:
  - Fast: `0.5` seconds (362 rows in ~3 minutes)
  - Slow: `5.0` seconds (362 rows in ~30 minutes)

### Dashboard Refresh Rate
- Default: 3 seconds
- Can be adjusted in `page.tsx` (search for `setInterval`)
- Lower values = more API calls but faster updates

## Future Enhancements

- [ ] WebSocket support for real-time push updates
- [ ] Multiple simultaneous streams
- [ ] Stream scheduling and automation
- [ ] Historical data comparison
- [ ] Alert thresholds for sensor values
- [ ] Export filtered data to new CSV
- [ ] Time-series charts for sensor trends

## Files Created

### Backend (FastAPI)
- `/apps/api/iot_stream.py` - Main streaming server
- `/apps/api/start_iot_stream.ps1` - Startup script
- `/apps/api/requirements.txt` - Updated with dependencies

### Frontend (Next.js)
- `/apps/web/app/home/iot-dashboard/page.tsx` - Dashboard UI
- `/apps/web/app/api/csv-files/route.ts` - List CSV files
- `/apps/web/app/api/csv-files/download/route.ts` - Download CSV content
- `/apps/web/lib/DataManagement/csv-storage.service.ts` - Storage utilities

### Database
- `/apps/web/supabase/migrations/20260111_iot_streaming_storage.sql` - Storage policies

### Documentation
- `/apps/web/app/home/csv-dashboard/page.tsx` - Updated to use Supabase
- This README

## License

Same as parent project.
