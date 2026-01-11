/**
 * Main export for data-section library
 */

// IndexedDB service
export { indexedDBService } from './indexeddb.service';
export type {
  Embedding,
  FileMetadata,
  StoredFile,
} from './indexeddb.service';

// Supabase service
export { SupabaseFileService } from './supabase-file.service';
export { useSupabaseFileService } from './use-supabase-file-service';

// RAG service
export { createRagService, RagService } from './rag.service';
export type { RagContext, RagOptions } from './rag.service';

// Document processor
export { documentProcessor, DocumentProcessor } from './processors/document-processor.service';
export type { 
  DocumentType, 
  ProcessingConfig, 
  ProcessedDocument 
} from './processors/document-processor.service';

// Parsers
export {
  chunkText,
  cleanText,
  extractText,
  type ParseResult,
  type SupportedFileType,
} from './parsers';

// Embeddings
export {
  createEmbedModel,
  embeddingService,
  EmbeddingService,
  type EmbedModel,
  type EmbeddingConfig,
  type EmbeddingProgress,
  type ProgressCallback,
} from './embeddings';

