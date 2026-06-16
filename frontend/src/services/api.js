const BACKEND_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

import axios from 'axios';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor for outgoing requests: attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for responses: handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and not already retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint to get new access token
        const res = await axios.post(`${BACKEND_URL}/auth/refresh`, {
          token: refreshToken
        });

        const newAccessToken = res.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // Update auth header and retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, log out the user and clear tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Redirect to login (only if we're not already on the login page)
        if (!window.location.pathname.endsWith('/login')) {
          window.location.href = '/login?session_expired=true';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const getPhotoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('http') && url.includes('cloudinary')) {
    return url;
  }
  const backendBase = BACKEND_URL.replace('/api', '');
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      return `${backendBase}${parsed.pathname}`;
    } catch (e) {
      return url;
    }
  }
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default api;
