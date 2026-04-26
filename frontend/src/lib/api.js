import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 120s for NVIDIA AI pipeline calls
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - attach token & handle FormData
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('scrimx_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Auto-detect FormData and let browser set Content-Type with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    
    // Auto logout on 401 BUT ONLY if it's an explicit auth failure 
    // to prevent unrelated 401s (e.g., from Cloudinary) from kicking the user out.
    if (error.response?.status === 401) {
      const authErrors = [
        'Invalid token', 
        'Token expired', 
        'Not authorized - no token', 
        'Not authorized', 
        'User not found', 
        'Invalid credentials'
      ];
      
      if (!message || authErrors.includes(message)) {
        localStorage.removeItem('scrimx_token');
        localStorage.removeItem('scrimx_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject({ message, status: error.response?.status });
  }
);

export default api;
