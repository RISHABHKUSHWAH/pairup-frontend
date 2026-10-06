/**
 * Base HTTP Client and Token Session Manager
 */

const rawBase = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : (import.meta.env.DEV ? 'http://127.0.0.1:8000' : 'https://pairup.pythonanywhere.com');

export const API_BASE = (rawBase || '').trim().replace(/\/+$/, '');

export const TokenStorage = {
  getToken: () => localStorage.getItem('pairup_token'),
  getUser: () => {
    try {
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

  const token = TokenStorage.getToken();
  if ((auth || token) && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
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
    throw new Error(errorMsg);
  }

  return data;
}
