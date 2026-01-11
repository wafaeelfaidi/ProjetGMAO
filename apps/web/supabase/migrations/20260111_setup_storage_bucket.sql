/*
 * -------------------------------------------------------
 * Storage Bucket Setup for Document Storage
 * 
 * IMPORTANT: Storage bucket policies CANNOT be created via SQL migration.
 * They must be created through the Supabase Dashboard UI.
 * 
 * This file documents the required policies for reference.
 * -------------------------------------------------------
 */

-- =====================================================
-- SECTION 1: Create Storage Bucket (UI ONLY)
-- =====================================================

-- GO TO: Supabase Dashboard > Storage > New Bucket
-- 
-- Settings:
--   Name: documents
--   Public: NO (keep it private)
--   File size limit: 52428800 (50MB)
--   Allowed MIME types:
--     - application/pdf
--     - application/vnd.openxmlformats-officedocument.wordprocessingml.document
--     - application/msword
--     - text/plain
--     - text/csv
--     - application/json
--     - text/markdown
--     - application/xml
--     - text/html

-- =====================================================
-- SECTION 2: Storage Bucket Policies (UI ONLY)
-- =====================================================

-- After creating the bucket, go to the bucket settings and add these policies:
--
-- POLICY 1: Allow authenticated users to INSERT their own files
-- ---------------------------------------------------------------
-- Target roles: authenticated
-- Policy name: Users can upload their own documents
-- Allowed operation: INSERT
-- Policy definition:
--   bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text
--
--
-- POLICY 2: Allow authenticated users to SELECT their own files
-- ---------------------------------------------------------------
-- Target roles: authenticated
-- Policy name: Users can read their own documents  
-- Allowed operation: SELECT
-- Policy definition:
--   bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text
--
--
-- POLICY 3: Allow authenticated users to UPDATE their own files
-- ---------------------------------------------------------------
-- Target roles: authenticated
-- Policy name: Users can update their own documents
-- Allowed operation: UPDATE
-- Policy definition:
--   bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text
--
--
-- POLICY 4: Allow authenticated users to DELETE their own files
-- ---------------------------------------------------------------
-- Target roles: authenticated
-- Policy name: Users can delete their own documents
-- Allowed operation: DELETE
-- Policy definition:
--   bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text

-- =====================================================
-- SECTION 3: Verification
-- =====================================================

-- After setting up policies through the UI, verify with:
--
-- SELECT * FROM storage.buckets WHERE name = 'documents';
--
-- You should see the bucket with:
-- - public: false
-- - file_size_limit: 52428800
-- - allowed_mime_types: array of types listed above
