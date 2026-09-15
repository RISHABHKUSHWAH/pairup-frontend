import React, { useId } from 'react';

export default function PairUpLoader({
  text = 'LOADING PLEASE WAIT',
  size = 520,
  fullScreen = false,
  showBackground = true,
  className = '',
  style = {},
}) {
  const uid = useId().replace(/[:]/g, '');

  const bgGradId = `bgCanvas_${uid}`;
  const primaryBlueGradId = `primaryBlueGrad_${uid}`;
  const skyBlueGradId = `skyBlueGrad_${uid}`;
  const cardShadowId = `cardShadow_${uid}`;
  const packetGlowId = `packetGlow_${uid}`;

  const loaderSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 480"
      width="100%"
      height="100%"
      style={{
        maxWidth: typeof size === 'number' ? `${size}px` : size,
        height: 'auto',
        display: 'block',
        margin: '0 auto',
      }}
      role="progressbar"
      aria-label={text}
    >
      <defs>
        {/* Background Canvas Gradient */}
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--surface, #FFFFFF)" />
          <stop offset="100%" stopColor="var(--bg, #F4F8FC)" />
        </linearGradient>

        {/* Node 1: Solid Primary Deep Blue */}
        <linearGradient id={primaryBlueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Node 2: Sky Blue Stroke Gradient */}
        <linearGradient id={skyBlueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Soft Drop Shadow for Cards */}
        <filter id={cardShadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#0F2A4A" floodOpacity="0.08" />
        </filter>

        {/* Glowing Effect for Moving Packet */}
        <filter id={packetGlowId} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#0284C7" floodOpacity="0.5" />
        </filter>

        <style>{`
          @keyframes travel_${uid} {
            0%, 100% {
              transform: translateX(0px);
            }
            50% {
              transform: translateX(260px);
            }
          }

          @keyframes dashFlow_${uid} {
            to {
              stroke-dashoffset: -48;
            }
          }

          @keyframes pulseLeft_${uid} {
            0%, 100% {
              transform: scale(1.15);
              opacity: 1;
            }
            50% {
              transform: scale(0.9);
              opacity: 0.75;
            }
          }

          @keyframes pulseRight_${uid} {
            0%, 100% {
              transform: scale(0.9);
              opacity: 0.75;
            }
            50% {
              transform: scale(1.15);
              opacity: 1;
            }
          }

          @keyframes dotFade_${uid} {
            0%, 20% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }

          .animated-packet_${uid} {
            animation: travel_${uid} 2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          }

          .animated-track_${uid} {
            animation: dashFlow_${uid} 1.2s linear infinite;
          }

          .node-left-core_${uid} {
            transform-origin: 220px 200px;
            animation: pulseLeft_${uid} 2s ease-in-out infinite;
          }

          .node-right-core_${uid} {
            transform-origin: 580px 200px;
            animation: pulseRight_${uid} 2s ease-in-out infinite;
          }

          .dot-1_${uid} { animation: dotFade_${uid} 1.4s infinite 0.2s; }
          .dot-2_${uid} { animation: dotFade_${uid} 1.4s infinite 0.4s; }
          .dot-3_${uid} { animation: dotFade_${uid} 1.4s infinite 0.6s; }
        `}</style>
      </defs>

      {/* Clean Canvas Background */}
      {showBackground && (
        <rect
          width="800"
          height="480"
          fill={`url(#${bgGradId})`}
          rx="28"
          stroke="var(--grid-strong, rgba(0,0,0,0.06))"
          strokeWidth="1"
        />
      )}

      {/* ================= LOGO ICON / LOADER ================= */}
      <g id="icon-mark" transform="translate(0, -10)">
        {/* Animated Connection Track */}
        <line
          className={`animated-track_${uid}`}
          x1="270"
          y1="200"
          x2="530"
          y2="200"
          stroke="var(--accent-soft, #BFDBFE)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="10 14"
        />

        {/* Left Node: Solid Primary Blue Squircle (Host / Mentor) */}
        <g filter={`url(#${cardShadowId})`}>
          <rect x="150" y="130" width="140" height="140" rx="42" fill={`url(#${primaryBlueGradId})`} />
          <circle className={`node-left-core_${uid}`} cx="220" cy="200" r="18" fill="#FFFFFF" />
        </g>

        {/* Right Node: Outlined Sky Blue Squircle (Guest / Mentee) */}
        <g filter={`url(#${cardShadowId})`}>
          <rect
            x="510"
            y="130"
            width="140"
            height="140"
            rx="42"
            fill="var(--surface, #FFFFFF)"
            stroke={`url(#${skyBlueGradId})`}
            strokeWidth="9"
          />
          <circle className={`node-right-core_${uid}`} cx="580" cy="200" r="18" fill={`url(#${skyBlueGradId})`} />
        </g>

        {/* Animated Moving Packet (Travels from 270 to 530) */}
        <g className={`animated-packet_${uid}`}>
          <circle cx="270" cy="200" r="13" fill="#0EA5E9" filter={`url(#${packetGlowId})`} />
          <circle cx="270" cy="200" r="4.5" fill="#FFFFFF" opacity="0.95" />
        </g>
      </g>

      {/* ================= TYPOGRAPHY & LOADING TEXT ================= */}
      <g id="typography" textAnchor="middle">
        <text
          x="400"
          y="388"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="4"
          fill="var(--ink-muted, #64748B)"
        >
          {text}
          <tspan className={`dot-1_${uid}`}>.</tspan>
          <tspan className={`dot-2_${uid}`}>.</tspan>
          <tspan className={`dot-3_${uid}`}>.</tspan>
        </text>
      </g>
    </svg>
  );

  if (fullScreen) {
    return (
      <div
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg, #F8FAFC)',
          padding: '24px',
          ...style,
        }}
      >
        {loaderSvg}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        width: '100%',
        ...style,
      }}
    >
      {loaderSvg}
    </div>
  );
}
