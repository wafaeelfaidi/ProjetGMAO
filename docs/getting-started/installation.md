# Installation Guide

Detailed installation instructions for Project GMAO.

## System Requirements

### Hardware

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **CPU**: Dual-core processor or better

### Software

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux
- **Node.js**: Version 18.17 or later
- **Python**: Version 3.10 or later
- **pnpm**: Version 8.0 or later
- **Git**: Latest version

## Step-by-Step Installation

### 1. Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/):

```bash
# Verify installation
node --version  # Should be 18.17+
npm --version
```

### 2. Install pnpm

```bash
npm install -g pnpm

# Verify installation
pnpm --version  # Should be 8.0+
```

### 3. Install Python

Download and install Python from [python.org](https://python.org/):

```bash
# Verify installation
python --version  # Should be 3.10+
pip --version
```

### 4. Clone Repository

```bash
git clone https://github.com/yourusername/project-gmao.git
cd project-gmao
```

### 5. Install Frontend Dependencies

```bash
pnpm install
```

This will install all Node.js dependencies for the monorepo.

### 6. Install Python Dependencies

```bash
cd apps/api
python -m venv env

# Activate virtual environment
# Windows:
.\env\Scripts\activate
# macOS/Linux:
source env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 7. Set Up Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

### 8. Configure Environment Variables

Create environment files:

```bash
# Frontend
cp apps/web/.env.example apps/web/.env.local

# Edit apps/web/.env.local with your values
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API (optional)
OPENAI_API_KEY=your-openai-key
COHERE_API_KEY=your-cohere-key
```

### 9. Run Database Migrations

```bash
cd apps/web
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### 10. Create Storage Bucket

Run in Supabase SQL Editor:

```sql
-- Create documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## Verification

Verify your installation:

```bash
# Frontend
cd apps/web
pnpm dev
# Should start on http://localhost:3000

# API
cd apps/api
source env/bin/activate  # or .\env\Scripts\activate on Windows
uvicorn maintenance:app --reload
# Should start on http://localhost:8000
```

## Common Issues

### pnpm not found

```bash
npm install -g pnpm
```

### Python virtual environment issues

```bash
# Windows
python -m venv env --clear
.\env\Scripts\activate

# macOS/Linux
python3 -m venv env
source env/bin/activate
```

### Supabase connection errors

- Verify your `.env.local` file has correct credentials
- Check Supabase project is active
- Ensure API keys are valid

## Next Steps

Continue to [Configuration](configuration.md) to set up your environment.
