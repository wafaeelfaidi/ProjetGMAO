/**
 * RAG (Retrieval Augmented Generation) Service
 * Provides document retrieval for AI-powered responses
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { embeddingService } from './embeddings/embedding.service';
import { SupabaseFileService } from './supabase-file.service';

export interface RagContext {
  query: string;
  retrievedChunks: Array<{
    fileName: string;
    chunkText: string;
    similarity: number;
    sourceInfo: any;
  }>;
  contextText: string;
  metadata: {
    documentCount: number;
    chunkCount: number;
    averageSimilarity: number;
  };
}

export interface RagOptions {
  maxChunks?: number;
  minSimilarity?: number;
  includeMetadata?: boolean;
}

/**
 * RAG Service for document-enhanced AI responses
 */
export class RagService {
  private fileService: SupabaseFileService;
  private initialized = false;

  constructor(private client: SupabaseClient) {
    this.fileService = new SupabaseFileService(client);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.fileService.initialize();
    embeddingService.setStorage(this.fileService);
    this.initialized = true;
  }

  /**
   * Get relevant context for a query
   */
  async getContext(
    query: string,
    options: RagOptions = {}
  ): Promise<RagContext> {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      maxChunks = 5,
      minSimilarity = 0.7,
      includeMetadata = true,
    } = options;

    try {
      // Get relevant chunks using vector search
      const retrievedChunks = await embeddingService.getRagContext(
        query,
        maxChunks,
        minSimilarity
      );

      // Build context text from chunks
      const contextText = this.buildContextText(retrievedChunks);

      // Calculate metadata
      const documentCount = new Set(retrievedChunks.map(c => c.fileName)).size;
      const avgSimilarity = retrievedChunks.length > 0
        ? retrievedChunks.reduce((sum, c) => sum + c.similarity, 0) / retrievedChunks.length
        : 0;

      return {
        query,
        retrievedChunks,
        contextText,
        metadata: {
          documentCount,
          chunkCount: retrievedChunks.length,
          averageSimilarity: avgSimilarity,
        },
      };
    } catch (error) {
      console.error('Failed to get RAG context:', error);
      throw new Error(`RAG context retrieval failed: ${error}`);
    }
  }

  /**
   * Generate a prompt with context for AI models
   */
  async buildPrompt(
    query: string,
    systemPrompt: string,
    options: RagOptions = {}
  ): Promise<string> {
    const context = await this.getContext(query, options);

    if (context.retrievedChunks.length === 0) {
      return `${systemPrompt}\n\nUser Question: ${query}\n\nNote: No relevant documents were found in the knowledge base.`;
    }

    const prompt = `${systemPrompt}

Context from Knowledge Base:
${context.contextText}

Sources: ${context.metadata.documentCount} document(s), ${context.metadata.chunkCount} chunk(s)
Average Relevance: ${(context.metadata.averageSimilarity * 100).toFixed(1)}%

User Question: ${query}

Instructions: Use the context above to answer the user's question. If the context doesn't contain relevant information, say so clearly.`;

    return prompt;
  }

  /**
   * Search documents with enhanced results
   */
  async searchDocuments(
    query: string,
    options: {
      fileId?: string;
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<Array<{
    fileId: string;
    fileName: string;
    chunkIndex: number;
    text: string;
    similarity: number;
  }>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const { fileId, topK = 5, threshold = 0.5 } = options;

    // Generate query embedding
    const queryVector = await embeddingService['model'].embedText(query);

    // Use Supabase vector search
    return this.fileService.vectorSearch(queryVector, {
      fileId,
      topK,
      threshold,
    });
  }

  /**
   * Get document statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    totalEmbeddings: number;
    documentsByType: Record<string, number>;
    processingStatus: Record<string, number>;
  }> {
    const { data, error } = await this.client.rpc('get_document_stats');

    if (error) {
      console.error('Error getting document stats:', error);
      return {
        totalDocuments: 0,
        totalEmbeddings: 0,
        documentsByType: {},
        processingStatus: {},
      };
    }

    const stats = data?.[0];
    return {
      totalDocuments: Number(stats?.total_documents || 0),
      totalEmbeddings: Number(stats?.total_embeddings || 0),
      documentsByType: stats?.documents_by_type || {},
      processingStatus: stats?.processing_status_counts || {},
    };
  }

  /**
   * Helper: Build context text from chunks
   */
  private buildContextText(chunks: Array<{
    fileName: string;
    chunkText: string;
    similarity: number;
    sourceInfo: any;
  }>): string {
    if (chunks.length === 0) return '';

    return chunks
      .map((chunk, index) => {
        const source = `[Source ${index + 1}: ${chunk.fileName}]`;
        const relevance = `(Relevance: ${(chunk.similarity * 100).toFixed(1)}%)`;
        return `${source} ${relevance}\n${chunk.chunkText}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Process a new document for RAG
   */
  async processDocument(
    file: File,
    onProgress?: (progress: {
      stage: string;
      progress: number;
      message: string;
    }) => void
  ): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Store file
    onProgress?.({
      stage: 'uploading',
      progress: 10,
      message: 'Uploading document...',
    });

    const fileId = await this.fileService.storeFile(file);

    // Process embeddings
    await embeddingService.processFile(fileId, onProgress);

    return fileId;
  }

  /**
   * Delete a document and its embeddings
   */
  async deleteDocument(fileId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    await this.fileService.deleteFile(fileId);
  }

  /**
   * List all documents
   */
  async listDocuments(): Promise<Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    uploadDate: string;
    isProcessed: boolean;
    hasEmbeddings: boolean;
  }>> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.fileService.listFiles();
  }
}

/**
 * Factory function to create RAG service with Supabase client
 */
export function createRagService(client: SupabaseClient): RagService {
  return new RagService(client);
}
