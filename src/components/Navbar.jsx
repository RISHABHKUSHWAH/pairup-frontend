import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { initials, notificationsApi, learnerNotifications, mentorNotifications } from '../api/client';
import { SunIcon, MoonIcon, BellIcon } from './Icons';
import PairUpLogo from './PairUpLogo';

export default function Navbar() {
  const { user, isOnline, toggleOnlineStatus, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'mentor') return '/mentor/dashboard';
    if (user.role === 'admin' || user.role === 'superadmin') return '/admin';
    return '/learner/dashboard';
  };

  const getNotificationsPath = () => {
    if (!user) return '/login';
    if (user.role === 'mentor') return '/mentor/notifications';
    if (user.role === 'admin' || user.role === 'superadmin') return '/admin/notifications';
    return '/learner/notifications';
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const fetchUnread = async () => {
      try {
        const data = await notificationsApi.list();
        if (Array.isArray(data) && active) {
          setUnreadCount(data.filter((n) => !n.is_read).length);
          return;
        }
      } catch (_) {}

      if (active) {
        if (user.role === 'mentor') {
          const notifs = mentorNotifications.getNotifications();
          setUnreadCount(notifs.filter((n) => !n.read).length);
        } else if (user.role === 'learner') {
          const notifs = learnerNotifications.getNotifications();
          setUnreadCount(notifs.filter((n) => !n.read).length);
        } else {
          setUnreadCount(0);
        }
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  return (
    <header className="topbar">
      <Link to="/" className="logo" title="PairUp Home">
        <PairUpLogo size={22} className="logo-mark" />
        <span>PairUp</span>
      </Link>

      <button
        className="icon-btn"
        type="button"
        onClick={toggleTheme}
        title="Toggle theme"
        aria-label="Toggle theme"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
      </button>

      <div className="topbar-actions">
        {user ? (
          <>
            {user.role === 'mentor' && (
              <button
                type="button"
                className={`toggle-online ${!isOnline ? 'is-offline' : ''}`}
                onClick={toggleOnlineStatus}
                title="Toggle whether learners see you as online"
              >
                <span className="toggle-track">
                  <span className="knob"></span>
                </span>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </button>
            )}

            <span className={`role-badge role-${user.role}`}>
              {user.role.toUpperCase()}
            </span>

            <Link to={getDashboardPath()} className="nav-user" title="Go to Dashboard">
              <span className="nav-avatar">{initials(user.name)}</span>
              <span className="nav-user-name">{user.name}</span>
            </Link>

            <Link
              to={getNotificationsPath()}
              className="icon-btn"
              title="Notifications"
              aria-label="Notifications"
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <BellIcon size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#DC2626',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '50%',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--surface, #fff)',
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {(user.role === 'admin' || user.role === 'superadmin') && (
              <Link to={getDashboardPath()} className="btn btn-ghost">
                Admin Panel
              </Link>
            )}

            {user.role === 'superadmin' && (
              <Link to="/superadmin" className="btn btn-ghost">
                Super Admin
              </Link>
            )}

            <button type="button" onClick={handleLogout} className="btn btn-ghost">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">
              Log in
            </Link>
            <Link to="/login?mode=register" className="btn btn-primary">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
