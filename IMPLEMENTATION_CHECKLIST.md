# Implementation Checklist

Use this checklist to track your implementation progress.

## Phase 1: Database Setup ✓ COMPLETE

- [x] Create migration file
- [x] Review SQL migration code
- [ ] **TODO**: Apply migration to Supabase
  ```bash
  cd apps/web
  npx supabase db push
  ```
- [ ] **TODO**: Verify tables created in Supabase Studio
  - [ ] Check `accounts` table has `role` column
  - [ ] Check `uploaded_files` table exists
  - [ ] Check `file_embeddings` table exists
  - [ ] Check helper functions exist (is_admin, is_operator, get_user_role)
  - [ ] Check RLS policies are enabled

## Phase 2: Role Assignment

- [ ] **TODO**: Set first user as admin
  ```sql
  -- In Supabase Studio SQL Editor
  UPDATE public.accounts
  SET role = 'admin'
  WHERE email = 'YOUR_EMAIL@example.com';
  ```
- [ ] **TODO**: Create test operator account
  - [ ] Register a new user
  - [ ] Verify they get 'operator' role by default
- [ ] **TODO**: Test role functions
  ```sql
  -- Test in SQL Editor
  SELECT public.is_admin();
  SELECT public.is_operator();
  SELECT public.get_user_role();
  ```

## Phase 3: Code Integration ✓ COMPLETE

- [x] Create role utilities (`role-utils.ts`)
- [x] Create role hooks (`use-user-role.ts`)
- [x] Create server role utils (`server-role-utils.ts`)
- [x] Update middleware for RBAC
- [x] Update navigation config
- [x] Update sidebar component
- [x] Create Supabase file service
- [x] Create Supabase file service hook

## Phase 4: Page Updates (YOUR WORK)

### Update DataManagement Page
- [ ] **TODO**: Update `apps/web/app/home/DataManagement/page.tsx`
  - [ ] Import `useSupabaseFileService` instead of `indexedDBService`
  - [ ] Replace all `indexedDBService` calls with `fileService` calls
  - [ ] Test file upload
  - [ ] Test file list
  - [ ] Test file delete
  - [ ] Test file processing

### Update Chatbot Page
- [ ] **TODO**: Update `apps/web/app/home/chatbot/page.tsx`
  - [ ] Import `useSupabaseFileService`
  - [ ] Use Supabase service for file operations
  - [ ] Update embedding service to use Supabase storage
  - [ ] Test chatbot with uploaded files

### Update Embedding Service
- [ ] **TODO**: Update `apps/web/lib/DataManagement/embeddings/embedding.service.ts`
  - [ ] Add `setStorage()` method
  - [ ] Make storage backend configurable
  - [ ] Update all storage calls to use `this.storage`
  - [ ] Test with both IndexedDB and Supabase

## Phase 5: Testing

### Admin User Testing
- [ ] **TODO**: Log in as admin
- [ ] **TODO**: Verify access to all pages:
  - [ ] Home
  - [ ] Dashboard
  - [ ] Data Management
  - [ ] Chatbot
  - [ ] AMDEC
  - [ ] Work Orders
  - [ ] Breakdown Prediction
  - [ ] Maintenance Planning
  - [ ] Settings
- [ ] **TODO**: Test file operations:
  - [ ] Upload file
  - [ ] View files
  - [ ] Process file (embeddings)
  - [ ] Delete file
  - [ ] Search with embeddings

### Operator User Testing
- [ ] **TODO**: Log in as operator
- [ ] **TODO**: Verify access to allowed pages:
  - [ ] Home (✓)
  - [ ] Dashboard (✓)
  - [ ] Chatbot (✓)
  - [ ] Maintenance Planning (✓)
  - [ ] Settings (✓)
- [ ] **TODO**: Verify NO access to restricted pages:
  - [ ] Data Management (redirects to home)
  - [ ] AMDEC (redirects to home)
  - [ ] Work Orders (redirects to home)
  - [ ] Breakdown Prediction (redirects to home)
- [ ] **TODO**: Verify navigation only shows allowed items
- [ ] **TODO**: Test file operations as operator:
  - [ ] Upload own files
  - [ ] View own files
  - [ ] Cannot view other users' files
  - [ ] Can delete own files
  - [ ] Cannot delete other users' files (admin only)

