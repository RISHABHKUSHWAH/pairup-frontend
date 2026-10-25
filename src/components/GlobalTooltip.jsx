import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * GlobalTooltip
 * 
 * Provides a universal, ultra-modern hover tooltip across the entire platform.
 * 
 * Intercepts:
 * 1. Explicit `data-tooltip="Tooltip Text"` elements
 * 2. Standard `title="..."` attributes (removes native ugly OS tooltip and displays modern tooltip)
 * 
 * Supports:
 * - `data-tooltip-pos="top|bottom|left|right"`
 * - Automatic boundary collision detection (flips orientation when near viewport edges)
 * - Hover grouping (instant transition when moving between adjacent tooltips)
 * - Directional micro-arrow matching surface & border
 * - Smooth fade & micro-scale animation
 */
export default function GlobalTooltip() {
  const [tooltipState, setTooltipState] = useState(null);
  const showTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const lastActiveTimeRef = useRef(0);
  const currentTargetRef = useRef(null);

  useEffect(() => {
    // Convert native title attributes on hover to prevent ugly browser tooltip
    const handleMouseOver = (e) => {
      const target = e.target.closest('[data-tooltip], [title]');
      if (!target) return;

      // If target has a native title attribute, migrate it to data-tooltip
      if (target.hasAttribute('title')) {
        const titleText = target.getAttribute('title');
        if (titleText && titleText.trim()) {
          target.setAttribute('data-tooltip', titleText.trim());
          target.setAttribute('data-pairup-original-title', titleText);
        }
        target.removeAttribute('title');
      }

      const text = target.getAttribute('data-tooltip');
      if (!text || !text.trim()) return;

      // Don't restart if already showing for this exact target
      if (currentTargetRef.current === target && tooltipState) {
        return;
      }

      currentTargetRef.current = target;
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);

      // Check if we are in "warm group" mode (another tooltip was active < 350ms ago)
      const now = Date.now();
      const isWarm = now - lastActiveTimeRef.current < 350;
      const delay = isWarm ? 0 : 160;

      const positionTooltip = () => {
        if (!target.isConnected) return;
        const rect = target.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        let preferredPos = target.getAttribute('data-tooltip-pos');
        if (!preferredPos) {
          // Check if target is inside collapsed sidebar
          const inCollapsedSidebar = target.closest('.admin-sidebar.collapsed');
          preferredPos = inCollapsedSidebar ? 'right' : 'top';
        }

        // Boundary collision detection & flipping
        let finalPos = preferredPos;
        const estimatedHeight = 32;
        const estimatedWidth = Math.min(260, Math.max(60, text.length * 7.5 + 24));

        if (finalPos === 'top' && rect.top - estimatedHeight - 10 < 0) {
          finalPos = 'bottom';
        } else if (finalPos === 'bottom' && rect.bottom + estimatedHeight + 10 > window.innerHeight) {
          finalPos = 'top';
        } else if (finalPos === 'right' && rect.right + estimatedWidth + 10 > window.innerWidth) {
          finalPos = 'left';
        } else if (finalPos === 'left' && rect.left - estimatedWidth - 10 < 0) {
          finalPos = 'right';
        }

        let x = 0;
        let y = 0;

        if (finalPos === 'top') {
          x = rect.left + rect.width / 2;
          y = rect.top - 7;
        } else if (finalPos === 'bottom') {
          x = rect.left + rect.width / 2;
          y = rect.bottom + 7;
        } else if (finalPos === 'right') {
          x = rect.right + 7;
          y = rect.top + rect.height / 2;
        } else if (finalPos === 'left') {
          x = rect.left - 7;
          y = rect.top + rect.height / 2;
        }

        // Clamp x to avoid horizontal overflow
        const halfWidth = estimatedWidth / 2;
        if (finalPos === 'top' || finalPos === 'bottom') {
          x = Math.max(halfWidth + 8, Math.min(window.innerWidth - halfWidth - 8, x));
        }

        setTooltipState({
          text,
          x,
          y,
          pos: finalPos,
          visible: true,
        });
        lastActiveTimeRef.current = Date.now();
      };

      if (delay === 0) {
        positionTooltip();
      } else {
        showTimeoutRef.current = setTimeout(positionTooltip, delay);
      }
    };

    const handleMouseOut = (e) => {
      const target = e.target.closest('[data-tooltip], [data-pairup-original-title]');
      if (!target) return;

      // If moving to a descendant of the same target, don't dismiss
      if (e.relatedTarget && target.contains(e.relatedTarget)) {
        return;
      }

      if (currentTargetRef.current === target) {
        currentTargetRef.current = null;
        if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);

        setTooltipState((prev) => (prev ? { ...prev, visible: false } : null));
        lastActiveTimeRef.current = Date.now();

        hideTimeoutRef.current = setTimeout(() => {
          setTooltipState(null);
        }, 120);
      }
    };

    const handleDismiss = () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      currentTargetRef.current = null;
      setTooltipState(null);
      lastActiveTimeRef.current = 0;
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('scroll', handleDismiss, { capture: true, passive: true });
    window.addEventListener('resize', handleDismiss, { passive: true });
    document.addEventListener('pointerdown', handleDismiss, true);
    document.addEventListener('keydown', handleDismiss, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
      document.removeEventListener('pointerdown', handleDismiss, true);
      document.removeEventListener('keydown', handleDismiss, true);
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [tooltipState]);

  if (!tooltipState) return null;

  const { text, x, y, pos, visible } = tooltipState;

  // Translation based on placement position
  let transform = 'translate(-50%, -100%)';
  if (pos === 'bottom') transform = 'translate(-50%, 0)';
  if (pos === 'right') transform = 'translate(0, -50%)';
  if (pos === 'left') transform = 'translate(-100%, -50%)';

  return createPortal(
    <div
      className={`pairup-floating-tooltip pairup-floating-tooltip--${pos} ${visible ? 'is-visible' : 'is-hiding'}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform,
      }}
      role="tooltip"
      aria-hidden={!visible}
    >
      <span className="pairup-tooltip-content">{text}</span>
      <span className={`pairup-tooltip-arrow pairup-tooltip-arrow--${pos}`} />
    </div>,
    document.body
  );
}
