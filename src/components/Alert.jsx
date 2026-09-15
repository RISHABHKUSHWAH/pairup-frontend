import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  XIcon,
} from './Icons';

/**
 * Modern PairUp Alert Component
 * 
 * Supports:
 * - Types: 'error' (danger), 'success', 'warning', 'info'
 * - Floating fixed overlay mode (stays in view regardless of scrolling)
 * - Auto-dismissible with configurable duration in milliseconds (e.g. 4000ms)
 * - Animated progress countdown timer with pause on hover
 * - Smooth entrance and exit animations
 * - Built-in crisp SVG icons
 * - Custom action buttons and close button
 */
export default function Alert({
  type = 'info',
  title,
  message,
  children,
  icon,
  dismissible = false,
  onDismiss,
  action,
  floating = false,
  portal = floating,
  autoDismiss = 0,
  showProgress = true,
  className = '',
  style = {},
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const remainingTimeRef = useRef(autoDismiss);
  const startTimeRef = useRef(null);

  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 220);
  };

  useEffect(() => {
    if (!autoDismiss || autoDismiss <= 0) return;

    remainingTimeRef.current = autoDismiss;
    startTimeRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, autoDismiss);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoDismiss]);

  const handleMouseEnter = () => {
    if (!autoDismiss || autoDismiss <= 0) return;
    setIsPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    if (!autoDismiss || autoDismiss <= 0 || remainingTimeRef.current <= 0) return;
    setIsPaused(false);
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, remainingTimeRef.current);
  };

  const normalizedType = ['error', 'danger'].includes(type)
    ? 'error'
    : ['success', 'ok'].includes(type)
    ? 'success'
    : ['warning', 'warn'].includes(type)
    ? 'warning'
    : 'info';

  const defaultIcons = {
    error: <AlertCircleIcon size={18} />,
    success: <CheckCircleIcon size={18} />,
    warning: <AlertTriangleIcon size={18} />,
    info: <InfoIcon size={18} />,
  };

  const renderIcon = icon !== false && (icon || defaultIcons[normalizedType]);

  const alertClass = [
    'alert',
    `alert-${normalizedType}`,
    floating ? 'is-floating' : '',
    isExiting ? 'is-exiting' : '',
    className,
  ].filter(Boolean).join(' ');

  const alertNode = (
    <div
      className={alertClass}
      style={style}
      role="alert"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderIcon && <span className="alert-icon">{renderIcon}</span>}
      <div className="alert-body">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-message">
          {message || children}
        </div>
        {action && <div className="alert-action-container">{action}</div>}
      </div>
      {(dismissible || autoDismiss > 0) && (
        <button
          type="button"
          className="alert-close-btn"
          onClick={handleDismiss}
          aria-label="Dismiss alert"
          title="Dismiss"
        >
          <XIcon size={15} />
        </button>
      )}
      {autoDismiss > 0 && showProgress && (
        <div
          className={`alert-progress-bar alert-progress-${normalizedType}`}
          style={{
            animationDuration: `${autoDismiss}ms`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      )}
    </div>
  );

  if (portal && typeof document !== 'undefined') {
    return createPortal(alertNode, document.body);
  }

  return alertNode;
}

