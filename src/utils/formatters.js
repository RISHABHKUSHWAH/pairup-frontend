/**
 * Common formatting and display utility functions.
 */

/**
 * Extracts up to 2 uppercase initials from a user's display name.
 * @param {string} name 
 * @returns {string} e.g. "Alex Rivera" -> "AR"
 */
export function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Generates visual star representation for rating numbers.
 * @param {number} r 
 * @returns {string} e.g. 4.8 -> "★★★★"
 */
export function stars(r) {
  const num = Number(r);
  if (!num || isNaN(num) || num <= 0) return '';
  const full = Math.min(5, Math.max(1, Math.round(num)));
  return '★'.repeat(full);
}

/**
 * Formats a number into Indian Rupee (INR) currency string.
 * @param {number|string} amount 
 * @returns {string} e.g. 1500 -> "₹1,500"
 */
export function formatCurrency(amount) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats an ISO datetime string into human readable localized format.
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export function formatDateTime(dateVal) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns a relative time string (e.g. "5 mins ago", "Yesterday").
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export function timeAgo(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const now = new Date();
  const diffSecs = Math.floor((now - d) / 1000);

  if (diffSecs < 60) return 'Just now';
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  if (diffSecs < 172800) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Resolves the destination route for any notification item based on its type, link, or content.
 * Guarantees every notification points to a valid, live page in the application.
 *
 * @param {object} item - Notification object
 * @param {string} role - 'learner' | 'mentor' | 'admin' | 'superadmin'
 * @returns {string} URL path e.g. '/learner/my-problems'
 */
export function resolveNotificationLink(item, role = 'learner') {
  const rawLink = item?.link || '';
  if (rawLink && typeof rawLink === 'string' && rawLink.trim() !== '' && rawLink !== '#') {
    const trimmed = rawLink.trim();
    if (trimmed === '/learner/problems') return '/learner/my-problems';
    if (trimmed === '/mentor/problem-requests') return '/mentor/explore-problems';
    if (trimmed.startsWith('/messages')) return trimmed.replace(/^\/messages/, '/chat');
    return trimmed;
  }

  const type = String(item?.type || '').toLowerCase();
  const title = String(item?.title || '').toLowerCase();
  const body = String(item?.body || item?.message || '').toLowerCase();
  const combined = `${type} ${title} ${body}`;

  if (role === 'mentor') {
    if (combined.includes('proposal') || combined.includes('quote') || combined.includes('counter-offer')) {
      return '/mentor/my-proposals';
    }
    if (combined.includes('problem') || combined.includes('request')) {
      return '/mentor/explore-problems';
    }
    if (combined.includes('session') || combined.includes('booking') || combined.includes('room')) {
      return '/mentor/sessions';
    }
    if (combined.includes('message') || combined.includes('chat') || combined.includes('conversation')) {
      return '/chat';
    }
    if (combined.includes('payment') || combined.includes('payout') || combined.includes('earning') || combined.includes('escrow') || combined.includes('released')) {
      return '/mentor/earnings';
    }
    if (combined.includes('review') || combined.includes('rating') || combined.includes('star')) {
      return '/mentor/reviews';
    }
    if (combined.includes('contract')) {
      return '/mentor/contracts';
    }
    if (combined.includes('availability') || combined.includes('schedule') || combined.includes('calendar')) {
      return '/mentor/availability';
    }
    return '/mentor/dashboard';
  } else if (role === 'admin' || role === 'superadmin') {
    if (combined.includes('session')) return '/admin/sessions';
    if (combined.includes('payment')) return '/admin/payments';
    if (combined.includes('problem')) return '/admin/problems';
    if (combined.includes('dispute') || combined.includes('refund')) return '/admin/disputes';
    if (combined.includes('mentor')) return '/admin/mentors';
    if (combined.includes('contract')) return '/admin/contracts';
    return '/admin/overview';
  } else {
    // Learner
    if (combined.includes('proposal') || combined.includes('quote') || combined.includes('counter-offer') || combined.includes('problem')) {
      return '/learner/my-problems';
    }
    if (combined.includes('session') || combined.includes('booking') || combined.includes('room')) {
      return '/learner/sessions';
    }
    if (combined.includes('message') || combined.includes('chat') || combined.includes('conversation')) {
      return '/chat';
    }
    if (combined.includes('payment') || combined.includes('refund') || combined.includes('escrow') || combined.includes('wallet')) {
      return '/learner/payments';
    }
    if (combined.includes('review') || combined.includes('rating') || combined.includes('feedback')) {
      return '/learner/reviews';
    }
    if (combined.includes('contract')) {
      return '/learner/contracts';
    }
    if (combined.includes('explore') || combined.includes('welcome') || combined.includes('search')) {
      return '/learner/explore';
    }
    return '/learner/dashboard';
  }
}
