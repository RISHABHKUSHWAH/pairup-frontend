import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTour } from '../context/TourContext';
import {
  HelpCircleIcon,
  SearchIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  XIcon,
  CrownIcon,
  ShieldCheckIcon,
  PanelLeftCloseIcon,
  UserIcon,
  StarIcon,
  DocumentIcon,
  FileEditIcon,
  MessageIcon,
  CalendarIcon,
  WalletIcon,
  CreditCardIcon,
} from './Icons';

export default function PlatformTour() {
  const {
    isTourActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    tourRole,
    nextStep,
    prevStep,
    goToStep,
    endTour,
  } = useTour();

  const [targetRect, setTargetRect] = useState(null);
  const cardRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(360);
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1200,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  // Track active target element class with thorough cleanup
  useEffect(() => {
    document.querySelectorAll('.tour-active-target').forEach((node) => {
      node.classList.remove('tour-active-target');
    });

    if (!isTourActive || !currentStep?.target) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      el.classList.add('tour-active-target');
      return () => {
        el.classList.remove('tour-active-target');
      };
    }
  }, [isTourActive, currentStep]);

  useEffect(() => {
    if (!isTourActive) {
      document.querySelectorAll('.tour-active-target').forEach((node) => {
        node.classList.remove('tour-active-target');
      });
    }
  }, [isTourActive]);

  // Keep card height measured accurately
  useEffect(() => {
    if (cardRef.current) {
      setCardHeight(cardRef.current.offsetHeight);
    }
  }, [currentStepIndex, isTourActive, tourRole]);

  // Update target rect on step change, resize, or scroll
  useEffect(() => {
    if (!isTourActive || !currentStep) return;

    function updatePosition() {
      const vwCurrent = window.innerWidth || document.documentElement?.clientWidth || 1200;
      const vhCurrent = window.innerHeight || document.documentElement?.clientHeight || 800;
      setViewport({ w: vwCurrent, h: vhCurrent });

      if (cardRef.current) {
        setCardHeight(cardRef.current.offsetHeight);
      }

      if (currentStep?.target) {
        const el = document.querySelector(currentStep.target);
        if (el) {
          const rect = el.getBoundingClientRect();
          const sidebar = document.querySelector('.admin-sidebar');
          const isSidebar = sidebar ? sidebar.contains(el) : (rect.left < 320 && rect.width <= 320);

          // On mobile/narrow viewports, if the target is hidden or off-screen (e.g. inside the closed sidebar drawer),
          // fall back to a cleanly centered tour card with no off-screen spotlight cutout.
          const isHiddenOrOffscreen =
            rect.width <= 0 ||
            rect.height <= 0 ||
            rect.right <= 0 ||
            rect.left >= vwCurrent ||
            (vwCurrent <= 768 && isSidebar && (!sidebar || !sidebar.classList.contains('mobile-open')));

          if (isHiddenOrOffscreen) {
            setTargetRect(null);
            return;
          }

          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right,
          });

          const isInViewport =
            rect.top >= 0 && rect.bottom <= vhCurrent && rect.left >= 0 && rect.right <= vwCurrent;
          if (!isInViewport && !isSidebar) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          }
          return;
        }
      }
      setTargetRect(null); // Fallback to centered modal
    }

    updatePosition();
    const t1 = setTimeout(updatePosition, 50);
    const t2 = setTimeout(updatePosition, 160);
    const t3 = setTimeout(updatePosition, 360);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    // Also observe sidebar if user folds/unfolds it during tour
    let observer = null;
    const sidebarEl = document.querySelector('.admin-sidebar');
    if (sidebarEl && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updatePosition();
      });
      observer.observe(sidebarEl);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      if (observer) observer.disconnect();
    };
  }, [isTourActive, currentStep, currentStepIndex]);

  // Keyboard navigation (Escape, ArrowRight, ArrowLeft)
  useEffect(() => {
    if (!isTourActive) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        endTour(true);
      } else if (e.key === 'ArrowRight') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourActive, nextStep, prevStep, endTour]);

  if (typeof document === 'undefined') return null;

  if (!isTourActive) {
    return null;
  }

  const isLastStep = currentStepIndex === totalSteps - 1;

  // Viewport and sizing calculation (use actual window dimensions matching 1:1 unzoomed tour wrapper)
  const vw = (typeof window !== 'undefined' && window.innerWidth) || viewport.w || 1200;
  const vh = (typeof window !== 'undefined' && window.innerHeight) || viewport.h || 800;
  const isMobile = vw <= 768;
  const cardWidth = Math.min(440, Math.max(260, vw - 24));
  const effectiveCardHeight = cardRef.current?.offsetHeight || cardHeight || 360;

  const targetEl = currentStep?.target ? document.querySelector(currentStep.target) : null;
  const sidebarEl = typeof document !== 'undefined' ? document.querySelector('.admin-sidebar') : null;
  const isSidebarTarget = Boolean(
    targetRect && (
      (targetEl && sidebarEl && sidebarEl.contains(targetEl)) ||
      (targetRect.left < 320 && targetRect.width <= 320)
    )
  );

  // Get active browser CSS zoom factor on <html> if present (e.g. --app-zoom: 0.9)
  const getAppZoom = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 1;
    const computed = getComputedStyle(document.documentElement).zoom;
    const parsed = parseFloat(computed);
    return parsed && !isNaN(parsed) && parsed > 0 ? parsed : 1;
  };

  const zoomFactor = getAppZoom();

  // For sidebar targets, use exact 0 padding so the frame fits the div pill exactly
  const padX = isSidebarTarget ? 0 : 4;
  const padY = isSidebarTarget ? 0 : 4;
  const cornerRadius = isSidebarTarget ? 10 : 8;

  const cutoutX = targetRect ? Math.max(0, targetRect.left - padX) : 0;
  const cutoutY = targetRect ? Math.max(0, targetRect.top - padY) : 0;
  const cutoutW = targetRect ? targetRect.width + padX * 2 : 0;
  const cutoutH = targetRect ? targetRect.height + padY * 2 : 0;

  // Use flexbox centered modal overlay when no target is visible (e.g. Step 1 intro or mobile hidden sidebar targets)
  const isCentered = !targetRect || (isMobile && isSidebarTarget);

  // Calculate card positioning relative to targetRect with intelligent viewport clamping
  let cardStyle = {};

  if (!isCentered && targetRect) {
    if (isSidebarTarget && !isMobile) {
      // Place card to the RIGHT of the entire sidebar so sidebar item is fully visible and not blocked
      const sidebarRect = sidebarEl ? sidebarEl.getBoundingClientRect() : null;
      const sidebarRight = sidebarRect ? sidebarRect.right : targetRect.right;
      const anchorRight = Math.max(targetRect.right, sidebarRight);

      let left = anchorRight + 20;

      // If sidebar + card overflows viewport, clamp safely
      if (left + cardWidth > vw - 16) {
        left = Math.max(16, vw - cardWidth - 16);
      }

      // Center card vertically aligned with target, clamped inside viewport
      let top = targetRect.top + targetRect.height / 2 - effectiveCardHeight / 2;
      top = Math.max(16, Math.min(top, vh - effectiveCardHeight - 16));

      cardStyle = {
        position: 'fixed',
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        width: `${cardWidth}px`,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 32px)',
        zIndex: 100002,
      };
    } else if (isMobile) {
      // Mobile viewport with visible main-area target: full-width clamped card anchored above or below target
      const spaceBelow = vh - targetRect.bottom;
      const spaceAbove = targetRect.top;

      let top;
      if (spaceBelow >= Math.min(effectiveCardHeight, vh * 0.55) + 16) {
        top = targetRect.bottom + 12;
      } else if (spaceAbove >= Math.min(effectiveCardHeight, vh * 0.55) + 16) {
        top = targetRect.top - effectiveCardHeight - 12;
      } else {
        top = Math.max(12, (vh - effectiveCardHeight) / 2);
      }
      top = Math.max(12, Math.min(top, Math.max(12, vh - effectiveCardHeight - 12)));

      cardStyle = {
        position: 'fixed',
        top: `${Math.round(top)}px`,
        left: '12px',
        right: '12px',
        width: 'auto',
        maxWidth: '440px',
        margin: '0 auto',
        maxHeight: 'calc(100dvh - 24px)',
        zIndex: 100002,
      };
    } else {
      // Desktop target in main area: place below if room, otherwise above, clamped
      const spaceBelow = vh - targetRect.bottom;
      const spaceAbove = targetRect.top;

      let top;
      if (spaceBelow >= effectiveCardHeight + 20) {
        top = targetRect.bottom + 14;
      } else if (spaceAbove >= effectiveCardHeight + 20) {
        top = targetRect.top - effectiveCardHeight - 14;
      } else {
        top = targetRect.top + targetRect.height / 2 - effectiveCardHeight / 2;
      }
      top = Math.max(16, Math.min(top, vh - effectiveCardHeight - 16));

      let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
      left = Math.max(16, Math.min(left, vw - cardWidth - 16));

      cardStyle = {
        position: 'fixed',
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        width: `${cardWidth}px`,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 32px)',
        zIndex: 100002,
      };
    }
  } else {
    // Centered modal card inside .tour-centered-overlay flexbox container (immune to transform/zoom drift)
    cardStyle = {
      position: 'relative',
      width: '100%',
      maxWidth: '440px',
      maxHeight: 'calc(100dvh - 24px)',
      zIndex: 100002,
    };
  }

  const stepIcons = {
    welcome: <CrownIcon size={20} />,
    'welcome-mentor': <CrownIcon size={20} />,
    metrics: <StarIcon size={20} />,
    'mentor-metrics': <StarIcon size={20} />,
    explore: <SearchIcon size={20} />,
    'explore-problems': <SearchIcon size={20} />,
    'post-problem': <PlusIcon size={20} />,
    'my-problems': <DocumentIcon size={20} />,
    'my-proposals': <FileEditIcon size={20} />,
    contracts: <DocumentIcon size={20} />,
    'mentor-contracts': <DocumentIcon size={20} />,
    availability: <ClockIcon size={20} />,
    calendar: <CalendarIcon size={20} />,
    sessions: <ClockIcon size={20} />,
    'mentor-sessions': <ClockIcon size={20} />,
    messages: <MessageIcon size={20} />,
    'mentor-messages': <MessageIcon size={20} />,
    payments: <CreditCardIcon size={20} />,
    earnings: <WalletIcon size={20} />,
    reviews: <StarIcon size={20} />,
    'sidebar-fold': <PanelLeftCloseIcon size={20} />,
    'sidebar-fold-mentor': <PanelLeftCloseIcon size={20} />,
    'user-menu': <UserIcon size={20} />,
    'mentor-user-menu': <ShieldCheckIcon size={20} />,
  };

  const icon = stepIcons[currentStep.id] || <HelpCircleIcon size={20} />;

  return createPortal(
    <div
      className="tour-wrapper"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100000,
        zoom: zoomFactor !== 1 ? 1 / zoomFactor : undefined,
      }}
    >
      {/* SVG Mask Backdrop with transparent cutout hole directly over the target option */}
      <svg
        className="tour-svg-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          zIndex: 100000,
          pointerEvents: 'auto',
        }}
        onClick={() => endTour(false)}
      >
        <defs>
          <mask id="tour-cutout-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            {/* White area = visible dark overlay - covers 100% of screen under all viewport & zoom conditions */}
            <rect x="0" y="0" width="100%" height="100%" fill="#ffffff" />
            {/* Black area = 100% transparent cutout hole matching exact div bounds */}
            {!isCentered && targetRect && (
              <rect
                x={cutoutX}
                y={cutoutY}
                width={cutoutW}
                height={cutoutH}
                rx={cornerRadius}
                ry={cornerRadius}
                fill="#000000"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.72)"
          mask="url(#tour-cutout-mask)"
        />
      </svg>

      {/* Glowing spotlight frame around target element - exactly fitted to target div */}
      {!isCentered && targetRect && (
        <div
          className="tour-spotlight-frame"
          style={{
            position: 'fixed',
            top: `${cutoutY}px`,
            left: `${cutoutX}px`,
            width: `${cutoutW}px`,
            height: `${cutoutH}px`,
            boxSizing: 'border-box',
            borderRadius: `${cornerRadius}px`,
            border: '2px solid var(--accent)',
            boxShadow: '0 0 16px rgba(38, 71, 214, 0.65), inset 0 0 8px rgba(38, 71, 214, 0.25)',
            pointerEvents: 'none',
            zIndex: 100001,
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      )}

      {/* Floating Tour Step Card */}
      <div className={isCentered ? 'tour-centered-overlay' : undefined}>
      <div ref={cardRef} className={`tour-card ${isCentered ? 'tour-card--centered' : ''}`} style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {/* Top Header: Progress and Role Switcher */}
        <div className="tour-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="tour-step-badge">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            <span className="tour-role-badge">
              {tourRole === 'mentor' ? 'Mentor Tour' : 'Learner Tour'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="tour-close-btn"
              onClick={() => endTour(true)}
              aria-label="Exit tour"
              title="Close tour"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>

        {/* Progress bar line */}
        <div className="tour-progress-track">
          <div
            className="tour-progress-bar"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Main Step Content */}
        <div className="tour-card-body">
          <div className="tour-title-row">
            <div className="tour-icon-box">{icon}</div>
            <div>
              <h3 className="tour-title">{currentStep.title}</h3>
              {currentStep.badge && <span className="tour-category-tag">{currentStep.badge}</span>}
            </div>
          </div>

          <p className="tour-description">{currentStep.description}</p>

          {/* Feature highlights tags */}
          {currentStep.tags && currentStep.tags.length > 0 && (
            <div className="tour-tags-row">
              {currentStep.tags.map((tag, i) => (
                <span key={i} className="tour-tag">
                  <CheckCircleIcon size={12} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Navigation Actions */}
        <div className="tour-card-footer">
          {/* Step dots */}
          <div className="tour-dots">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`tour-dot ${idx === currentStepIndex ? 'active' : ''}`}
                onClick={() => goToStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <ChevronLeftIcon size={14} /> Back
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={nextStep}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              {isLastStep ? (
                <>
                  <CheckCircleIcon size={14} /> Finish Tour
                </>
              ) : (
                <>
                  Next <ChevronRightIcon size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}

