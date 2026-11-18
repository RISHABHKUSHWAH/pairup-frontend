/**
 * PairUp Web Audio Sound Synthesizer & Notification Sound Controller
 * Provides zero-dependency, instant, pleasant chimes for incoming & sent chat messages.
 */

const SOUND_KEYS = {
  INCOMING: 'pairup_sound_incoming_enabled',
  OUTGOING: 'pairup_sound_outgoing_enabled',
  NOTIFICATION: 'pairup_sound_notification_enabled',
};

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// User-gesture resume listener
if (typeof window !== 'undefined') {
  const resumeOnInteraction = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', resumeOnInteraction, { once: true, passive: true });
  window.addEventListener('keydown', resumeOnInteraction, { once: true, passive: true });
}

export const soundSettings = {
  isIncomingEnabled() {
    try {
      const val = localStorage.getItem(SOUND_KEYS.INCOMING);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  },

  setIncomingEnabled(enabled) {
    try {
      localStorage.setItem(SOUND_KEYS.INCOMING, String(enabled));
      window.dispatchEvent(new CustomEvent('pairup_sound_settings_changed', { detail: { incoming: enabled } }));
    } catch {}
  },

  isOutgoingEnabled() {
    try {
      const val = localStorage.getItem(SOUND_KEYS.OUTGOING);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  },

  setOutgoingEnabled(enabled) {
    try {
      localStorage.setItem(SOUND_KEYS.OUTGOING, String(enabled));
      window.dispatchEvent(new CustomEvent('pairup_sound_settings_changed', { detail: { outgoing: enabled } }));
    } catch {}
  },

  isNotificationEnabled() {
    try {
      const val = localStorage.getItem(SOUND_KEYS.NOTIFICATION);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  },

  setNotificationEnabled(enabled) {
    try {
      localStorage.setItem(SOUND_KEYS.NOTIFICATION, String(enabled));
      window.dispatchEvent(new CustomEvent('pairup_sound_settings_changed', { detail: { notification: enabled } }));
    } catch {}
  },
};

/**
 * Play a clean, modern harmonic chime for incoming messages (G5 -> C6)
 */
export function playIncomingSound(force = false) {
  if (!force && !soundSettings.isIncomingEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // First tone (G5 - 784 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Second tone (C6 - 1046.5 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.08);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.095);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.debug('Failed to play incoming message sound:', err);
  }
}

/**
 * Play a swift, tactile pop/swoosh for sent messages (480Hz -> 760Hz ramp)
 */
export function playOutgoingSound(force = false) {
  if (!force && !soundSettings.isOutgoingEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.06);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (err) {
    console.debug('Failed to play outgoing message sound:', err);
  }
}

export function previewIncomingSound() {
  playIncomingSound(true);
}

export function previewOutgoingSound() {
  playOutgoingSound(true);
}

/**
 * Play a clear, elegant 3-note harmonic chime for system and in-app notifications (E5 -> G#5 -> B5)
 * Suitable for both Learner and Mentor alerts across the platform.
 */
export function playNotificationSound(force = false) {
  if (!force && !soundSettings.isNotificationEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const notes = [
      { freq: 659.25, time: 0, dur: 0.24, vol: 0.22 },     // E5
      { freq: 830.61, time: 0.08, dur: 0.28, vol: 0.26 }, // G#5
      { freq: 987.77, time: 0.16, dur: 0.48, vol: 0.3 },  // B5
    ];

    notes.forEach(({ freq, time, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  } catch (err) {
    console.debug('Failed to play notification sound:', err);
  }
}

export function previewNotificationSound() {
  playNotificationSound(true);
}

// Global browser event listener to trigger notification sound from anywhere
if (typeof window !== 'undefined') {
  window.addEventListener('pairup_play_notification_sound', (e) => {
    playNotificationSound(Boolean(e?.detail?.force));
  });
}
