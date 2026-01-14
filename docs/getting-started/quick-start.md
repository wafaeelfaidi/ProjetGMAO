# Quick Start Guide

Get Project GMAO up and running in minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17 or later
- **pnpm** 8.0 or later
- **Python** 3.10 or later
- **Git**
- **Supabase** account

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/project-gmao.git
cd project-gmao
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies for the API
cd apps/api
python -m venv env
source env/bin/activate  # On Windows: .\env\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### 3. Configure Environment Variables

Create `.env.local` files:

```bash
# apps/web/.env.local
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Set Up Database

Run database migrations:

```bash
cd apps/web
npx supabase db push
```

Create the storage bucket (run in Supabase SQL Editor):

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;
```

### 5. Start Development Servers

```bash
# Start Next.js frontend
cd apps/web
pnpm dev

# In a new terminal, start Python API
cd apps/api
source env/bin/activate
uvicorn maintenance:app --reload
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## First Steps

### Create an Admin User

1. Sign up at http://localhost:3000/auth/sign-up
2. Check your email for verification
3. Update your role to admin in Supabase:

```sql
UPDATE public.accounts 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Configure Cohere API

1. Get a Cohere API key from https://cohere.com
2. Go to Data Management in the app
3. Configure your Cohere API key

### Upload and Process Documents

1. Navigate to Data Management
2. Upload PDF, DOCX, or TXT files
3. Click "Process" on each file
4. Wait for embeddings to be generated

### Use the Chatbot

1. Navigate to the Chatbot page
2. Ask questions about your uploaded documents
3. The AI will retrieve relevant context and generate answers

## Next Steps

- [Configure RAG Pipeline](../guides/rag-setup.md)
- [Set Up IoT Streaming](../features/iot-integration.md)
- [Deploy to Production](../deployment/production.md)

## Troubleshooting

### "Storage bucket 'documents' not found"

Run the bucket creation SQL in Step 4 above.

### "0 chunks found" in chatbot

Make sure you've processed your files in Data Management with the correct Cohere API key.

### Migration errors

Delete the `supabase_migrations` table entries and re-run migrations:

```sql
DELETE FROM supabase_migrations.schema_migrations;
```

For more help, see the [Troubleshooting Guide](../guides/troubleshooting.md).
