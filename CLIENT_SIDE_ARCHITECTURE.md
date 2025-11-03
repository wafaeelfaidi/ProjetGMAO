# Client-Side AI Agent Architecture

## Overview

This application has been transformed into a **fully client-side AI agent** system. All document processing, embeddings, and AI interactions happen directly in the browser with no backend dependencies (except for authentication).

## Key Features

✅ **100% Local Processing**: Documents, embeddings, and chat history stored in IndexedDB  
✅ **Privacy-First**: User's Cohere API key stored in-memory only, never persisted  
✅ **No Server Required**: All RAG operations run in the browser  
✅ **Autonomous Agent**: Intelligent maintenance assistant with reasoning capabilities  
✅ **MakerKit Compatible**: Preserves existing frontend structure and authentication  

## Architecture Components

### 1. Client Storage (`lib/client-storage/`)

**indexed-db.ts**: IndexedDB wrapper for local data persistence

**Object Stores**:
- `documents`: Stores uploaded files with metadata and text content
- `embeddings`: Stores text chunks with their vector embeddings (1024-dim)
- `chat_history`: Stores conversation history

**Key Functions**:
- `initDB()`: Initialize database and create object stores
- `addItem()`, `getItem()`, `updateItem()`, `deleteItem()`: CRUD operations
- `getItemsByIndex()`: Query by indexed fields (userId, documentId, timestamp)

### 2. Cohere Client (`lib/cohere/client.ts`)

**CohereClient Class**: Direct API integration for embeddings and chat

**Key Methods**:
- `embed(texts, options)`: Create embeddings using `embed-english-v3.0` (returns 1024-dim vectors)
- `chat(message, context, options)`: Generate responses using `command-r` model
- `validateKey()`: Test API key validity

**In-Memory Storage**:
- API key stored in closure variable only
- Never written to localStorage, cookies, or any persistent storage
- User must re-enter key on page refresh

### 3. Vector Store (`lib/vector-store/local-store.ts`)

**LocalVectorStore Class**: Pure JavaScript semantic search

**Key Methods**:
- `search(queryEmbedding, userId, topK, threshold)`: Find similar text chunks using cosine similarity
- `multiSearch()`: Search with multiple query embeddings and merge results
- `getStats()`: Get counts of embeddings and documents

**Algorithm**: Cosine similarity computed in-browser without external dependencies

### 4. Document Processing (`lib/document-processing/processor.ts`)

**processDocument Function**: Client-side text extraction and embedding

**Supported Formats** (currently):
- Plain text (`.txt`)
- Markdown (`.md`)
- JSON (`.json`)
- CSV (`.csv`)

**TODO**: Add PDF.js for PDF support, mammoth.js for DOCX

**Processing Pipeline**:
1. Extract text from file
2. Chunk text (1000 chars, 200 overlap)
3. Create embeddings via Cohere API (batch size: 96)
4. Store document and embeddings in IndexedDB

**Progress Tracking**: Real-time callbacks for UI updates

### 5. Autonomous Agent (`lib/agent/maintenance-agent.ts`)

**MaintenanceAgent Class**: Intelligent maintenance assistant

**Key Methods**:
- `processQuery(query)`: Answer questions with RAG
  - Creates query embedding
  - Searches local vector store
  - Generates answer with context using Cohere
  - Stores in chat history
- `getChatHistory()`: Retrieve conversation history
- `clearHistory()`: Delete all messages
- `getStats()`: Get usage statistics

**System Prompt**: Specialized for GMAO maintenance operations

**Configuration**:
- Temperature: 0.3 (factual, deterministic)
- Max tokens: 2000
- Top K: 5 (retrieve 5 most relevant chunks)
- Similarity threshold: 0.5 (minimum cosine similarity)

### 6. UI Components

#### ApiKeyManager (`components/api-key-manager.tsx`)
- Prompts user for Cohere API key
- Validates key with test request
- Shows privacy/security information
- No styling dependencies (uses Tailwind only)

#### Chatbot Page (`app/home/chatbot/page.tsx`)
- Settings panel to configure API key
- Chat interface with markdown rendering
- Shows document sources for each answer
- Auto-loads chat history on mount
- Displays warning if API key not set

