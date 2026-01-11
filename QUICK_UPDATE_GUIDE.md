# Quick Guide: Updating Pages from IndexedDB to Supabase

This guide shows you how to update your existing pages to use Supabase instead of IndexedDB.

## 1. Update DataManagement Page

**File**: `apps/web/app/home/DataManagement/page.tsx`

### Changes Required:

**Before (IndexedDB)**:
```tsx
import { indexedDBService } from '~/lib/DataManagement/indexeddb.service';

// Initialize
await indexedDBService.initialize();

// List files
const files = await indexedDBService.listFiles();

// Store file
await indexedDBService.storeFile(file);

// Delete file
await indexedDBService.deleteFile(fileId);
```

**After (Supabase)**:
```tsx
'use client';

import { useSupabaseFileService } from '~/lib/DataManagement/use-supabase-file-service';

export default function DataManagementPage() {
  const fileService = useSupabaseFileService();
  
  // Initialize (no-op, but kept for compatibility)
  await fileService.initialize();
  
  // List files
  const files = await fileService.listFiles();
  
  // Store file
  await fileService.storeFile(file);
  
  // Delete file
  await fileService.deleteFile(fileId);
}
```

### Full Example:

```tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Database, FileText, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { EmbeddingProgress } from '~/lib/DataManagement/embeddings';
import { embeddingService } from '~/lib/DataManagement/embeddings';
import type { FileMetadata } from '~/lib/DataManagement/supabase-file.service';
import { useSupabaseFileService } from '~/lib/DataManagement/use-supabase-file-service';

import { FileList } from './_components/file-list';
import { FileUpload } from './_components/file-upload';
import { ModelConfig } from './_components/model-config';
import { ProcessingModal } from './_components/processing-modal';
import { SearchPanel } from './_components/search-panel';

export default function DataSectionPage() {
  const fileService = useSupabaseFileService();
  
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());
  const [processingFile, setProcessingFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [processingProgress, setProcessingProgress] =
    useState<EmbeddingProgress | null>(null);

  const [searchResults, setSearchResults] = useState<
    Array<{
      fileId: string;
      chunkIndex: number;
      text: string;
      similarity: number;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modelInfo, setModelInfo] = useState(embeddingService.getModelInfo());
  const [totalChunks, setTotalChunks] = useState(0);

  // Initialize on mount
  useEffect(() => {
    initializeDB();
  }, []);

  const initializeDB = async () => {
    try {
      await fileService.initialize();
      await loadFiles();
    } catch (error) {
      console.error('Failed to initialize:', error);
      alert('Failed to initialize. Please refresh the page.');
    }
  };

  const loadFiles = async () => {
    try {
      const fileList = await fileService.listFiles();
      setFiles(fileList);
      
      const chunkCount = await fileService.getEmbeddingsCount();
      setTotalChunks(chunkCount);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    for (const file of selectedFiles) {
      try {
        await fileService.storeFile(file);
        await loadFiles();
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        alert(`Failed to upload ${file.name}`);
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await fileService.deleteFile(fileId);
        await loadFiles();
      } catch (error) {
        console.error('Failed to delete file:', error);
        alert('Failed to delete file');
      }
    }
  };

  const handleProcessFile = useCallback(async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    setIsProcessing((prev) => new Set(prev).add(fileId));
    setProcessingFile({ id: fileId, name: file.name });

    try {
      // Update embedding service to use Supabase storage
      embeddingService.setStorage(fileService);
      
      await embeddingService.processFile(fileId, (progress) => {
        setProcessingProgress(progress);
      });

      await loadFiles();
      alert(`Successfully processed ${file.name}`);
    } catch (error) {
      console.error('Failed to process file:', error);
      alert(`Failed to process ${file.name}`);
    } finally {
      setIsProcessing((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      setProcessingFile(null);
      setProcessingProgress(null);
    }
  }, [files, fileService]);

  const handleSearch = async (query: string, fileId?: string) => {
    setIsSearching(true);
    try {
      embeddingService.setStorage(fileService);
      const results = await embeddingService.search(query, fileId, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* ... rest of your component */}
    </div>
  );
}
```

---

## 2. Update Chatbot Page

**File**: `apps/web/app/home/chatbot/page.tsx`

### Changes Required:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';

import { embeddingService } from '~/lib/DataManagement/embeddings';
import type { FileMetadata } from '~/lib/DataManagement/supabase-file.service';
import { useSupabaseFileService } from '~/lib/DataManagement/use-supabase-file-service';

import { ChatbotPanel } from './_components/chatbot-panel';

export default function ChatbotPage() {
  const fileService = useSupabaseFileService();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const fileList = await fileService.listFiles();
      setFiles(fileList);
      
      // Update embedding service to use Supabase
      embeddingService.setStorage(fileService);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <ChatbotPanel files={files} isLoading={isLoading} />
    </div>
  );
}
```

---

## 3. Update Embedding Service

**File**: `apps/web/lib/DataManagement/embeddings/embedding.service.ts`

### Add Storage Setter:

```typescript
export class EmbeddingService {
  private storage: any; // Can be IndexedDB or Supabase service
  
  constructor() {
    // Initialize with IndexedDB for backward compatibility
    this.storage = indexedDBService;
  }
  
  /**
   * Set the storage backend (IndexedDB or Supabase)
   */
  setStorage(storage: any) {
    this.storage = storage;
  }
  
