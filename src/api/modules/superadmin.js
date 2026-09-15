import { apiFetch } from '../http';

export const superadminApi = {
  getSuperadminAdmins: () =>
    apiFetch('/api/superadmin/admins', { auth: true }),

  searchSuperadminUsers: (query) =>
    apiFetch(`/api/superadmin/search-users?q=${encodeURIComponent(query)}`, { auth: true }),

  promoteAdmin: (userId) =>
    apiFetch(`/api/superadmin/admins/${userId}/promote`, { method: 'POST', auth: true }),

  revokeAdmin: (userId) =>
    apiFetch(`/api/superadmin/admins/${userId}/revoke`, { method: 'POST', auth: true }),
};
