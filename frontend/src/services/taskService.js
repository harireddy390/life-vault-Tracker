import api from '../api/axiosConfig';

/**
 * Fetch all tasks for the authenticated user.
 */
const getTasks = async () => {
  const response = await api.get('/tasks');
  return response.data;
};

/**
 * Create a new task.
 * @param {Object|string} payload - The task object, or a string for legacy text-only creation.
 * @param {string} [legacyPriority='medium'] - Priority if using the legacy string method.
 */
const createTask = async (payload, legacyPriority = 'medium') => {
  // Safely support both legacy string input and full object input without the `arguments` bug
  const body = typeof payload === 'string'
    ? { text: payload, priority: legacyPriority }
    : payload;
    
  const response = await api.post('/tasks', body);
  return response.data;
};

/**
 * Update a specific task by ID.
 */
const updateTask = async (id, updates) => {
  const response = await api.put(`/tasks/${id}`, updates);
  return response.data;
};

/**
 * Toggle the important/star status of a task.
 */
const toggleTaskStar = async (id) => {
  const response = await api.patch(`/tasks/${id}/star`);
  return response.data;
};

/**
 * Delete a task permanently.
 */
const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};

export default {
  getTasks,
  createTask,
  updateTask,
  toggleTaskStar,
  deleteTask,
};