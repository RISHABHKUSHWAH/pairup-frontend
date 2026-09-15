import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Alert from '../components/Alert';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({
    type = 'info',
    title,
    message,
    duration = 4500,
    action,
    dismissible = true,
  }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const newToast = { id, type, title, message, duration, action, dismissible };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const toast = {
    show: showToast,
    error: (msg, opts = {}) => showToast({ type: 'error', message: msg, ...opts }),
    success: (msg, opts = {}) => showToast({ type: 'success', message: msg, ...opts }),
    warning: (msg, opts = {}) => showToast({ type: 'warning', message: msg, ...opts }),
    info: (msg, opts = {}) => showToast({ type: 'info', message: msg, ...opts }),
    dismiss: dismissToast,
  };

  const floatingContainer = toasts.length > 0 && (
    <aside className="alert-floating-container" aria-label="Notifications" role="region">
      {toasts.map((t) => (
        <Alert
          key={t.id}
          type={t.type}
          title={t.title}
          dismissible={t.dismissible}
          autoDismiss={t.duration}
          onDismiss={() => dismissToast(t.id)}
          action={t.action}
          floating={true}
          portal={false}
        >
          {t.message}
        </Alert>
      ))}
    </aside>
  );

  return (
    <ToastContext.Provider value={{ toast, showToast, dismissToast }}>
      {children}
      {floatingContainer && typeof document !== 'undefined' && createPortal(floatingContainer, document.body)}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
