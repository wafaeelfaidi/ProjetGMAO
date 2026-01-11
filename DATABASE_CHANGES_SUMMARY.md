# Supabase Database Changes Summary

## Overview
This document lists all changes that must be made to the Supabase database to implement role-based access control and migrate from IndexedDB to Supabase.

**Assumptions**: 
- The `accounts` table already exists (from base schema)
- The `uploaded_files` and `file_embeddings` tables DO NOT exist yet
- This migration creates new tables and modifies existing ones

---

## 1. Create User Role Enum

```sql
CREATE TYPE public.user_role AS ENUM ('admin', 'operator');
```

**Purpose**: Define the two user role types in the system.

---

## 2. Accounts Table Structure

### Base Table (Should Already Exist)
```sql
-- This table should already exist from your base Supabase schema
-- If it doesn't exist, create it first:

CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) UNIQUE,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users,
    updated_by UUID REFERENCES auth.users,
    picture_url VARCHAR(1000),
    public_data JSONB DEFAULT '{}'::jsonb NOT NULL
);
```

### Add Role Column (NEW)
```sql
-- Add the role column to the existing accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'operator';
```

### Add Index (NEW)
```sql
CREATE INDEX IF NOT EXISTS idx_accounts_role ON public.accounts(role);
```

**Purpose**: 
- Store user roles in the accounts table
- Default new users to 'operator' role
- Index for faster role-based queries

**Complete Accounts Table After Migration**:
```sql
-- Final structure after migration
public.accounts (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) UNIQUE,
    role user_role NOT NULL DEFAULT 'operator',  -- NEW COLUMN
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users,
    updated_by UUID REFERENCES auth.users,
    picture_url VARCHAR(1000),
    public_data JSONB DEFAULT '{}'::jsonb NOT NULL
)
```

---

## 3. Create `uploaded_files` Table (New Table)

**This table does not exist yet and will be created by this migration.**

```sql
CREATE TABLE public.uploaded_files (
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
```

### Indexes (Created with Table)
```sql
CREATE INDEX idx_uploaded_files_user_id ON public.uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_account_id ON public.uploaded_files(account_id);
CREATE INDEX idx_uploaded_files_upload_date ON public.uploaded_files(upload_date DESC);
CREATE INDEX idx_uploaded_files_is_processed ON public.uploaded_files(is_processed);
```

**Note**: These indexes will be created immediately after the table is created.

**Purpose**: 
- Replace IndexedDB files store
- Store uploaded files with binary data
- Track processing status and embeddings

--- (New Table)

**This table does not exist yet and will be created by this migration.**

```sql
CREATE TABLE
```sql
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
``` (Created with Table)
```sql
CREATE INDEX idx_file_embeddings_file_id ON public.file_embeddings(file_id);
CREATE INDEX idx_file_embeddings_user_id ON public.file_embeddings(user_id);
CREATE INDEX idx_file_embeddings_account_id ON public.file_embeddings(account_id);
CREATE INDEX idx_file_embeddings_chunk_index ON public.file_embeddings(file_id, chunk_index);
```

**Note**: These indexes will be created immediately after the table is created.ATE INDEX idx_file_embeddings_account_id ON public.file_embeddings(account_id);
CREATE INDEX idx_file_embeddings_chunk_index ON public.file_embeddings(file_id, chunk_index);
```

**Purpose**:
- Replace IndexedDB embeddings store
- Store text chunks and their vector embeddings
- Link embeddings to files via foreign key

---

## 5. Create Helper Functions

### is_admin()
```sql
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
```

### is_operator()
```sql
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
```

### get_user_role()
```sql
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
```

**Purpose**: Provide secure functions to check user roles

---

## 6. Row Level Security (RLS) Policies

### Enable RLS
```sql
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_embeddings ENABLE ROW LEVEL SECURITY;
```

### uploaded_files Policies

**SELECT Policy**:
```sql
CREATE POLICY uploaded_files_select ON public.uploaded_files
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());
```

**INSERT Policy**:
```sql
CREATE POLICY uploaded_files_insert ON public.uploaded_files
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND account_id = auth.uid());
```

**UPDATE Policy**:
```sql
CREATE POLICY uploaded_files_update ON public.uploaded_files
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());
```

