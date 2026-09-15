import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, TokenStorage, mentorProfileSettings, mentorPayoutSettings, learnerProfile } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => TokenStorage.getUser());
  const [token, setToken] = useState(() => TokenStorage.getToken());
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const me = await api.me();
          setUser(me);
          TokenStorage.setSession(token, me);

          if (me.role === 'mentor') {
            try {
              const mentor = await api.getMentor(me.id);
              setIsOnline(Boolean(mentor.online));
            } catch {
              // Ignore mentor profile lookup error
            }
          }
        } catch {
          // Token expired or invalid
          logout();
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
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
    }
    return res.user;
  };

  const register = async (name, email, password, role) => {
    const res = await api.register(name, email, password, role);
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

  const logout = () => {
    TokenStorage.clear();
    setToken(null);
    setUser(null);
    setIsOnline(false);
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    await api.updateOnlineStatus(newStatus);
    setIsOnline(newStatus);
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
      setIsOnline(false);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isOnline,
        login,
        register,
        logout,
        toggleOnlineStatus,
        updateUser,
        switchRole,
        refreshUser,
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
