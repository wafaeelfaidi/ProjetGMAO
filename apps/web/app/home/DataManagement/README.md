# Data Section - Document Upload & Embedding System

## Overview

A complete file upload, processing, and semantic search system built with:
- **IndexedDB** for client-side storage
- **Modular embedding interface** for easy model swapping
- **Text extraction** from PDF, TXT, DOCX files
- **Semantic search** using vector embeddings

## Features

### 1. File Management
- ✅ Upload multiple files (PDF, TXT, DOCX, CSV)
- ✅ Drag & drop interface
- ✅ File size validation (50MB default)
- ✅ File metadata storage
- ✅ Delete files with embeddings cleanup

### 2. Text Processing
- ✅ Text extraction from TXT (with encoding detection)
- ⚠️ PDF parsing (requires `pdfjs-dist` library)
- ⚠️ DOCX parsing (requires `mammoth` library)
- ✅ Text cleaning and normalization
- ✅ Chunking with overlap (500 words default)

### 3. Embedding System
- ✅ Modular `EmbedModel` interface
- ✅ Three implementations:
  - `SimpleEmbedModel` - TF-IDF-like (no dependencies)
  - `OpenAIEmbedModel` - OpenAI embeddings API
  - `CohereEmbedModel` - Cohere embeddings API
- ✅ Progress tracking during processing
- ✅ Batch embedding support

### 4. Semantic Search
- ✅ Query-based search across all files
- ✅ Filter by specific file
- ✅ Configurable top-K results
- ✅ Cosine similarity scoring

## Architecture

```
lib/data-section/
├── indexeddb.service.ts       # IndexedDB wrapper with file & embedding stores
├── parsers/
│   ├── txt.parser.ts          # TXT file parser (UTF-8/Latin-1)
│   ├── pdf.parser.ts          # PDF parser (placeholder for pdf.js)
│   ├── docx.parser.ts         # DOCX parser (placeholder for mammoth)
│   └── index.ts               # Main parser orchestrator
├── embeddings/
│   ├── embed-model.interface.ts  # EmbedModel interface + 3 implementations
│   ├── embedding.service.ts      # Orchestrates processing & search
│   └── index.ts
└── index.ts                   # Public API exports

app/home/data-section/
├── page.tsx                   # Main page with tabs (Files, Search, Database)
└── _components/
    ├── file-upload.tsx        # Drag & drop file upload
    ├── file-list.tsx          # File table with actions
    ├── processing-modal.tsx   # Progress modal during embedding
    └── search-panel.tsx       # Search interface with results
```

## Usage

### Basic File Upload & Processing

```tsx
import { indexedDBService, embeddingService } from '~/lib/data-section';

// Initialize database
await indexedDBService.initialize();

// Upload file
const arrayBuffer = await file.arrayBuffer();
await indexedDBService.storeFile({
  id: crypto.randomUUID(),
  fileName: file.name,
  fileType: file.type,
  fileSize: file.size,
  uploadedAt: new Date().toISOString(),
  data: arrayBuffer,
  metadata: {},
});

// Process file for embeddings
await embeddingService.processFile(fileId, (progress) => {
  console.log(`${progress.stage}: ${progress.progress}%`);
});
```

### Semantic Search

```tsx
// Search across all files
const results = await embeddingService.search('machine learning', undefined, 5);

// Search specific file
const results = await embeddingService.search('neural networks', fileId, 10);

// Results contain:
// - fileId: string
// - chunkIndex: number
// - text: string (chunk content)
// - similarity: number (0-1)
```

### Custom Embedding Model

```tsx
import { createEmbedModel, EmbeddingService } from '~/lib/data-section';

// Use OpenAI embeddings
const openAIModel = createEmbedModel('openai');
const service = new EmbeddingService({ modelType: 'openai' });

// Or create custom implementation
class MyCustomModel implements EmbedModel {
  getDimension() { return 768; }
  getModelName() { return 'custom-bert'; }
  
  async embedText(text: string): Promise<number[]> {
    // Your implementation
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embedText(t)));
  }
}
```

## Configuration

### Chunk Settings

```tsx
const service = new EmbeddingService({
  chunkSize: 500,    // Words per chunk
  overlap: 50,       // Overlapping words between chunks
  modelType: 'simple'
});
```

### File Size Limit

```tsx
<FileUpload 
  onFilesSelected={handleFiles}
  maxSizeMB={50}  // Default: 50MB
  accept=".pdf,.txt,.docx,.csv"
/>
```

## Adding External Libraries

### For PDF Support

```bash
pnpm add pdfjs-dist
```

Then update `lib/data-section/parsers/pdf.parser.ts` to use pdf.js (implementation commented in file).

### For DOCX Support

```bash
pnpm add mammoth
```

Then update `lib/data-section/parsers/docx.parser.ts` to use mammoth (implementation commented in file).

## IndexedDB Schema

### Files Store
```typescript
{
  id: string;              // UUID
  fileName: string;
  fileType: string;        // MIME type
  fileSize: number;        // Bytes
  uploadedAt: string;      // ISO date
  data: ArrayBuffer;       // File binary data
  metadata: {
    processed?: boolean;
    processedAt?: string;
    wordCount?: number;
    charCount?: number;
    [key: string]: any;
  };
}
```

### Embeddings Store
```typescript
{
  fileId: string;          // Reference to file
  chunkIndex: number;      // Chunk sequence number
  text: string;            // Chunk text content
  vector: number[];        // Embedding vector
  metadata: {
    modelName: string;
    dimension: number;
    createdAt: string;
  };
}
```

## API

### IndexedDB Service

- `initialize()` - Initialize database
- `storeFile(file)` - Store file with metadata
- `getFile(id)` - Retrieve file
- `listFiles()` - List all files (metadata only)
- `updateFileMetadata(id, updates)` - Update file metadata
- `deleteFile(id)` - Delete file and its embeddings
- `storeEmbeddings(embeddings[])` - Store embeddings batch
- `getEmbeddings(fileId?)` - Get all or filtered embeddings
- `clearAll()` - Clear entire database

### Embedding Service

- `processFile(fileId, onProgress?)` - Extract, chunk, embed, store
- `search(query, fileId?, topK?)` - Semantic search
- `setModel(modelType)` - Change embedding model
- `getModelInfo()` - Get current model details

## Current Limitations

1. **PDF Parsing**: Requires `pdfjs-dist` library (not included by default)
2. **DOCX Parsing**: Requires `mammoth` library (not included by default)
3. **CSV Files**: Not processed for embeddings (use CSV Dashboard instead)
4. **Embedding Models**: Default model is simple TF-IDF-like (use OpenAI/Cohere for production)
5. **Client-Side Only**: All processing happens in browser (can be slow for large files)

## Future Enhancements

- [ ] Add server-side parsing via API routes for better performance
- [ ] Implement persistent API key storage for OpenAI/Cohere
- [ ] Add file preview functionality
- [ ] Export/import embeddings
- [ ] Advanced search filters (date range, file type, etc.)
- [ ] Batch processing for multiple files
- [ ] Real-time processing status across tabs
- [ ] Integration with existing CSV Dashboard for CSV files

## Testing

1. Navigate to `/home/data-section`
2. Upload a TXT file
3. Click "Process" to generate embeddings
4. Go to "Search" tab
5. Enter a query to test semantic search
6. Check "Database" tab for statistics

## Notes

- All data stored locally in browser's IndexedDB
- No data sent to server (except when using OpenAI/Cohere APIs)
- Clear browser data will delete all uploaded files
- Embeddings are tied to files and deleted on file deletion
