import React, { useId } from 'react';

/**
 * PairUp Official Logo Component
 *
 * Implements the official PairUp brand mark:
 * - Left Node: Solid Primary Deep Blue squircle (Host / Mentor)
 * - Connection Bridge: Dashed line with active cyan data transmission node
 * - Right Node: Outlined Sky Blue squircle (Guest / Mentee)
 *
 * @param {Object} props
 * @param {'mark' | 'card' | 'icon'} [props.variant='mark'] - Logo display variant
 * @param {number|string} [props.size=24] - Height of the logo in pixels (for mark/icon)
 * @param {number|string} [props.width] - Optional explicit width
 * @param {boolean} [props.showText=false] - Whether to render 'PairUp' brand text alongside
 * @param {string} [props.className=''] - Extra CSS class
 * @param {React.CSSProperties} [props.style] - Inline CSS styles
 */
export default function PairUpLogo({
  variant = 'mark',
  size = 24,
  width,
  showText = false,
  className = '',
  style = {},
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const primaryBlueGradId = `publue-${uid}`;
  const skyBlueGradId = `pusky-${uid}`;
  const cardShadowId = `pushadow-${uid}`;
  const packetGlowId = `puglow-${uid}`;
  const bgCanvasId = `pubg-${uid}`;

  // Full Card Variant (800x480 with canvas background)
  if (variant === 'card') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 480"
        width={width || '100%'}
        height={size ? (typeof size === 'number' ? `${size}px` : size) : '100%'}
        className={`pairup-logo-card ${className}`.trim()}
        style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
        {...rest}
      >
        <defs>
          <linearGradient id={bgCanvasId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F4F8FC" />
          </linearGradient>

          <linearGradient id={primaryBlueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          <linearGradient id={skyBlueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <filter id={cardShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#0F2A4A" floodOpacity="0.08" />
          </filter>

          <filter id={packetGlowId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#0284C7" floodOpacity="0.35" />
          </filter>
        </defs>

        <rect width="800" height="480" fill={`url(#${bgCanvasId})`} rx="28" />

        <g id="icon-mark" transform="translate(0, -10)">
          <line
            x1="270"
            y1="200"
            x2="530"
            y2="200"
            stroke="#BFDBFE"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="10 14"
          />

          <circle cx="400" cy="200" r="13" fill="#0EA5E9" filter={`url(#${packetGlowId})`} />
          <circle cx="400" cy="200" r="4.5" fill="#FFFFFF" opacity="0.95" />

          <g filter={`url(#${cardShadowId})`}>
            <rect x="150" y="130" width="140" height="140" rx="42" fill={`url(#${primaryBlueGradId})`} />
            <circle cx="220" cy="200" r="18" fill="#FFFFFF" />
          </g>

          <g filter={`url(#${cardShadowId})`}>
            <rect
              x="510"
              y="130"
              width="140"
              height="140"
              rx="42"
              fill="#FFFFFF"
              stroke={`url(#${skyBlueGradId})`}
              strokeWidth="9"
            />
            <circle cx="580" cy="200" r="18" fill={`url(#${skyBlueGradId})`} />
          </g>
        </g>
      </svg>
    );
  }

  // Single Icon Variant (square mentor squircle)
  if (variant === 'icon') {
    const iconSize = typeof size === 'number' ? `${size}px` : size;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="130 100 180 180"
        width={width || iconSize}
        height={iconSize}
        className={`pairup-logo-icon ${className}`.trim()}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
        {...rest}
      >
        <defs>
          <linearGradient id={primaryBlueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <filter id={cardShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0F2A4A" floodOpacity="0.12" />
          </filter>
        </defs>
        <g filter={`url(#${cardShadowId})`}>
          <rect x="150" y="120" width="140" height="140" rx="42" fill={`url(#${primaryBlueGradId})`} />
          <circle cx="220" cy="190" r="20" fill="#FFFFFF" />
        </g>
      </svg>
    );
  }

  // Default: Brand Mark Variant (Connected Nodes)
  // ViewBox tightly framing the two connected nodes and transmission packet
  // x: 130..670 (width: 540), y: 95..290 (height: 195) -> aspect ratio ~ 2.77:1
  const computedHeight = typeof size === 'number' ? `${size}px` : size;
  const computedWidth = width || (typeof size === 'number' ? `${Math.round(size * 2.77)}px` : undefined);

  const markSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="130 95 540 195"
      width={computedWidth}
      height={computedHeight}
      className={`pairup-logo-mark ${className}`.trim()}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id={primaryBlueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        <linearGradient id={skyBlueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        <filter id={cardShadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0F2A4A" floodOpacity="0.12" />
        </filter>

        <filter id={packetGlowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#0284C7" floodOpacity="0.4" />
        </filter>
      </defs>

      <g id="icon-mark" transform="translate(0, -10)">
        {/* Connection Bridge */}
        <line
          x1="270"
          y1="200"
          x2="530"
          y2="200"
          stroke="#BFDBFE"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="10 14"
        />

        {/* Active Data Transmission Node */}
        <circle cx="400" cy="200" r="14" fill="#0EA5E9" filter={`url(#${packetGlowId})`} />
        <circle cx="400" cy="200" r="5" fill="#FFFFFF" opacity="0.95" />

        {/* Left Node: Mentor / Host */}
        <g filter={`url(#${cardShadowId})`}>
          <rect x="150" y="130" width="140" height="140" rx="42" fill={`url(#${primaryBlueGradId})`} />
          <circle cx="220" cy="200" r="20" fill="#FFFFFF" />
        </g>

        {/* Right Node: Mentee / Guest */}
        <g filter={`url(#${cardShadowId})`}>
          <rect
            x="510"
            y="130"
            width="140"
            height="140"
            rx="42"
            fill="#FFFFFF"
            stroke={`url(#${skyBlueGradId})`}
            strokeWidth="11"
          />
          <circle cx="580" cy="200" r="20" fill={`url(#${skyBlueGradId})`} />
        </g>
      </g>
    </svg>
  );

  if (!showText) {
    return markSvg;
  }

  return (
    <span
      className="pairup-brand"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 800,
        fontSize: '19px',
        textDecoration: 'none',
      }}
    >
      {markSvg}
      <span className="logo-text">PairUp</span>
    </span>
  );
}
