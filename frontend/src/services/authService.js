import api from '../api/axiosConfig';

const STORAGE_KEY = 'lifevault_user';

const register = async (name, email, password) => {
  const { data } = await api.post('/auth/register', { name, email, password });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

const logout = () => {
  localStorage.removeItem(STORAGE_KEY);
};

const getCurrentUser = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

const updateStepTarget = async (stepTarget) => {
  const { data } = await api.put('/auth/me/step-target', { stepTarget });
  // Also update local storage user object so UI stays in sync
  const user = getCurrentUser();
  if (user) {
    user.stepTarget = data.stepTarget;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
  return data;
};

export default { register, login, logout, getCurrentUser, updateStepTarget };