#### Upload Page (`app/dataUpload/page.tsx`)
- Drag & drop file upload
- Real-time progress tracking (extracting → chunking → embedding → storing)
- Batch processing support
- Clear completed button
- Requires API key before processing

## Data Flow

```
User uploads document
    ↓
Extract text (browser)
    ↓
Chunk text (1000 chars)
    ↓
Create embeddings (Cohere API)
    ↓
Store in IndexedDB
    ↓
User asks question
    ↓
Create query embedding (Cohere API)
    ↓
Search local vector store (cosine similarity)
    ↓
Retrieve top K chunks
    ↓
Generate answer with context (Cohere API)
    ↓
Store in chat history
    ↓
Display to user
```

## Security & Privacy

### In-Memory API Key
```typescript
let cohereClient: CohereClient | null = null;

export function setCohereApiKey(apiKey: string): void {
  cohereClient = new CohereClient({ apiKey });
}
```
- Key stored in JavaScript closure
- Never persisted to disk
- Lost on page refresh
- Only used for direct Cohere API calls

### Local-Only Data
- All documents stored in IndexedDB (browser storage)
- Embeddings never sent to backend
- Chat history private to user
- No telemetry or analytics

### Supabase Auth Only
- Authentication still uses Supabase
- userId used to segregate local data
- No document data sent to Supabase

## Migration from Backend

### What Was Removed
- ❌ FastAPI backend (`apps/backend/`)
- ❌ Supabase document storage
- ❌ Supabase vector database
- ❌ Backend RAG pipeline
- ❌ Server-side embeddings

### What Was Preserved
- ✅ Supabase authentication
- ✅ MakerKit frontend structure
- ✅ User sessions and security
- ✅ All UI components and styling

### Breaking Changes
1. Documents no longer backed up to server
2. Data lost if browser storage cleared
3. No cross-device sync
4. User must provide own Cohere API key

## Usage

### 1. Setup Cohere API Key
```typescript
import { setCohereApiKey } from "~/lib/cohere/client";

setCohereApiKey("your-api-key");
```

### 2. Upload and Process Documents
```typescript
import { processDocument } from "~/lib/document-processing/processor";

const result = await processDocument(
  file,
  userId,
  (progress) => console.log(progress.message)
);
```

### 3. Query with Agent
```typescript
import { MaintenanceAgent } from "~/lib/agent/maintenance-agent";

const agent = new MaintenanceAgent(userId);
const response = await agent.processQuery("How do I maintain the compressor?");

console.log(response.message); // AI answer
console.log(response.sources); // Document IDs used
```

## Future Enhancements

### Document Management UI (Todo #9)
- Browse uploaded documents
- View document details and chunks
- Delete documents and their embeddings
- Search documents by name/content

### Advanced Features
- PDF support via PDF.js
- DOCX support via mammoth.js
- LanceDB WebAssembly for faster vector search
- Export/import functionality for backups
- Multi-language support
- Voice input/output

### Performance Optimizations
- Web Workers for embedding computation
- Streaming responses from Cohere
- IndexedDB caching and lazy loading
- Batch processing improvements

## Development

### Install Dependencies
```bash
pnpm install
```

### Run Development Server
```bash
pnpm dev
```

### Build for Production
```bash
pnpm build
```

### Test Workflow
1. Navigate to `/dataUpload`
2. Enter Cohere API key
3. Upload a text file
4. Wait for processing to complete
5. Navigate to `/home/chatbot`
6. Ask questions about your document

## Troubleshooting

### "Cohere API key not set"
- Click settings icon in chatbot
- Enter your API key from dashboard.cohere.com
- Key is validated automatically

### "Unsupported file type"
- Currently only TXT, MD, JSON, CSV supported
- PDF and DOCX support coming soon

### "Failed to create embeddings"
- Check Cohere API key is valid
- Check network connection
- Verify API usage limits not exceeded

### Data not persisting
- IndexedDB may be cleared by browser
- Check browser storage settings
- Consider export/import feature for backups

## API Reference

See individual component files for detailed TypeScript interfaces and JSDoc comments.

## License

Same as parent project.
