/**
 * Client-side vector store for semantic search.
 * Uses cosine similarity for retrieval without external dependencies.
 */

import { getItemsByIndex } from "../client-storage/indexed-db";
import type { StoredEmbedding } from "../client-storage/indexed-db";

export interface SearchResult {
  id: string;
  documentId: string;
  text: string;
  similarity: number;
  chunkIndex: number;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Vector store for local semantic search
 */
export class LocalVectorStore {
  /**
   * Search for similar embeddings using cosine similarity
   */
  async search(
    queryEmbedding: number[],
    userId: string,
    topK: number = 5,
    similarityThreshold: number = 0.5
  ): Promise<SearchResult[]> {
    // Get all embeddings for the user
    const embeddings = await getItemsByIndex<StoredEmbedding>(
      "embeddings",
      "userId",
      userId
    );

    console.log(`[VectorStore] Searching ${embeddings.length} embeddings for userId:`, userId);
    console.log(`[VectorStore] Using threshold: ${similarityThreshold}, topK: ${topK}`);

    if (embeddings.length === 0) {
      console.warn("[VectorStore] No embeddings found for this user!");
      return [];
    }

    // Calculate similarity for each embedding
    const results = embeddings.map((emb) => ({
      id: emb.id,
      documentId: emb.documentId,
      text: emb.text,
      chunkIndex: emb.chunkIndex,
      similarity: cosineSimilarity(queryEmbedding, emb.embedding),
    }));

    // Filter by threshold and sort by similarity (descending)
    const filtered = results
      .filter((r) => r.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity);

    console.log(`[VectorStore] After filtering (>=${similarityThreshold}): ${filtered.length} chunks`);
    if (filtered.length > 0) {
      console.log("[VectorStore] Similarity range:", 
        filtered[filtered.length - 1]?.similarity.toFixed(3), 
        "to", 
        filtered[0]?.similarity.toFixed(3)
      );
    } else if (results.length > 0) {
      const maxSimilarity = Math.max(...results.map(r => r.similarity));
      console.warn(`[VectorStore] All chunks below threshold! Max similarity: ${maxSimilarity.toFixed(3)}`);
      console.log("[VectorStore] Consider lowering threshold or checking document relevance");
    }

    // Return top K results
    return filtered.slice(0, topK);
  }

  /**
   * Search with multiple queries and merge results
   */
  async multiSearch(
    queryEmbeddings: number[][],
    userId: string,
    topK: number = 5,
    similarityThreshold: number = 0.5
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const seenIds = new Set<string>();

    for (const queryEmb of queryEmbeddings) {
      const results = await this.search(
        queryEmb,
        userId,
        topK,
        similarityThreshold
      );

      // Add unique results
      for (const result of results) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id);
          allResults.push(result);
        }
      }
    }

    // Sort by similarity and limit to topK
    return allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(userId: string): Promise<{
    totalEmbeddings: number;
    uniqueDocuments: number;
  }> {
    const embeddings = await getItemsByIndex<StoredEmbedding>(
      "embeddings",
      "userId",
      userId
    );

    const uniqueDocIds = new Set(embeddings.map((e) => e.documentId));

    return {
      totalEmbeddings: embeddings.length,
      uniqueDocuments: uniqueDocIds.size,
    };
  }

  /**
   * Get all embeddings for a specific document
   */
  async getDocumentEmbeddings(
    documentId: string
  ): Promise<StoredEmbedding[]> {
    return getItemsByIndex<StoredEmbedding>(
      "embeddings",
      "documentId",
      documentId
    );
  }
}

/**
 * Singleton instance
 */
let vectorStoreInstance: LocalVectorStore | null = null;

export function getVectorStore(): LocalVectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new LocalVectorStore();
  }
  return vectorStoreInstance;
}
