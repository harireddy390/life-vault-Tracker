import api from '../api/axiosConfig';

const getExpenses = async () => (await api.get('/expenses')).data;
const createExpense = async (expense) => (await api.post('/expenses', expense)).data;
const deleteExpense = async (id) => (await api.delete(`/expenses/${id}`)).data;

export default { getExpenses, createExpense, deleteExpense };
