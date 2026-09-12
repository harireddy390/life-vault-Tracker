import api from '../api/axiosConfig';

const BASE = '/family';

// ── Members ───────────────────────────────────────────────────────────────────
export const getMembers = async () => (await api.get(`${BASE}/members`)).data;

export const createMember = async (data) => (await api.post(`${BASE}/members`, data)).data;

export const updateMember = async (id, data) => (await api.put(`${BASE}/members/${id}`, data)).data;

export const deleteMember = async (id) => (await api.delete(`${BASE}/members/${id}`)).data;

// ── Documents ─────────────────────────────────────────────────────────────────
export const getMemberDocuments = async (memberId) =>
  (await api.get(`${BASE}/members/${memberId}/documents`)).data;

export const getAllDocuments = async (params = {}) =>
  (await api.get(`${BASE}/documents`, { params })).data;

export const uploadDocument = async (memberId, formData) => {
  return (
    await api.post(`${BASE}/members/${memberId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data;
};

export const deleteDocument = async (docId) =>
  (await api.delete(`${BASE}/documents/${docId}`)).data;

// ── Renewals & Milestones ────────────────────────────────────────────────────
export const getRenewals = async (memberId) => {
  const params = memberId && memberId !== 'All' ? { memberId } : {};
  return (await api.get(`${BASE}/renewals`, { params })).data;
};

export const createRenewal = async (data) =>
  (await api.post(`${BASE}/renewals`, data)).data;

export const toggleRenewal = async (id) =>
  (await api.patch(`${BASE}/renewals/${id}/toggle`)).data;

export const deleteRenewal = async (id) =>
  (await api.delete(`${BASE}/renewals/${id}`)).data;

export const getFamilyMembers = getMembers;
export const toggleRenewalStatus = toggleRenewal;

// Export default with backward-compatibility aliases
export default {
  getMembers,
  getFamilyMembers: getMembers,
  createMember,
  updateMember,
  deleteMember,
  getMemberDocuments,
  getAllDocuments,
  uploadDocument,
  deleteDocument,
  getRenewals,
  createRenewal,
  toggleRenewal,
  toggleRenewalStatus: toggleRenewal,
  deleteRenewal,
  // Backward compatibility aliases
  getFamily: getMembers,
  addMember: createMember,
};
