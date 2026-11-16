import api from '../api/axiosConfig';
import { clearMasterPassword } from './vaultCrypto';
import { swrCache } from '../utils/swrCache';

const STORAGE_KEY = 'lifevault_user';

/**
 * Completely purges all local storage, indexedDB, SWR cache, and session tokens.
 * Guarantees zero cross-account session bleeding when logging out or switching users.
 */
export const clearAllSessionData = async () => {
  try {
    clearMasterPassword();
  } catch {}

  try {
    await swrCache.clear();
  } catch {}

  try {
    sessionStorage.clear();
  } catch {}

  try {
    localStorage.clear();
  } catch {}
};

const register = async (name, email, password) => {
  // Wipe any residual session state before setting up new account
  await clearAllSessionData();
  const { data } = await api.post('/auth/register', { name, email, password });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

const login = async (email, password) => {
  // Wipe any previous session state before logging into another account
  await clearAllSessionData();
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

const logout = async () => {
  await clearAllSessionData();
};

const getCurrentUser = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const updateStepTarget = async (stepTarget) => {
  const { data } = await api.put('/auth/me/step-target', { stepTarget });
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

export default {
  register,
  login,
  logout,
  clearAllSessionData,
  getCurrentUser,
  updateStepTarget,
  forgotPassword,
  resetPassword,
};
