import React, { useState } from 'react';
import { ChevronDownIcon } from './Icons';

function formatEntryTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function CounterHistoryTimeline({
  history = [],
  viewerRole = 'learner',
  title = 'Negotiation & Counter-Offer History',
  defaultOpen = false,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const entries = Array.isArray(history) ? history : [];
  if (entries.length === 0) return null;

  let counterRound = 0;
  const counterCount = entries.filter((e) => e.action === 'counter').length;

  return (
    <div
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border, var(--grid-strong))',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          padding: '11px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          flexWrap: 'wrap',
        }}
        title={isOpen ? 'Click to collapse history' : 'Click to view negotiation & counter-offer history'}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '12.5px', color: 'var(--ink)' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-muted)',
              transition: 'transform 0.18s ease',
              transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          >
            <ChevronDownIcon size={15} />
          </span>
          <span>{title}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="mono"
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: counterCount > 0 ? 'rgba(99, 102, 241, 0.14)' : 'var(--bg)',
              color: counterCount > 0 ? 'var(--accent, #6366f1)' : 'var(--ink-muted)',
              border: counterCount > 0 ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--grid-strong)',
            }}
          >
            {counterCount} {counterCount === 1 ? 'Counter-Offer' : 'Counter-Offers'}
          </span>
        </div>
      </button>

      {isOpen && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 14px 12px', borderTop: '1px solid var(--grid, var(--border))', paddingTop: '10px' }}>
        {entries.map((entry, idx) => {
          const isCounter = entry.action === 'counter';
          const isAccepted = entry.action === 'accepted' || entry.action === 'accepted_counter';
          const isInitial = entry.action === 'proposed';
          if (isCounter) counterRound += 1;

          const isMe = entry.role === viewerRole;
          const roleLabel = entry.role === 'mentor' ? 'Mentor' : 'Learner';
          const badgeLabel = isInitial
            ? 'Initial Quote'
            : isCounter
            ? `Counter #${counterRound}`
            : entry.action === 'accepted_counter'
            ? 'Counter Accepted'
            : 'Accepted';

          const badgeBg = isAccepted
            ? 'rgba(16, 185, 129, 0.15)'
            : isInitial
            ? 'rgba(59, 130, 246, 0.14)'
            : entry.role === 'learner'
            ? 'rgba(245, 158, 11, 0.15)'
            : 'rgba(99, 102, 241, 0.16)';

          const badgeColor = isAccepted
            ? '#10b981'
            : isInitial
            ? '#3b82f6'
            : entry.role === 'learner'
            ? '#f59e0b'
            : '#6366f1';

          const isLatest = idx === entries.length - 1;
          const timeStr = formatEntryTime(entry.created_at);

          return (
            <div
              key={`${entry.action}-${idx}-${entry.created_at || idx}`}
              style={{
                padding: '9px 11px',
                borderRadius: '7px',
                background: 'var(--bg)',
                border: isLatest && isCounter
                  ? '1px solid rgba(99, 102, 241, 0.4)'
                  : isAccepted
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : '1px solid var(--grid, var(--border))',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: badgeBg,
                      color: badgeColor,
                      textTransform: 'uppercase',
                    }}
                  >
                    {badgeLabel}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    {entry.actor_name || roleLabel}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                    ({isMe ? 'You' : roleLabel})
                  </span>
                </div>
                <span
                  className="mono"
                  style={{
                    fontWeight: 700,
                    fontSize: '13.5px',
                    color: isAccepted ? '#10b981' : isLatest && isCounter ? 'var(--accent, #6366f1)' : 'var(--ink)',
                  }}
                >
                  ₹{entry.price}
                </span>
              </div>

              {entry.message && (
                <div
                  style={{
                    marginTop: '5px',
                    fontSize: '12px',
                    color: 'var(--ink-muted)',
                    lineHeight: 1.45,
                    fontStyle: isCounter ? 'italic' : 'normal',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {isCounter ? `"${entry.message}"` : entry.message}
                </div>
              )}

              {timeStr && (
                <div style={{ marginTop: '4px', fontSize: '10.5px', color: 'var(--ink-faint, var(--ink-muted))' }}>
                  {timeStr}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
