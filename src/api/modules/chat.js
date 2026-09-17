import { apiFetch } from '../http';

export const chatApi = {
  getMessages: (withUserId, contractId = null) =>
    apiFetch(`/api/messages?with=${withUserId}${contractId ? `&contract_id=${contractId}` : ''}`, { auth: true }),

  sendMessage: (receiver_id, body, contractId = null) =>
    apiFetch('/api/messages', { method: 'POST', auth: true, body: { receiver_id, body, contract_id: contractId } }),

  getConversations: () =>
    apiFetch(`/api/messages/conversations`, { auth: true }),

  uploadAttachment: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/api/messages/upload', {
      method: 'POST',
      auth: true,
      body: formData,
    });
  },

  clearConversation: (withUserId, contractId = null) =>
    apiFetch(`/api/messages/clear?with=${withUserId}${contractId ? `&contract_id=${contractId}` : ''}`, {
      method: 'DELETE',
      auth: true,
    }),

  deleteMessage: (messageId, deleteFor = 'me') =>
    apiFetch(`/api/messages/${messageId}${deleteFor ? `?delete_for=${deleteFor}` : ''}`, {
      method: 'DELETE',
      auth: true,
      body: { delete_for: deleteFor },
    }),
};

