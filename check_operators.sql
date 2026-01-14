-- Check if role column exists and list all users with their roles
SELECT id, email, name, role 
FROM public.accounts 
ORDER BY created_at DESC;

-- Count operators
SELECT COUNT(*) as operator_count 
FROM public.accounts 
WHERE role = 'operator';
