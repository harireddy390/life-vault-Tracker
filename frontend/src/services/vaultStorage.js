import axios from 'axios';

const API_URL = '/api/vault';
export const BASELINE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB Baseline

const getAuthHeaders = () => {
  // Read token from the same key that authService uses: 'lifevault_user'
  const stored = localStorage.getItem('lifevault_user');
  const token = stored ? JSON.parse(stored).token : null;
  const vaultToken = sessionStorage.getItem('vaultToken');
  return {
    Authorization: `Bearer ${token}`,
    'x-vault-token': vaultToken || '',
  };
};

/**
 * Retrieves all documents from Backend
 */
export async function getAllDocuments() {
  try {
    const response = await axios.get(`${API_URL}/documents`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

/**
 * Retrieves a single document URL for download
 * Since we are downloading, we might just use the token in headers and fetch the blob
 */
export async function downloadDocument(id, originalName) {
  try {
    const response = await axios.get(`${API_URL}/documents/${id}/download`, {
      headers: getAuthHeaders(),
      responseType: 'blob',
    });
    return response.data; // This is a Blob
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
}

/**
 * Saves a new document to the Backend
 */
export async function saveDocument(formData) {
  const response = await axios.post(`${API_URL}/documents`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Deletes a document by ID
 */
export async function deleteDocument(id) {
  const response = await axios.delete(`${API_URL}/documents/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

/**
 * Updates specific fields of an existing document
 */
export async function updateDocument(id, updates) {
  const response = await axios.put(`${API_URL}/documents/${id}`, updates, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

/**
 * Retrieves total storage used from Backend
 */
export async function getTotalStorageUsed() {
  try {
    const response = await axios.get(`${API_URL}/storage`, {
      headers: getAuthHeaders(),
    });
    return response.data.usedBytes || 0;
  } catch (error) {
    console.error('Error fetching storage usage:', error);
    return 0;
  }
}

export default {
  BASELINE_QUOTA_BYTES,
  getAllDocuments,
  downloadDocument,
  saveDocument,
  deleteDocument,
  updateDocument,
  getTotalStorageUsed,
};
