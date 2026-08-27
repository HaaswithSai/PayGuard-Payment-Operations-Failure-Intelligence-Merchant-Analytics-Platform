import apiClient from './client';

export const webhooksApi = {
  getEvents: (params) => apiClient.get('/webhooks/events', { params }),
  getEventById: (id) => apiClient.get(`/webhooks/events/${id}`),
  replayEvent: (id) => apiClient.post(`/webhooks/events/${id}/replay`),
  simulateWebhook: (data) => apiClient.post('/webhooks/simulate', data),
};
