-- Allow authenticated users to read basic account info for operators and admins
-- This is needed for the task delegation feature to list operators

CREATE POLICY "Users can view operator and admin accounts"
    ON public.accounts
    FOR SELECT
    TO authenticated
    USING (
        role IN ('admin', 'operator')
    );
