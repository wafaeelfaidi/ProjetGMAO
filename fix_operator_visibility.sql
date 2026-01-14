-- Quick fix: Run this in Supabase SQL Editor to allow viewing operators

-- Drop policy if it exists
DROP POLICY IF EXISTS "Users can view operator and admin accounts" ON public.accounts;

-- Allow authenticated users to view operator and admin accounts
CREATE POLICY "Users can view operator and admin accounts"
    ON public.accounts
    FOR SELECT
    TO authenticated
    USING (
        role IN ('admin', 'operator')
    );
