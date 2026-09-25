import React, { useState, useEffect } from 'react';
import { ChevronUpIcon } from './Icons';

export default function ScrollToTopButton({
  threshold = 280,
  behavior = 'smooth',
  showLabel = true,
  label = 'Top',
  title = 'Scroll to top',
  className = '',
  style = {},
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setVisible(scrollY > threshold);
    };

    // Initial evaluation
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    try {
      window.scrollTo({
        top: 0,
        behavior,
      });
    } catch {
      // Fallback for older browsers
      window.scrollTo(0, 0);
    }
  };

  return (
    <button
      type="button"
      className={`scroll-to-top-btn ${visible ? 'visible' : ''} ${className}`}
      onClick={scrollToTop}
      title={title}
      aria-label={title}
      style={style}
    >
      <ChevronUpIcon size={18} />
      {showLabel && <span className="scroll-to-top-label">{label}</span>}
    </button>
  );
}
