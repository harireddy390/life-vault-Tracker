import api from '../api/axiosConfig';
import { swrCache } from '../utils/swrCache';

const BASE = '/health';

// ── Medical Profile & Emergency Contacts ──
export const getEmergencyProfile = () => api.get(`${BASE}/emergency`).then((r) => r.data);
export const updateEmergencyProfile = (data) => api.put(`${BASE}/emergency`, data).then((r) => r.data);
export const addContact = (data) => api.post(`${BASE}/contacts`, data).then((r) => r.data);
export const deleteContact = (id) => api.delete(`${BASE}/contacts/${id}`).then((r) => r.data);

// ── Medications ──
export const getMedications = () => api.get(`${BASE}/medications`).then((r) => r.data);
export const addMedication = (data) => api.post(`${BASE}/medications`, data).then((r) => r.data);
export const takeDose = (id) => api.patch(`${BASE}/medications/${id}/take-dose`).then((r) => r.data);
export const deleteMedication = (id) => api.delete(`${BASE}/medications/${id}`).then((r) => r.data);

// ── Vitals ──
export const getVitals = () => api.get(`${BASE}/vitals`).then((r) => r.data);
export const logVital = (data) => api.post(`${BASE}/vitals`, data).then((r) => r.data);

// ── Health Records ──
export const getRecords = (params = {}) => api.get(`${BASE}/records`, { params }).then((r) => r.data);
export const uploadRecord = (formData) =>
  api
    .post(`${BASE}/records/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
export const deleteRecord = (id) => api.delete(`${BASE}/records/${id}`).then((r) => r.data);
export const getRecordDownloadUrl = (id) => `/api/health/records/${id}/download`;

// ── Comprehensive Daily Health Metrics (Vitals, Water, Sleep, Meds, Workout) ──
export const getDailyHealthMetric = async (date, onRevalidate) => {
  const cacheKey = `health_daily_${date}`;
  return swrCache.fetchSWR(
    cacheKey,
    async () => {
      const { data } = await api.get(`${BASE}/daily/${date}`);
      return data;
    },
    onRevalidate
  );
};

export const saveDailyHealthMetric = async (date, payload) => {
  const cacheKey = `health_daily_${date}`;
  const { data } = await api.put(`${BASE}/daily/${date}`, payload);
  swrCache.set(cacheKey, data);
  swrCache.invalidate('health_history');
  return data;
};

export const getHealthMetricsHistory = async (days = 14, onRevalidate) => {
  const cacheKey = `health_history_${days}`;
  return swrCache.fetchSWR(
    cacheKey,
    async () => {
      const { data } = await api.get(`${BASE}/history`, { params: { days } });
      return data;
    },
    onRevalidate
  );
};

export const quickUpdateWater = async (date, { delta, amount }) => {
  const cacheKey = `health_daily_${date}`;
  // Optimistic update in cache
  const cached = swrCache.get(cacheKey);
  if (cached) {
    const updatedWater = amount !== undefined ? Math.max(0, amount) : Math.max(0, (cached.water || 0) + (delta || 1));
    swrCache.set(cacheKey, { ...cached, water: updatedWater });
  }

  const { data } = await api.patch(`${BASE}/daily/${date}/water`, { delta, amount });
  if (cached) {
    swrCache.set(cacheKey, { ...cached, water: data.water });
  }
  return data;
};

export const toggleMedTaken = async (date, medData) => {
  const cacheKey = `health_daily_${date}`;
  const { data } = await api.patch(`${BASE}/daily/${date}/meds/toggle`, medData);
  if (data.metric) {
    swrCache.set(cacheKey, data.metric);
  }
  return data;
};

export const logWorkout = async (date, workoutData) => {
  const cacheKey = `health_daily_${date}`;
  const { data } = await api.post(`${BASE}/daily/${date}/workout`, workoutData);
  swrCache.set(cacheKey, data);
  return data;
};

export const deleteWorkout = async (date, workoutId) => {
  const cacheKey = `health_daily_${date}`;
  const { data } = await api.delete(`${BASE}/daily/${date}/workout/${workoutId}`);
  swrCache.set(cacheKey, data);
  return data;
};

export default {
  getEmergencyProfile,
  updateEmergencyProfile,
  addContact,
  deleteContact,
  getMedications,
  addMedication,
  takeDose,
  deleteMedication,
  getVitals,
  logVital,
  getRecords,
  uploadRecord,
  deleteRecord,
  getRecordDownloadUrl,
  getDailyHealthMetric,
  saveDailyHealthMetric,
  getHealthMetricsHistory,
  quickUpdateWater,
  toggleMedTaken,
  logWorkout,
  deleteWorkout,
};
