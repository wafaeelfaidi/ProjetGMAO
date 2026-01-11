# RAG System Quick Start Guide

## Step 1: Apply Database Migration

Run the migration to create the vector database:

```bash
cd apps/web
supabase db push
```

Or manually run this SQL in Supabase Dashboard:
- File: `apps/web/supabase/migrations/20260111_add_vector_embeddings.sql`

## Step 2: Verify pgvector Extension

Check if pgvector is enabled in Supabase Dashboard > Database > Extensions.

If not enabled, run:
```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
```

## Step 3: Upload Your First Document

Navigate to: `http://localhost:3000/home/DataManagement`

1. Click **Files** tab
2. Click **Browse** or drag & drop a file
3. Supported formats: PDF, DOCX, TXT, MD, CSV, JSON, XML, HTML
4. Click **Process** on the uploaded file
5. Wait for processing to complete

## Step 4: Search Documents

1. Click **Search** tab
2. Enter a search query (e.g., "maintenance procedure")
3. Adjust settings:
   - **File**: Search all or specific file
   - **Results**: Number of results (1-20)
4. Click **Search**
5. View results with relevance scores

## Step 5: Use RAG in Code

### Basic Setup
```typescript
import { createRagService } from '~/lib/DataManagement';
import { getSupabaseBrowserClient } from '@kit/supabase/client';

const client = getSupabaseBrowserClient();
const ragService = createRagService(client);
await ragService.initialize();
```

### Get Context for a Query
```typescript
const context = await ragService.getContext(
  'How to maintain the equipment?',
  {
    maxChunks: 5,
    minSimilarity: 0.7,
  }
);

console.log('Context:', context.contextText);
console.log('Sources:', context.retrievedChunks.length);
```

### Build AI Prompt
```typescript
const prompt = await ragService.buildPrompt(
  'What are the safety procedures?',
  'You are a maintenance assistant.',
  { maxChunks: 3 }
);

// Use with OpenAI or other AI model
const response = await openai.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
  model: 'gpt-4',
});
```

### Search Documents
```typescript
const results = await ragService.searchDocuments('safety', {
  topK: 5,
  threshold: 0.6,
});

results.forEach(r => {
  console.log(`${r.fileName}: ${r.similarity}%`);
  console.log(r.text);
});
```

## Step 6: Configure Embedding Model

In the UI:
1. Go to **Database** tab
2. Select embedding model:
   - **Simple**: Local, no API key needed
   - **OpenAI**: Requires OpenAI API key
   - **Cohere**: Requires Cohere API key
   - **Mistral**: Requires Mistral API key
   - **Gemini**: Requires Google API key
3. Enter API key if required
4. Save changes

In code:
```typescript
import { embeddingService } from '~/lib/DataManagement';

// Use OpenAI
embeddingService.setModel('openai', 'sk-...');

// Use local model (no key)
embeddingService.setModel('simple');
```

## Step 7: Integrate with Chatbot

Example chatbot integration:

```typescript
// In your chatbot page/component
import { createRagService } from '~/lib/DataManagement';
import { getSupabaseBrowserClient } from '@kit/supabase/client';

async function handleChatMessage(userMessage: string) {
  const client = getSupabaseBrowserClient();
  const ragService = createRagService(client);
  await ragService.initialize();

  // Get relevant context
  const context = await ragService.getContext(userMessage, {
    maxChunks: 3,
    minSimilarity: 0.6,
  });

  // Build prompt with context
  const prompt = `Context from documentation:
${context.contextText}

User question: ${userMessage}

Answer based on the context above.`;

  // Send to AI model
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  return response.json();
}
```

## Common Use Cases

### 1. Maintenance Documentation Search
```typescript
const results = await ragService.searchDocuments(
  'preventive maintenance schedule',
  { topK: 5 }
);
```

### 2. Safety Procedure Lookup
```typescript
const context = await ragService.getContext(
  'emergency shutdown procedure',
  { maxChunks: 3, minSimilarity: 0.7 }
);
```

### 3. Equipment Manual Search
```typescript
const results = await ragService.searchDocuments(
  'calibration instructions',
  { fileId: 'equipment-manual-uuid', topK: 3 }
);
```

### 4. Troubleshooting Assistant
```typescript
const prompt = await ragService.buildPrompt(
  'Machine is overheating, what should I do?',
  'You are a troubleshooting assistant. Use the maintenance documentation to help.',
  { maxChunks: 5 }
);
```

## Tips & Best Practices

### Document Upload
- ✅ Use descriptive filenames
- ✅ Upload related documents together
- ✅ Process documents immediately after upload
- ✅ Verify processing completed successfully

### Search
- ✅ Use natural language queries
- ✅ Be specific in your questions
- ✅ Adjust similarity threshold based on results
- ✅ Start with broader search, then narrow down

### RAG Context
- ✅ Use 3-5 chunks for most use cases
- ✅ Higher similarity threshold (0.7+) for precise answers
- ✅ Lower threshold (0.5-0.6) for exploratory searches
- ✅ Include source information for citations

### Performance
- ✅ Process documents during off-peak hours
- ✅ Use file filters when searching specific topics
- ✅ Keep chunk size reasonable (500-1000 words)
- ✅ Clean up old/unused documents regularly

## Troubleshooting

### "No results found"
- Lower similarity threshold (try 0.5)
- Check if documents are processed (has_embeddings = true)
- Verify embedding model is initialized
- Try different search terms

### "Processing failed"
- Check file size (may need to increase limits)
- Verify file type is supported
- Check browser console for errors
- Review processing_error in database

### "Slow search"
- Ensure HNSW index exists on embeddings
- Use file filters to narrow search
- Reduce topK value
- Check database performance

### "Permission denied"
- Verify user is authenticated
- Check RLS policies
- Ensure user has access to file
- Try as admin user

## Next Steps

1. ✅ Upload your documentation
2. ✅ Test search functionality
3. ✅ Integrate with chatbot
4. ✅ Configure embedding model
5. ✅ Train team on usage
6. ✅ Monitor performance
7. ✅ Gather user feedback

## Resources

- **Full Documentation**: `apps/web/lib/DataManagement/RAG_DOCUMENTATION.md`
- **Implementation Summary**: `RAG_IMPLEMENTATION_SUMMARY.md`
- **Database Schema**: `apps/web/supabase/migrations/20260111_add_vector_embeddings.sql`
- **Code Examples**: See `/lib/DataManagement/rag.service.ts`

## Support

For help:
1. Check documentation files
2. Review browser console logs
3. Check Supabase logs
4. Inspect database tables directly

---

**Ready to use!** Start uploading documents and searching. 🚀
