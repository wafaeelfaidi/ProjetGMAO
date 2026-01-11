# Apply Vector Embeddings Migration to Supabase
# This script applies the migration using Supabase Management API

$ErrorActionPreference = "Stop"

Write-Host "🚀 Applying Vector Embeddings Migration..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$envFile = Join-Path $PSScriptRoot ".env.development"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $serviceKey) {
    Write-Host "❌ Error: Supabase credentials not found in .env.development" -ForegroundColor Red
    Write-Host "   Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Supabase Project: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# Read migration file
$migrationFile = Join-Path $PSScriptRoot "supabase\migrations\20260111_add_vector_embeddings.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

$migrationSQL = Get-Content $migrationFile -Raw
Write-Host "✅ Migration file loaded" -ForegroundColor Green
Write-Host "   Size: $([Math]::Round($migrationSQL.Length / 1024, 2)) KB" -ForegroundColor Gray
Write-Host ""

Write-Host "📝 To apply this migration, please:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Open Supabase Dashboard: $supabaseUrl" -ForegroundColor White
Write-Host "   2. Go to 'SQL Editor' (left sidebar)" -ForegroundColor White
Write-Host "   3. Click 'New Query'" -ForegroundColor White
Write-Host "   4. Copy the migration SQL from:" -ForegroundColor White
Write-Host "      $migrationFile" -ForegroundColor Cyan
Write-Host "   5. Paste and click 'Run'" -ForegroundColor White
Write-Host ""
Write-Host "💡 Alternatively, copy the SQL now:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to copy the SQL to clipboard..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Copy to clipboard
$migrationSQL | Set-Clipboard
Write-Host ""
Write-Host "✅ SQL copied to clipboard!" -ForegroundColor Green
Write-Host "   Now paste it in the Supabase SQL Editor and run it." -ForegroundColor White
Write-Host ""
Write-Host "🔗 Quick link: $supabaseUrl/project/default/sql/new" -ForegroundColor Cyan
Write-Host ""

# Open browser
$sqlEditorUrl = "$supabaseUrl/project/default/sql/new"
Write-Host "🌐 Opening SQL Editor in browser..." -ForegroundColor Cyan
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "✨ Done! After running the migration, check:" -ForegroundColor Green
Write-Host "   1. pgvector extension is enabled" -ForegroundColor White
Write-Host "   2. file_embeddings table has embedding vector column" -ForegroundColor White
Write-Host "   3. Search functions exist" -ForegroundColor White
Write-Host ""
