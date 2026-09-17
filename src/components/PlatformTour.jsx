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

  // Track active target element class
  useEffect(() => {
    if (!isTourActive || !currentStep?.target) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      el.classList.add('tour-active-target');
      return () => {
        el.classList.remove('tour-active-target');
      };
    }
  }, [isTourActive, currentStep]);

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
      setViewport({ w: window.innerWidth, h: window.innerHeight });

      if (cardRef.current) {
        setCardHeight(cardRef.current.offsetHeight);
      }

      if (currentStep.target) {
        const el = document.querySelector(currentStep.target);
        if (el) {
          const rect = el.getBoundingClientRect();
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right,
          });
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          return;
        }
      }
      setTargetRect(null); // Fallback to centered modal
    }

    updatePosition();
    const timer = setTimeout(updatePosition, 80);

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
      clearTimeout(timer);
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

  // Calculate card positioning relative to targetRect with intelligent viewport clamping
  let cardStyle = {};
  const vw = viewport.w;
  const vh = viewport.h;
  const cardWidth = Math.min(440, Math.max(300, vw - 32));
  const effectiveCardHeight = cardRef.current?.offsetHeight || cardHeight || 360;

  if (targetRect) {
    const isSidebarTarget = targetRect.left < 300 && targetRect.width <= 320;

    if (isSidebarTarget && vw > 768) {
      // Place card to the RIGHT of sidebar so sidebar item is fully visible and not blocked
      const left = Math.min(targetRect.right + 20, vw - cardWidth - 16);

      // Center card vertically aligned with target, clamped inside viewport
      let top = targetRect.top + targetRect.height / 2 - effectiveCardHeight / 2;
      top = Math.max(16, Math.min(top, vh - effectiveCardHeight - 16));

      cardStyle = {
        position: 'fixed',
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        maxHeight: 'calc(100vh - 32px)',
        zIndex: 100002,
      };
    } else {
      // Target in main area: place below if room, otherwise above, clamped
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
        maxHeight: 'calc(100vh - 32px)',
        zIndex: 100002,
      };
    }
  } else {
    // Centered modal style for intro step
    cardStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxHeight: 'calc(100vh - 32px)',
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
    <div className="tour-wrapper" role="dialog" aria-modal="true">
      {/* SVG Mask Backdrop with transparent cutout hole directly over the target option */}
      <svg
        className="tour-svg-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 100000,
          pointerEvents: 'auto',
        }}
        onClick={() => endTour(false)}
      >
        <defs>
          <mask id="tour-cutout-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            {/* White area = visible dark overlay */}
            <rect x="0" y="0" width={vw} height={vh} fill="#ffffff" />
            {/* Black area = 100% transparent cutout hole */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="8"
                ry="8"
                fill="#000000"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={vw}
          height={vh}
          fill="rgba(0, 0, 0, 0.72)"
          mask="url(#tour-cutout-mask)"
        />
      </svg>

      {/* Glowing spotlight frame around target element */}
      {targetRect && (
        <div
          className="tour-spotlight-frame"
          style={{
            position: 'fixed',
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            borderRadius: '8px',
            border: '2px solid var(--accent)',
            boxShadow: '0 0 16px rgba(38, 71, 214, 0.65), inset 0 0 8px rgba(38, 71, 214, 0.25)',
            pointerEvents: 'none',
            zIndex: 100001,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      )}

      {/* Floating Tour Step Card */}
      <div ref={cardRef} className="tour-card" style={cardStyle} onClick={(e) => e.stopPropagation()}>
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
    </div>,
    document.body
  );
}

