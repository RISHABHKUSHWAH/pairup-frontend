import { apiFetch } from '../http';

export const authApi = {
  login: (email, password) =>
    apiFetch('/api/auth/login', { method: 'POST', body: { email, password } }),

  register: (name, email, password, role) =>
    apiFetch('/api/auth/register', { method: 'POST', body: { name, email, password, role } }),

  me: () =>
    apiFetch('/api/auth/me', { auth: true }),

  switchRole: (role) =>
    apiFetch('/api/auth/switch-role', { method: 'POST', auth: true, body: role ? { role } : {} }),

  getPlatformConfig: () =>
    apiFetch('/api/platform/config'),
};
