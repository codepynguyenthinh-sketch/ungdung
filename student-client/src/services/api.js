import axios from 'axios';

export const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';
const api = axios.create({ baseURL: apiBaseUrl });

// List of endpoints that are truly public and don't need authentication.
const PUBLIC_ENDPOINTS = ['/categories', '/stats', '/authors', '/publishers'];

const isPublicRequest = (url) => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('student_token');
  if (token && !isPublicRequest(cfg.url)) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    // Don't redirect on 401 for public endpoints or GET requests
    const isPublic = isPublicRequest(err.config?.url);
    const isAuthEndpoint = err.config?.url?.includes('/auth/me');
    const isGetRequest = err.config?.method === 'get';
    
    if (err.response?.status === 401 && !isPublic && !isAuthEndpoint && !isGetRequest) {
      localStorage.removeItem('student_token');
      localStorage.removeItem('student_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
