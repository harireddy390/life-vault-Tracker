import api, { API_URL } from '../api/axiosConfig';

export const getMediaSrc = (mediaOrUrl) => {
  if (!mediaOrUrl) return '';
  let url = '';
  if (typeof mediaOrUrl === 'string') {
    url = mediaOrUrl;
  } else if (typeof mediaOrUrl === 'object') {
    url = mediaOrUrl.file_url || (mediaOrUrl.storedName ? `/uploads/memories/${mediaOrUrl.storedName}` : '') || mediaOrUrl.url || '';
  }
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
};

export const getMediaUrl = async (memoryId, mediaId) => {
  const stored = localStorage.getItem('lifevault_user');
  const token = stored ? JSON.parse(stored).token : null;
  const response = await fetch(`${API_URL}/memories/${memoryId}/media/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Could not load media');
  const blob = await response.blob();
  return window.URL.createObjectURL(blob);
};

export const getMemories = async (params = {}) => {
  const { data } = await api.get('/memories', { params });
  return data;
};

export const getTimeline = async (params = {}) => {
  const { data } = await api.get('/memories/timeline', { params });
  return Array.isArray(data) ? data : (data.timeline || data.memories || []);
};

export const getThrowbacks = async () => {
  const { data } = await api.get('/memories/throwback');
  return data;
};

export const getStats = async () => {
  const { data } = await api.get('/memories/stats');
  return data;
};

export const getMemory = async (id) => {
  const { data } = await api.get(`/memories/${id}`);
  return data;
};

export const createMemory = async (payload) => {
  // Support either FormData or normal JSON object
  const isFormData = payload instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
  const { data } = await api.post('/memories', payload, config);
  return data;
};

export const updateMemory = async (id, payload) => {
  const isFormData = payload instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
  const { data } = await api.put(`/memories/${id}`, payload, config);
  return data;
};

export const toggleFavorite = async (id) => {
  const { data } = await api.patch(`/memories/${id}/favorite`);
  return data;
};

export const deleteMemory = async (id) => {
  const { data } = await api.delete(`/memories/${id}`);
  return data;
};

export const uploadMedia = async (memoryId, files, onProgress) => {
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

export const deleteMedia = async (memoryId, mediaId) => {
  const { data } = await api.delete(`/memories/${memoryId}/media/${mediaId}`);
  return data;
};

export default {
  getMediaSrc,
  getMemories,
  getTimeline,
  getThrowbacks,
  getStats,
  getMemory,
  createMemory,
  updateMemory,
  toggleFavorite,
  deleteMemory,
  uploadMedia,
  deleteMedia,
};
