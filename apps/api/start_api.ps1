# FastAPI Startup Script
# This script activates the virtual environment and starts the FastAPI server

Write-Host "Starting Machine Prediction FastAPI Server..." -ForegroundColor Green

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Activate virtual environment
$venvPath = Join-Path $scriptDir "env2\Scripts\Activate.ps1"

if (Test-Path $venvPath) {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & $venvPath
} else {
    Write-Host "Virtual environment not found at: $venvPath" -ForegroundColor Red
    Write-Host "Please create a virtual environment first or update the path" -ForegroundColor Red
    exit 1
}

# Start FastAPI server
Write-Host "Starting FastAPI server on http://localhost:8000..." -ForegroundColor Yellow
Write-Host "API Documentation available at: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

python predict.py
