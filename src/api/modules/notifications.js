import { apiFetch } from '../http';

export const notificationsApi = {
  list: () => apiFetch('/api/notifications', { auth: true }),
  markRead: (id) => apiFetch(`/api/notifications/${id}/read`, { method: 'POST', auth: true }),
  markAllRead: () => apiFetch('/api/notifications/mark-all-read', { method: 'POST', auth: true }),
  clearAll: () => apiFetch('/api/notifications/clear', { method: 'DELETE', auth: true }),
};
