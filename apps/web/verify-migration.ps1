# Verify Supabase Migration
# This script checks that all IndexedDB references have been properly migrated to Supabase

Write-Host "🔍 Verifying Supabase Migration..." -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Check 1: Verify no direct IndexedDB usage in main files
Write-Host "✓ Checking for IndexedDB references..." -ForegroundColor Yellow
$indexedDBRefs = Get-ChildItem -Path ".\app\home\DataManagement" -Recurse -Filter "*.tsx" | 
    Select-String -Pattern "indexedDBService" -CaseSensitive

if ($indexedDBRefs) {
    $errors += "Found IndexedDB references in DataManagement components"
    $indexedDBRefs | ForEach-Object { Write-Host "  ❌ $_" -ForegroundColor Red }
} else {
    Write-Host "  ✅ No direct IndexedDB usage in components" -ForegroundColor Green
}

# Check 2: Verify Supabase file service exists
Write-Host "✓ Checking Supabase services..." -ForegroundColor Yellow
if (Test-Path ".\lib\DataManagement\supabase-file.service.ts") {
    Write-Host "  ✅ Supabase file service found" -ForegroundColor Green
} else {
    $errors += "Supabase file service not found"
    Write-Host "  ❌ Supabase file service missing" -ForegroundColor Red
}

# Check 3: Verify RAG service exists
if (Test-Path ".\lib\DataManagement\rag.service.ts") {
    Write-Host "  ✅ RAG service found" -ForegroundColor Green
} else {
    $warnings += "RAG service not found"
    Write-Host "  ⚠️  RAG service missing" -ForegroundColor Yellow
}

# Check 4: Verify document processor exists
if (Test-Path ".\lib\DataManagement\processors\document-processor.service.ts") {
    Write-Host "  ✅ Document processor found" -ForegroundColor Green
} else {
    $errors += "Document processor not found"
    Write-Host "  ❌ Document processor missing" -ForegroundColor Red
}

# Check 5: Verify migration file exists
Write-Host "✓ Checking migration files..." -ForegroundColor Yellow
if (Test-Path ".\supabase\migrations\20260111_add_vector_embeddings.sql") {
    Write-Host "  ✅ Vector embeddings migration found" -ForegroundColor Green
} else {
    $errors += "Vector embeddings migration not found"
    Write-Host "  ❌ Migration file missing" -ForegroundColor Red
}

# Check 6: Verify environment variables
Write-Host "✓ Checking environment configuration..." -ForegroundColor Yellow
$envFile = Get-Content ".env.development" -ErrorAction SilentlyContinue
if ($envFile -match "NEXT_PUBLIC_SUPABASE_URL" -and $envFile -match "SUPABASE_SERVICE_ROLE_KEY") {
    Write-Host "  ✅ Supabase credentials configured" -ForegroundColor Green
} else {
    $errors += "Supabase credentials not configured"
    Write-Host "  ❌ Supabase credentials missing" -ForegroundColor Red
}

# Check 7: Verify embedding service storage is not hardcoded to IndexedDB
Write-Host "✓ Checking embedding service..." -ForegroundColor Yellow
$embeddingService = Get-Content ".\lib\DataManagement\embeddings\embedding.service.ts" -Raw
if ($embeddingService -match "this\.storage = indexedDBService") {
    $errors += "Embedding service still defaults to IndexedDB"
    Write-Host "  ❌ Embedding service still using IndexedDB default" -ForegroundColor Red
} else {
    Write-Host "  ✅ Embedding service properly configured" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "📊 Verification Summary" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ All checks passed! Migration is complete." -ForegroundColor Green
} elseif ($errors.Count -eq 0) {
    Write-Host "✅ Migration successful with $($warnings.Count) warning(s):" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "   ⚠️  $_" -ForegroundColor Yellow }
} else {
    Write-Host "❌ Migration has $($errors.Count) error(s):" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "   ❌ $_" -ForegroundColor Red }
    if ($warnings.Count -gt 0) {
        Write-Host "`n⚠️  And $($warnings.Count) warning(s):" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "   ⚠️  $_" -ForegroundColor Yellow }
    }
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Apply database migration in Supabase Dashboard" -ForegroundColor White
Write-Host "   2. Test file upload and processing" -ForegroundColor White
Write-Host "   3. Test vector search functionality" -ForegroundColor White
Write-Host "   4. Verify RAG context retrieval" -ForegroundColor White
Write-Host ""
