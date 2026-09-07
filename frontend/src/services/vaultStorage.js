/**
 * IndexedDB Wrapper for Life Vault Documents
 * Handles persistent offline-first storage of File/Blob objects and metadata.
 * Baseline storage quota: 10 GB.
 * Zero hardcoded mock/sample items.
 */

const DB_NAME = 'LifeVault_DocumentDB';
const DB_VERSION = 2; // Incremented version to remove expiry index cleanly
const STORE_NAME = 'vault_documents';

export const BASELINE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB Baseline

/**
 * Opens and initializes the IndexedDB store
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('uploadDate', 'uploadDate', { unique: false });
        store.createIndex('isEncrypted', 'isEncrypted', { unique: false });
      } else {
        const store = event.target.transaction.objectStore(STORE_NAME);
        if (store.indexNames.contains('expiryDate')) {
          store.deleteIndex('expiryDate');
        }
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Retrieves all documents from IndexedDB
 */
export async function getAllDocuments() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Retrieves a single document by ID
 */
export async function getDocument(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Saves or updates a document in IndexedDB
 */
export async function saveDocument(doc) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(doc);

    request.onsuccess = () => {
      resolve(doc);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Deletes a document by ID
 */
export async function deleteDocument(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Updates specific fields of an existing document
 */
export async function updateDocument(id, updates) {
  const doc = await getDocument(id);
  if (!doc) throw new Error('Document not found');

  const updated = { ...doc, ...updates };
  await saveDocument(updated);
  return updated;
}

/**
 * Calculates total storage used across all stored document Blobs and metadata (in bytes)
 */
export async function getTotalStorageUsed() {
  const docs = await getAllDocuments();
  let totalBytes = 0;
  for (const doc of docs) {
    if (doc.sizeBytes) {
      totalBytes += doc.sizeBytes;
    } else if (doc.blob && typeof doc.blob.size === 'number') {
      totalBytes += doc.blob.size;
    }
  }
  return totalBytes;
}

export default {
  BASELINE_QUOTA_BYTES,
  openDB,
  getAllDocuments,
  getDocument,
  saveDocument,
  deleteDocument,
  updateDocument,
  getTotalStorageUsed,
};
