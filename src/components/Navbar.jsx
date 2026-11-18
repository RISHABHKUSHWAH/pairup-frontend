import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { initials, resolveImageUrl, notificationsApi, learnerNotifications, mentorNotifications } from '../api/client';
import { SunIcon, MoonIcon, BellIcon, MenuIcon, XIcon } from './Icons';
import { playNotificationSound } from '../utils/soundEffects';
import PairUpLogo from './PairUpLogo';

export default function Navbar() {
  const { user, isOnline, toggleOnlineStatus, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef(null);

  // Close mobile menu on route change, outside click, or Escape
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [mobileMenuOpen]);

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

  const prevUnreadNotifIdsRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      prevUnreadNotifIdsRef.current = null;
      return;
    }

    let active = true;

    const checkNewAndPlay = (currentIds) => {
      if (prevUnreadNotifIdsRef.current !== null) {
        const prevSet = new Set(prevUnreadNotifIdsRef.current);
        const hasNew = currentIds.some((id) => !prevSet.has(id));
        if (hasNew) {
          playNotificationSound();
        }
      }
      prevUnreadNotifIdsRef.current = currentIds;
    };

    const fetchUnread = async () => {
      let currentUnreadIds = [];
      try {
        const data = await notificationsApi.list();
        if (Array.isArray(data) && active) {
          const unreadList = data.filter((n) => !n.is_read);
          setUnreadCount(unreadList.length);
          currentUnreadIds = unreadList.map((n) => String(n.id));
          checkNewAndPlay(currentUnreadIds);
          return;
        }
      } catch (_) {}

      if (active) {
        if (user.role === 'mentor') {
          const notifs = mentorNotifications.getNotifications();
          const unreadList = notifs.filter((n) => !n.read);
          setUnreadCount(unreadList.length);
          currentUnreadIds = unreadList.map((n) => String(n.id));
        } else if (user.role === 'learner') {
          const notifs = learnerNotifications.getNotifications();
          const unreadList = notifs.filter((n) => !n.read);
          setUnreadCount(unreadList.length);
          currentUnreadIds = unreadList.map((n) => String(n.id));
        } else {
          setUnreadCount(0);
        }
        checkNewAndPlay(currentUnreadIds);
      }
    };

    fetchUnread();
    window.addEventListener('pairup_notifications_updated', fetchUnread);
    window.addEventListener('storage', fetchUnread);
    const interval = setInterval(fetchUnread, 10000);
    return () => {
      active = false;
      window.removeEventListener('pairup_notifications_updated', fetchUnread);
      window.removeEventListener('storage', fetchUnread);
      clearInterval(interval);
    };
  }, [user]);

  return (
    <header className="topbar" ref={headerRef}>
      <Link to="/" className="logo" title="PairUp Home">
        <PairUpLogo size={22} className="logo-mark" />
        <span>PairUp</span>
      </Link>

      <button
        className="icon-btn topbar-theme-desktop"
        type="button"
        onClick={toggleTheme}
        title="Toggle theme"
        aria-label="Toggle theme"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
      </button>

      <nav className="topbar-nav" aria-label="Main navigation">
        <NavLink
          to="/what-is-pairup"
          className={({ isActive }) => `topbar-nav-link ${isActive ? 'active' : ''}`}
        >
          What is PairUp?
        </NavLink>
        <NavLink
          to="/help"
          className={({ isActive }) => `topbar-nav-link ${isActive ? 'active' : ''}`}
        >
          Help &amp; Guides
        </NavLink>
      </nav>

      {/* Desktop right-side actions */}
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
              <span className="nav-avatar">
                {user.avatar || user.photo_url ? (
                  <img
                    src={resolveImageUrl(user.avatar || user.photo_url)}
                    alt={user.name}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.style.display = 'inline-block';
                      }
                    }}
                  />
                ) : null}
                <span style={{ display: user.avatar || user.photo_url ? 'none' : 'inline-block' }}>
                  {initials(user.name)}
                </span>
              </span>
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

      {/* Mobile compact right-side controls (single-row clean header) */}
      <div className="topbar-mobile-controls">
        {user && (
          <Link
            to={getNotificationsPath()}
            className="icon-btn"
            title="Notifications"
            aria-label="Notifications"
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <BellIcon size={17} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#DC2626',
                  color: '#fff',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  borderRadius: '50%',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 3px',
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
        )}
        <button
          className="icon-btn"
          type="button"
          onClick={toggleTheme}
          title="Toggle theme"
          aria-label="Toggle theme"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
        <button
          className="icon-btn"
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {mobileMenuOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
        </button>
      </div>

      {/* Mobile sleek dropdown menu */}
      {mobileMenuOpen && (
        <div className="topbar-mobile-drawer">
          <div className="topbar-mobile-links">
            <NavLink
              to="/what-is-pairup"
              className={({ isActive }) => `topbar-mobile-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              What is PairUp?
            </NavLink>
            <NavLink
              to="/help"
              className={({ isActive }) => `topbar-mobile-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Help &amp; Guides
            </NavLink>
          </div>

          <div className="topbar-mobile-divider" />

          {user ? (
            <div className="topbar-mobile-account">
              <Link
                to={getDashboardPath()}
                className="topbar-mobile-user-card"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="nav-avatar">
                  {user.avatar || user.photo_url ? (
                    <img src={resolveImageUrl(user.avatar || user.photo_url)} alt={user.name} />
                  ) : (
                    <span>{initials(user.name)}</span>
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Go to Dashboard →</div>
                </div>
                <span className={`role-badge role-${user.role}`}>{user.role.toUpperCase()}</span>
              </Link>

              {user.role === 'mentor' && (
                <button
                  type="button"
                  className={`toggle-online ${!isOnline ? 'is-offline' : ''}`}
                  onClick={toggleOnlineStatus}
                  style={{ width: '100%', justifyContent: 'center', padding: '8px 12px' }}
                >
                  <span className="toggle-track">
                    <span className="knob"></span>
                  </span>
                  <span>{isOnline ? 'Online & Available' : 'Currently Offline'}</span>
                </button>
              )}

              {(user.role === 'admin' || user.role === 'superadmin') && (
                <Link to={getDashboardPath()} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                  Admin Panel
                </Link>
              )}

              {user.role === 'superadmin' && (
                <Link to="/superadmin" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                  Super Admin
                </Link>
              )}

              <button
                type="button"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleLogout(e);
                }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="topbar-mobile-auth-row">
              <Link
                to="/login"
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                to="/login?mode=register"
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
