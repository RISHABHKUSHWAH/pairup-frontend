import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';
import { BellIcon, SunIcon, MoonIcon, ArrowLeftIcon } from './Icons';

export default function PortalLayout({
  title,
  portalType = 'learner',
  actions,
  showBack,
  backUrl,
  fullHeight = false,
  bodyStyle = {},
  children,
}) {
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pairup_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    let active = true;
    const updateUnread = async () => {
      let remoteUnread = 0;
      let hasRemote = false;
      try {
        const data = await notificationsApi.list();
        if (Array.isArray(data) && active) {
          hasRemote = true;
          remoteUnread = data.filter((n) => !n.is_read).length;
        }
      } catch (_) {}

      if (active) {
        if (portalType === 'mentor') {
          const notifs = mentorNotifications.getNotifications();
          const localUnread = notifs.filter((n) => !n.read).length;
          setUnreadCount(hasRemote ? remoteUnread + localUnread : localUnread);
        } else if (portalType === 'learner') {
          const notifs = learnerNotifications.getNotifications();
          const localUnread = notifs.filter((n) => !n.read).length;
          setUnreadCount(hasRemote ? remoteUnread + localUnread : localUnread);
        } else {
          setUnreadCount(hasRemote ? remoteUnread : 0);
        }
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

  return (
    <div className={`admin-shell ${fullHeight ? 'admin-shell--full-height' : ''}`}>
      <Sidebar
        portalType={portalType}
        unreadCount={unreadCount}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <main className={`admin-content ${fullHeight ? 'admin-content--full-height' : ''}`}>
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
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
            <Link
              to={notificationsLink}
              className="icon-btn"
              title="Notifications"
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
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </Link>
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
      </main>
    </div>
  );
}
