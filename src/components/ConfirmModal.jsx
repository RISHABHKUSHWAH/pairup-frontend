import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangleIcon, TrashIcon, InfoIcon, XIcon } from './Icons';

/**
 * Modern PairUp Confirm & Alert Dialog Modal
 * Replaces ugly browser-native window.confirm() and window.alert()
 */
export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Autofocus confirm button
    const timer = setTimeout(() => confirmBtnRef.current?.focus(), 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const isWarning = type === 'warning';

  const iconBadge = isDanger ? (
    <div className="confirm-icon-badge confirm-icon-danger">
      <TrashIcon size={24} />
    </div>
  ) : isWarning ? (
    <div className="confirm-icon-badge confirm-icon-warning">
      <AlertTriangleIcon size={24} />
    </div>
  ) : (
    <div className="confirm-icon-badge confirm-icon-info">
      <InfoIcon size={24} />
    </div>
  );

  const modalNode = (
    <div className="confirm-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="confirm-close-btn"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <XIcon size={16} />
        </button>

        <div className="confirm-header">
          {iconBadge}
          <div className="confirm-title-wrap">
            <h3 id="confirm-modal-title" className="confirm-title">{title}</h3>
            {message && <p className="confirm-message">{message}</p>}
          </div>
        </div>

        <div className="confirm-actions">
          <button
            type="button"
            className="btn btn-secondary confirm-btn-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'} confirm-btn-action`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalNode, document.body);
}
