/*
 * -------------------------------------------------------
 * Add User Roles and File Storage Migration
 * This migration adds:
 * - User role system (admin/operator)
 * - File storage tables to replace IndexedDB
 * - RLS policies for role-based access control
 * -------------------------------------------------------
 */

-- =====================================================
-- SECTION 1: User Roles
-- =====================================================

-- Create user_role enum (if not exists)
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'operator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'operator';

-- Create index for faster role queries
CREATE INDEX IF NOT EXISTS idx_accounts_role ON public.accounts(role);

-- Comment on the role column
COMMENT ON COLUMN public.accounts.role IS 'User role: admin (full access) or operator (limited access to home, dashboard, chatbot, maintenance planning)';

-- =====================================================
-- SECTION 2: File Storage Tables (replacing IndexedDB)
-- =====================================================

-- Create uploaded_files table
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
    has_embeddings BOOLEAN NOT NULL DEFAULT FALSE,
    file_data BYTEA NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create file_embeddings table
CREATE TABLE IF NOT EXISTS public.file_embeddings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    vector REAL[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON public.uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_account_id ON public.uploaded_files(account_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_upload_date ON public.uploaded_files(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_is_processed ON public.uploaded_files(is_processed);

CREATE INDEX IF NOT EXISTS idx_file_embeddings_file_id ON public.file_embeddings(file_id);
CREATE INDEX IF NOT EXISTS idx_file_embeddings_user_id ON public.file_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_file_embeddings_account_id ON public.file_embeddings(account_id);
CREATE INDEX IF NOT EXISTS idx_file_embeddings_chunk_index ON public.file_embeddings(file_id, chunk_index);

-- Comments on tables
COMMENT ON TABLE public.uploaded_files IS 'Stores uploaded files with binary data (replaces IndexedDB files store)';
COMMENT ON TABLE public.file_embeddings IS 'Stores text embeddings for semantic search (replaces IndexedDB embeddings store)';

-- =====================================================
-- SECTION 3: Helper Functions for Role Management
-- =====================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM public.accounts
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is operator
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'operator'
        FROM public.accounts
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
BEGIN
    RETURN (
        SELECT role
        FROM public.accounts
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- =====================================================
-- SECTION 4: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS uploaded_files_select ON public.uploaded_files;
DROP POLICY IF EXISTS uploaded_files_insert ON public.uploaded_files;
DROP POLICY IF EXISTS uploaded_files_update ON public.uploaded_files;
DROP POLICY IF EXISTS uploaded_files_delete ON public.uploaded_files;
DROP POLICY IF EXISTS file_embeddings_select ON public.file_embeddings;
DROP POLICY IF EXISTS file_embeddings_insert ON public.file_embeddings;
DROP POLICY IF EXISTS file_embeddings_update ON public.file_embeddings;
DROP POLICY IF EXISTS file_embeddings_delete ON public.file_embeddings;

-- uploaded_files policies
-- Policy: Users can view their own files or all files if admin
CREATE POLICY uploaded_files_select ON public.uploaded_files
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR public.is_admin()
    );

-- Policy: Users can insert their own files
CREATE POLICY uploaded_files_insert ON public.uploaded_files
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND account_id = auth.uid()
    );

-- Policy: Users can update their own files or all files if admin
CREATE POLICY uploaded_files_update ON public.uploaded_files
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() OR public.is_admin()
    )
    WITH CHECK (
        user_id = auth.uid() OR public.is_admin()
    );

-- Policy: Users can delete their own files or all files if admin
CREATE POLICY uploaded_files_delete ON public.uploaded_files
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() OR public.is_admin()
    );

-- file_embeddings policies
-- Policy: Users can view their own embeddings or all embeddings if admin
CREATE POLICY file_embeddings_select ON public.file_embeddings
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR public.is_admin()
    );

-- Policy: Users can insert their own embeddings
CREATE POLICY file_embeddings_insert ON public.file_embeddings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND account_id = auth.uid()
    );

-- Policy: Users can update their own embeddings or all embeddings if admin
CREATE POLICY file_embeddings_update ON public.file_embeddings
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() OR public.is_admin()
    )
    WITH CHECK (
        user_id = auth.uid() OR public.is_admin()
    );

-- Policy: Users can delete their own embeddings or all embeddings if admin
CREATE POLICY file_embeddings_delete ON public.file_embeddings
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() OR public.is_admin()
    );

-- =====================================================
-- SECTION 5: Triggers for automatic updates
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_uploaded_files_updated_at ON public.uploaded_files;

-- Trigger for uploaded_files
CREATE TRIGGER update_uploaded_files_updated_at
    BEFORE UPDATE ON public.uploaded_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SECTION 6: Grant Permissions
-- =====================================================

-- Grant permissions on uploaded_files
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploaded_files TO authenticated;

-- Grant permissions on file_embeddings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_embeddings TO authenticated;

-- =====================================================
-- SECTION 7: Set first user as admin (optional)
-- =====================================================

-- Function to set the first registered user as admin
CREATE OR REPLACE FUNCTION kit.set_first_user_as_admin()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count existing users
    SELECT COUNT(*) INTO user_count FROM public.accounts;
    
    -- If this is the first user, set them as admin
    IF user_count = 1 THEN
        UPDATE public.accounts
        SET role = 'admin'
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_first_user_set_admin ON public.accounts;

-- Create trigger to run after user creation
CREATE TRIGGER on_first_user_set_admin
    AFTER INSERT ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION kit.set_first_user_as_admin();
