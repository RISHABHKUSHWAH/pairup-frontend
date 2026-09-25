import React from 'react';

/**
 * Renders an optimized SVG icon for a given technology or skill name.
 * Falls back to a clean code bracket icon if the technology doesn't have a custom icon.
 */
export function TechIcon({ name = '', size = 14, className = '' }) {
  const normalized = String(name).trim().toLowerCase();

  switch (normalized) {
    case 'python':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M11.9 2C6.9 2 7.2 4.1 7.2 4.1l.01 2.2h4.8v.7H5.2S2 6.6 2 11.6s2.8 4.9 2.8 4.9h1.7v-2.4s-.1-2.8 2.8-2.8h4.7s2.7.1 2.7-2.6V4.6S17 2 11.9 2zm-1.4 1.5a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"
            fill="currentColor"
          />
          <path
            d="M12.1 22c5 0 4.7-2.1 4.7-2.1l-.01-2.2h-4.8v-.7h6.8s3.2.4 3.2-4.6-2.8-4.9-2.8-4.9h-1.7v2.4s.1 2.8-2.8 2.8H10s-2.7-.1-2.7 2.6v4.1S7 22 12.1 22zm1.4-1.5a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z"
            fill="currentColor"
            opacity="0.85"
          />
        </svg>
      );

    case 'react':
    case 'reactjs':
    case 'react native':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(0 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
      );

    case 'docker':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <rect x="3" y="10" width="2" height="2" rx="0.3" />
          <rect x="6" y="10" width="2" height="2" rx="0.3" />
          <rect x="9" y="10" width="2" height="2" rx="0.3" />
          <rect x="12" y="10" width="2" height="2" rx="0.3" />
          <rect x="6" y="7" width="2" height="2" rx="0.3" />
          <rect x="9" y="7" width="2" height="2" rx="0.3" />
          <rect x="12" y="7" width="2" height="2" rx="0.3" />
          <rect x="9" y="4" width="2" height="2" rx="0.3" />
          <path d="M22 12.5c-.8-.2-2-.1-2.7.5-.5-.7-1.4-1-2.3-.9-1.2.1-2.2 1-2.3 2.2-.4.1-.9.1-1.3.1H1.5c-.3 1.2 0 4.1 2.5 6.2 3.1 2.6 8.3 2.6 11.8.4 4.1-2.5 5.7-6.2 6.2-8.5z" />
        </svg>
      );

    case 'aws':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M6 16.5c-2.5 0-4-1.8-4-4 0-2 1.5-3.8 3.5-4 1-.1 1.9.3 2.5.8C8.8 6.5 11 4.5 13.8 5c2.3.4 4 2.2 4.2 4.5 1.5.3 2.8 1.4 3 3 .3 2.1-1.3 4-3.5 4H6z" />
          <path d="M7 19c3 1.5 7 1.5 10 0" />
          <polyline points="15.5 18 17 19 16 20.5" />
        </svg>
      );

    case 'django':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12.7 3.5h3.1v10.8c0 2.2-.7 3.7-2 4.6-1.1.8-2.6 1.1-4.4 1.1-1.6 0-3.1-.3-4.1-.9l.7-2.6c.9.5 2 .7 3.2.7 1.9 0 3.5-.8 3.5-3.3V3.5zm-5.9 7.6h3v8.5H6.8v-8.5z" />
          <circle cx="8.3" cy="7.2" r="1.6" />
        </svg>
      );

    case 'kubernetes':
    case 'k8s':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="12 2 21 7.2 21 16.8 12 22 3 16.8 3 7.2 12 2" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="9" x2="12" y2="4.5" />
          <line x1="14.5" y1="13.5" x2="18.5" y2="15.5" />
          <line x1="9.5" y1="13.5" x2="5.5" y2="15.5" />
        </svg>
      );

    case 'terraform':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <polygon points="2 3 9 7.1 9 15.3 2 11.2 2 3" />
          <polygon points="9.5 7.4 16.5 11.5 16.5 19.7 9.5 15.6 9.5 7.4" />
          <polygon points="17 11.8 24 15.9 24 24.1 17 20 17 11.8" />
          <polygon points="17 3 24 7.1 24 15.3 17 11.2 17 3" />
        </svg>
      );

    case 'devops':
    case 'ci/cd':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M8 12c-2.8 0-5 2.2-5 5s2.2 5 5 5c3.5 0 5.7-4.4 8-10 2.3-5.6 4.5-10 8-10 2.8 0 5 2.2 5 5s-2.2 5-5 5c-3.5 0-5.7-4.4-8-10" />
        </svg>
      );

    case 'dsa':
    case 'algorithms':
    case 'data structures':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <line x1="10.5" y1="7.2" x2="7.5" y2="15.8" />
          <line x1="13.5" y1="7.2" x2="16.5" y2="15.8" />
        </svg>
      );

    case 'graphql':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="12 2 21 7.2 21 16.8 12 22 3 16.8 3 7.2 12 2" />
          <polygon points="12 6.5 17 9.5 17 14.5 12 17.5 7 14.5 7 9.5 12 6.5" />
          <circle cx="12" cy="2" r="1.5" fill="currentColor" />
          <circle cx="21" cy="7.2" r="1.5" fill="currentColor" />
          <circle cx="21" cy="16.8" r="1.5" fill="currentColor" />
          <circle cx="12" cy="22" r="1.5" fill="currentColor" />
          <circle cx="3" cy="16.8" r="1.5" fill="currentColor" />
          <circle cx="3" cy="7.2" r="1.5" fill="currentColor" />
        </svg>
      );

    case 'sql':
    case 'postgresql':
    case 'mysql':
    case 'mongodb':
    case 'database':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );

    case 'javascript':
    case 'js':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 12v4a2 2 0 0 0 4 0v-4" />
          <path d="M15 13c.5-.7 1.2-1 2-1 1.2 0 2 .8 2 2 0 1.5-2 2-2 3 0 .7.8 1 2 1" />
        </svg>
      );

    case 'typescript':
    case 'ts':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <line x1="8" y1="8" x2="14" y2="8" />
          <line x1="11" y1="8" x2="11" y2="16" />
          <path d="M15 13c.5-.7 1.2-1 2-1 1.2 0 2 .8 2 2 0 1.5-2 2-2 3 0 .7.8 1 2 1" />
        </svg>
      );

    case 'node':
    case 'nodejs':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="12 2 21 7.2 21 16.8 12 22 3 16.8 3 7.2 12 2" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );

    case 'go':
    case 'golang':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="6" cy="12" r="3.5" />
          <path d="M14 9.5h6v5h-4" />
        </svg>
      );

    case 'git':
    case 'github':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="9" r="3" />
          <circle cx="6" cy="6" r="3" />
          <line x1="6" y1="9" x2="6" y2="15" />
          <path d="M18 12a9 9 0 0 1-9 9" />
        </svg>
      );

    case 'system design':
    case 'architecture':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="2" y="3" width="6" height="5" rx="1" />
          <rect x="16" y="3" width="6" height="5" rx="1" />
          <rect x="9" y="16" width="6" height="5" rx="1" />
          <line x1="5" y1="8" x2="5" y2="12" />
          <line x1="19" y1="8" x2="19" y2="12" />
          <line x1="5" y1="12" x2="19" y2="12" />
          <line x1="12" y1="12" x2="12" y2="16" />
        </svg>
      );

    case 'all':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );

    default:
      // Clean, modern code tag icon: < / >
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
  }
}
