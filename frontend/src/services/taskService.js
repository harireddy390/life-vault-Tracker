import api from '../api/axiosConfig';

const getTasks = async () => (await api.get('/tasks')).data;

const createTask = async (text, priority = 'medium') =>
  (await api.post('/tasks', { text, priority })).data;

const updateTask = async (id, updates) => (await api.put(`/tasks/${id}`, updates)).data;

const deleteTask = async (id) => (await api.delete(`/tasks/${id}`)).data;

export default { getTasks, createTask, updateTask, deleteTask };
