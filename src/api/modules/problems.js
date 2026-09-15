import { apiFetch } from '../http';

export const problemApi = {
  getProblems: (params = {}) => {
    const query = new URLSearchParams();
    if (params?.skill) query.set('skill', params.skill);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiFetch(`/api/problems${qs ? `?${qs}` : ''}`, { auth: true });
  },

  getMyProblems: () =>
    apiFetch('/api/problems/mine', { auth: true }),

  createProblem: (data) =>
    apiFetch('/api/problems', { method: 'POST', auth: true, body: data }),

  closeProblem: (id) =>
    apiFetch(`/api/problems/${id}/close`, { method: 'POST', auth: true }),

  deleteProblem: (id) =>
    apiFetch(`/api/problems/${id}`, { method: 'DELETE', auth: true }),

  getProposals: (problemId) =>
    apiFetch(`/api/problems/${problemId}/proposals`, { auth: true }),

  getMyProposals: () =>
    apiFetch('/api/proposals/mine', { auth: true }),

  submitProposal: (problemId, data) =>
    apiFetch(`/api/problems/${problemId}/proposals`, { method: 'POST', auth: true, body: data }),

  acceptProposal: (problemId, proposalId, data = {}) =>
    apiFetch(`/api/problems/${problemId}/proposals/${proposalId}/accept`, { method: 'POST', auth: true, body: data }),

  rejectProposal: (problemId, proposalId) =>
    apiFetch(`/api/problems/${problemId}/proposals/${proposalId}/reject`, { method: 'POST', auth: true }),

  counterProposal: (problemId, proposalId, data) =>
    apiFetch(`/api/problems/${problemId}/proposals/${proposalId}/counter`, { method: 'POST', auth: true, body: data }),

  acceptCounterOffer: (problemId, proposalId) =>
    apiFetch(`/api/problems/${problemId}/proposals/${proposalId}/accept-counter`, { method: 'POST', auth: true }),

  withdrawProposal: (proposalId) =>
    apiFetch(`/api/proposals/${proposalId}`, { method: 'DELETE', auth: true }),
};
