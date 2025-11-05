/**
 * Document management utilities for viewing and managing stored documents
 */

import {
  getItemsByIndex,
  deleteItem,
  STORES,
  getAllItems,
} from "../client-storage/indexed-db";
import type { StoredDocument, StoredEmbedding } from "../client-storage/indexed-db";

export interface DocumentSummary {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: number;
  chunkCount: number;
  previewText: string;
  processed: boolean;
}

/**
 * Get all documents for a user with summaries
 */
export async function getUserDocuments(
  userId: string
): Promise<DocumentSummary[]> {
  const documents = await getItemsByIndex<StoredDocument>(
    STORES.DOCUMENTS,
    "userId",
    userId
  );

  const summaries = await Promise.all(
    documents.map(async (doc) => {
      const embeddings = await getItemsByIndex<StoredEmbedding>(
        STORES.EMBEDDINGS,
        "documentId",
        doc.id
      );

      return {
        id: doc.id,
        fileName: doc.fileName,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        chunkCount: embeddings.length,
        previewText: doc.textContent.slice(0, 200) + "...",
        processed: doc.processed ?? false,
      };
    })
  );

  // Sort by upload date (newest first)
  return summaries.sort((a, b) => b.uploadedAt - a.uploadedAt);
}

/**
 * Get full document details
 */
export async function getDocumentDetails(
  documentId: string
): Promise<{
  document: StoredDocument;
  chunks: StoredEmbedding[];
} | null> {
  const allDocs = await getAllItems<StoredDocument>(STORES.DOCUMENTS);
  const document = allDocs.find((doc) => doc.id === documentId);

  if (!document) {
    return null;
  }

  const chunks = await getItemsByIndex<StoredEmbedding>(
    STORES.EMBEDDINGS,
    "documentId",
    documentId
  );

  // Sort chunks by index
  chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

  return { document, chunks };
}

/**
 * Delete a document and all its embeddings
 */
export async function deleteDocument(documentId: string): Promise<void> {
  // Get all embeddings for this document
  const embeddings = await getItemsByIndex<StoredEmbedding>(
    STORES.EMBEDDINGS,
    "documentId",
    documentId
  );

  // Delete all embeddings
  await Promise.all(
    embeddings.map((emb) => deleteItem(STORES.EMBEDDINGS, emb.id))
  );

  // Delete the document
  await deleteItem(STORES.DOCUMENTS, documentId);
}

/**
 * Delete multiple documents
 */
export async function deleteDocuments(documentIds: string[]): Promise<void> {
  await Promise.all(documentIds.map((id) => deleteDocument(id)));
}

/**
 * Search documents by filename
 */
export async function searchDocuments(
  userId: string,
  searchTerm: string
): Promise<DocumentSummary[]> {
  const allDocs = await getUserDocuments(userId);
  const term = searchTerm.toLowerCase();

  return allDocs.filter((doc) =>
    doc.fileName.toLowerCase().includes(term)
  );
}

/**
 * Get storage statistics
 */
export async function getStorageStats(userId: string): Promise<{
  totalDocuments: number;
  totalChunks: number;
  totalSize: number;
  oldestDocument: number | null;
  newestDocument: number | null;
}> {
  const documents = await getItemsByIndex<StoredDocument>(
    STORES.DOCUMENTS,
    "userId",
    userId
  );

  const embeddings = await getItemsByIndex<StoredEmbedding>(
    STORES.EMBEDDINGS,
    "userId",
    userId
  );

  const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);
  const uploadDates = documents.map((doc) => doc.uploadedAt);

  return {
    totalDocuments: documents.length,
    totalChunks: embeddings.length,
    totalSize,
    oldestDocument: uploadDates.length > 0 ? Math.min(...uploadDates) : null,
    newestDocument: uploadDates.length > 0 ? Math.max(...uploadDates) : null,
  };
}

/**
 * Export document data as JSON (for backup)
 */
export async function exportDocument(
  documentId: string
): Promise<string> {
  const details = await getDocumentDetails(documentId);
  if (!details) {
    throw new Error("Document not found");
  }

  return JSON.stringify(details, null, 2);
}

/**
 * Export all user documents as JSON
 */
export async function exportAllDocuments(userId: string): Promise<string> {
  const documents = await getItemsByIndex<StoredDocument>(
    STORES.DOCUMENTS,
    "userId",
    userId
  );

  const allData = await Promise.all(
    documents.map((doc) => getDocumentDetails(doc.id))
  );

  return JSON.stringify(allData, null, 2);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}
