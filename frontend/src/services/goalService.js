import api from '../api/axiosConfig';

const getGoals = async () => (await api.get('/goals')).data;
const createGoal = async (goal) => (await api.post('/goals', goal)).data;
const updateGoal = async (id, updates) => (await api.put(`/goals/${id}`, updates)).data;
const deleteGoal = async (id) => (await api.delete(`/goals/${id}`)).data;

export default { getGoals, createGoal, updateGoal, deleteGoal };
