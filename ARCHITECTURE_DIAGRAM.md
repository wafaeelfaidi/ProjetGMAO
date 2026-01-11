# Architecture Diagram: RBAC & Supabase Migration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Interface                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Admin UI   │  │ Operator UI  │  │   Guest UI   │              │
│  │ (Full Access)│  │  (Limited)   │  │ (Login Only) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Middleware Layer                                │
│  ┌───────────────────────────────────────────────────────┐          │
│  │  Role-Based Access Control (RBAC)                     │          │
│  │  • Check user authentication                          │          │
│  │  • Fetch user role from database                      │          │
│  │  • Validate access to requested route                 │          │
│  │  • Redirect if unauthorized                           │          │
│  └───────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Application Routes                              │
│                                                                       │
│  Admin Routes (✓ Admin, ✗ Operator):                                │
│  • /home/DataManagement                                              │
│  • /home/AMDEC                                                       │
│  • /home/OT-creator                                                  │
│  • /home/breakdown-prediction                                        │
│                                                                       │
│  Operator Routes (✓ Admin, ✓ Operator):                             │
│  • /home                                                             │
│  • /home/csv-dashboard                                               │
│  • /home/chatbot                                                     │
│  • /home/maintenance                                                 │
│  • /home/settings                                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                            │
│  ┌──────────────────┐  ┌──────────────────┐                         │
│  │  Role Utilities  │  │  File Service    │                         │
│  │  • useUserRole() │  │  • Supabase      │                         │
│  │  • isAdmin()     │  │  • File ops      │                         │
│  │  • permissions   │  │  • Embeddings    │                         │
│  └──────────────────┘  └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Supabase Backend                                │
│                                                                       │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  Authentication (Supabase Auth)                     │            │
│  │  • User login/logout                                │            │
│  │  • Session management                               │            │
│  │  • JWT tokens                                       │            │
│  └─────────────────────────────────────────────────────┘            │
│                              │                                        │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  Database (PostgreSQL)                              │            │
│  │                                                      │            │
│  │  ┌──────────────────┐                               │            │
│  │  │  accounts         │                               │            │
│  │  │  • id (PK)        │                               │            │
│  │  │  • email          │                               │            │
│  │  │  • role ←────────┼─── NEW: 'admin' | 'operator'  │            │
│  │  │  • name           │                               │            │
│  │  └──────────────────┘                               │            │
│  │                                                      │            │
│  │  ┌──────────────────┐                               │            │
│  │  │  uploaded_files   │ ← NEW TABLE                  │            │
│  │  │  • id (PK)        │                               │            │
│  │  │  • user_id (FK)   │                               │            │
│  │  │  • account_id (FK)│                               │            │
│  │  │  • name           │                               │            │
│  │  │  • type           │                               │            │
│  │  │  • size           │                               │            │
│  │  │  • file_data      │                               │            │
│  │  │  • is_processed   │                               │            │
│  │  │  • has_embeddings │                               │            │
│  │  └──────────────────┘                               │            │
│  │            │                                          │            │
│  │            │ 1:N                                      │            │
│  │            ▼                                          │            │
│  │  ┌──────────────────┐                               │            │
│  │  │ file_embeddings  │ ← NEW TABLE                   │            │
│  │  │  • id (PK)        │                               │            │
│  │  │  • file_id (FK)   │                               │            │
│  │  │  • user_id (FK)   │                               │            │
│  │  │  • chunk_index    │                               │            │
│  │  │  • text           │                               │            │
│  │  │  • vector[]       │                               │            │
│  │  └──────────────────┘                               │            │
│  │                                                      │            │
│  │  Row Level Security (RLS):                          │            │
│  │  • Users see only their own data                    │            │
│  │  • Admins see all data                              │            │
│  │  • Operators can't access admin-only tables         │            │
│  └─────────────────────────────────────────────────────┘            │
│                                                                       │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  Helper Functions                                   │            │
│  │  • is_admin() → boolean                             │            │
│  │  • is_operator() → boolean                          │            │
│  │  • get_user_role() → 'admin' | 'operator'           │            │
│  └─────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: File Upload

