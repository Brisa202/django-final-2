import Axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

const axios = Axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

const get = (k) => localStorage.getItem(k) || sessionStorage.getItem(k);

axios.interceptors.request.use((config) => {
  const token = get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    // ⚠️ solo 401 dispara logout/redirección
    if (status === 401) {
      ['access_token','refresh_token'].forEach(k=>{
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
