import api from '../api/axiosConfig';

/**
 * Fetch all habits, optionally including archived ones.
 */
export const getHabits = async (includeArchived = false) => {
  const response = await api.get('/habits', {
    params: { includeArchived }
  });
  return response.data;
};

/**
 * Create a new habit.
 */
export const createHabit = async (habitData) => {
  const response = await api.post('/habits', habitData);
  return response.data;
};

/**
 * Update a specific habit by ID.
 */
export const updateHabit = async (id, updates) => {
  const response = await api.put(`/habits/${id}`, updates);
  return response.data;
};

/**
 * Delete a habit permanently.
 */
export const deleteHabit = async (id) => {
  const response = await api.delete(`/habits/${id}`);
  return response.data;
};

// Keep default export as an object for legacy components
export default { 
  getHabits, 
  createHabit, 
  updateHabit, 
  deleteHabit 
};