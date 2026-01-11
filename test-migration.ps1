# Test Supabase migration
cd apps/web

Write-Host "Loading environment variables..." -ForegroundColor Cyan
$env:NEXT_PUBLIC_SUPABASE_URL = "https://zwebmnlkgimgqtsutcbm.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthaW5hcXBnbnBtcWRsa2lyY2x0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDUyNzY3MSwiZXhwIjoyMDc2MTAzNjcxfQ.r3ToVJqxEqfbZrZkxu7v2Ro91d8FgZEMM9BvbwQfYLU"

Write-Host "Running migration verification..." -ForegroundColor Cyan
npx tsx scripts/verify-migration.ts
