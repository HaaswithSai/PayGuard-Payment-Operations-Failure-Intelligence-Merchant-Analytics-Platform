import apiClient from './client';

export const merchantsApi = {
  getMerchants: (params) => apiClient.get('/merchants', { params }),
  getMerchantById: (id) => apiClient.get(`/merchants/${id}`),
  createMerchant: (data) => apiClient.post('/merchants', data),
  updateMerchant: (id, data) => apiClient.patch(`/merchants/${id}`, data),
  updateMerchantConfig: (id, data) => apiClient.patch(`/merchants/${id}/configuration`, data),
  updateMerchantStatus: (id, status) => apiClient.patch(`/merchants/${id}/status`, { status }),
  deleteMerchant: (id) => apiClient.delete(`/merchants/${id}`),
};
