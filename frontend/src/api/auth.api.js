import apiClient from './client';

export const authApi = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  getMe: () => apiClient.get('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),
  changePassword: (currentPassword, newPassword) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }),
};
