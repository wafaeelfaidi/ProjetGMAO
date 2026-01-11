# Quick Start Script for IoT Streaming System
# This script helps you get the IoT streaming system running quickly

Write-Host "🚀 IoT Streaming System - Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "apps/api/iot_stream.py")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check Node/pnpm
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

try {
    $pnpmVersion = pnpm --version 2>&1
    Write-Host "✅ pnpm found: v$pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pnpm not found. Please install pnpm" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Setting up environment..." -ForegroundColor Yellow
Write-Host ""

# Check .env file
if (!(Test-Path "apps/api/.env")) {
    Write-Host "⚠️  .env file not found in apps/api/" -ForegroundColor Yellow
    Write-Host "Creating template .env file..." -ForegroundColor Yellow
    
    $envContent = @"
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
"@
    
    $envContent | Out-File -FilePath "apps/api/.env" -Encoding UTF8
    
    Write-Host ""
    Write-Host "❌ Please edit apps/api/.env and add your Supabase credentials" -ForegroundColor Red
    Write-Host "   Get these from: https://app.supabase.com/project/_/settings/api" -ForegroundColor Yellow
    Write-Host ""
    exit 1
} else {
    Write-Host "✅ .env file found" -ForegroundColor Green
}

# Check if environment variables are set
$envContent = Get-Content "apps/api/.env" -Raw
if ($envContent -match "your_supabase_project_url") {
    Write-Host "❌ Please update SUPABASE_URL in apps/api/.env" -ForegroundColor Red
    exit 1
}
if ($envContent -match "your_service_role_key") {
    Write-Host "❌ Please update SUPABASE_SERVICE_KEY in apps/api/.env" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Installing dependencies..." -ForegroundColor Yellow
Write-Host ""

# Setup Python virtual environment
if (!(Test-Path "apps/api/env")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    Set-Location apps/api
    python -m venv env
    Set-Location ../..
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✅ Virtual environment exists" -ForegroundColor Green
}

# Install Python dependencies
Write-Host "Installing Python packages..." -ForegroundColor Cyan
Set-Location apps/api
.\env\Scripts\Activate.ps1
pip install -r requirements.txt --quiet
Set-Location ../..
Write-Host "✅ Python packages installed" -ForegroundColor Green

Write-Host ""
Write-Host "🗄️  Setting up Supabase..." -ForegroundColor Yellow
Write-Host ""

# Apply migration
Write-Host "Applying Supabase migration..." -ForegroundColor Cyan
Set-Location apps/web

# Check if migration exists
if (Test-Path "supabase/migrations/20260111_iot_streaming_storage.sql") {
    Write-Host "Migration file found. Please apply it manually using:" -ForegroundColor Yellow
    Write-Host "  cd apps/web" -ForegroundColor Cyan
    Write-Host "  pnpm supabase db push" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "⚠️  Migration file not found" -ForegroundColor Yellow
}

Set-Location ../..

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎯 Quick Start Instructions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  Start the Next.js development server:" -ForegroundColor Yellow
Write-Host "   cd apps/web" -ForegroundColor Cyan
Write-Host "   pnpm dev" -ForegroundColor Cyan
Write-Host ""

Write-Host "2️⃣  In a NEW terminal, start the IoT streaming server:" -ForegroundColor Yellow
Write-Host "   cd apps/api" -ForegroundColor Cyan
Write-Host "   .\start_iot_stream.ps1" -ForegroundColor Cyan
Write-Host ""

Write-Host "3️⃣  Open the dashboard in your browser:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000/home/iot-dashboard" -ForegroundColor Cyan
Write-Host ""

Write-Host "4️⃣  Click 'Start Stream' to begin the simulation!" -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📚 Resources" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IoT Streaming API Docs: http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:3000/home/iot-dashboard" -ForegroundColor Cyan
Write-Host "Regular CSV Dashboard: http://localhost:3000/home/csv-dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "Full documentation: IOT_STREAMING_README.md" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to start servers now
$response = Read-Host "Would you like to start the servers now? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "🚀 Starting servers..." -ForegroundColor Green
    Write-Host ""
    
    # Start IoT streaming server in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\api'; .\start_iot_stream.ps1"
    
    Start-Sleep -Seconds 2
    
    # Start Next.js dev server in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\web'; pnpm dev"
    
    Write-Host "✅ Servers starting in new windows..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Wait a few seconds, then open: http://localhost:3000/home/iot-dashboard" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "👍 No problem! Run the commands above when you're ready." -ForegroundColor Green
}

Write-Host ""
Write-Host "Happy streaming! 🎉" -ForegroundColor Cyan
Write-Host ""
