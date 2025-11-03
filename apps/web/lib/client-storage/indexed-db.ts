/**
 * IndexedDB wrapper for client-side storage of documents, embeddings, and chat history.
 * All data remains on the client - never sent to backend.
 */

const DB_NAME = "gmao_client_db";
const DB_VERSION = 1;

// Store names
export const STORES = {
  DOCUMENTS: "documents",
  EMBEDDINGS: "embeddings",
  CHAT_HISTORY: "chat_history",
} as const;

export interface StoredDocument {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
  textContent: string;
  userId: string;
  processed: boolean; // Whether embeddings have been created
  fileData?: ArrayBuffer; // Store raw file data for later processing
}

export interface StoredEmbedding {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  userId: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  documentIds?: string[]; // IDs of documents referenced in this message
}

/**
 * Initialize IndexedDB with required object stores
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Documents store
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: "id" });
        docStore.createIndex("userId", "userId", { unique: false });
        docStore.createIndex("uploadedAt", "uploadedAt", { unique: false });
      }

      // Embeddings store
      if (!db.objectStoreNames.contains(STORES.EMBEDDINGS)) {
        const embStore = db.createObjectStore(STORES.EMBEDDINGS, { keyPath: "id" });
        embStore.createIndex("documentId", "documentId", { unique: false });
        embStore.createIndex("userId", "userId", { unique: false });
      }

      // Chat history store
      if (!db.objectStoreNames.contains(STORES.CHAT_HISTORY)) {
        const chatStore = db.createObjectStore(STORES.CHAT_HISTORY, { keyPath: "id" });
        chatStore.createIndex("userId", "userId", { unique: false });
        chatStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

/**
 * Generic add operation
 */
export async function addItem<T>(storeName: string, item: T): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic get operation
 */
export async function getItem<T>(storeName: string, id: string): Promise<T | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all items from a store
 */
export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get items by index
 */
export async function getItemsByIndex<T>(
  storeName: string,
  indexName: string,
  value: string
): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete item
 */
export async function deleteItem(storeName: string, id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update item
 */
export async function updateItem<T>(storeName: string, item: T): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all data from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Helper class for common storage operations
 */
export class ClientStorage {
  async getDocuments(): Promise<StoredDocument[]> {
    return getAllItems<StoredDocument>(STORES.DOCUMENTS);
  }

  async getDocument(id: string): Promise<StoredDocument | null> {
    return getItem<StoredDocument>(STORES.DOCUMENTS, id);
  }

  async getUserDocuments(userId: string): Promise<StoredDocument[]> {
    return getItemsByIndex<StoredDocument>(STORES.DOCUMENTS, "userId", userId);
  }

  async getUnprocessedDocuments(userId: string): Promise<StoredDocument[]> {
    const allDocs = await this.getUserDocuments(userId);
    return allDocs.filter(doc => !doc.processed);
  }

  async getProcessedDocuments(userId: string): Promise<StoredDocument[]> {
    const allDocs = await this.getUserDocuments(userId);
    return allDocs.filter(doc => doc.processed);
  }

  async addDocument(doc: StoredDocument): Promise<void> {
    return addItem(STORES.DOCUMENTS, doc);
  }

  async updateDocument(doc: StoredDocument): Promise<void> {
    return updateItem(STORES.DOCUMENTS, doc);
  }

  async deleteDocument(id: string): Promise<void> {
    return deleteItem(STORES.DOCUMENTS, id);
  }

  async getEmbeddings(): Promise<StoredEmbedding[]> {
    return getAllItems<StoredEmbedding>(STORES.EMBEDDINGS);
  }

  async getDocumentEmbeddings(documentId: string): Promise<StoredEmbedding[]> {
    return getItemsByIndex<StoredEmbedding>(STORES.EMBEDDINGS, "documentId", documentId);
  }

  async addEmbedding(embedding: StoredEmbedding): Promise<void> {
    return addItem(STORES.EMBEDDINGS, embedding);
  }

  async deleteEmbedding(id: string): Promise<void> {
    return deleteItem(STORES.EMBEDDINGS, id);
  }

  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    const messages = await getItemsByIndex<ChatMessage>(STORES.CHAT_HISTORY, "userId", userId);
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  }

  async addChatMessage(message: ChatMessage): Promise<void> {
    return addItem(STORES.CHAT_HISTORY, message);
  }
}
