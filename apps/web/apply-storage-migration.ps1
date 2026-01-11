# Apply Storage Bucket Migration
# Run this in PowerShell

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Storage Bucket Setup Guide" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Apply Database Migration" -ForegroundColor Yellow
Write-Host "---------------------------------" -ForegroundColor Yellow
Write-Host "1. Go to Supabase Dashboard > SQL Editor" -ForegroundColor White
Write-Host "2. Copy the contents of:" -ForegroundColor White
Write-Host "   apps/web/supabase/migrations/20260111_add_vector_embeddings.sql" -ForegroundColor Green
Write-Host "3. Paste and run it" -ForegroundColor White
Write-Host ""

Write-Host "Step 2: Create Storage Bucket" -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Yellow
Write-Host "1. Go to Supabase Dashboard > Storage" -ForegroundColor White
Write-Host "2. Click 'New bucket' button" -ForegroundColor White
Write-Host "3. Configure bucket:" -ForegroundColor White
Write-Host "   Name: documents" -ForegroundColor Green
Write-Host "   Public: NO (uncheck 'Public bucket')" -ForegroundColor Green
Write-Host "   File size limit: 50 MB" -ForegroundColor Green
Write-Host "4. Click 'Create bucket'" -ForegroundColor White
Write-Host ""

Write-Host "Step 3: Set Up Storage Policies" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Yellow
Write-Host "1. Click on the 'documents' bucket" -ForegroundColor White
Write-Host "2. Go to 'Policies' tab" -ForegroundColor White
Write-Host "3. Click 'New Policy' for each operation:" -ForegroundColor White
Write-Host ""
Write-Host "   Policy 1 - INSERT (Upload):" -ForegroundColor Cyan
Write-Host "   Name: Users can upload their own documents" -ForegroundColor White
Write-Host "   Allowed operation: INSERT" -ForegroundColor White
Write-Host "   Target roles: authenticated" -ForegroundColor White
Write-Host "   USING expression:" -ForegroundColor White
Write-Host "   bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text" -ForegroundColor Gray
Write-Host ""
Write-Host "   Policy 2 - SELECT (Download):" -ForegroundColor Cyan
Write-Host "   Name: Users can read their own documents" -ForegroundColor White
Write-Host "   Allowed operation: SELECT" -ForegroundColor White
Write-Host "   Target roles: authenticated" -ForegroundColor White
Write-Host "   USING expression:" -ForegroundColor White
Write-Host "   bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text" -ForegroundColor Gray
Write-Host ""
Write-Host "   Policy 3 - UPDATE:" -ForegroundColor Cyan
Write-Host "   Name: Users can update their own documents" -ForegroundColor White
Write-Host "   Allowed operation: UPDATE" -ForegroundColor White
Write-Host "   Target roles: authenticated" -ForegroundColor White
Write-Host "   USING expression:" -ForegroundColor White
Write-Host "   bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text" -ForegroundColor Gray
Write-Host ""
Write-Host "   Policy 4 - DELETE:" -ForegroundColor Cyan
Write-Host "   Name: Users can delete their own documents" -ForegroundColor White
Write-Host "   Allowed operation: DELETE" -ForegroundColor White
Write-Host "   Target roles: authenticated" -ForegroundColor White
Write-Host "   USING expression:" -ForegroundColor White
Write-Host "   bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 4: Verify Setup" -ForegroundColor Yellow
Write-Host "--------------------" -ForegroundColor Yellow
Write-Host "Run this query in SQL Editor:" -ForegroundColor White
Write-Host ""
Write-Host "-- Check bucket exists" -ForegroundColor Green
Write-Host "SELECT * FROM storage.buckets WHERE name = 'documents';" -ForegroundColor Green
Write-Host ""
Write-Host "-- Check database schema" -ForegroundColor Green
Write-Host "SELECT column_name, data_type" -ForegroundColor Green
Write-Host "FROM information_schema.columns" -ForegroundColor Green
Write-Host "WHERE table_name = 'uploaded_files'" -ForegroundColor Green
Write-Host "  AND column_name IN ('file_path', 'file_data');" -ForegroundColor Green
Write-Host ""
Write-Host "Expected:" -ForegroundColor White
Write-Host "  ✓ Bucket 'documents' exists with public=false" -ForegroundColor Green
Write-Host "  ✓ Column 'file_path' exists (type: text)" -ForegroundColor Green
Write-Host "  ✓ Column 'file_data' does NOT exist" -ForegroundColor Green
Write-Host "  ✓ 4 policies on the documents bucket" -ForegroundColor Green
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✅ Complete all steps before testing!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