```
User uploads file
      │
      ▼
┌──────────────────┐
│ FileUpload       │
│ Component        │
└──────────────────┘
      │
      ▼
┌──────────────────┐
│ useSupabaseFile  │
│ Service          │
└──────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ SupabaseFileService                  │
│ • Validates user authentication      │
│ • Converts file to ArrayBuffer       │
│ • Stores in uploaded_files table     │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ Supabase Database                    │
│ • RLS checks user permissions        │
│ • Inserts file record                │
│ • Returns file ID                    │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ Embedding Service (optional)         │
│ • Extracts text from file            │
│ • Chunks text                        │
│ • Generates embeddings               │
│ • Stores in file_embeddings table    │
└──────────────────────────────────────┘
```

## Permission Matrix

```
┌────────────────────────────┬────────┬──────────┐
│ Feature / Page             │ Admin  │ Operator │
├────────────────────────────┼────────┼──────────┤
│ Home                       │   ✓    │    ✓     │
│ Dashboard (CSV)            │   ✓    │    ✓     │
│ Chatbot                    │   ✓    │    ✓     │
│ Maintenance Planning       │   ✓    │    ✓     │
│ Settings                   │   ✓    │    ✓     │
├────────────────────────────┼────────┼──────────┤
│ Data Management            │   ✓    │    ✗     │
│ AMDEC                      │   ✓    │    ✗     │
│ Work Orders (OT Creator)   │   ✓    │    ✗     │
│ Breakdown Prediction       │   ✓    │    ✗     │
├────────────────────────────┼────────┼──────────┤
│ View Own Files             │   ✓    │    ✓     │
│ View All Files             │   ✓    │    ✗     │
│ Upload Files               │   ✓    │    ✓     │
│ Delete Own Files           │   ✓    │    ✓     │
│ Delete Other's Files       │   ✓    │    ✗     │
│ Manage Users (future)      │   ✓    │    ✗     │
└────────────────────────────┴────────┴──────────┘
```

## Before vs After Migration

### Before: IndexedDB Architecture
```
┌─────────────────────────────────┐
│      Browser Storage            │
│  ┌───────────────────────────┐  │
│  │  IndexedDB                │  │
│  │  • DataSectionDB          │  │
│  │    ├── files store        │  │
│  │    └── embeddings store   │  │
│  │                           │  │
│  │  Issues:                  │  │
│  │  • Local only             │  │
│  │  • No sync                │  │
│  │  • Single user            │  │
│  │  • Limited storage        │  │
│  │  • No backup              │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### After: Supabase Architecture
```
┌─────────────────────────────────────────┐
│      Supabase Cloud                     │
│  ┌───────────────────────────────────┐  │
│  │  PostgreSQL Database              │  │
│  │  • uploaded_files                 │  │
│  │  • file_embeddings                │  │
│  │  • accounts (with roles)          │  │
│  │                                   │  │
│  │  Benefits:                        │  │
│  │  ✓ Cloud storage                  │  │
│  │  ✓ Multi-user                     │  │
│  │  ✓ Automatic sync                 │  │
│  │  ✓ Unlimited storage              │  │
│  │  ✓ Automatic backups              │  │
│  │  ✓ Row Level Security             │  │
│  │  ✓ Role-based access              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Role Assignment Flow

```
New User Registers
      │
      ▼
┌──────────────────────────────┐
│ Supabase Auth                │
│ Creates auth.users record    │
└──────────────────────────────┘
      │
      ▼
┌──────────────────────────────┐
│ Trigger: on_auth_user_created│
│ Creates accounts record      │
│ Role = 'operator' (default)  │
└──────────────────────────────┘
      │
      ▼
┌──────────────────────────────┐
│ Trigger: set_first_user_admin│
│ If user_count = 1            │
│   → Set role = 'admin'       │
└──────────────────────────────┘
      │
      ▼
┌──────────────────────────────┐
│ User has role assigned       │
│ • First user = Admin         │
│ • Others = Operator          │
└──────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────┐
│ Layer 1: Middleware                     │
│ • Server-side route protection          │
│ • Redirects unauthorized access         │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ Layer 2: UI Filtering                   │
│ • Navigation filtered by role           │
│ • Admin-only buttons hidden             │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ Layer 3: Row Level Security (RLS)       │
│ • Database-level access control         │
│ • Users can only see their own data     │
│ • Admins can see all data               │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ Layer 4: Helper Functions               │
│ • Secure role checking                  │
│ • SECURITY DEFINER for safe execution   │
└─────────────────────────────────────────┘
```

This multi-layered approach ensures security at every level of the application!
