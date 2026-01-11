/*
 * -------------------------------------------------------
 * Add File Visibility (Public/Private) Support
 * -------------------------------------------------------
 */

-- Add visibility column to uploaded_files table
ALTER TABLE public.uploaded_files
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for public file queries
CREATE INDEX IF NOT EXISTS idx_uploaded_files_is_public
ON public.uploaded_files (is_public)
WHERE is_public = TRUE;

-- Update RLS policies to allow public file access
-- Policy: Allow anyone to read public files
CREATE POLICY IF NOT EXISTS "Anyone can read public files" ON public.uploaded_files
FOR SELECT TO anon, authenticated
USING (is_public = TRUE);

-- Policy: Allow anyone to read embeddings of public files
CREATE POLICY IF NOT EXISTS "Anyone can read public file embeddings" ON public.file_embeddings
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.uploaded_files
    WHERE id = file_embeddings.file_id
    AND is_public = TRUE
  )
);

-- Add comment
COMMENT ON COLUMN public.uploaded_files.is_public IS 
'Whether the file is publicly accessible (true) or private to the owner (false)';