### Role System Testing
- [ ] **TODO**: Test role hooks work correctly:
  ```tsx
  const { role } = useUserRole(); // Should show current role
  const { isAdmin } = useIsAdmin(); // Should be true/false
  const { hasPermission } = usePermission('canAccessAMDEC');
  ```
- [ ] **TODO**: Test middleware redirects work
- [ ] **TODO**: Test RLS policies in database
  ```sql
  -- As operator, try to select admin's files (should return empty)
  SELECT * FROM uploaded_files;
  ```

## Phase 6: Data Migration (Optional)

- [ ] **TODO**: Decide if you need to migrate existing IndexedDB data
- [ ] If YES:
  - [ ] Back up IndexedDB data
  - [ ] Run migration script (see QUICK_UPDATE_GUIDE.md)
  - [ ] Verify all files migrated
  - [ ] Verify all embeddings migrated
  - [ ] Test search with migrated data
  - [ ] Clear IndexedDB after successful migration

## Phase 7: Cleanup

- [ ] **TODO**: Remove IndexedDB service imports if fully migrated
- [ ] **TODO**: Update documentation/comments
- [ ] **TODO**: Remove console.log debugging statements
- [ ] **TODO**: Add user role badge in UI (optional)
- [ ] **TODO**: Add admin panel for user management (future feature)

## Phase 8: Production Deployment

- [ ] **TODO**: Test in production environment
- [ ] **TODO**: Verify Supabase connection works
- [ ] **TODO**: Check environment variables are set
- [ ] **TODO**: Test with multiple simultaneous users
- [ ] **TODO**: Monitor database performance
- [ ] **TODO**: Set up database backups (Supabase Pro)

## Documentation Review

- [ ] **TODO**: Read `IMPLEMENTATION_SUMMARY.md`
- [ ] **TODO**: Read `RBAC_AND_SUPABASE_MIGRATION.md`
- [ ] **TODO**: Read `DATABASE_CHANGES_SUMMARY.md`
- [ ] **TODO**: Read `QUICK_UPDATE_GUIDE.md`
- [ ] **TODO**: Review `ARCHITECTURE_DIAGRAM.md`

## Troubleshooting (If Issues Arise)

- [ ] Check browser console for errors
- [ ] Check Supabase logs
- [ ] Verify database migration applied successfully
- [ ] Verify RLS policies are correct
- [ ] Check user roles are set correctly
- [ ] Test with different browsers/incognito mode
- [ ] Clear browser cache if needed

## Success Criteria

✅ Migration is successful when:
- [ ] All users have roles assigned
- [ ] Admin can access all features
- [ ] Operator can only access allowed features
- [ ] Files are stored in Supabase
- [ ] Embeddings are stored in Supabase
- [ ] Search functionality works
- [ ] No console errors
- [ ] Navigation filters correctly by role
- [ ] Middleware redirects work
- [ ] RLS policies protect data

---

## Quick Commands Reference

### Database
```bash
# Apply migration
cd apps/web
npx supabase db push

# Reset database (development only)
npx supabase db reset
```

### Set Roles (SQL)
```sql
-- Set admin
UPDATE public.accounts SET role = 'admin' WHERE email = 'admin@example.com';

-- Set operator
UPDATE public.accounts SET role = 'operator' WHERE email = 'operator@example.com';

-- Check roles
SELECT id, email, role FROM public.accounts;
```

### Test Queries (SQL)
```sql
-- Test RLS as current user
SELECT * FROM uploaded_files;
SELECT * FROM file_embeddings;

-- Count files by user
SELECT user_id, COUNT(*) FROM uploaded_files GROUP BY user_id;

-- Check role functions
SELECT public.is_admin();
SELECT public.get_user_role();
```

---

## Progress Tracking

**Started**: _______________  
**Database Setup Complete**: _______________  
**Code Integration Complete**: ✓  
**Pages Updated**: _______________  
**Testing Complete**: _______________  
**Production Deployed**: _______________

---

## Notes

Use this section to track any issues, decisions, or important information:

```
[Date] [Note]
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
```
