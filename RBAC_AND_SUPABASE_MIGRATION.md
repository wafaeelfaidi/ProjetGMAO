# Role-Based Access Control (RBAC) & Supabase Migration

## Overview

This document outlines the implementation of role-based access control and migration from IndexedDB to Supabase for the GMAO project.

## Table of Contents

1. [User Roles](#user-roles)
2. [Supabase Database Changes](#supabase-database-changes)
3. [Implementation Guide](#implementation-guide)
4. [API Reference](#api-reference)
5. [Migration Steps](#migration-steps)

---

## User Roles

### Admin Role
- **Access**: Full access to all features
- **Permissions**:
  - Home
  - Dashboard (CSV)
  - Data Management
  - Chatbot
  - AMDEC
  - Work Orders (OT Creator)
  - Breakdown Prediction
  - Maintenance Planning
  - Settings
  - User Management (future feature)

### Operator Role
- **Access**: Limited to operational features
- **Permissions**:
  - Home
  - Dashboard (CSV)
  - Chatbot
  - Maintenance Planning
  - Settings

---

## Supabase Database Changes

### 1. Migration File

**Location**: `apps/web/supabase/migrations/20260111_add_roles_and_file_storage.sql`

### 2. New Database Objects

#### Enums
```sql
CREATE TYPE public.user_role AS ENUM ('admin', 'operator');
```

#### Tables Modified

**accounts table**:
- Added column: `role public.user_role NOT NULL DEFAULT 'operator'`
- Added index: `idx_accounts_role` on `role` column

#### New Tables

**uploaded_files**:
```sql
CREATE TABLE public.uploaded_files (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
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
```

**file_embeddings**:
```sql
CREATE TABLE public.file_embeddings (
    id UUID PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES public.uploaded_files(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    vector REAL[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);
```

#### Helper Functions

- `public.is_admin()` - Check if current user is admin
- `public.is_operator()` - Check if current user is operator
- `public.get_user_role()` - Get current user's role

#### Row Level Security (RLS) Policies

All tables have RLS enabled with policies for:
- SELECT: Users can view their own data or all data if admin
- INSERT: Users can insert their own data
- UPDATE: Users can update their own data or all data if admin
- DELETE: Users can delete their own data or all data if admin

---

## Implementation Guide

### 1. Running the Migration

```bash
# Navigate to the web app directory
cd apps/web

# Run the migration using Supabase CLI
npx supabase db push

# Or apply manually in Supabase Studio
# Copy the content of the migration file and execute in SQL Editor
```

### 2. Setting User Roles

**Automatic**: The first user to register is automatically set as admin.

**Manual** (via Supabase Studio):
```sql
-- Set a user as admin
UPDATE public.accounts
SET role = 'admin'
WHERE email = 'user@example.com';

-- Set a user as operator
UPDATE public.accounts
SET role = 'operator'
WHERE email = 'operator@example.com';
```

### 3. Using Role Utilities

#### Client-Side (React Components)

```tsx
import { useUserRole, useIsAdmin, usePermission } from '~/lib/roles/use-user-role';

function MyComponent() {
  // Get user role
  const { role, loading } = useUserRole();
  
  // Check if admin
  const { isAdmin } = useIsAdmin();
  
  // Check specific permission
  const { hasPermission } = usePermission('canAccessAMDEC');
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Your role: {role}</p>
      {isAdmin && <AdminPanel />}
      {hasPermission && <AMDECFeature />}
    </div>
  );
}
```

#### Server-Side (Server Components)

```tsx
import { getUserRole, isAdmin, requireAdmin } from '~/lib/roles/server-role-utils';

async function ServerComponent() {
  const role = await getUserRole();
  const adminStatus = await isAdmin();
  
  // Require admin role (throws error if not admin)
  await requireAdmin();
  
  return <div>Admin-only content</div>;
}
```

### 4. Navigation Filtering

The navigation automatically filters based on user role. The implementation is in:
- `apps/web/config/navigation.config.tsx`
- `apps/web/app/home/_components/home-sidebar.tsx`

### 5. Middleware Protection

Routes are protected at the middleware level in `apps/web/middleware.ts`:
- Operators are redirected if they try to access admin-only pages
- All role checks happen server-side for security

---

## API Reference

### Role Utilities

**Client-Side Hooks**:

```typescript
// Get user role
const { role, loading } = useUserRole();

// Check if admin
const { isAdmin, loading } = useIsAdmin();

// Check if operator
const { isOperator, loading } = useIsOperator();

// Check specific permission
const { hasPermission, loading, role } = usePermission('canAccessAMDEC');
```

**Server-Side Functions**:

```typescript
// Get user role
const role = await getUserRole(); // Returns 'admin' | 'operator' | null

// Check if admin
const isAdminUser = await isAdmin(); // Returns boolean

// Check if operator
const isOperatorUser = await isOperator(); // Returns boolean

// Require admin (throws if not admin)
await requireAdmin(); // Throws Error if not admin
```

### Supabase File Service

**Usage**:

```typescript
import { useSupabaseFileService } from '~/lib/DataManagement/use-supabase-file-service';

function MyComponent() {
  const fileService = useSupabaseFileService();
  
  // Store a file
  const fileId = await fileService.storeFile(file);
  
  // List files
  const files = await fileService.listFiles();
  
  // Get file with data
  const fileData = await fileService.getFile(fileId);
  
  // Update file metadata
  await fileService.updateFileMetadata(fileId, {
    isProcessed: true,
    hasEmbeddings: true
  });
  
  // Delete file
  await fileService.deleteFile(fileId);
  
  // Store embeddings
  await fileService.storeEmbeddings([
    { fileId, chunkIndex: 0, text: 'chunk 1', vector: [...] }
  ]);
  
  // Get embeddings
  const embeddings = await fileService.getEmbeddings(fileId);
  
  // Get embeddings count
  const count = await fileService.getEmbeddingsCount();
}
```

---

## Migration Steps

### Step 1: Apply Database Migration

```bash
cd apps/web
npx supabase db push
```

### Step 2: Update Pages to Use Supabase

Replace IndexedDB service with Supabase service in your pages:

**Before**:
```typescript
import { indexedDBService } from '~/lib/DataManagement/indexeddb.service';

const files = await indexedDBService.listFiles();
```

**After**:
```typescript
import { useSupabaseFileService } from '~/lib/DataManagement/use-supabase-file-service';

const fileService = useSupabaseFileService();
const files = await fileService.listFiles();
```

### Step 3: Update File Upload Components

The API is nearly identical, so minimal changes are needed:

```typescript
// Example: apps/web/app/home/DataManagement/page.tsx
const handleFilesSelected = async (selectedFiles: File[]) => {
  for (const file of selectedFiles) {
    try {
      await fileService.storeFile(file); // Same API!
      await loadFiles();
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
    }
  }
};
```

### Step 4: Update Embedding Service

The embedding service needs minimal changes since it uses the same interface:

```typescript
// lib/DataManagement/embeddings/embedding.service.ts
// Change the storage backend from IndexedDB to Supabase
constructor(private storage: SupabaseFileService) {
  // ... rest of the code remains the same
}
```

### Step 5: Set User Roles

Log into Supabase Studio and set appropriate roles for existing users:

```sql
-- Set admin users
UPDATE public.accounts
SET role = 'admin'
WHERE email IN ('admin1@example.com', 'admin2@example.com');

-- Operators default to 'operator' role
```

### Step 6: Test Role-Based Access

1. Log in as an operator
   - Verify access to: Home, Dashboard, Chatbot, Maintenance Planning
   - Verify NO access to: Data Management, AMDEC, Work Orders, Breakdown Prediction

2. Log in as an admin
   - Verify access to all features

### Step 7: Migrate Existing Data (Optional)

If you have existing data in IndexedDB that needs to be migrated:

```typescript
// Migration script (run once in browser console)
async function migrateFromIndexedDB() {
  const fileService = new SupabaseFileService(supabase);
  const files = await indexedDBService.listFiles();
  
  for (const file of files) {
    const fileData = await indexedDBService.getFile(file.id);
    if (fileData) {
      // Create File object from stored data
      const blob = new Blob([fileData.data], { type: fileData.type });
      const newFile = new File([blob], fileData.name, { type: fileData.type });
      
      // Store in Supabase
      await fileService.storeFile(newFile);
      
      // Migrate embeddings if they exist
      if (fileData.hasEmbeddings) {
        const embeddings = await indexedDBService.getEmbeddings(file.id);
        await fileService.storeEmbeddings(embeddings);
      }
    }
  }
  
  console.log('Migration complete!');
}
```

---

## Files Changed/Created

### Created Files
1. `apps/web/supabase/migrations/20260111_add_roles_and_file_storage.sql`
2. `apps/web/lib/roles/role-utils.ts`
3. `apps/web/lib/roles/use-user-role.ts`
4. `apps/web/lib/roles/server-role-utils.ts`
5. `apps/web/lib/DataManagement/supabase-file.service.ts`
6. `apps/web/lib/DataManagement/use-supabase-file-service.ts`

### Modified Files
1. `apps/web/middleware.ts` - Added role-based access control
2. `apps/web/config/navigation.config.tsx` - Added route filtering by role
3. `apps/web/app/home/_components/home-sidebar.tsx` - Made role-aware

### Files to Update (by you)
1. `apps/web/app/home/DataManagement/page.tsx` - Replace IndexedDB with Supabase
2. `apps/web/app/home/chatbot/page.tsx` - Replace IndexedDB with Supabase
3. `apps/web/lib/DataManagement/embeddings/embedding.service.ts` - Use Supabase storage

---

## Security Considerations

1. **Row Level Security**: All tables have RLS enabled, ensuring users can only access their own data (unless admin)
2. **Server-Side Validation**: Role checks happen in middleware before page access
3. **Database Functions**: Helper functions use `SECURITY DEFINER` for safe role checking
4. **First User Admin**: The first registered user is automatically set as admin
5. **Binary Data**: File data is stored as BYTEA in Supabase with proper encryption

---

## Troubleshooting

### Migration Fails

```bash
# Reset and retry
npx supabase db reset
npx supabase db push
```

### User Role Not Set

```sql
-- Check current role
SELECT id, email, role FROM public.accounts WHERE email = 'your@email.com';

-- Set role if missing
UPDATE public.accounts SET role = 'admin' WHERE email = 'your@email.com';
```

### RLS Blocking Access

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('uploaded_files', 'file_embeddings');

-- Temporarily disable RLS for debugging (NOT recommended for production)
ALTER TABLE public.uploaded_files DISABLE ROW LEVEL SECURITY;
```

---

## Next Steps

1. Apply the database migration
2. Set user roles in Supabase
3. Update DataManagement and Chatbot pages to use Supabase
4. Test with both admin and operator accounts
5. Migrate existing IndexedDB data (if any)
6. Remove IndexedDB service once migration is complete
