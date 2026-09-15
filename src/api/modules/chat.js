import { apiFetch } from '../http';

export const chatApi = {
  getMessages: (withUserId, contractId = null) =>
    apiFetch(`/api/messages?with=${withUserId}${contractId ? `&contract_id=${contractId}` : ''}`, { auth: true }),

  sendMessage: (receiver_id, body, contractId = null) =>
    apiFetch('/api/messages', { method: 'POST', auth: true, body: { receiver_id, body, contract_id: contractId } }),

  getConversations: () =>
    apiFetch(`/api/messages/conversations`, { auth: true }),
};
