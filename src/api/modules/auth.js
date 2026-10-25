import { apiFetch } from '../http';

export const authApi = {
  login: (email, password) =>
    apiFetch('/api/auth/login', { method: 'POST', body: { email, password } }),

  logout: () =>
    apiFetch('/api/auth/logout', { method: 'POST', auth: true }),

  register: (name, email, password, role) =>
    apiFetch('/api/auth/register', { method: 'POST', body: { name, email, password, role } }),

  activateAccount: (token) =>
    apiFetch('/api/auth/activate', { method: 'POST', body: { token } }),

  resendVerification: (email) =>
    apiFetch('/api/auth/resend-verification', { method: 'POST', body: { email } }),

  forgotPassword: (email) =>
    apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (token, password, email) =>
    apiFetch('/api/auth/reset-password', { method: 'POST', body: { token, password, email } }),

  me: () =>
    apiFetch('/api/auth/me', { auth: true }),

  switchRole: (role) =>
    apiFetch('/api/auth/switch-role', { method: 'POST', auth: true, body: role ? { role } : {} }),

  googleAuth: (credential, role = 'learner') =>
    apiFetch('/api/auth/google', { method: 'POST', body: { credential, role } }),

  getPlatformConfig: () =>
    apiFetch('/api/platform/config'),

  requestAccountDeletion: (reason = '') =>
    apiFetch('/api/auth/request-account-deletion', { method: 'POST', auth: true, body: { reason } }),

  getAccountDeletionStatus: () =>
    apiFetch('/api/auth/account-deletion-status', { auth: true }),

  cancelAccountDeletion: () =>
    apiFetch('/api/auth/cancel-account-deletion', { method: 'POST', auth: true }),
};
