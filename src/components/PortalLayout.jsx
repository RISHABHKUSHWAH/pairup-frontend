import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { BellIcon, SunIcon, MoonIcon, ArrowLeftIcon, MenuIcon, CheckIcon, VolumeIcon, VolumeXIcon } from './Icons';
import { notificationsApi, learnerNotifications, mentorNotifications, chatApi } from '../api/client';
import { playIncomingSound, playNotificationSound, soundSettings } from '../utils/soundEffects';
import { resolveNotificationLink } from '../utils';

export default function PortalLayout({
  title,
  portalType: explicitPortalType,
  role,
  actions,
  showBack,
  backUrl,
  fullHeight = false,
  hideFooter = false,
  bodyStyle = {},
  children,
}) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Smart resolution of portalType:
  // 1. Explicit prop `portalType` or `role`
  // 2. Inferred from current route path prefix
  // 3. Inferred from authenticated user's role
  // 4. Default fallback to 'learner'
  const resolvedRole = explicitPortalType || role;
  let portalType = 'learner';
  if (resolvedRole) {
    portalType = resolvedRole === 'superadmin' ? 'admin' : resolvedRole;
  } else if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin')) {
    portalType = 'admin';
  } else if (location.pathname.startsWith('/mentor')) {
    portalType = 'mentor';
  } else if (location.pathname.startsWith('/learner')) {
    portalType = 'learner';
  } else if (user?.role === 'admin' || user?.role === 'superadmin') {
    portalType = 'admin';
  } else if (user?.role === 'mentor') {
    portalType = 'mentor';
  }
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const prevUnreadMessagesRef = useRef(null);
  const prevUnreadNotifIdsRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(() => soundSettings.isNotificationEnabled());
  const [latestNotifs, setLatestNotifs] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleSoundChange = (e) => {
      if (e?.detail?.notification !== undefined) {
        setSoundEnabled(e.detail.notification);
      } else {
        setSoundEnabled(soundSettings.isNotificationEnabled());
      }
    };
    window.addEventListener('pairup_sound_settings_changed', handleSoundChange);
    return () => window.removeEventListener('pairup_sound_settings_changed', handleSoundChange);
  }, []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pairup_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pairup_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          toggleSidebar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dashboardRoute =
    portalType === 'mentor'
      ? '/mentor/dashboard'
      : portalType === 'admin'
      ? '/admin/dashboard'
      : '/learner/dashboard';

  const currentPath = location.pathname.replace(/\/+$/, '');
  const isRootDashboard =
    currentPath === dashboardRoute ||
    currentPath === `/${portalType}` ||
    (portalType === 'admin' && (currentPath === '/admin/overview' || currentPath === '/admin'));

  const shouldShowBack = showBack !== undefined ? showBack : !isRootDashboard;

  const handleGoBack = () => {
    if (backUrl) {
      navigate(backUrl);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(dashboardRoute);
    }
  };

  const notificationsLink =
    portalType === 'mentor'
      ? '/mentor/notifications'
      : portalType === 'admin'
      ? '/admin/notifications'
      : '/learner/notifications';

  const formatTime = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now - date) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch (_) {
      return 'Recent';
    }
  };

  useEffect(() => {
    let active = true;
    const updateUnread = async () => {
      let remoteUnread = 0;
      let hasRemote = false;
      let currentUnreadIds = [];
      try {
        const data = await notificationsApi.list();
        if (Array.isArray(data) && active) {
          hasRemote = true;
          const unreadList = data.filter((n) => !n.is_read);
          remoteUnread = unreadList.length;
          currentUnreadIds = unreadList.map((n) => String(n.id));
          setLatestNotifs(
            data.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.message,
              read: n.is_read,
              link: n.link,
              time: formatTime(n.created_at),
              type: n.type || 'system',
            }))
          );
        }
      } catch (_) {}

      if (active) {
        if (hasRemote) {
          setUnreadCount(remoteUnread);
        } else if (portalType === 'mentor') {
          const notifs = mentorNotifications.getNotifications();
          const unreadList = notifs.filter((n) => !n.read);
          currentUnreadIds = unreadList.map((n) => String(n.id));
          setUnreadCount(unreadList.length);
          setLatestNotifs(notifs);
        } else if (portalType === 'learner') {
          const notifs = learnerNotifications.getNotifications();
          const unreadList = notifs.filter((n) => !n.read);
          currentUnreadIds = unreadList.map((n) => String(n.id));
          setUnreadCount(unreadList.length);
          setLatestNotifs(notifs);
        } else {
          setUnreadCount(0);
          setLatestNotifs([]);
        }

        // Play notification chime when new unread notification(s) arrive
        if (prevUnreadNotifIdsRef.current !== null) {
          const prevSet = new Set(prevUnreadNotifIdsRef.current);
          const hasNew = currentUnreadIds.some((id) => !prevSet.has(id));
          if (hasNew) {
            playNotificationSound();
          }
        }
        prevUnreadNotifIdsRef.current = currentUnreadIds;
      }
    };

    updateUnread();
    const interval = setInterval(updateUnread, 10000);

    const handleSync = () => {
      updateUnread();
    };

    window.addEventListener('pairup_notifications_updated', handleSync);
    window.addEventListener('pairup_support_tickets_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('pairup_notifications_updated', handleSync);
      window.removeEventListener('pairup_support_tickets_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [portalType]);

  const handleDropdownItemClick = async (item) => {
    try {
      await notificationsApi.markRead(item.id);
    } catch (_) {}
    if (portalType === 'mentor') {
      mentorNotifications.markRead(item.id);
    } else if (portalType === 'learner') {
      learnerNotifications.markRead(item.id);
    }
    setLatestNotifs((prev) => prev.filter((n) => String(n.id) !== String(item.id)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setDropdownOpen(false);
    window.dispatchEvent(new CustomEvent('pairup_notifications_updated'));

    const target = resolveNotificationLink(item, portalType);
    if (target) {
      navigate(target);
    }
  };

  useEffect(() => {
    let active = true;

    const updateUnreadMessages = async () => {
      try {
        const res = await chatApi.getUnreadCount();
        if (res && typeof res.unread_count === 'number' && active) {
          const newCount = res.unread_count;
          if (prevUnreadMessagesRef.current !== null && newCount > prevUnreadMessagesRef.current) {
            const isChatActive = location.pathname.startsWith('/chat') && location.search.includes('with=');
            if (!isChatActive) {
              playIncomingSound();
            }
          }
          prevUnreadMessagesRef.current = newCount;
          setUnreadMessagesCount(newCount);
        }
      } catch (_) {}
    };

    updateUnreadMessages();
    const msgInterval = setInterval(updateUnreadMessages, 8000);

    const handleMessageSync = (e) => {
      if (e?.detail && typeof e.detail.unread_count === 'number') {
        setUnreadMessagesCount(e.detail.unread_count);
        prevUnreadMessagesRef.current = e.detail.unread_count;
      } else {
        updateUnreadMessages();
      }
    };

    window.addEventListener('pairup_messages_updated', handleMessageSync);

    return () => {
      active = false;
      clearInterval(msgInterval);
      window.removeEventListener('pairup_messages_updated', handleMessageSync);
    };
  }, [location.pathname, location.search]);

  const handleDropdownMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAllRead();
    } catch (_) {}
    if (portalType === 'mentor') {
      mentorNotifications.markAllRead();
    } else if (portalType === 'learner') {
      learnerNotifications.markAllRead();
    }
    setLatestNotifs([]);
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent('pairup_notifications_updated'));
  };

  return (
    <div className={`admin-shell ${fullHeight ? 'admin-shell--full-height' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
      <Sidebar
        portalType={portalType}
        unreadCount={unreadCount}
        unreadMessagesCount={unreadMessagesCount}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <main className={`admin-content ${fullHeight ? 'admin-content--full-height' : ''}`}>
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <button
              type="button"
              className="admin-mobile-menu-btn hide-desktop"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              title="Toggle navigation menu"
              aria-label="Toggle navigation menu"
            >
              <MenuIcon size={18} />
            </button>
            {shouldShowBack && (
              <button
                type="button"
                onClick={handleGoBack}
                className="portal-back-btn"
                title="Go back to previous page"
                aria-label="Go back"
              >
                <ArrowLeftIcon size={15} />
                <span>Back</span>
              </button>
            )}
            <h1 className="admin-page-title" style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </h1>
          </div>
          <div className="admin-topbar-actions">
            {actions}

            {/* Notification Bell with Dropdown Popover */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setDropdownOpen((prev) => !prev)}
                title="Notifications"
                aria-label="Toggle notifications dropdown"
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
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--surface)',
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div
                  className="portal-notif-dropdown"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '360px',
                    maxWidth: 'calc(100vw - 32px)',
                    background: 'var(--card-bg, #1a1a24)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span
                          style={{
                            background: '#DC2626',
                            color: '#fff',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '999px',
                          }}
                        >
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !soundEnabled;
                          soundSettings.setNotificationEnabled(next);
                          setSoundEnabled(next);
                          if (next) {
                            playNotificationSound(true);
                          }
                        }}
                        className="btn btn-ghost"
                        title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: soundEnabled ? 'var(--primary)' : 'var(--text-muted)',
                        }}
                      >
                        {soundEnabled ? <VolumeIcon size={13} /> : <VolumeXIcon size={13} />}
                        <span>{soundEnabled ? 'Sound' : 'Muted'}</span>
                      </button>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleDropdownMarkAllRead}
                          className="btn btn-ghost"
                          style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <CheckIcon size={12} />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {latestNotifs.length === 0 ? (
                      <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No notifications right now
                      </div>
                    ) : (
                      latestNotifs.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleDropdownItemClick(n)}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                            background: !n.read ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <span style={{ fontWeight: n.read ? 500 : 700, fontSize: '13px', color: 'var(--ink)' }}>
                                {n.title}
                              </span>
                              <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)', flexShrink: 0 }}>
                                {n.time}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.body}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate(notificationsLink);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary, #6366f1)',
                        fontWeight: 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                      }}
                    >
                      View all in Notification Center &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              className="icon-btn"
              type="button"
              onClick={toggleTheme}
              title="Toggle dark mode"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
            </button>
          </div>
        </div>
        <div className={`admin-body ${fullHeight ? 'admin-body--full-height' : ''}`} style={bodyStyle}>
          {children}
        </div>
        {!fullHeight && !hideFooter && (
          <footer className="portal-footer" role="contentinfo">
            <div className="portal-footer-inner">
              <div className="portal-footer-copy">
                &copy; {new Date().getFullYear()} PairUp. All rights reserved.
              </div>
              <div className="portal-footer-links">
                <Link to="/terms" className="portal-footer-link" title="Terms of Service">
                  Terms
                </Link>
                <span className="portal-footer-dot" aria-hidden="true">&bull;</span>
                <Link to="/privacy" className="portal-footer-link" title="Privacy Policy">
                  Privacy
                </Link>
              </div>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
