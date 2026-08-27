import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45 seconds for cloud cold-start resilience
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('payguard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Unauthorized / Expired sessions
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;

    if (status === 401 && errorCode !== 'INVALID_CREDENTIALS') {
      // Auto-logout on token expiration (if not already on login page)
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('payguard_token');
        localStorage.removeItem('payguard_user');
        window.location.href = '/login?expired=true';
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({
      status,
      code: errorCode,
      message,
      details: error.response?.data?.error?.details || null,
      raw: error,
    });
  }
);

export default apiClient;
