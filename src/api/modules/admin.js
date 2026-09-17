import { apiFetch } from '../http';

export const adminApi = {
  getAdminStats: () =>
    apiFetch('/api/admin/stats', { auth: true }),

  getAdminUsers: (role) =>
    apiFetch(`/api/admin/users${role ? '?role=' + role : ''}`, { auth: true }),

  getAdminAllUsers: () =>
    apiFetch('/api/admin/all-users', { auth: true }),

  adminSwitchUserRole: (userId, role) =>
    apiFetch(`/api/admin/users/${userId}/switch-role`, {
      method: 'POST',
      auth: true,
      body: role ? { role } : {},
    }),

  adminToggleSuspendUser: (userId, suspend) =>
    apiFetch(`/api/admin/users/${userId}/toggle-suspend`, {
      method: 'POST',
      auth: true,
      body: suspend !== undefined ? { suspend } : {},
    }),

  getAdminPayments: () =>
    apiFetch('/api/admin/payments', { auth: true }),

  getAdminBookings: () =>
    apiFetch('/api/admin/bookings', { auth: true }),

  getPendingMentors: () =>
    apiFetch('/api/admin/mentors/pending', { auth: true }),

  approveMentor: (id) =>
    apiFetch(`/api/admin/mentors/${id}/approve`, { method: 'POST', auth: true }),

  rejectMentor: (id) =>
    apiFetch(`/api/admin/mentors/${id}/reject`, { method: 'POST', auth: true }),

  getDisputes: () =>
    apiFetch('/api/admin/disputes', { auth: true }),

  resolveDispute: (id, action) =>
    apiFetch(`/api/admin/disputes/${id}/resolve`, {
      method: 'POST',
      auth: true,
      body: { action },
    }),

  getPayouts: () =>
    apiFetch('/api/admin/payouts', { auth: true }),

  processPayout: (id) =>
    apiFetch('/api/admin/payouts', {
      method: 'POST',
      auth: true,
      body: { payout_id: id },
    }),

  getAdminSettings: () =>
    apiFetch('/api/admin/settings', { auth: true }),

  updateAdminSettings: (data) =>
    apiFetch('/api/admin/settings', { method: 'PUT', auth: true, body: data }),

  getAdminReviews: () =>
    apiFetch('/api/admin/reviews', { auth: true }),

  deleteAdminReview: (id) =>
    apiFetch(`/api/admin/reviews/${id}`, { method: 'DELETE', auth: true }),

  getAdminProblems: () =>
    apiFetch('/api/admin/problems', { auth: true }),

  closeAdminProblem: (id) =>
    apiFetch(`/api/admin/problems/${id}/close`, { method: 'POST', auth: true }),

  getAdminRefunds: () =>
    apiFetch('/api/admin/refunds', { auth: true }),

  getAdminNotifications: () =>
    apiFetch('/api/admin/notifications', { auth: true }),

  getAuditLogs: () =>
    apiFetch('/api/admin/audit-logs', { auth: true }),

  getAdminPages: () =>
    apiFetch('/api/admin/pages', { auth: true }),

  updateAdminPage: (slug, data) =>
    apiFetch(`/api/admin/pages/${slug}`, { method: 'PUT', auth: true, body: data }),
};
