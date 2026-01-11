# RAG (Retrieval Augmented Generation) System

## Overview

This system provides a complete RAG implementation using Supabase and pgvector for document embeddings and semantic search.

## Features

### 1. Vector Database (Supabase + pgvector)
- **pgvector extension**: Efficient vector similarity search
- **768-dimensional embeddings**: Compatible with most embedding models
- **HNSW indexing**: Fast approximate nearest neighbor search
- **Row-level security**: User and admin-based access control

### 2. Document Processing by Type
Different document types are processed with optimized strategies:

- **PDF**: Structured chunking with larger chunks (750 words)
- **DOCX**: Paragraph-based chunking (500 words)
- **TXT**: Simple overlapping chunks (500 words)
- **Markdown**: Section-based chunking by headers
- **CSV**: Row-based chunking with header preservation
- **JSON**: Flattened structure to searchable text
- **XML/HTML**: Text extraction with tag removal

### 3. Semantic Search
- **Vector similarity**: pgvector cosine distance
- **Hybrid search**: Combines semantic and keyword matching
- **Filtered search**: By file, user, or custom criteria
- **Relevance scoring**: Similarity percentages

### 4. RAG Integration
- **Context retrieval**: Get relevant document chunks for queries
- **Prompt building**: Automatic context injection for AI models
- **Source tracking**: Track which documents provided context
- **Metadata**: Document counts, relevance scores

## Database Schema

### Tables

#### `uploaded_files`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- account_id: UUID (foreign key to accounts)
- name: VARCHAR(500)
- type: VARCHAR(100)
- size: BIGINT
- upload_date: TIMESTAMPTZ
- is_processed: BOOLEAN
- has_embeddings: BOOLEAN
- file_data: BYTEA
- document_type: VARCHAR(50) -- Auto-detected: pdf, docx, txt, etc.
- processing_status: VARCHAR(50) -- pending, processing, completed, failed
- processing_error: TEXT
- processed_at: TIMESTAMPTZ
- metadata: JSONB
```

#### `file_embeddings`
```sql
- id: UUID (primary key)
- file_id: UUID (foreign key to uploaded_files)
- user_id: UUID (foreign key to auth.users)
- account_id: UUID (foreign key to accounts)
- chunk_index: INTEGER
- text: TEXT
- embedding: vector(768) -- pgvector type
- created_at: TIMESTAMPTZ
- metadata: JSONB
```

### Functions

#### `search_documents(query_embedding, match_threshold, match_count, filter_file_id, filter_user_id)`
Semantic search using vector similarity.

**Parameters:**
- `query_embedding`: vector(768) - The query embedding
- `match_threshold`: FLOAT - Minimum similarity (0-1)
- `match_count`: INT - Max results to return
- `filter_file_id`: UUID - Optional file filter
- `filter_user_id`: UUID - Optional user filter

**Returns:**
```typescript
{
  id: UUID;
  file_id: UUID;
  file_name: TEXT;
  chunk_index: INT;
  content: TEXT;
  similarity: FLOAT;
  metadata: JSONB;
}[]
```

#### `get_rag_context(query_embedding, max_chunks, min_similarity)`
Get document chunks for RAG context.

**Parameters:**
- `query_embedding`: vector(768)
- `max_chunks`: INT (default: 5)
- `min_similarity`: FLOAT (default: 0.7)

**Returns:**
```typescript
{
  file_name: TEXT;
  chunk_text: TEXT;
  similarity: FLOAT;
  source_info: JSONB;
}[]
```

#### `hybrid_search_documents(query_text, query_embedding, ...)`
Combines semantic vector search with keyword matching.

## Usage

### 1. Basic Setup

```typescript
import { createRagService } from '~/lib/DataManagement';
import { getSupabaseBrowserClient } from '@kit/supabase/client';

const client = getSupabaseBrowserClient();
const ragService = createRagService(client);
await ragService.initialize();
```

### 2. Upload and Process Documents

```typescript
// Upload a document
const file = new File(['content'], 'document.pdf');
const fileId = await ragService.processDocument(
  file,
  (progress) => {
    console.log(`${progress.stage}: ${progress.progress}%`);
  }
);
```

### 3. Search Documents

```typescript
// Simple search
const results = await ragService.searchDocuments('maintenance procedures', {
  topK: 5,
  threshold: 0.7,
});

