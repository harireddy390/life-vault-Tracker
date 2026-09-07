/**
 * IndexedDB Wrapper for Life Vault Documents
 * Handles persistent offline-first storage of File/Blob objects and metadata.
 * Calculates total storage consumption directly from stored blobs.
 */

const DB_NAME = 'LifeVault_DocumentDB';
const DB_VERSION = 1;
const STORE_NAME = 'vault_documents';

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
        store.createIndex('expiryDate', 'expiryDate', { unique: false });
        store.createIndex('isEncrypted', 'isEncrypted', { unique: false });
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

/**
 * Helper to build an SVG-based previewable Blob
 */
function createSampleDocBlob(title, subtitle, color = '#6366F1') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
      <rect width="800" height="1100" fill="#f8fafc" />
      <rect x="40" y="40" width="720" height="1020" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
      <rect x="40" y="40" width="720" height="100" rx="20" fill="${color}" />
      <text x="80" y="105" fill="#ffffff" font-family="sans-serif" font-size="28" font-weight="bold">LIFE VAULT VERIFIED DOCUMENT</text>
      <text x="80" y="200" fill="#0f172a" font-family="sans-serif" font-size="32" font-weight="bold">${title}</text>
      <text x="80" y="240" fill="#64748b" font-family="sans-serif" font-size="18">${subtitle}</text>
      <line x1="80" y1="280" x2="720" y2="280" stroke="#e2e8f0" stroke-width="2" />
      <rect x="80" y="320" width="640" height="160" rx="12" fill="#f1f5f9" />
      <text x="110" y="360" fill="#334155" font-family="sans-serif" font-size="16">Official Reference: LV-${Math.floor(100000 + Math.random() * 900000)}</text>
      <text x="110" y="400" fill="#334155" font-family="sans-serif" font-size="16">Authentication: Client-Side SHA-256 Verified</text>
      <text x="110" y="440" fill="#334155" font-family="sans-serif" font-size="16">Offline Encrypted Node: LifeVault-Storage-01</text>
      <circle cx="660" cy="980" r="40" fill="${color}" opacity="0.15" />
      <circle cx="660" cy="980" r="30" fill="${color}" opacity="0.3" />
      <text x="635" y="988" fill="${color}" font-family="sans-serif" font-size="22" font-weight="bold">SEAL</text>
      <text x="80" y="980" fill="#94a3b8" font-family="sans-serif" font-size="14">Life Vault Document Vault Engine • Private &amp; Encrypted</text>
    </svg>
  `;
  return new Blob([svg], { type: 'image/svg+xml' });
}

/**
 * Seeds initial mock documents if the database is newly initialized
 */
export async function seedInitialDocumentsIfEmpty() {
  const existing = await getAllDocuments();
  if (existing.length > 0) return existing;

  const now = new Date();
  
  // Expiry dates
  const inTwoYears = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString().split('T')[0];
  const inTwelveDays = new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0];
  const expiredLastMonth = new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0];
  const inEightMonths = new Date(now.getFullYear(), now.getMonth() + 8, now.getDate()).toISOString().split('T')[0];

  const blob1 = createSampleDocBlob('University Degree & Transcript', 'Bachelor of Computer Science • Grade A with Distinction', '#6366f1');
  const blob2 = createSampleDocBlob('Passport International Travel Copy', 'Republic Passport • Valid for International Transit', '#0284c7');
  const blob3 = createSampleDocBlob('Health & Critical Care Insurance', 'Comprehensive Family Health Shield • Policy #POL-99201', '#10b981');
  const blob4 = createSampleDocBlob('Financial Tax Return & Salary Slip', 'Annual Income Statement • Financial Year Assessment', '#f59e0b');
  const blob5 = createSampleDocBlob('Government Vehicle Driving License', 'Motor Vehicle Department • Class LMV / MCWG', '#e11d48');

  const seedDocs = [
    {
      id: 'doc-seed-1',
      name: 'College Degree & Official Transcript.pdf',
      blob: blob1,
      mimeType: 'image/svg+xml',
      sizeBytes: blob1.size || 1420000,
      category: 'Academics & College',
      tags: ['Degree', 'Semester', 'Hall Ticket', 'Mark Sheet', 'Academics'],
      uploadDate: new Date(Date.now() - 86400000 * 15).toISOString(),
      expiryDate: inTwoYears,
      isEncrypted: false,
      notes: 'Final transcript attested by dean. Keep copy for visa paperwork.',
      extractedKeywords: ['Semester 8', 'Grade Point 9.4', 'Hall Ticket', 'Dean Signature', 'Computer Engineering'],
    },
    {
      id: 'doc-seed-2',
      name: 'National Passport & Aadhaar Copy.pdf',
      blob: blob2,
      mimeType: 'image/svg+xml',
      sizeBytes: blob2.size || 2150000,
      category: 'Government IDs',
      tags: ['Passport', 'Aadhaar', 'Identity', 'Travel', 'Visa'],
      uploadDate: new Date(Date.now() - 86400000 * 20).toISOString(),
      expiryDate: inTwelveDays, // Expiring soon (<30 days)
      isEncrypted: false,
      notes: 'Renewal required before international trip next quarter.',
      extractedKeywords: ['Passport Authority', 'Aadhaar UIDAI', 'Biometrics Verified', 'Nationality'],
    },
    {
      id: 'doc-seed-3',
      name: 'Executive Medical Checkup & Insurance Policy.pdf',
      blob: blob3,
      mimeType: 'image/svg+xml',
      sizeBytes: blob3.size || 1880000,
      category: 'Medical & Health',
      tags: ['Insurance', 'Lab Reports', 'Prescription', 'Vaccination', 'Blood Test'],
      uploadDate: new Date(Date.now() - 86400000 * 5).toISOString(),
      expiryDate: inEightMonths,
      isEncrypted: false,
      notes: 'TPA Card: #99482. Cashless hospitalization coverage active.',
      extractedKeywords: ['Apollo Hospitals', 'Blood Panel', 'Cashless Card', 'Policy Schedule', 'Vaccination'],
    },
    {
      id: 'doc-seed-4',
      name: 'Confidential Employment Contract & Salary Slips.pdf',
      blob: blob4,
      mimeType: 'image/svg+xml',
      sizeBytes: blob4.size || 3400000,
      category: 'Finance & Employment',
      tags: ['Salary', 'Tax Forms', 'Offer Letter', 'Confidential', 'W2'],
      uploadDate: new Date(Date.now() - 86400000 * 30).toISOString(),
      expiryDate: inTwoYears,
      isEncrypted: true,
      notes: 'Encrypted document containing compensation structure, NDA and equity schedule.',
      extractedKeywords: ['CTC Breakdown', 'Stock Units', 'Tax Deduction', 'Non Disclosure Agreement'],
    },
    {
      id: 'doc-seed-5',
      name: 'Driver License & Vehicle Registration.pdf',
      blob: blob5,
      mimeType: 'image/svg+xml',
      sizeBytes: blob5.size || 1650000,
      category: 'Government IDs',
      tags: ['Driver License', 'Transport', 'ID', 'Registration'],
      uploadDate: new Date(Date.now() - 86400000 * 60).toISOString(),
      expiryDate: expiredLastMonth, // Expired!
      notes: 'Expired last month. Urgent renewal test scheduled at RTO.',
      extractedKeywords: ['Transport Dept', 'Class LMV', 'License Number', 'Valid Till'],
      isEncrypted: false,
    },
  ];

  for (const doc of seedDocs) {
    await saveDocument(doc);
  }

  return seedDocs;
}

export default {
  openDB,
  getAllDocuments,
  getDocument,
  saveDocument,
  deleteDocument,
  updateDocument,
  getTotalStorageUsed,
  seedInitialDocumentsIfEmpty,
};
