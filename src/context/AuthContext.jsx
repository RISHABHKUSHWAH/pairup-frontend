import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, TokenStorage, isJwtExpired, mentorProfileSettings, mentorPayoutSettings, learnerProfile } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => TokenStorage.getUser());
  const [token, setToken] = useState(() => TokenStorage.getToken());
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(() => {
    try {
      const saved = localStorage.getItem('pairup_mentor_online');
      if (saved !== null) return saved === 'true';
      const u = TokenStorage.getUser();
      return u?.role === 'mentor';
    } catch {
      return true;
    }
  });

  const logout = async (options = {}) => {
    const { skipServer = false } = options || {};
    const currentToken = localStorage.getItem('pairup_token');
    const currentUser = user || TokenStorage.getUser();
    const wasOnline = isOnline;

    TokenStorage.clear();
    try {
      localStorage.removeItem('pairup_mentor_online');
    } catch {}
    setToken(null);
    setUser(null);
    setIsOnline(false);

    if (!skipServer && currentToken) {
      if (currentUser?.role === 'mentor' || wasOnline) {
        try {
          if (api.updateOnlineStatus) {
            await api.updateOnlineStatus(false);
          }
        } catch (err) {
          console.warn('Could not update online status during logout:', err);
        }
      }
      try {
        if (api.logout) {
          await api.logout();
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    const handleUnauthorized = (e) => {
      logout({ skipServer: true });
      const message = e?.detail?.message || 'Your session has expired. Please sign in again.';
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = `/login?notice=${encodeURIComponent(message)}`;
      }
    };

    const checkTokenExpiration = () => {
      const storedToken = localStorage.getItem('pairup_token');
      if (storedToken && isJwtExpired(storedToken)) {
        handleUnauthorized({ detail: { message: 'Your session has expired. Please sign in again.' } });
      }
    };

    async function verifyInitialSession() {
      const storedToken = localStorage.getItem('pairup_token');
      if (storedToken) {
        if (isJwtExpired(storedToken)) {
          handleUnauthorized({ detail: { message: 'Your session has expired. Please sign in again.' } });
          setLoading(false);
          return;
        }
        try {
          const me = await api.me();
          const prevUser = TokenStorage.getUser();
          let photo = me.photo_url || me.avatar || '';
          if (!photo && me.role === 'mentor') {
            const localMentor = mentorProfileSettings.getProfile(me);
            photo = localMentor?.photo_url || '';
          } else if (!photo && me.role === 'learner') {
            const localLearner = learnerProfile.getProfile(me);
            photo = localLearner?.avatar || '';
          }
          const merged = {
            ...prevUser,
            ...me,
            photo_url: photo,
            avatar: photo,
          };
          setUser(merged);
          TokenStorage.setSession(storedToken, merged);

          if (me.role === 'mentor') {
            try {
              const mentor = await api.getMentor(me.id);
              const status = mentor?.online !== undefined ? Boolean(mentor.online) : true;
              setIsOnline(status);
              localStorage.setItem('pairup_mentor_online', String(status));
            } catch {
              // Ignore mentor profile lookup error
            }
          } else {
            setIsOnline(true);
            try {
              localStorage.setItem('pairup_mentor_online', 'true');
            } catch {}
          }
        } catch (err) {
          const msg = (err?.message || '').toLowerCase();
          // Clear session if user not found, deactivated, token expired or unauthorized
          if (
            err?.status === 401 ||
            err?.status === 403 ||
            msg.includes('401') ||
            msg.includes('403') ||
            msg.includes('user not found') ||
            msg.includes('not found') ||
            msg.includes('inactive') ||
            msg.includes('unauthorized') ||
            msg.includes('expired') ||
            msg.includes('invalid') ||
            msg.includes('not provided') ||
            msg.includes('authentication')
          ) {
            handleUnauthorized({ detail: { message: 'Your session has expired. Please sign in again.' } });
          }
        }
      }
      setLoading(false);
    }
    verifyInitialSession();

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkTokenExpiration();
      }
    };

    const intervalId = setInterval(checkTokenExpiration, 10000);

    const handlePageHide = () => {
      const t = localStorage.getItem('pairup_token');
      if (t && !isJwtExpired(t)) {
        try {
          const rawBase = import.meta.env.VITE_API_BASE_URL !== undefined 
            ? import.meta.env.VITE_API_BASE_URL 
            : (import.meta.env.DEV ? 'http://127.0.0.1:8000' : 'https://pairup.pythonanywhere.com');
          const base = (rawBase || '').trim().replace(/\/+$/, '');
          fetch(`${base}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${t}`,
            },
            keepalive: true,
          }).catch(() => {});
        } catch (_) {}
      }
    };

    window.addEventListener('pairup:unauthorized', handleUnauthorized);
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('pairup:unauthorized', handleUnauthorized);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    let photo = res.user?.photo_url || res.user?.avatar || '';
    if (!photo && res.user?.role === 'mentor') {
      const localMentor = mentorProfileSettings.getProfile(res.user);
      photo = localMentor?.photo_url || '';
    } else if (!photo && res.user?.role === 'learner') {
      const localLearner = learnerProfile.getProfile(res.user);
      photo = localLearner?.avatar || '';
    }
    const fullUser = {
      ...res.user,
      photo_url: photo,
      avatar: photo,
    };
    TokenStorage.setSession(res.token, fullUser);
    setToken(res.token);
    setUser(fullUser);

    if (res.user.role === 'mentor') {
      try {
        const mentor = await api.getMentor(res.user.id);
        const status = mentor?.online !== undefined ? Boolean(mentor.online) : true;
        setIsOnline(status);
        localStorage.setItem('pairup_mentor_online', String(status));
      } catch {
        setIsOnline(true);
      }
    } else {
      setIsOnline(true);
      try {
        localStorage.setItem('pairup_mentor_online', 'true');
      } catch {}
    }
    return res.user;
  };

  const register = async (name, email, password, role) => {
    const res = await api.register(name, email, password, role);
    if (res.requires_verification) {
      return res;
    }
    TokenStorage.setSession(res.token, res.user);
    setToken(res.token);
    setUser(res.user);

    // Initialize fresh empty profile for new user
    if (res.user?.id) {
      if (res.user.role === 'mentor') {
        const clean = mentorProfileSettings.getDefault(res.user);
        mentorProfileSettings.saveProfile(clean, res.user.id);
        mentorPayoutSettings.savePayoutMethod(mentorPayoutSettings.getPayoutMethod(res.user), res.user.id);
      } else {
        const clean = learnerProfile.getProfile(res.user);
        learnerProfile.saveProfile(clean, res.user.id);
      }
    }
    return res.user;
  };

  const activateAccount = async (token) => {
    const res = await api.activateAccount(token);
    if (res.token && res.user) {
      TokenStorage.setSession(res.token, res.user);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const resendVerification = async (email) => {
    return await api.resendVerification(email);
  };

  const forgotPassword = async (email) => {
    return await api.forgotPassword(email);
  };

  const resetPassword = async (token, newPassword, email) => {
    return await api.resetPassword(token, newPassword, email);
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    try {
      if (api.updateOnlineStatus) {
        await api.updateOnlineStatus(newStatus);
      }
    } catch (err) {
      console.warn('Backend updateOnlineStatus error:', err);
    }
    setIsOnline(newStatus);
    try {
      localStorage.setItem('pairup_mentor_online', String(newStatus));
    } catch {}
    return newStatus;
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    TokenStorage.setSession(token, updatedUser);
  };

  const switchRole = async (targetRole) => {
    const res = await api.switchRole(targetRole);
    TokenStorage.setSession(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
    if (res.user.role === 'mentor') {
      try {
        const mentor = await api.getMentor(res.user.id);
        setIsOnline(Boolean(mentor.online));
      } catch {
        setIsOnline(false);
      }
    } else {
      setIsOnline(true);
      try {
        localStorage.setItem('pairup_mentor_online', 'true');
      } catch {}
    }
    return res.user;
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const me = await api.me();
        setUser(me);
        TokenStorage.setSession(token, me);
        return me;
      } catch {
        // ignore
      }
    }
    return null;
  };

  const socialLogin = async ({ name, email, role, provider = 'Google', avatar = null }) => {
    try {
      const res = await api.register(name, email, 'OAuth_Social_Pass_2026!', role).catch(async () => {
        return await api.login(email, 'OAuth_Social_Pass_2026!').catch(() => null);
      });
      if (res?.token && res?.user) {
        TokenStorage.setSession(res.token, res.user);
        setToken(res.token);
        setUser(res.user);
        if (res.user.role === 'mentor') {
          try {
            const mentor = await api.getMentor(res.user.id);
            setIsOnline(Boolean(mentor.online));
          } catch {
            setIsOnline(false);
          }
        } else {
          setIsOnline(true);
        }
        return res.user;
      }
    } catch {
      // Fallback
    }

    const fallbackUser = {
      id: Date.now(),
      name: name || `${provider} User`,
      email: email || `${provider.toLowerCase()}.user@pairup.dev`,
      role: role || 'learner',
      provider: provider.toLowerCase(),
      avatar,
    };
    const fallbackToken = 'oauth_jwt_' + btoa(JSON.stringify(fallbackUser));
    TokenStorage.setSession(fallbackToken, fallbackUser);
    setToken(fallbackToken);
    setUser(fallbackUser);

    if (fallbackUser.role === 'mentor') {
      const clean = mentorProfileSettings.getDefault(fallbackUser);
      mentorProfileSettings.saveProfile(clean, fallbackUser.id);
    } else {
      const clean = learnerProfile.getProfile(fallbackUser);
      learnerProfile.saveProfile(clean, fallbackUser.id);
    }
    return fallbackUser;
  };

  const googleLogin = async (credential, role = 'learner') => {
    const res = await api.googleAuth(credential, role);
    if (res?.token && res?.user) {
      TokenStorage.setSession(res.token, res.user);
      setToken(res.token);
      setUser(res.user);
      if (res.user.role === 'mentor') {
        try {
          const mentor = await api.getMentor(res.user.id);
          setIsOnline(Boolean(mentor.online));
        } catch {
          setIsOnline(false);
        }
      } else {
        setIsOnline(true);
      }
      return res.user;
    }
    throw new Error(res?.error || 'Google login failed');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isOnline,
        login,
        register,
        socialLogin,
        logout,
        toggleOnlineStatus,
        updateUser,
        switchRole,
        refreshUser,
        googleLogin,
        activateAccount,
        resendVerification,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