// Search within specific file
const results = await ragService.searchDocuments('safety guidelines', {
  fileId: 'file-uuid',
  topK: 3,
});
```

### 4. Get RAG Context

```typescript
// Get context for a query
const context = await ragService.getContext('How to maintain equipment?', {
  maxChunks: 5,
  minSimilarity: 0.7,
});

console.log('Retrieved chunks:', context.retrievedChunks);
console.log('Context text:', context.contextText);
console.log('Metadata:', context.metadata);
```

### 5. Build AI Prompts

```typescript
// Automatically build a prompt with context
const prompt = await ragService.buildPrompt(
  'What are the safety procedures?',
  'You are a maintenance assistant. Answer based on the provided documentation.',
  { maxChunks: 3, minSimilarity: 0.7 }
);

// Use prompt with AI model
const response = await openai.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
  model: 'gpt-4',
});
```

### 6. Document Statistics

```typescript
const stats = await ragService.getStats();
console.log('Total documents:', stats.totalDocuments);
console.log('Total embeddings:', stats.totalEmbeddings);
console.log('By type:', stats.documentsByType);
```

## Document Processing

### Automatic Type Detection

Documents are automatically categorized by file extension and MIME type:

```typescript
import { documentProcessor } from '~/lib/DataManagement';

const result = await documentProcessor.processDocument(
  fileBuffer,
  'manual.pdf',
  'application/pdf'
);

console.log('Document type:', result.documentType);
console.log('Chunks:', result.chunks);
console.log('Strategy:', result.metadata.processingStrategy);
```

### Custom Processing Configuration

```typescript
documentProcessor.updateConfig({
  chunkSize: 1000,
  overlap: 100,
  preserveFormatting: true,
  extractMetadata: true,
});
```

## Embedding Models

Configure different embedding models:

```typescript
import { embeddingService } from '~/lib/DataManagement';

// Use OpenAI embeddings
embeddingService.setModel('openai', 'your-api-key');

// Use Cohere embeddings
embeddingService.setModel('cohere', 'your-api-key');

// Use simple local embeddings (no API key needed)
embeddingService.setModel('simple');
```

## Security

### Row-Level Security (RLS)

- Users can only access their own documents
- Admins can access all documents
- RLS policies enforce access control at database level

### Functions

Helper functions for role-based access:
- `is_admin()`: Check if current user is admin
- `is_operator()`: Check if current user is operator
- `get_user_role()`: Get current user's role

## Performance

### Indexing

- **HNSW index** on embeddings for fast similarity search
- **GIN index** on text for keyword search
- **B-tree indexes** on foreign keys and common filters

### Optimization Tips

1. **Batch processing**: Upload multiple files in parallel
2. **Chunk size**: Adjust based on document type (default: 500 words)
3. **Similarity threshold**: Balance between precision and recall (default: 0.7)
4. **Max chunks**: Limit context size for better relevance (default: 5)

## Migration

To apply the vector database migration:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually in Supabase dashboard
# Run: apps/web/supabase/migrations/20260111_add_vector_embeddings.sql
```

## Example: Chatbot with RAG

```typescript
import { createRagService } from '~/lib/DataManagement';
import { getSupabaseBrowserClient } from '@kit/supabase/client';

async function chatWithRAG(userMessage: string) {
  const client = getSupabaseBrowserClient();
  const ragService = createRagService(client);
  await ragService.initialize();

  // Build prompt with context
  const prompt = await ragService.buildPrompt(
    userMessage,
    'You are a helpful assistant with access to maintenance documentation.',
    { maxChunks: 5, minSimilarity: 0.7 }
  );

  // Call your AI model
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  return data.message;
}
```

## Troubleshooting

### No results from search
- Check if documents are processed (has_embeddings = true)
- Lower the similarity threshold (try 0.5 instead of 0.7)
- Verify embedding model is initialized

### Slow search
- Ensure HNSW index is created on embeddings column
- Reduce topK value
- Consider using specific file filters

### Processing errors
- Check file size limits (increase if needed)
- Verify file type is supported
- Check processing_error column in uploaded_files table

## API Reference

See the source files for detailed API documentation:
- `rag.service.ts`: Main RAG service
- `document-processor.service.ts`: Document processing
- `embedding.service.ts`: Embedding generation
- `supabase-file.service.ts`: File and embedding storage
