import React, { useState } from 'react';
import { useTour } from '../context/TourContext';
import { CrownIcon, ChevronRightIcon, XIcon, CheckCircleIcon } from './Icons';

export default function TourBanner({ role = 'learner' }) {
  const { startTour } = useTour();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(`pairup_banner_dismissed_${role}`) === 'true';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(`pairup_banner_dismissed_${role}`, 'true');
    } catch {}
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
          onClick={() => startTour(role)}
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
