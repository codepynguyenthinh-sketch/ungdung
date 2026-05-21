import axios from 'axios';

export const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';
const baseURL = apiBaseUrl;

const api = axios.create({ baseURL });

// List of public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = ['/books', '/categories', '/stats', '/authors', '/publishers'];

const isPublicRequest = (url) => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

api.interceptors.request.use((config) => {
  // Only attach token if NOT a public endpoint
  if (!isPublicRequest(config.url)) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    // Don't redirect on 401 for public endpoints or GET requests
    const isPublic = isPublicRequest(err.config?.url);
    const isAuthEndpoint = err.config?.url?.includes('/auth/me');
    const isGetRequest = err.config?.method === 'get';
    
    if (err.response?.status === 401 && !isPublic && !isAuthEndpoint && !isGetRequest) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
