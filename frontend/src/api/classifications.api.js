import apiClient from './client';

export const classificationsApi = {
  getClassifications: (params) => apiClient.get('/classifications', { params }),
  getClassificationById: (paymentId) => apiClient.get(`/classifications/${paymentId}`),
  overrideClassification: (paymentId, data) => apiClient.patch(`/classifications/${paymentId}/override`, data),
  getQueueJobs: (params) => apiClient.get('/queue/jobs', { params }),
  triggerQueueProcess: (limit = 10) => apiClient.post(`/queue/process?limit=${limit}`),
};
