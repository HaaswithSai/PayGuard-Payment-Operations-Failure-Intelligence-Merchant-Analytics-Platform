import apiClient from './client';

export const analyticsApi = {
  getSummary: (params) => apiClient.get('/analytics/summary', { params }),
  getPaymentsTrend: (params) => apiClient.get('/analytics/payments-trend', { params }),
  getFailuresByCategory: (params) => apiClient.get('/analytics/failures-by-category', { params }),
  getFailuresByGateway: (params) => apiClient.get('/analytics/failures-by-gateway', { params }),
  getFailuresByBank: (params) => apiClient.get('/analytics/failures-by-bank', { params }),
  getMerchantPerformance: (params) => apiClient.get('/analytics/merchant-performance', { params }),
  getTopFailureReasons: (params) => apiClient.get('/analytics/top-failure-reasons', { params }),
  getQueueStats: () => apiClient.get('/analytics/queue-stats'),
  getRecentActivity: (params) => apiClient.get('/analytics/recent-activity', { params }),
};
