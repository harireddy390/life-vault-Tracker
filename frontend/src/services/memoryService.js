import api, { API_URL } from '../api/axiosConfig';

const getMemories = async () => (await api.get('/memories')).data;
const createMemory = async (memory) => (await api.post('/memories', memory)).data;
const deleteMemory = async (id) => (await api.delete(`/memories/${id}`)).data;

const uploadMedia = async (memoryId, files, onProgress) => {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append('files', f));

  const { data } = await api.post(`/memories/${memoryId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded * 100) / event.total));
    },
  });
  return data;
};

const deleteMedia = async (memoryId, mediaId) =>
  (await api.delete(`/memories/${memoryId}/media/${mediaId}`)).data;

// Media files are auth-protected, not public — fetch as a blob for display,
// same pattern as documentService's preview.
const getMediaUrl = async (memoryId, mediaId) => {
  const stored = localStorage.getItem('lifevault_user');
  const token = stored ? JSON.parse(stored).token : null;
  const response = await fetch(`${API_URL}/memories/${memoryId}/media/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Could not load media');
  const blob = await response.blob();
  return window.URL.createObjectURL(blob);
};

export default { getMemories, createMemory, deleteMemory, uploadMedia, deleteMedia, getMediaUrl };
