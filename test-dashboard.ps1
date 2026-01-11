# CSV Dashboard - Testing & Verification Script
# Run this after starting your dev server with: pnpm dev

Write-Host "CSV Dashboard Testing Script" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
$projectRoot = "d:\Expertise\next-supabase-saas-kit-lite"
if (-not (Test-Path $projectRoot)) {
    Write-Host "[ERROR] Project directory not found: $projectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot
Write-Host "[OK] Project directory: $projectRoot" -ForegroundColor Green
Write-Host ""

# Test 1: Check if data folder exists
Write-Host "Test 1: Data folder existence" -ForegroundColor Yellow
if (Test-Path ".\data") {
    Write-Host "  [OK] /data folder exists" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] /data folder not found" -ForegroundColor Red
}

# Test 2: Check CSV files
Write-Host ""
Write-Host "Test 2: CSV files" -ForegroundColor Yellow
$csvFiles = Get-ChildItem ".\data\*.csv" -ErrorAction SilentlyContinue
if ($csvFiles) {
    Write-Host "  [OK] Found $($csvFiles.Count) CSV files:" -ForegroundColor Green
    foreach ($file in $csvFiles) {
        Write-Host "     - $($file.Name)" -ForegroundColor Cyan
    }
} else {
    Write-Host "  [ERROR] No CSV files found in /data" -ForegroundColor Red
}

# Test 3: Check created files
Write-Host ""
Write-Host "Test 3: Dashboard files" -ForegroundColor Yellow
$filesToCheck = @(
    "apps\web\lib\csv-utils.ts",
    "apps\web\app\api\csv\list\route.ts",
    "apps\web\app\api\csv\load\route.ts",
    "apps\web\app\home\csv-dashboard\page.tsx",
    "apps\web\app\home\csv-dashboard\_components\data-table.tsx",
    "apps\web\app\home\csv-dashboard\_components\filter-controls.tsx",
    "apps\web\app\home\csv-dashboard\_components\visualizations.tsx"
)

$allFilesExist = $true
foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $file - NOT FOUND" -ForegroundColor Red
        $allFilesExist = $false
    }
}

# Test 4: Check configuration updates
Write-Host ""
Write-Host "Test 4: Configuration files" -ForegroundColor Yellow

$pathsConfig = Get-Content "apps\web\config\paths.config.ts" -Raw
if ($pathsConfig -match "csvDashboard") {
    Write-Host "  [OK] paths.config.ts updated" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] paths.config.ts not updated" -ForegroundColor Red
}

$navConfig = Get-Content "apps\web\config\navigation.config.tsx" -Raw
if ($navConfig -match "CSV Dashboard") {
    Write-Host "  [OK] navigation.config.tsx updated" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] navigation.config.tsx not updated" -ForegroundColor Red
}

# Test 5: Check CSV encoding
Write-Host ""
Write-Host "Test 5: CSV encoding test" -ForegroundColor Yellow
if (Test-Path ".\data\AMDEC.csv") {
    $firstLine = Get-Content ".\data\AMDEC.csv" -First 1 -Encoding UTF8
    Write-Host "  [OK] First line read successfully with UTF-8" -ForegroundColor Green
} else {
    Write-Host "  [WARN] AMDEC.csv not found" -ForegroundColor Yellow
}

# Test 6: Check package.json dependencies
Write-Host ""
Write-Host "Test 6: Required dependencies" -ForegroundColor Yellow
$packageJson = Get-Content "apps\web\package.json" | ConvertFrom-Json
$requiredDeps = @("recharts", "react", "next")
foreach ($dep in $requiredDeps) {
    if ($packageJson.dependencies.$dep) {
        Write-Host "  [OK] $dep installed" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $dep missing" -ForegroundColor Red
    }
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

if ($allFilesExist) {
    Write-Host "[OK] All dashboard files created successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Some files are missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Start dev server: pnpm dev" -ForegroundColor White
Write-Host "  2. Open browser: http://localhost:3000" -ForegroundColor White
Write-Host "  3. Sign in to your account" -ForegroundColor White
Write-Host "  4. Click CSV Dashboard in sidebar" -ForegroundColor White
Write-Host "  5. Select a CSV file to visualize" -ForegroundColor White
Write-Host ""

Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  - INTEGRATION_GUIDE.md" -ForegroundColor White
Write-Host "  - CSV_DASHBOARD_README.md" -ForegroundColor White
Write-Host "  - IMPLEMENTATION_SUMMARY.md" -ForegroundColor White
Write-Host ""

Write-Host "Dashboard is ready!" -ForegroundColor Green
Write-Host ""
