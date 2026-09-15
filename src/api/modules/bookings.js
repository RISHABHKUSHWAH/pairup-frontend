import { apiFetch } from '../http';

export const bookingApi = {
  getBookings: () =>
    apiFetch('/api/bookings', { auth: true }),

  getBooking: (id) =>
    apiFetch(`/api/bookings/${id}`, { auth: true }),

  createBooking: (data) =>
    apiFetch('/api/bookings', { method: 'POST', auth: true, body: data }),

  acceptBooking: (id) =>
    apiFetch(`/api/bookings/${id}/accept`, { method: 'POST', auth: true }),

  payBooking: (id) =>
    apiFetch(`/api/bookings/${id}/pay`, { method: 'POST', auth: true }),

  completeBooking: (id) =>
    apiFetch(`/api/bookings/${id}/complete`, { method: 'POST', auth: true }),

  disputeBooking: (id, reason) =>
    apiFetch(`/api/bookings/${id}/dispute`, { method: 'POST', auth: true, body: { reason } }),

  getNotes: (id) =>
    apiFetch(`/api/bookings/${id}/notes`, { auth: true }),

  saveNotes: (id, notes) =>
    apiFetch(`/api/bookings/${id}/notes`, { method: 'PUT', auth: true, body: { notes } }),

  getLiveKitToken: (id) =>
    apiFetch(`/api/bookings/${id}/livekit-token`, { auth: true }),

  getSessionFiles: (id) =>
    apiFetch(`/api/bookings/${id}/files`, { auth: true }),

  uploadSessionFile: (id, formData) =>
    apiFetch(`/api/bookings/${id}/files`, { method: 'POST', auth: true, body: formData }),

  getSessionSummary: (id) =>
    apiFetch(`/api/bookings/${id}/summary`, { auth: true }),

  saveSessionSummary: (id, data) =>
    apiFetch(`/api/bookings/${id}/summary`, { method: 'POST', auth: true, body: data }),

  sendSessionSignal: (id, signalType, data) =>
    apiFetch(`/api/bookings/${id}/signal`, {
      method: 'POST',
      auth: true,
      body: { signal_type: signalType, data },
    }),

  getSessionSignals: (id, after = 0) =>
    apiFetch(`/api/bookings/${id}/signal?after=${after}`, { auth: true }),
};
