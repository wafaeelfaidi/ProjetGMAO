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
