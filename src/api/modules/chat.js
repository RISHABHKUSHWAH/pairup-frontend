import { apiFetch } from '../http';

export const chatApi = {
  getMessages: (withUserId) =>
    apiFetch(`/api/messages?with=${withUserId}`, { auth: true }),

  sendMessage: (receiver_id, body) =>
    apiFetch('/api/messages', { method: 'POST', auth: true, body: { receiver_id, body } }),

  getConversations: () =>
    apiFetch('/api/messages/conversations', { auth: true }),
};
