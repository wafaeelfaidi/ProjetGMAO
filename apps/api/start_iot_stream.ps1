# IoT Data Streaming Server Startup Script
# This script starts the FastAPI server for IoT data streaming simulation

Write-Host "Starting IoT Data Streaming Server..." -ForegroundColor Cyan

# Check if virtual environment exists
if (!(Test-Path ".\env2")) {
    Write-Host "Virtual environment not found. Creating one..." -ForegroundColor Yellow
    python -m venv env
    Write-Host "Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
.\env2\Scripts\Activate.ps1

# Install/upgrade dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt --quiet

# Check if .env file exists
if (!(Test-Path ".\env2")) {
    Write-Host ".env2 file not found!" -ForegroundColor Yellow
    Write-Host "Please create a .env2 file with:" -ForegroundColor Yellow
    Write-Host "  SUPABASE_URL=https://zwebmnlkgimgqtsutcbm.supabase.co" -ForegroundColor Yellow
    Write-Host "  SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3ZWJtbmxrZ2ltZ3F0c3V0Y2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA4MDcxMSwiZXhwIjoyMDgzNjU2NzExfQ.Xvc_xX5Bb1NGlSnIa74aouoyh-f_tYKX6egv-mwK-G8" -ForegroundColor Yellow
    exit 1
}

# Start the server
Write-Host "Starting server on http://localhost:8001" -ForegroundColor Green
Write-Host "API docs available at http://localhost:8001/docs" -ForegroundColor Green
Write-Host "" 
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

python -m uvicorn iot_stream:app --reload --port 8001
