import api from '../api/axiosConfig';
import { clearMasterPassword } from './vaultCrypto';

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
  clearMasterPassword();
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

const forgotPassword = async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
};

const resetPassword = async (arg1, arg2, arg3) => {
  if (typeof arg1 === 'object' && arg1 !== null) {
    const { data } = await api.post('/auth/reset-password', arg1);
    return data;
  }
  if (arg3 !== undefined) {
    const { data } = await api.post('/auth/reset-password', { email: arg1, code: arg2, password: arg3 });
    return data;
  }
  const { data } = await api.post(`/auth/reset-password/${arg1}`, { password: arg2 });
  return data;
};

export default { register, login, logout, getCurrentUser, updateStepTarget, forgotPassword, resetPassword };

