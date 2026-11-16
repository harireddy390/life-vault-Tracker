import axios from 'axios';
import { swrCache } from '../utils/swrCache';

// Environment-driven API base URL (VITE_API_URL or relative fallback)
export const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15s request timeout to prevent hanging connections
});

// Attach the JWT to every request automatically
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem('lifevault_user');
      if (stored) {
        const { token } = JSON.parse(stored);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Storage access error handling
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// If the token is invalid/expired (401), completely purge session state to prevent session bleeding
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        await swrCache.clear();
      } catch {}

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
