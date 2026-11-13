import { apiFetch } from '../http';
import { buildAgoraToken, DEFAULT_AGORA_APP_ID, DEFAULT_AGORA_APP_CERTIFICATE } from './agoraTokenBuilder';

export const bookingApi = {
  getBookings: () =>
    apiFetch('/api/bookings', { auth: true }),

  getBooking: (id) =>
    apiFetch(`/api/bookings/${id}`, { auth: true }),

  createBooking: (data) => {
    const duration = Number(data.duration_minutes || data.duration || 60);
    let price = Number(data.price || 0);
    if (!price || price <= 0) {
      const hourly = Number(data.hourly_rate || data.rate || 0);
      price = hourly > 0 ? Math.max(1, Math.round((hourly * duration) / 60)) : 50;
    }
    const payload = {
      ...data,
      duration_minutes: duration,
      price,
      scheduled_at: data.scheduled_at || data.scheduled_time || undefined,
    };
    return apiFetch('/api/bookings', { method: 'POST', auth: true, body: payload });
  },

  acceptBooking: (id) =>
    apiFetch(`/api/bookings/${id}/accept`, { method: 'POST', auth: true }),

  payBooking: (id) =>
    apiFetch(`/api/bookings/${id}/pay`, { method: 'POST', auth: true }),

  completeBooking: (id) =>
    apiFetch(`/api/bookings/${id}/complete`, { method: 'POST', auth: true }),

  disputeBooking: (id, reason) =>
    apiFetch(`/api/bookings/${id}/dispute`, { method: 'POST', auth: true, body: { reason } }),

  cancelBooking: (id, reason) =>
    apiFetch(`/api/bookings/${id}/cancel`, { method: 'POST', auth: true, body: { reason } }),

  rescheduleBooking: (id, scheduled_at, note = '') =>
    apiFetch(`/api/bookings/${id}/reschedule`, { method: 'POST', auth: true, body: { scheduled_at, note } }),

  acceptReschedule: (id) =>
    apiFetch(`/api/bookings/${id}/reschedule/accept`, { method: 'POST', auth: true }),

  denyReschedule: (id, reason = '') =>
    apiFetch(`/api/bookings/${id}/reschedule/deny`, { method: 'POST', auth: true, body: { reason } }),

  getNotes: (id) =>
    apiFetch(`/api/bookings/${id}/notes`, { auth: true }),

  saveNotes: (id, notes) =>
    apiFetch(`/api/bookings/${id}/notes`, { method: 'PUT', auth: true, body: { notes } }),

  getAgoraToken: async (id) => {
    let result = null;
    try {
      result = await apiFetch(`/api/bookings/${id}/agora-token`, { auth: true });
    } catch (err) {
      // If backend hasn't been updated with /agora-token yet (404), fall back to /livekit-token or booking info
      if (err?.status === 404) {
        try {
          result = await apiFetch(`/api/bookings/${id}/livekit-token`, { auth: true });
        } catch (_) {
          result = await apiFetch(`/api/bookings/${id}`, { auth: true });
        }
      } else {
        throw err;
      }
    }

    const appId =
      result.app_id && result.app_id !== 'test_agora_app_id'
        ? result.app_id
        : import.meta.env.VITE_AGORA_APP_ID || DEFAULT_AGORA_APP_ID;
    const appCertificate =
      result.app_certificate ||
      import.meta.env.VITE_AGORA_APP_CERTIFICATE ||
      DEFAULT_AGORA_APP_CERTIFICATE;
    const channelName = result.channel_name || result.room_name || `pairup-session-${id}`;
    const uid = result.uid || result.user_id || 0;

    let token = result.token;
    // If token is missing, LiveKit JWT (starts with eyJ), or placeholder, build a fresh Agora RTC token
    if (!token || String(token).startsWith('eyJ') || String(token) === 'test_token') {
      try {
        token = await buildAgoraToken(appId, appCertificate, channelName, uid);
      } catch (tokErr) {
        console.warn('Browser Agora token builder error:', tokErr);
        token = '';
      }
    }

    return {
      ...result,
      app_id: appId,
      app_certificate: appCertificate,
      channel_name: channelName,
      room_name: channelName,
      token,
      uid,
    };
  },

  getLiveKitToken: async (id) => {
    try {
      return await apiFetch(`/api/bookings/${id}/agora-token`, { auth: true });
    } catch (err) {
      if (err?.status === 404) {
        return await apiFetch(`/api/bookings/${id}/livekit-token`, { auth: true });
      }
      throw err;
    }
  },

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
