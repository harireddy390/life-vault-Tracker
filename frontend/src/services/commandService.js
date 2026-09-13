import api from '../api/axiosConfig';

export const getTodayData = async () => {
  const res = await api.get('/command/today');
  return res.data;
};

export const getSchedule = async (date) => {
  const res = await api.get('/command/schedule', { params: date ? { date } : {} });
  return res.data;
};

export const getWeeklySchedule = async () => {
  const res = await api.get('/command/schedule/weekly');
  return res.data;
};

export const saveScheduleBlock = async (blockData) => {
  const res = await api.post('/command/schedule', blockData);
  return res.data;
};

export const updateScheduleBlock = async (id, updates) => {
  const res = await api.put(`/command/schedule/${id}`, updates);
  return res.data;
};

export const deleteScheduleBlock = async (id) => {
  const res = await api.delete(`/command/schedule/${id}`);
  return res.data;
};

export const toggleScheduleBlock = async (id, date) => {
  const res = await api.post(`/command/schedule/${id}/toggle`, { date });
  return res.data;
};

export const skipScheduleBlock = async (id, date) => {
  const res = await api.post(`/command/schedule/${id}/skip`, { date });
  return res.data;
};

export const seedRoutine = async () => {
  const res = await api.post('/command/schedule/seed');
  return res.data;
};

export const submitWorkout = async (workoutData) => {
  const res = await api.post('/command/workout', workoutData);
  return res.data;
};

export const getRecentWorkouts = async () => {
  const res = await api.get('/command/workout/recent');
  return res.data;
};

export const toggleTask = async (id) => {
  const res = await api.patch(`/command/task/${id}/toggle`);
  return res.data;
};

export const quickAddTask = async (taskData) => {
  const res = await api.post('/command/task/quick-add', taskData);
  return res.data;
};

export const toggleHabit = async (id, date) => {
  const res = await api.post(`/command/habit/${id}/toggle`, { date });
  return res.data;
};

export const getWeeklyReview = async () => {
  const res = await api.get('/command/review/weekly');
  return res.data;
};

export const submitWeeklyReview = async (reviewData) => {
  const res = await api.post('/command/review/weekly', reviewData);
  return res.data;
};

export default {
  getTodayData,
  getSchedule,
  saveScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  toggleScheduleBlock,
  skipScheduleBlock,
  seedRoutine,
  submitWorkout,
  getRecentWorkouts,
  toggleTask,
  quickAddTask,
  toggleHabit,
  getWeeklyReview,
  submitWeeklyReview,
};
