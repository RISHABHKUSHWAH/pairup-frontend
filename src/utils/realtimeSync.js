import { useEffect, useRef } from 'react';

// Shared BroadcastChannel for zero-latency cross-tab communication
let syncChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel('pairup_realtime_sync');
  } catch (e) {
    console.warn('BroadcastChannel not supported in this environment', e);
  }
}

/**
 * Broadcast an event that data of a given entity has changed
 * @param {string} entity - 'problems' | 'proposals' | 'contracts' | 'sessions' | 'all'
 * @param {any} payload - optional details
 */
export function broadcastDataChange(entity = 'all', payload = {}) {
  const eventData = {
    type: 'PAIRUP_DATA_CHANGED',
    entity,
    payload,
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel for active tabs
  if (syncChannel) {
    try {
      syncChannel.postMessage(eventData);
    } catch (e) {
      console.warn('Failed to postMessage on syncChannel', e);
    }
  }

  // 2. Same-window CustomEvent
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('pairup_data_changed', { detail: eventData }));
    } catch {}

    // 3. LocalStorage event for cross-tab fallback
    try {
      localStorage.setItem('pairup_realtime_event', JSON.stringify(eventData));
    } catch {}
  }
}

/**
 * Hook to automatically synchronize and refresh component data
 * @param {Object} options
 * @param {Function} options.onSync - Callback to re-fetch or sync data silently
 * @param {Array<string>} [options.entities] - Entities this component listens for (default: all)
 * @param {number} [options.intervalMs] - Polling interval in ms (default: 4000ms)
 * @param {boolean} [options.enabled] - Whether sync is currently active (default: true)
 */
export function useRealtimeSync({
  onSync,
  entities = ['all'],
  intervalMs = 4000,
  enabled = true,
}) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;

  useEffect(() => {
    if (!enabled) return;

    const triggerSync = (entity) => {
      if (
        !entity ||
        entitiesRef.current.includes('all') ||
        entitiesRef.current.includes(entity)
      ) {
        if (typeof onSyncRef.current === 'function') {
          onSyncRef.current();
        }
      }
    };

    // 1. Polling interval (handles cross-user / cross-browser changes)
    let intervalId = null;
    if (intervalMs > 0) {
      intervalId = setInterval(() => {
        // Only poll if tab is currently visible to save resources
        if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
          triggerSync('all');
        }
      }, intervalMs);
    }

    // 2. Window focus & Tab visibility listener
    const handleFocus = () => {
      triggerSync('all');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerSync('all');
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. BroadcastChannel listener
    const handleChannelMessage = (event) => {
      if (event?.data?.type === 'PAIRUP_DATA_CHANGED') {
        triggerSync(event.data.entity);
      }
    };

    if (syncChannel) {
      syncChannel.addEventListener('message', handleChannelMessage);
    }

    // 4. CustomEvent listener (same window)
    const handleCustomEvent = (e) => {
      if (e?.detail?.type === 'PAIRUP_DATA_CHANGED') {
        triggerSync(e.detail.entity);
      }
    };
    window.addEventListener('pairup_data_changed', handleCustomEvent);

    // 5. Storage listener (cross-tab fallback)
    const handleStorage = (e) => {
      if (e.key === 'pairup_realtime_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          triggerSync(parsed.entity);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleChannelMessage);
      }
      window.removeEventListener('pairup_data_changed', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [enabled, intervalMs]);
}
