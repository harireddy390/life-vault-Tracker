import api from '../api/axiosConfig';

const BASE = '/health';

// ── Medical Profile & Emergency Contacts ──
export const getEmergencyProfile = () => api.get(`${BASE}/emergency`).then(r => r.data);
export const updateEmergencyProfile = (data) => api.put(`${BASE}/emergency`, data).then(r => r.data);
export const addContact = (data) => api.post(`${BASE}/contacts`, data).then(r => r.data);
export const deleteContact = (id) => api.delete(`${BASE}/contacts/${id}`).then(r => r.data);

// ── Medications ──
export const getMedications = () => api.get(`${BASE}/medications`).then(r => r.data);
export const addMedication = (data) => api.post(`${BASE}/medications`, data).then(r => r.data);
export const takeDose = (id) => api.patch(`${BASE}/medications/${id}/take-dose`).then(r => r.data);
export const deleteMedication = (id) => api.delete(`${BASE}/medications/${id}`).then(r => r.data);

// ── Vitals ──
export const getVitals = () => api.get(`${BASE}/vitals`).then(r => r.data);
export const logVital = (data) => api.post(`${BASE}/vitals`, data).then(r => r.data);

// ── Health Records ──
export const getRecords = (params = {}) => api.get(`${BASE}/records`, { params }).then(r => r.data);
export const uploadRecord = (formData) =>
  api.post(`${BASE}/records/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
export const deleteRecord = (id) => api.delete(`${BASE}/records/${id}`).then(r => r.data);
export const getRecordDownloadUrl = (id) => `/api/health/records/${id}/download`;
