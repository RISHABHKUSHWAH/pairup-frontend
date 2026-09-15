import { apiFetch } from '../http';

export const contractsApi = {
  getContracts: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch(`/api/contracts${query}`, { auth: true });
  },


  getContract: (id) => apiFetch(`/api/contracts/${id}`, { auth: true }),

  createContract: (data) =>
    apiFetch('/api/contracts', {
      method: 'POST',
      auth: true,
      body: data,
    }),

  payContract: (id, data = {}) =>
    apiFetch(`/api/contracts/${id}/pay`, {
      method: 'POST',
      auth: true,
      body: data,
    }),

  completeContractByMentor: (id) =>
    apiFetch(`/api/contracts/${id}/complete-by-mentor`, {
      method: 'POST',
      auth: true,
    }),

  approveContract: (id, data = {}) =>
    apiFetch(`/api/contracts/${id}/approve`, {
      method: 'POST',
      auth: true,
      body: data,
    }),

  disputeContract: (id, reason) =>
    apiFetch(`/api/contracts/${id}/dispute`, {
      method: 'POST',
      auth: true,
      body: { reason },
    }),

  declineContract: (id) =>
    apiFetch(`/api/contracts/${id}/decline`, {
      method: 'POST',
      auth: true,
    }),

  scheduleContractSession: (contractId, sessionId, scheduledAt) =>
    apiFetch(`/api/contracts/${contractId}/sessions/${sessionId}/schedule`, {
      method: 'POST',
      auth: true,
      body: { scheduled_at: scheduledAt },
    }),

  adminResolveContract: (id, action, adminNotes = '') =>
    apiFetch(`/api/contracts/${id}/admin-resolve`, {
      method: 'POST',
      auth: true,
      body: { action, admin_notes: adminNotes },
    }),
};

