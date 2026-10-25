import React from 'react';
import { useTour } from '../context/TourContext';
import { CrownIcon, ChevronRightIcon, XIcon } from './Icons';

export default function TourBanner({ role = 'learner' }) {
  const { startTour, dismissBanner, isBannerDismissed } = useTour();

  // If dismissed or tour already completed, do not render
  if (isBannerDismissed(role)) return null;

  const handleStartTour = () => {
    dismissBanner(role);
    startTour(role);
  };

  const handleDismiss = () => {
    dismissBanner(role);
  };

  const isMentor = role === 'mentor';

  return (
    <div className="tour-welcome-banner">
      <div className="tour-banner-left">
        <div className="tour-banner-icon-badge">
          <CrownIcon size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="tour-banner-tag">Platform Tour</span>
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600 }}>
              60-second interactive walkthrough
            </span>
          </div>
          <h4 className="tour-banner-title">
            {isMentor
              ? 'New to the Mentor Workspace? Take the guided walkthrough'
              : 'New to PairUp? Take a quick guided tour of all features'}
          </h4>
          <p className="tour-banner-desc">
            {isMentor
              ? 'Learn how to explore open problems, submit milestone proposals, configure weekly working hours, host live Monaco pair sessions, and collect wallet payouts.'
              : 'Discover how to find top mentors, post problem bounties, join real-time Monaco + WebRTC video rooms, and take advantage of secure escrow protection.'}
          </p>
        </div>
      </div>

      <div className="tour-banner-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleStartTour}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          <span>Start Guided Tour</span>
          <ChevronRightIcon size={15} />
        </button>
        <button
          type="button"
          className="tour-banner-dismiss-btn"
          onClick={handleDismiss}
          aria-label="Dismiss tour banner"
          title="Dismiss banner"
        >
          <XIcon size={15} />
        </button>
      </div>
    </div>
  );
}
