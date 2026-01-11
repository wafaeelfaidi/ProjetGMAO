/**
 * IndexedDB Service for File and Embedding Storage
 * 
 * Stores:
 * - Files (binary data + metadata)
 * - Embeddings (vectors linked to file IDs)
 * 
 * Database: 'DataSectionDB'
 * Stores: 'files', 'embeddings'
 */

const DB_NAME = 'DataSectionDB';
const DB_VERSION = 1;

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: number;
  isProcessed: boolean;
  hasEmbeddings: boolean;
}

export interface StoredFile extends FileMetadata {
  data: ArrayBuffer;
}

export interface Embedding {
  id: string;
  fileId: string;
  chunkIndex: number;
  text: string;
  vector: number[];
  createdAt: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create files store
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('uploadDate', 'uploadDate', { unique: false });
          fileStore.createIndex('type', 'type', { unique: false });
          fileStore.createIndex('name', 'name', { unique: false });
        }

        // Create embeddings store
        if (!db.objectStoreNames.contains('embeddings')) {
          const embeddingStore = db.createObjectStore('embeddings', {
            keyPath: 'id',
          });
          embeddingStore.createIndex('fileId', 'fileId', { unique: false });
        }
      };
    });
  }

  /**
   * Store a file with metadata
   */
  async storeFile(file: File | StoredFile): Promise<string> {
    if (!this.db) await this.initialize();

    let storedFile: StoredFile;

    // If it's already a StoredFile, use it directly
    if ('data' in file && file.data instanceof ArrayBuffer) {
      storedFile = file as StoredFile;
    } else {
      // Otherwise, it's a browser File object
      const browserFile = file as File;
      const id = crypto.randomUUID();
      const arrayBuffer = await browserFile.arrayBuffer();

      storedFile = {
        id,
        name: browserFile.name,
        type: browserFile.type,
        size: browserFile.size,
        uploadDate: Date.now(),
        isProcessed: false,
        hasEmbeddings: false,
        data: arrayBuffer,
      };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.add(storedFile);

      request.onsuccess = () => resolve(storedFile.id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all files (metadata only, without binary data)
   */
  async listFiles(): Promise<FileMetadata[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.getAll();

      request.onsuccess = () => {
        const files = request.result.map(
          (file: StoredFile): FileMetadata => ({
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadDate: file.uploadDate,
            isProcessed: file.isProcessed,
            hasEmbeddings: file.hasEmbeddings,
          }),
        );
        resolve(files);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a specific file with its binary data
   */
  async getFile(id: string): Promise<StoredFile | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update file metadata (mark as processed)
   */
  async updateFileMetadata(
    id: string,
    updates: Partial<FileMetadata>,
  ): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const file = getRequest.result;
        if (!file) {
          reject(new Error('File not found'));
          return;
        }

        const updatedFile = { ...file, ...updates };
        const putRequest = store.put(updatedFile);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Delete a file and its embeddings
   */
  async deleteFile(id: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['files', 'embeddings'],
        'readwrite',
      );
      const fileStore = transaction.objectStore('files');
      const embeddingStore = transaction.objectStore('embeddings');

      // Delete file
      const deleteFileRequest = fileStore.delete(id);

      // Delete associated embeddings
      const embeddingIndex = embeddingStore.index('fileId');
      const embeddingRequest = embeddingIndex.openCursor(
        IDBKeyRange.only(id),
      );

      embeddingRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Store embeddings for a file
   */
  async storeEmbeddings(embeddings: Embedding[]): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['embeddings'], 'readwrite');
      const store = transaction.objectStore('embeddings');

      for (const embedding of embeddings) {
        store.add(embedding);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get embeddings for a specific file
   */
  async getEmbeddings(fileId: string): Promise<Embedding[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      const index = store.index('fileId');
      const request = index.getAll(fileId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all embeddings (for statistics)
   */
  async getAllEmbeddings(): Promise<Embedding[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get total count of embeddings/chunks
   */
  async getEmbeddingsCount(): Promise<number> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['files', 'embeddings'],
        'readwrite',
      );
      const fileStore = transaction.objectStore('files');
      const embeddingStore = transaction.objectStore('embeddings');

      fileStore.clear();
      embeddingStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