  async processFile(fileId: string, onProgress?: ProgressCallback) {
    // Use this.storage instead of hardcoded indexedDBService
    const file = await this.storage.getFile(fileId);
    
    // ... rest of the code remains the same
    
    await this.storage.storeEmbeddings(embeddings);
    await this.storage.updateFileMetadata(fileId, {
      isProcessed: true,
      hasEmbeddings: true,
    });
  }
  
  async search(query: string, fileId?: string, topK: number = 5) {
    // Use this.storage
    const embeddings = fileId
      ? await this.storage.getEmbeddings(fileId)
      : await this.storage.getAllEmbeddings();
    
    // ... rest of the code
  }
}
```

---

## 4. Type Updates

Since the Supabase service uses the same interface as IndexedDB, most type definitions remain the same. However, update your imports:

**Before**:
```typescript
import type { FileMetadata } from '~/lib/DataManagement/indexeddb.service';
```

**After**:
```typescript
import type { FileMetadata } from '~/lib/DataManagement/supabase-file.service';
```

---

## 5. Common Patterns

### Pattern 1: Initialize and Load
```typescript
const fileService = useSupabaseFileService();

useEffect(() => {
  async function init() {
    await fileService.initialize(); // No-op for Supabase, but keeps API compatible
    const files = await fileService.listFiles();
    setFiles(files);
  }
  init();
}, [fileService]);
```

### Pattern 2: File Upload
```typescript
const handleUpload = async (file: File) => {
  try {
    const fileId = await fileService.storeFile(file);
    console.log('File uploaded:', fileId);
    await refreshFiles();
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Pattern 3: File Delete
```typescript
const handleDelete = async (fileId: string) => {
  if (!confirm('Delete this file?')) return;
  
  try {
    await fileService.deleteFile(fileId);
    await refreshFiles();
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
```

### Pattern 4: Search with Embeddings
```typescript
const handleSearch = async (query: string) => {
  try {
    // Make sure embedding service uses Supabase storage
    embeddingService.setStorage(fileService);
    
    const results = await embeddingService.search(query);
    setResults(results);
  } catch (error) {
    console.error('Search failed:', error);
  }
};
```

---

## 6. Testing Checklist

After updating your pages, test the following:

### ✅ File Operations
- [ ] Upload a file
- [ ] List all files
- [ ] View file details
- [ ] Delete a file

### ✅ Embeddings
- [ ] Process a file to generate embeddings
- [ ] Verify embeddings are stored
- [ ] Search with a query
- [ ] Verify search results

### ✅ Role-Based Access
- [ ] Test as admin (should see Data Management)
- [ ] Test as operator (should NOT see Data Management)

### ✅ Performance
- [ ] Files load quickly
- [ ] Search is responsive
- [ ] No console errors

---

## 7. Migration Script (Optional)

If you have existing data in IndexedDB, run this script once in the browser console:

```javascript
async function migrateToSupabase() {
  // Import the old and new services
  const { indexedDBService } = await import('~/lib/DataManagement/indexeddb.service');
  const { useSupabaseFileService } = await import('~/lib/DataManagement/use-supabase-file-service');
  const { useSupabase } = await import('@kit/supabase/hooks/use-supabase');
  const { SupabaseFileService } = await import('~/lib/DataManagement/supabase-file.service');
  
  const supabase = useSupabase();
  const fileService = new SupabaseFileService(supabase);
  
  console.log('Starting migration...');
  
  // Get all files from IndexedDB
  const files = await indexedDBService.listFiles();
  console.log(`Found ${files.length} files to migrate`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Migrating ${i + 1}/${files.length}: ${file.name}`);
    
    try {
      // Get file data
      const fileData = await indexedDBService.getFile(file.id);
      if (!fileData) continue;
      
      // Create File object
      const blob = new Blob([fileData.data], { type: fileData.type });
      const newFile = new File([blob], fileData.name, { type: fileData.type });
      
      // Store in Supabase
      const newFileId = await fileService.storeFile(newFile);
      
      // Migrate embeddings if they exist
      if (fileData.hasEmbeddings) {
        const embeddings = await indexedDBService.getEmbeddings(file.id);
        console.log(`  Migrating ${embeddings.length} embeddings...`);
        
        const embeddingsWithNewFileId = embeddings.map(emb => ({
          ...emb,
          fileId: newFileId,
        }));
        
        await fileService.storeEmbeddings(embeddingsWithNewFileId);
      }
      
      console.log(`  ✓ Migrated ${file.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate ${file.name}:`, error);
    }
  }
  
  console.log('Migration complete!');
  console.log('You can now clear IndexedDB data.');
}

// Run the migration
migrateToSupabase();
```

---

## 8. Troubleshooting

### Issue: "User not authenticated" error
**Solution**: Make sure the user is logged in before calling file service methods.

### Issue: RLS blocking access
**Solution**: Check that RLS policies are correctly set up in Supabase.

### Issue: Files not showing up
**Solution**: Verify that the user_id and account_id are correctly set when storing files.

### Issue: Large files failing to upload
**Solution**: Check Supabase file size limits and consider using Supabase Storage for very large files.

---

## Next Steps

1. Update DataManagement page
2. Update Chatbot page
3. Update Embedding Service
4. Test thoroughly
5. Migrate existing data (if any)
6. Remove IndexedDB service imports once migration is complete
