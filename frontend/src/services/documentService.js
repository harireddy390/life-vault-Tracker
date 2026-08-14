import api, { API_URL } from '../api/axiosConfig';

const getDocuments = async () => (await api.get('/documents')).data;

const uploadDocument = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return data;
};

const deleteDocument = async (id) => (await api.delete(`/documents/${id}`)).data;

// Shared helper: fetch a file's bytes as a blob (auth header attached) —
// used by both download (forces a save) and preview (renders inline).
const fetchBlob = async (id) => {
  const stored = localStorage.getItem('lifevault_user');
  const token = stored ? JSON.parse(stored).token : null;

  const response = await fetch(`${API_URL}/documents/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Could not fetch file');
  return response.blob();
};

// Downloads need the JWT too, so we can't just link straight to the URL —
// fetch the file as a blob (with the auth header) and trigger the browser save.
const downloadDocument = async (id, filename) => {
  const blob = await fetchBlob(id);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// For the in-app viewer: same fetch, but we hand back an object URL to put
// in an <img>/<iframe> instead of forcing a save-file dialog. The caller
// is responsible for calling URL.revokeObjectURL when done (the viewer
// modal does this on close).
const getPreviewUrl = async (id) => {
  const blob = await fetchBlob(id);
  return window.URL.createObjectURL(blob);
};

export default { getDocuments, uploadDocument, deleteDocument, downloadDocument, getPreviewUrl };