**DELETE Policy**:
```sql
CREATE POLICY uploaded_files_delete ON public.uploaded_files
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin());
```

### file_embeddings Policies

**SELECT Policy**:
```sql
CREATE POLICY file_embeddings_select ON public.file_embeddings
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());
```

**INSERT Policy**:
```sql
CREATE POLICY file_embeddings_insert ON public.file_embeddings
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND account_id = auth.uid());
```

**UPDATE Policy**:
```sql
CREATE POLICY file_embeddings_update ON public.file_embeddings
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());
```

**DELETE Policy**:
```sql
CREATE POLICY file_embeddings_delete ON public.file_embeddings
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin());
```

**Purpose**: 
- Ensure users can only access their own files/embeddings
- Allow admins to access all files/embeddings
- Prevent unauthorized access

---

## 7. Triggers

### Update Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_uploaded_files_updated_at
BEFORE UPDATE ON public.uploaded_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### First User as Admin Trigger
```sql
CREATE OR REPLACE FUNCTION kit.set_first_user_as_admin()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.accounts;
    
    IF user_count = 1 THEN
        UPDATE public.accounts
        SET role = 'admin'
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_first_user_set_admin
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION kit.set_first_user_as_admin();
```

**Purpose**:
- Auto-update `updated_at` timestamp on file updates
- Automatically set first registered user as admin

---

## 8. Grant Permissions

```sql
-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploaded_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_embeddings TO authenticated;
```

**Purpose**: Allow authenticated users to execute functions and perform CRUD operations

---

## Summary of Changes

| Change Type | Count | Description(brand new) |
| Modified Tables | 1 | `accounts` (existing table - adds role column) |
| **New Tables** | **2** | **`uploaded_files`, `file_embeddings` (DO NOT exist yet)** |
| New Functions | 4 | Role checking functions + triggers (all new) |
| New Indexes | 9 | Performance optimization (created with new tables) |
| RLS Policies | 8 | 4 per new table (SELECT, INSERT, UPDATE, DELETE) |
| Triggers | 2 | Auto-update timestamps + first user admin (new) |

**Before Migration**:
- ✅ `accounts` table exists
- ❌ `user_role` enum does NOT exist
- ❌ `uploaded_files` table does NOT exist
- ❌ `file_embeddings` table does NOT exist
- ❌ Role helper functions do NOT exist

**After Migration**:
- ✅ `accounts` table exists (with new `role` column)
- ✅ `user_role` enum exists
- ✅ `uploaded_files` table exists
- ✅ `file_embeddings` table exists
- ✅ Role helper functions exist
| RLS Policies | 8 | 4 per table (SELECT, INSERT, UPDATE, DELETE) |
| Triggers | 2 | Auto-update timestamps + first user admin |

---

## Migration Command

To apply all these changes, run:

```bash
cd apps/web
npx supabase db push
```

Or manually execute the migration file in Supabase Studio:
- File: `apps/web/supabase/migrations/20260111_add_roles_and_file_storage.sql`

---

## Post-Migration Tasks

1. **Set Initial Roles**: Assign admin role to appropriate users
   ```sql
   UPDATE public.accounts SET role = 'admin' WHERE email = 'admin@example.com';
   ```

2. **Verify RLS**: Test that users can only access their own files
   
3. **Test Permissions**: Log in as admin and operator to verify access control

4. **Migrate Data**: If you have existing IndexedDB data, migrate it to Supabase

---

## Rollback Plan

If you need to rollback these changes:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS on_first_user_set_admin ON public.accounts;
DROP TRIGGER IF EXISTS update_uploaded_files_updated_at ON public.uploaded_files;

-- Drop functions
DROP FUNCTION IF EXISTS kit.set_first_user_as_admin();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_operator();
DROP FUNCTION IF EXISTS public.is_admin();

-- Drop tables
DROP TABLE IF EXISTS public.file_embeddings;
DROP TABLE IF EXISTS public.uploaded_files;

-- Drop column from accounts
ALTER TABLE public.accounts DROP COLUMN IF EXISTS role;

-- Drop enum type
DROP TYPE IF EXISTS public.user_role;
```
