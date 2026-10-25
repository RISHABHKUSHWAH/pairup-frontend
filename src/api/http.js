/**
 * Base HTTP Client and Token Session Manager
 */

const rawBase = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : (import.meta.env.DEV ? 'http://127.0.0.1:8000' : 'https://pairup.pythonanywhere.com');

export const API_BASE = (rawBase || '').trim().replace(/\/+$/, '');

export function isJwtExpired(token) {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed || typeof parsed.exp !== 'number') return false;
    // Buffer of 5 seconds to prevent edge-case race conditions
    return (parsed.exp * 1000) <= (Date.now() + 5000);
  } catch {
    return false;
  }
}

export const TokenStorage = {
  getToken: () => {
    const token = localStorage.getItem('pairup_token');
    if (token && isJwtExpired(token)) {
      TokenStorage.clear();
      return null;
    }
    return token;
  },
  getUser: () => {
    try {
      const token = localStorage.getItem('pairup_token');
      if (token && isJwtExpired(token)) {
        TokenStorage.clear();
        return null;
      }
      return JSON.parse(localStorage.getItem('pairup_user') || 'null');
    } catch {
      return null;
    }
  },
  setSession: (token, user) => {
    localStorage.setItem('pairup_token', token);
    localStorage.setItem('pairup_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('pairup_token');
    localStorage.removeItem('pairup_user');
    localStorage.removeItem('pairup_mentor_profile');
    localStorage.removeItem('pairup_mentor_payout_method');
    localStorage.removeItem('pairup_mentor_withdrawals');
    localStorage.removeItem('pairup_learner_profile');
    localStorage.removeItem('pairup_mentor_session_notes');
  },
};

export async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const isAuthRoute =
    cleanPath.includes('/auth/login') ||
    cleanPath.includes('/auth/register') ||
    cleanPath.includes('/auth/google') ||
    cleanPath.includes('/auth/activate') ||
    cleanPath.includes('/auth/forgot-password') ||
    cleanPath.includes('/auth/reset-password');

  const rawToken = localStorage.getItem('pairup_token');

  // Proactive token expiration interceptor
  if ((auth || rawToken) && !isAuthRoute && rawToken && isJwtExpired(rawToken)) {
    TokenStorage.clear();
    const errorMsg = 'Your session has expired. Please sign in again.';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pairup:unauthorized', { detail: { message: errorMsg } }));
    }
    const err = new Error(errorMsg);
    err.status = 401;
    err.data = { error: errorMsg };
    throw err;
  }

  const token = TokenStorage.getToken();
  if ((auth || token) && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : (API_BASE ? `${API_BASE}${cleanPath}` : cleanPath);
  const options = {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  };

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.detail || data.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;

    const lowerMsg = String(errorMsg).toLowerCase();
    const isTokenOrAuthError =
      res.status === 401 ||
      (res.status === 403 && (
        lowerMsg.includes('token') ||
        lowerMsg.includes('expired') ||
        lowerMsg.includes('unauthorized') ||
        lowerMsg.includes('authentication') ||
        lowerMsg.includes('not authenticated') ||
        lowerMsg.includes('user not found') ||
        lowerMsg.includes('inactive') ||
        lowerMsg.includes('signature')
      )) ||
      lowerMsg.includes('token has expired') ||
      lowerMsg.includes('invalid or expired token');

    if (isTokenOrAuthError && !isAuthRoute) {
      TokenStorage.clear();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pairup:unauthorized', { detail: { message: errorMsg } }));
      }
    }

    throw err;
  }

  return data;
}
