import { apiFetch } from '../http';

export const adminApi = {
  getAdminStats: () =>
    apiFetch('/api/admin/stats', { auth: true }),

  getAccountTracking: (params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    const q = new URLSearchParams(cleanParams).toString();
    return apiFetch(`/api/admin/account-tracking${q ? '?' + q : ''}`, { auth: true });
  },

  getSignupsTracking: (params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    const q = new URLSearchParams(cleanParams).toString();
    return apiFetch(`/api/admin/signups-tracking${q ? '?' + q : ''}`, { auth: true });
  },

  adminManualActivateUser: (userId) =>
    apiFetch(`/api/admin/users/${userId}/manual-activate`, {
      method: 'POST',
      auth: true,
    }),

  adminResendUserActivation: (userId) =>
    apiFetch(`/api/admin/users/${userId}/resend-activation`, {
      method: 'POST',
      auth: true,
    }),

  adminBulkResendActivations: () =>
    apiFetch('/api/admin/signups-tracking/bulk-resend', {
      method: 'POST',
      auth: true,
    }),

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

  setMentorCommission: (mentorId, custom_commission_percent, custom_tax_percent) => {
    const body = typeof custom_commission_percent === 'object' && custom_commission_percent !== null
      ? custom_commission_percent
      : { custom_commission_percent, custom_tax_percent };
    return apiFetch(`/api/admin/mentors/${mentorId}/set-commission`, {
      method: 'POST',
      auth: true,
      body,
    });
  },

  setUserCommission: (userId, custom_commission_percent, custom_tax_percent) => {
    const body = typeof custom_commission_percent === 'object' && custom_commission_percent !== null
      ? custom_commission_percent
      : { custom_commission_percent, custom_tax_percent };
    return apiFetch(`/api/admin/users/${userId}/set-commission`, {
      method: 'POST',
      auth: true,
      body,
    });
  },

  getCommissionRates: () =>
    apiFetch('/api/platform/commission-rates'),

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

  getAuditLogs: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.page_size) qs.set('page_size', params.page_size);
    if (params.q) qs.set('q', params.q);
    if (params.target_type && params.target_type !== 'all') qs.set('target_type', params.target_type);
    const query = qs.toString();
    return apiFetch(`/api/admin/audit-logs${query ? `?${query}` : ''}`, { auth: true });
  },

  getAdminPages: () =>
    apiFetch('/api/admin/pages', { auth: true }),

  updateAdminPage: (slug, data) =>
    apiFetch(`/api/admin/pages/${slug}`, { method: 'PUT', auth: true, body: data }),

  // Mail & Communication Management
  getMailConfig: () =>
    apiFetch('/api/admin/mail/config', { auth: true }),

  saveMailConfig: (data) =>
    apiFetch('/api/admin/mail/config/save', { method: 'POST', auth: true, body: data }),

  testMailConnection: (toEmail, config) =>
    apiFetch('/api/admin/mail/test', {
      method: 'POST',
      auth: true,
      body: { to_email: toEmail, config },
    }),

  sendInfoEmail: (payload) =>
    apiFetch('/api/admin/mail/send-info', { method: 'POST', auth: true, body: payload }),

  sendActivationEmail: (payload) =>
    apiFetch('/api/admin/mail/send-activation', { method: 'POST', auth: true, body: payload }),

  getUnverifiedUsers: () =>
    apiFetch('/api/admin/mail/unverified-users', { auth: true }),

  getDeletionRequests: () =>
    apiFetch('/api/admin/deletion-requests', { auth: true }),

  adminDeleteUser: (userId) =>
    apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE', auth: true }),

  adminRejectDeletionRequest: (userId, reason = '') =>
    apiFetch(`/api/admin/users/${userId}/reject-deletion`, {
      method: 'POST',
      auth: true,
      body: { reason },
    }),
};
