/**
 * Database migration utilities
 * Helps manage schema migrations and cleanup
 */

/**
 * Delete the entire IndexedDB database
 * Call this in browser console to reset: window.resetGMAODatabase()
 */
export async function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("gmao_client_db");
    request.onsuccess = () => {
      console.log("✅ Database deleted successfully. Refresh the page to recreate it.");
      resolve();
    };
    request.onerror = () => {
      console.error("❌ Failed to delete database:", request.error);
      reject(request.error);
    };
  });
}

/**
 * Clear all data but keep the schema
 */
export async function clearAllData(): Promise<void> {
  const DB_NAME = "gmao_client_db";
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const stores = ["documents", "embeddings", "chat_history", "equipements", "maintenance", "pieces_rechange"];
      
      for (const storeName of stores) {
        if (db.objectStoreNames.contains(storeName)) {
          const tx = db.transaction([storeName], "readwrite");
          const store = tx.objectStore(storeName);
          store.clear();
        }
      }
      
      console.log("✅ All data cleared successfully");
      resolve();
    };
    request.onerror = () => {
      console.error("❌ Failed to clear data:", request.error);
      reject(request.error);
    };
  });
}

/**
 * Export database info for debugging
 */
export async function getDatabaseInfo(): Promise<{
  name: string;
  version: number;
  stores: {
    name: string;
    keyPath: string;
    indexes: string[];
    count: number;
  }[];
}> {
  const DB_NAME = "gmao_client_db";
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = async () => {
      const db = request.result;
      const stores: {
        name: string;
        keyPath: string;
        indexes: string[];
        count: number;
      }[] = [];
      
      const storeNames = Array.from(db.objectStoreNames);
      
      for (const storeName of storeNames) {
        const tx = db.transaction([storeName], "readonly");
        const store = tx.objectStore(storeName);
        
        const countRequest = store.count();
        const count = await new Promise<number>((res) => {
          countRequest.onsuccess = () => res(countRequest.result);
        });
        
        const indexes = Array.from(store.indexNames);
        stores.push({
          name: storeName,
          keyPath: store.keyPath as string,
          indexes,
          count,
        });
      }
      
      resolve({
        name: DB_NAME,
        version: db.version,
        stores,
      });
    };
    request.onerror = () => {
      console.error("❌ Failed to get database info:", request.error);
      reject(request.error);
    };
  });
}

// Make functions available globally in development
if (typeof window !== "undefined") {
  (window as any).resetGMAODatabase = deleteDatabase;
  (window as any).clearGMAOData = clearAllData;
  (window as any).getGMAODatabaseInfo = getDatabaseInfo;
}
