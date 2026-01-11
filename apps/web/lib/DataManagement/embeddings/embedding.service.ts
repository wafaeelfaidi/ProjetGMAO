/**
 * Embedding Service
 * Orchestrates the embedding process for uploaded files
 */

import type { Embedding } from '../indexeddb.service';
import { indexedDBService } from '../indexeddb.service';
import { chunkText, cleanText, extractText } from '../parsers';
import type { EmbedModel } from './embed-model.interface';
import { createEmbedModel } from './embed-model.interface';

export interface EmbeddingConfig {
  chunkSize?: number;
  overlap?: number;
  modelType?: 'simple' | 'openai' | 'cohere' | 'mistral' | 'gemini';
  apiKey?: string;
}

export interface EmbeddingProgress {
  stage: 'extracting' | 'chunking' | 'embedding' | 'storing' | 'complete';
  progress: number; // 0-100
  message: string;
}

export type ProgressCallback = (progress: EmbeddingProgress) => void;

/**
 * Main embedding service class
 */
export class EmbeddingService {
  private model: EmbedModel;
  private config: Required<EmbeddingConfig>;
  private storage: any; // Can be IndexedDB or Supabase service

  private apiKey?: string;

  constructor(config: EmbeddingConfig = {}) {
    this.config = {
      chunkSize: config.chunkSize || 500,
      overlap: config.overlap || 50,
      modelType: config.modelType || 'simple',
      apiKey: config.apiKey ?? '',
    };
    this.apiKey = config.apiKey;
    this.model = createEmbedModel(this.config.modelType, this.apiKey);
    // Initialize with IndexedDB for backward compatibility
    this.storage = indexedDBService;
  }

  /**
   * Process a file and generate embeddings
   */
  async processFile(
    fileId: string,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    try {
      // Stage 1: Extract text from file
      onProgress?.({
        stage: 'extracting',
        progress: 10,
        message: 'Extracting text from file...',
      });

      const file = await this.storage.getFile(fileId);
      if (!file) {
        throw new Error('File not found');
      }

      // Skip CSV files
      if (file.type.includes('csv')) {
        throw new Error('CSV files are not processed for embeddings');
      }

      const parseResult = await extractText(
        file.data,
        file.type,
        file.name,
      );

      // Update file metadata with text stats
      await this.storage.updateFileMetadata(fileId, {
        isProcessed: true,
        hasEmbeddings: false,
      });

      // Stage 2: Clean and chunk text
      onProgress?.({
        stage: 'chunking',
        progress: 30,
        message: 'Splitting text into chunks...',
      });

      const cleanedText = cleanText(parseResult.text);
      const chunks = chunkText(
        cleanedText,
        this.config.chunkSize,
        this.config.overlap,
      );

      // Stage 3: Generate embeddings
      onProgress?.({
        stage: 'embedding',
        progress: 50,
        message: `Generating embeddings for ${chunks.length} chunks...`,
      });

      const embeddings: Embedding[] = [];
      const batchSize = 10; // Process in batches to show progress

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const vectors = await this.model.embedBatch(batch);

        vectors.forEach((vector, idx) => {
          embeddings.push({
            id: crypto.randomUUID(),
            fileId,
            chunkIndex: i + idx,
            text: batch[idx] || '',
            vector,
            createdAt: Date.now(),
          });
        });

        const progress =
          50 + ((i + batch.length) / chunks.length) * 40; // 50-90%
        onProgress?.({
          stage: 'embedding',
          progress,
          message: `Generated ${i + batch.length}/${chunks.length} embeddings...`,
        });
      }

      // Stage 4: Store embeddings
      onProgress?.({
        stage: 'storing',
        progress: 95,
        message: 'Storing embeddings...',
      });

      await this.storage.storeEmbeddings(embeddings);

      // Complete
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Successfully processed ${chunks.length} chunks`,
      });
    } catch (error) {
      throw new Error(`Failed to process file: ${error}`);
    }
  }

  /**
   * Set the storage backend (IndexedDB or Supabase)
   */
  setStorage(storage: any): void {
    this.storage = storage;
  }

  /**
   * Change the embedding model
   */
  setModel(modelType: 'simple' | 'openai' | 'cohere' | 'mistral' | 'gemini', apiKey?: string): void {
    this.config.modelType = modelType;
    if (apiKey) {
      this.apiKey = apiKey;
      this.config.apiKey = apiKey;
    }
    this.model = createEmbedModel(modelType, this.apiKey);
  }

  /**
   * Get current model info
   */
  getModelInfo() {
    return {
      name: this.model.getModelName(),
      dimension: this.model.getDimension(),
      type: this.config.modelType,
    };
  }

  /**
   * Search for similar text chunks using cosine similarity
   */
  async search(
    query: string,
    fileId?: string,
    topK: number = 5,
  ): Promise<
    Array<{
      fileId: string;
      chunkIndex: number;
      text: string;
      similarity: number;
    }>
  > {
    try {
      // Generate query embedding
      const queryVector = await this.model.embedText(query);

      // Get embeddings for specific file or all files
      let embeddings: Embedding[] = [];
      
      if (fileId) {
        embeddings = await this.storage.getEmbeddings(fileId);
      } else {
        // Get all files and their embeddings
        const files = await this.storage.listFiles();
        for (const file of files) {
          const fileEmbeddings = await this.storage.getEmbeddings(file.id);
          embeddings.push(...fileEmbeddings);
        }
      }

      // Calculate cosine similarity for each embedding
      const results = embeddings.map((embedding: Embedding) => ({
        fileId: embedding.fileId,
        chunkIndex: embedding.chunkIndex,
        text: embedding.text,
        similarity: this.cosineSimilarity(queryVector, embedding.vector),
      }));

      // Sort by similarity and return top K
      return results
        .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)
        .slice(0, topK);
    } catch (error) {
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (aVal !== undefined && bVal !== undefined) {
        dotProduct += aVal * bVal;
        normA += aVal * aVal;
        normB += bVal * bVal;
      }
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

/**
 * Singleton instance
 */
export const embeddingService = new EmbeddingService();
