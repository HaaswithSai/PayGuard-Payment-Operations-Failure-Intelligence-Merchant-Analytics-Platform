import apiClient from './client';

export const reportsApi = {
  getReportTypes: () => apiClient.get('/reports/types'),
  createReport: (data) => apiClient.post('/reports', data),
  listReports: (params) => apiClient.get('/reports', { params }),
  getReportById: (id) => apiClient.get(`/reports/${id}`),
  deleteReport: (id) => apiClient.delete(`/reports/${id}`),
  downloadReport: (id) =>
    apiClient.get(`/reports/${id}/download`, {
      responseType: 'blob',
    }),
};
