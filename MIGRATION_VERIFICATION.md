# ✅ Migration Verification Checklist

## Your New Supabase Project
- **URL**: `https://zwebmnlkgimgqtsutcbm.supabase.co`
- **Status**: Keys configured in `.env.development` ✅

---

## Step 1: Verify Database Tables

Go to your Supabase dashboard → **SQL Editor** and run these queries:

### Check 1: Accounts table has role column
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'accounts' AND column_name = 'role';
```
**Expected**: Should show the `role` column with type `user_role` and default `'operator'`

---

### Check 2: uploaded_files table exists
```sql
SELECT COUNT(*) as table_exists
FROM information_schema.tables 
WHERE table_name = 'uploaded_files';
```
**Expected**: Should return `1`

---

### Check 3: file_embeddings table exists
```sql
SELECT COUNT(*) as table_exists
FROM information_schema.tables 
WHERE table_name = 'file_embeddings';
```
**Expected**: Should return `1`

---

### Check 4: Helper functions exist
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_admin', 'is_operator', 'get_user_role');
```
**Expected**: Should show all 3 functions

---

### Check 5: RLS Policies exist
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('uploaded_files', 'file_embeddings');
```
**Expected**: Should show 8 policies (4 per table)

---

### Check 6: user_role enum exists
```sql
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'user_role';
```
**Expected**: Should show `admin` and `operator`

---

## Step 2: Set User Roles

### Make yourself an admin:
```sql
-- Replace with your actual email
UPDATE public.accounts 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Verify roles:
```sql
SELECT id, email, role, created_at 
FROM public.accounts 
ORDER BY created_at;
```

---

## Step 3: Test the Application

### 1. Restart Development Server
```bash
# Stop current server (Ctrl+C in terminal)
pnpm run dev
```

### 2. Test Login
- Log in to your application
- Check browser console for errors
- Verify you can access the application

### 3. Test Role-Based Access (After updating pages)
**As Admin** - should access:
- ✅ Home
- ✅ Dashboard  
- ✅ Data Management
- ✅ Chatbot
- ✅ AMDEC
- ✅ Work Orders
- ✅ Breakdown Prediction
- ✅ Maintenance Planning

**As Operator** - should access:
- ✅ Home
- ✅ Dashboard
- ✅ Chatbot
- ✅ Maintenance Planning
- ❌ Data Management (redirects)
- ❌ AMDEC (redirects)
- ❌ Work Orders (redirects)
- ❌ Breakdown Prediction (redirects)

---

## Step 4: Update Application Code

Now you need to update these files to use Supabase instead of IndexedDB:

### 1. Update DataManagement Page
**File**: `apps/web/app/home/DataManagement/page.tsx`

Replace:
```tsx
import { indexedDBService } from '~/lib/DataManagement/indexeddb.service';
```

With:
```tsx
import { useSupabaseFileService } from '~/lib/DataManagement/use-supabase-file-service';
```

Then in component:
```tsx
const fileService = useSupabaseFileService();
```

### 2. Update Chatbot Page
**File**: `apps/web/app/home/chatbot/page.tsx`

Same changes as above.

### 3. Update Embedding Service
**File**: `apps/web/lib/DataManagement/embeddings/embedding.service.ts`

Add method to switch storage backend:
```typescript
setStorage(storage: any) {
  this.storage = storage;
}
```

See `QUICK_UPDATE_GUIDE.md` for detailed examples.

---

## Step 5: Test File Operations

After updating the code:

1. **Upload a file**
   - Go to Data Management
   - Upload a test file
   - Check Supabase dashboard → Table Editor → uploaded_files
   - Should see your file there

2. **Process file** (generate embeddings)
   - Click "Process" on uploaded file
   - Check file_embeddings table
   - Should see chunks with vectors

3. **Delete file**
   - Delete a file
   - Check both tables - file and embeddings should be gone

---

## Troubleshooting

### Issue: "relation does not exist"
**Solution**: Tables weren't created. Re-run the migration SQL in Supabase SQL Editor.

### Issue: "permission denied"
**Solution**: RLS policies blocking access. Check you're logged in and policies are correct.

### Issue: "column role does not exist"
**Solution**: Role column wasn't added. Run:
```sql
ALTER TABLE public.accounts ADD COLUMN role user_role DEFAULT 'operator';
```

### Issue: Application still shows all pages for operator
**Solution**: Clear browser cache, restart dev server, check middleware is loading.

---

## Quick SQL Fix-All

If something went wrong, run this in Supabase SQL Editor:

```sql
-- Check what's missing
SELECT 'accounts.role exists' as check, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name='accounts' AND column_name='role'
       ) THEN '✅ YES' ELSE '❌ NO' END as status
UNION ALL
SELECT 'uploaded_files exists', 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name='uploaded_files'
       ) THEN '✅ YES' ELSE '❌ NO' END
UNION ALL
SELECT 'file_embeddings exists', 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name='file_embeddings'
       ) THEN '✅ YES' ELSE '❌ NO' END
UNION ALL
SELECT 'is_admin() exists', 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.routines 
         WHERE routine_name='is_admin'
       ) THEN '✅ YES' ELSE '❌ NO' END;
```

---

## Success Indicators

✅ All SQL checks pass  
✅ You have admin role assigned  
✅ Dev server runs without errors  
✅ You can log in successfully  
✅ Files upload to Supabase (after code update)  
✅ Role-based navigation works  

---

**Next**: Once all checks pass, follow `QUICK_UPDATE_GUIDE.md` to update your pages to use Supabase!
