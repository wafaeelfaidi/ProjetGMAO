-- Migration: Setup IoT Streaming CSV Storage
-- Description: Ensures the documents bucket can handle IoT streaming CSV files
-- Created: 2026-01-11

-- The documents bucket should already exist from previous migrations
-- This migration adds policies for the iot_streams folder

-- Enable RLS on storage.objects if not already enabled
-- (This is usually already done, but we ensure it here)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated users to read iot_streams files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role to upload iot_streams files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role to update iot_streams files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role to delete iot_streams files" ON storage.objects;

-- Policy: Allow authenticated users to read files in iot_streams folder
CREATE POLICY "Allow authenticated users to read iot_streams files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'iot_streams'
);

-- Policy: Allow service role to upload files to iot_streams folder
CREATE POLICY "Allow service role to upload iot_streams files"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'iot_streams'
);

-- Policy: Allow service role to update files in iot_streams folder
CREATE POLICY "Allow service role to update iot_streams files"
ON storage.objects
FOR UPDATE
TO service_role
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'iot_streams'
);

-- Policy: Allow service role to delete files in iot_streams folder
CREATE POLICY "Allow service role to delete iot_streams files"
ON storage.objects
FOR DELETE
TO service_role
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'iot_streams'
);

-- Add a comment to document this setup
COMMENT ON TABLE storage.objects IS 'Storage objects table with RLS policies for IoT streaming CSV files in iot_streams folder';
