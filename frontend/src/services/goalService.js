import api, { API_URL } from '../api/axiosConfig';

const getGoals = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== 'All') params.append('category', filters.category);
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters.priority && filters.priority !== 'All') params.append('priority', filters.priority);

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/goals${query}`);
  return response.data;
};

const createGoal = async (goalData) => {
  const response = await api.post('/goals', goalData);
  return response.data;
};

const updateGoal = async (id, updates) => {
  const response = await api.put(`/goals/${id}`, updates);
  return response.data;
};

const deleteGoal = async (id) => {
  const response = await api.delete(`/goals/${id}`);
  return response.data;
};

const logCheckin = async (id, { logged_value, note }) => {
  const response = await api.post(`/goals/${id}/checkin`, { logged_value, note });
  return response.data;
};

const toggleMilestone = async (milestoneId) => {
  const response = await api.patch(`/goals/milestones/${milestoneId}/toggle`);
  return response.data;
};

const addMilestone = async (goalId, { title, target_value }) => {
  const response = await api.post(`/goals/${goalId}/milestones`, { title, target_value });
  return response.data;
};

const deleteMilestone = async (milestoneId) => {
  const response = await api.delete(`/goals/milestones/${milestoneId}`);
  return response.data;
};

const uploadAttachment = async (goalId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/goals/${goalId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

const deleteAttachment = async (attachmentId) => {
  const response = await api.delete(`/goals/attachments/${attachmentId}`);
  return response.data;
};

const getDownloadUrl = (goalId, attachmentId) => {
  return `${API_URL}/goals/${goalId}/attachments/${attachmentId}/download`;
};

export default {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  logCheckin,
  toggleMilestone,
  addMilestone,
  deleteMilestone,
  uploadAttachment,
  deleteAttachment,
  getDownloadUrl,
};
