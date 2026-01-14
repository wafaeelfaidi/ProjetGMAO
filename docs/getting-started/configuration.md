# Configuration Guide

Configure Project GMAO for your specific needs.

## Environment Variables

### Frontend (apps/web/.env.local)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

### Python API (apps/api/.env)

```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Database (if not using Supabase)
DATABASE_URL=postgresql://user:password@localhost:5432/gmao

# ML Models
MODEL_PATH=./models
```

## Cohere API Configuration

For RAG chatbot functionality:

1. Sign up at [cohere.com](https://cohere.com)
2. Get your API key
3. In the app, navigate to Data Management
4. Click "Cohere Embedding Configuration"
5. Enter your API key
6. Click "Save Configuration"

Your API key is stored in browser localStorage.

## User Roles

Configure user roles in Supabase:

```sql
-- Make user admin
UPDATE public.accounts 
SET role = 'admin' 
WHERE email = 'user@example.com';

-- Make user operator
UPDATE public.accounts 
SET role = 'operator' 
WHERE email = 'user@example.com';
```

### Role Permissions

**Admin:**
- Full system access
- View all data
- Delegate tasks
- Manage users
- Configure settings

**Operator:**
- View assigned tasks
- Update task status
- View dashboard
- Use chatbot
- Limited access

## Database Configuration

### Connection Pooling

For production, configure connection pooling in Supabase:

1. Go to Database Settings
2. Enable connection pooling
3. Use pooled connection string in production

### RLS Policies

Review and customize Row Level Security policies:

```sql
-- Example: Custom policy for specific use case
CREATE POLICY custom_policy ON public.uploaded_files
FOR SELECT
TO authenticated
USING (
  is_public = true OR 
  user_id = auth.uid()
);
```

## Storage Configuration

### File Size Limits

Adjust in Supabase dashboard or SQL:

```sql
UPDATE storage.buckets 
SET file_size_limit = 104857600  -- 100MB
WHERE name = 'documents';
```

### Allowed MIME Types

```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown'
]
WHERE name = 'documents';
```

## ML Model Configuration

### Model Training

Configure in `apps/api/maintenance.py`:

```python
# Model parameters
RANDOM_STATE = 42
TEST_SIZE = 0.2
N_ESTIMATORS = 100
```

### Prediction Thresholds

```python
# Failure probability threshold
FAILURE_THRESHOLD = 0.7

# Confidence threshold
CONFIDENCE_THRESHOLD = 0.6
```

## Embedding Configuration

### Model Selection

Available models in Data Management:

- **Simple** - No API key required, basic embeddings
- **Cohere** - Recommended, 1024D vectors
- **OpenAI** - text-embedding-3-small, 1536D
- **Mistral** - 1024D vectors
- **Gemini** - 768D vectors

### Vector Dimensions

All embeddings are stored as 1536D vectors (zero-padded for smaller models).

## Next.js Configuration

### Custom Domain

In `next.config.mjs`:

```javascript
const config = {
  // ... other config
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};
```

### Build Optimization

```javascript
const config = {
  experimental: {
    optimizePackageImports: ['@kit/ui'],
  },
  transpilePackages: ['@kit/ui', '@kit/shared'],
};
```

## Advanced Configuration

### Custom Themes

Modify `tailwind.config.ts`:

```typescript
const config = {
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',  // Orange
        secondary: '#000000', // Black
      },
    },
  },
};
```

### API Rate Limiting

Configure in Python API:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/predict")
@limiter.limit("10/minute")
async def predict():
    # ...
```

## Monitoring & Logging

### Application Logs

Configure in `apps/web`:

```typescript
// lib/logger.ts
export const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};
```

### Database Logs

Enable in Supabase Dashboard:
1. Go to Project Settings
2. Enable Database Logs
3. Configure log retention

## Next Steps

- [Development Setup](../development/setup.md)
- [Deployment Guide](../deployment/production.md)
