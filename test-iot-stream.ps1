# Test IoT Streaming System
# This script provides quick commands to test the streaming functionality

Write-Host "🧪 IoT Streaming System - Test Suite" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8001"

function Test-ServerHealth {
    Write-Host "🏥 Testing server health..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/" -Method GET
        Write-Host "✅ Server is running" -ForegroundColor Green
        Write-Host "   Message: $($response.message)" -ForegroundColor Cyan
        return $true
    } catch {
        Write-Host "❌ Server is not running" -ForegroundColor Red
        Write-Host "   Please start the server first: cd apps/api && .\start_iot_stream.ps1" -ForegroundColor Yellow
        return $false
    }
}

function Get-StreamStatus {
    Write-Host ""
    Write-Host "📊 Current Stream Status:" -ForegroundColor Yellow
    try {
        $status = Invoke-RestMethod -Uri "$baseUrl/stream/status" -Method GET
        Write-Host "   Active: $($status.active)" -ForegroundColor Cyan
        Write-Host "   Current Row: $($status.current_row)" -ForegroundColor Cyan
        Write-Host "   Total Rows: $($status.total_rows)" -ForegroundColor Cyan
        Write-Host "   Progress: $($status.progress_percentage)%" -ForegroundColor Cyan
        Write-Host "   Paused: $($status.paused)" -ForegroundColor Cyan
        if ($status.file_name) {
            Write-Host "   File: $($status.file_name)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "❌ Error getting status" -ForegroundColor Red
    }
}

function Start-Stream {
    param(
        [int]$ChunkSize = 10,
        [double]$Interval = 2.0
    )
    
    Write-Host ""
    Write-Host "🚀 Starting stream..." -ForegroundColor Yellow
    Write-Host "   Chunk Size: $ChunkSize rows" -ForegroundColor Cyan
    Write-Host "   Interval: $Interval seconds" -ForegroundColor Cyan
    
    try {
        $body = @{
            csv_file_path = "../../DATA/Final copy.csv"
            chunk_size = $ChunkSize
            interval_seconds = $Interval
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/stream/start" -Method POST -Body $body -ContentType "application/json"
        Write-Host "✅ $($response.message)" -ForegroundColor Green
        Get-StreamStatus
    } catch {
        Write-Host "❌ Error starting stream" -ForegroundColor Red
        Write-Host "   $_" -ForegroundColor Yellow
    }
}

function Stop-Stream {
    Write-Host ""
    Write-Host "⏹️  Stopping stream..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/stream/stop" -Method POST
        Write-Host "✅ $($response.message)" -ForegroundColor Green
        Write-Host "   Final Row: $($response.final_row)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Error stopping stream" -ForegroundColor Red
    }
}

function Pause-Stream {
    Write-Host ""
    Write-Host "⏸️  Pausing stream..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/stream/pause" -Method POST
        Write-Host "✅ $($response.message)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error pausing stream" -ForegroundColor Red
    }
}

function Resume-Stream {
    Write-Host ""
    Write-Host "▶️  Resuming stream..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/stream/resume" -Method POST
        Write-Host "✅ $($response.message)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error resuming stream" -ForegroundColor Red
    }
}

function Show-Menu {
    Write-Host ""
    Write-Host "Available Commands:" -ForegroundColor Cyan
    Write-Host "  1. Start Stream (default: 10 rows chunk, 2s interval)" -ForegroundColor White
    Write-Host "  2. Start Fast Stream (10 rows chunk, 0.5s interval)" -ForegroundColor White
    Write-Host "  3. Start Slow Stream (5 rows chunk, 5s interval)" -ForegroundColor White
    Write-Host "  4. Get Status" -ForegroundColor White
    Write-Host "  5. Pause Stream" -ForegroundColor White
    Write-Host "  6. Resume Stream" -ForegroundColor White
    Write-Host "  7. Stop Stream" -ForegroundColor White
    Write-Host "  8. Open Dashboard in Browser" -ForegroundColor White
    Write-Host "  9. Open API Docs in Browser" -ForegroundColor White
    Write-Host "  Q. Quit" -ForegroundColor White
    Write-Host ""
}

# Main execution
if (-not (Test-ServerHealth)) {
    exit 1
}

Get-StreamStatus

while ($true) {
    Show-Menu
    $choice = Read-Host "Select an option"
    
    switch ($choice.ToUpper()) {
        "1" { Start-Stream }
        "2" { Start-Stream -Interval 0.5 }
        "3" { Start-Stream -ChunkSize 5 -Interval 5.0 }
        "4" { Get-StreamStatus }
        "5" { Pause-Stream; Get-StreamStatus }
        "6" { Resume-Stream; Get-StreamStatus }
        "7" { Stop-Stream; Get-StreamStatus }
        "8" { 
            Write-Host "🌐 Opening dashboard..." -ForegroundColor Cyan
            Start-Process "http://localhost:3000/home/iot-dashboard"
        }
        "9" { 
            Write-Host "📖 Opening API docs..." -ForegroundColor Cyan
            Start-Process "http://localhost:8001/docs"
        }
        "Q" { 
            Write-Host ""
            Write-Host "👋 Goodbye!" -ForegroundColor Cyan
            exit 0
        }
        default { 
            Write-Host "❌ Invalid option" -ForegroundColor Red
        }
    }
}
