import axios from 'axios';

// Change this if your backend runs on a different port
export const API_URL = 'http://localhost:4000/api';

const api = axios.create({ baseURL: API_URL });

// Attach the JWT to every request automatically
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('lifevault_user');
  if (stored) {
    const { token } = JSON.parse(stored);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token is invalid/expired, boot the user back to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('lifevault_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
