import api from '../api/axiosConfig';

const getDateProgress = async (date) => (await api.get(`/progress/date/${date}`)).data;
const getMonthProgress = async (year, month) => (await api.get(`/progress/month/${year}/${month}`)).data;
const setProgress = async (taskId, date, completed) =>
  (await api.post('/progress', { taskId, date, completed })).data;
const getStats = async (today) => (await api.get(`/progress/stats?today=${today}`)).data;

// Matrix & Stats aliases to support Planner.jsx perfectly
const getProgressMatrix = async (params) => (await api.get('/progress/matrix', { params })).data;
const getStreakStats = async () => (await api.get('/progress/stats')).data;
const toggleTaskProgress = async (taskId, date, completed) => 
  (await api.post('/progress/toggle', { taskId, date, completed })).data;

export default { 
  getDateProgress, 
  getProgressByDate: getDateProgress, // Alias
  getMonthProgress, 
  setProgress, 
  getStats,
  getProgressMatrix,
  getStreakStats,
  toggleTaskProgress
};