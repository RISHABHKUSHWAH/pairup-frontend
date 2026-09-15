import React from 'react';
import { Link } from 'react-router-dom';
import PairUpLogo from './PairUpLogo';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="logo" to="/" title="PairUp Home">
              <PairUpLogo size={22} className="logo-mark" />
              <span>PairUp</span>
            </Link>
            <div className="footer-tagline">
              Get unstuck. Pair with<br />a developer, live.
            </div>
            <div className="footer-social">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" title="Twitter / X">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.4l8.1-9.3L1 2h7.2l5 6.6L18.9 2zm-1.2 18h1.7L7.4 4H5.6l12.1 16z" />
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" title="LinkedIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.11 1 2.48 1s2.5 1.12 2.5 2.5zM.22 8.24h4.56V23H.22V8.24zm7.5 0h4.37v2.01h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 7v8.12h-4.56v-7.2c0-1.72-.03-3.93-2.4-3.93-2.4 0-2.77 1.87-2.77 3.8v7.33H7.72V8.24z" />
                </svg>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" title="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.02c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3z" />
                </svg>
              </a>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <Link to="/">Browse mentors</Link>
              <Link to="/become-a-mentor">Become a mentor</Link>
            </div>
            <div className="footer-col">
              <Link to="/help">Help &amp; support</Link>
              <Link to="/contact">Contact</Link>
            </div>
            <div className="footer-col">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© {new Date().getFullYear()} PairUp. All rights reserved.</span>
          <span className="footer-trust">
            <span className="led-sm"></span>Escrow-protected payments
          </span>
        </div>
      </div>
    </footer>
  );
}
