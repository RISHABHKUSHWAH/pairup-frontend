import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context';
import { initials } from '../api/client';
import {
  DashboardIcon,
  SearchIcon,
  PlusIcon,
  DocumentIcon,
  ClockIcon,
  MessageIcon,
  CreditCardIcon,
  StarIcon,
  UserIcon,
  SettingsIcon,
  HeartIcon,
  BookIcon,
  BellIcon,
  UsersIcon,
  MentorIcon,
  CalendarIcon,
  WalletIcon,
  PercentIcon,
  RefreshIcon,
  ScaleIcon,
  ShieldIcon,
  BarChartIcon,
  FileEditIcon,
  ListIcon,
  CrownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  HelpCircleIcon,
  MailIcon,
} from './Icons';
import { HelpCenterModal, SupportRequestsModal, WhatsNewModal } from './HelpModals';
import PairUpLogo from './PairUpLogo';
import { useTour } from '../context/TourContext';

export default function Sidebar({
  portalType = 'learner',
  unreadCount = 0,
  collapsed: controlledCollapsed,
  onToggle,
}) {
  const { user, logout, switchRole } = useAuth();
  const { toast } = useToast();
  const { startTour } = useTour();
  const navigate = useNavigate();

  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const userChipRef = useRef(null);

  const [helpOpen, setHelpOpen] = useState(false);
  const helpMenuRef = useRef(null);

  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showSupportRequests, setShowSupportRequests] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pairup_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('pairup_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        userChipRef.current &&
        !userChipRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
      if (
        helpMenuRef.current &&
        !helpMenuRef.current.contains(event.target)
      ) {
        setHelpOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setHelpOpen(false);
      }
    }
    if (menuOpen || helpOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, helpOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setHelpOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOpenSupport = () => {
      setShowSupportRequests(true);
    };
    window.addEventListener('pairup_open_support_ticket', handleOpenSupport);
    return () => window.removeEventListener('pairup_open_support_ticket', handleOpenSupport);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const handleSwitchMode = async () => {
    try {
      setMenuOpen(false);
      const target = user?.role === 'mentor' ? 'learner' : 'mentor';
      await switchRole(target);
      navigate(target === 'mentor' ? '/mentor/dashboard' : '/learner/dashboard');
    } catch (err) {
      toast.error('Could not switch role: ' + err.message);
    }
  };

  const learnerNav = [
    { to: '/learner/dashboard', label: 'Dashboard', icon: <DashboardIcon size={20} /> },
    { to: '/learner/explore', label: 'Find mentors', icon: <SearchIcon size={20} />, dataTour: 'nav-explore' },
    { to: '/learner/post-problem', label: 'Post problem', icon: <PlusIcon size={20} />, dataTour: 'nav-post-problem' },
    { to: '/learner/my-problems', label: 'My problems', icon: <DocumentIcon size={20} />, dataTour: 'nav-my-problems' },
    { to: '/learner/contracts', label: 'Contracts', icon: <DocumentIcon size={20} />, dataTour: 'nav-contracts' },
    { to: '/learner/sessions', label: 'Sessions', icon: <ClockIcon size={20} />, dataTour: 'nav-sessions' },
    { to: '/chat', label: 'Messages', icon: <MessageIcon size={20} />, dataTour: 'nav-messages' },
    { to: '/learner/payments', label: 'Payments', icon: <CreditCardIcon size={20} />, dataTour: 'nav-payments' },
    { to: '/learner/reviews', label: 'Reviews', icon: <StarIcon size={20} />, dataTour: 'nav-reviews' },
  ];

  const mentorNav = [
    { to: '/mentor/dashboard', label: 'Dashboard', icon: <DashboardIcon size={20} /> },
    { to: '/mentor/explore-problems', label: 'Explore problems', icon: <SearchIcon size={20} />, dataTour: 'nav-explore-problems' },
    { to: '/mentor/my-proposals', label: 'My proposals', icon: <FileEditIcon size={20} />, dataTour: 'nav-my-proposals' },
    { to: '/mentor/contracts', label: 'Contracts', icon: <DocumentIcon size={20} />, dataTour: 'nav-contracts' },
    { to: '/mentor/sessions', label: 'Sessions', icon: <ClockIcon size={20} />, dataTour: 'nav-sessions' },
    { to: '/chat', label: 'Messages', icon: <MessageIcon size={20} />, dataTour: 'nav-messages' },
    { to: '/mentor/availability', label: 'Availability', icon: <ClockIcon size={20} />, dataTour: 'nav-availability' },
    { to: '/mentor/calendar', label: 'Calendar', icon: <CalendarIcon size={20} />, dataTour: 'nav-calendar' },
    { to: '/mentor/earnings', label: 'Earnings & Payouts', icon: <WalletIcon size={20} />, dataTour: 'nav-earnings' },
    { to: '/mentor/reviews', label: 'Reviews', icon: <StarIcon size={20} />, dataTour: 'nav-reviews' },
  ];

  const adminNav = [
    { to: '/admin', label: 'Dashboard', icon: <DashboardIcon size={20} />, end: true },
    { to: '/admin/users', label: 'Users', icon: <UsersIcon size={20} /> },
    { to: '/admin/mentors', label: 'Mentors', icon: <MentorIcon size={20} /> },
    { to: '/admin/problems', label: 'Problem requests', icon: <DocumentIcon size={20} /> },
    { to: '/admin/contracts', label: 'Contracts', icon: <DocumentIcon size={20} /> },
    { to: '/admin/sessions', label: 'Sessions', icon: <ClockIcon size={20} /> },
    { to: '/admin/payments', label: 'Payments', icon: <CreditCardIcon size={20} /> },
    { to: '/admin/payouts', label: 'Payouts', icon: <WalletIcon size={20} /> },
    { to: '/admin/commissions', label: 'Commissions', icon: <PercentIcon size={20} /> },
    { to: '/admin/refunds', label: 'Refunds', icon: <RefreshIcon size={20} /> },
    { to: '/admin/disputes', label: 'Disputes', icon: <ScaleIcon size={20} /> },
    { to: '/admin/support', label: 'Support requests', icon: <MailIcon size={20} /> },
    { to: '/admin/verification', label: 'Verification', icon: <ShieldIcon size={20} /> },
    { to: '/admin/reviews', label: 'Reviews', icon: <StarIcon size={20} /> },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: <BarChartIcon size={20} /> },
    { to: '/admin/content', label: 'Content CMS', icon: <FileEditIcon size={20} /> },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: <ListIcon size={20} /> },
  ];

  if (user?.role === 'superadmin') {
    adminNav.push({ to: '/superadmin', label: 'Super Admin', icon: <CrownIcon size={20} /> });
  }

  let items = learnerNav;
  let roleLabel = 'LEARNER';
  let homeLink = '/learner/dashboard';

  if (portalType === 'mentor') {
    items = mentorNav;
    roleLabel = 'MENTOR';
    homeLink = '/mentor/dashboard';
  } else if (portalType === 'admin') {
    items = adminNav;
    roleLabel = user?.role === 'superadmin' ? 'SUPER ADMIN' : 'ADMIN';
    homeLink = '/admin';
  }

  const profileLink =
    portalType === 'mentor'
      ? '/mentor/profile'
      : portalType === 'admin'
      ? '/admin/settings'
      : '/learner/profile';

  const settingsLink =
    portalType === 'mentor'
      ? '/mentor/settings'
      : portalType === 'admin'
      ? '/admin/settings'
      : '/learner/settings';

  const notificationsLink =
    portalType === 'mentor'
      ? '/mentor/notifications'
      : portalType === 'admin'
      ? '/admin/notifications'
      : '/learner/notifications';

  return (
    <aside className={`admin-sidebar admin-sidebar--${portalType} portal-${portalType} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="admin-sidebar-top">
        <div className="admin-sidebar-header-row">
          <Link className="logo" to={homeLink} style={{ color: '#fff' }} title="PairUp Home">
            <PairUpLogo size={22} className="logo-mark logo-mark-full" variant="mark" />
            <PairUpLogo size={22} className="logo-mark logo-mark-icon" variant="icon" />
            <span className="logo-text">PairUp</span>
          </Link>
          <button
            type="button"
            className="admin-sidebar-toggle-btn"
            data-tour="sidebar-toggle"
            onClick={handleToggle}
            title={isCollapsed ? "Unfold sidebar" : "Fold sidebar"}
            aria-label={isCollapsed ? "Unfold sidebar" : "Fold sidebar"}
          >
            {isCollapsed ? <PanelLeftOpenIcon size={16} /> : <PanelLeftCloseIcon size={16} />}
          </button>
        </div>
        <div className="admin-role-label">{roleLabel}</div>
      </div>

      <nav className={`admin-nav ${portalType === 'admin' ? 'admin-nav--scrollable' : 'admin-nav--no-scroll'}`}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            data-tour={item.dataTour}
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            <span className="admin-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-bottom">
        {/* Floating User Account Menu */}
        {menuOpen && (
          <div ref={menuRef} className="admin-user-menu" role="menu" aria-label="User Account Menu">
            <div className="admin-user-menu-header">
              <div className="admin-user-menu-title" title={user?.name || 'User'}>
                {user?.name || 'User'}
              </div>
              <div className="admin-user-menu-email" title={user?.email || ''}>
                {user?.email || ''}
              </div>
              <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="admin-user-menu-badge">
                  {user?.role ? user.role.toUpperCase() : roleLabel}
                </span>
                {portalType === 'mentor' && (
                  <span className="admin-user-avail-status" title="Available for sessions">
                    <span className="avail-dot"></span> Available
                  </span>
                )}
              </div>
            </div>

            <NavLink
              to={profileLink}
              className={({ isActive }) => `admin-user-menu-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <UserIcon size={16} />
              <span>{portalType === 'mentor' ? 'Mentor Profile' : portalType === 'admin' ? 'Admin Profile' : 'My Profile'}</span>
            </NavLink>

            {portalType === 'mentor' && (
              <NavLink
                to="/mentor/availability"
                className={({ isActive }) => `admin-user-menu-item ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <ClockIcon size={16} />
                <span>Availability</span>
                <span className="admin-user-menu-avail-pill">Open</span>
              </NavLink>
            )}

            <NavLink
              to={notificationsLink}
              className={({ isActive }) => `admin-user-menu-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <BellIcon size={16} />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="admin-user-menu-count">{unreadCount}</span>
              )}
            </NavLink>

            <NavLink
              to={settingsLink}
              className={({ isActive }) => `admin-user-menu-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <SettingsIcon size={16} />
              <span>Settings</span>
            </NavLink>

            {portalType === 'learner' && (
              <>
                <NavLink
                  to="/learner/favorites"
                  className={({ isActive }) => `admin-user-menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <HeartIcon size={16} />
                  <span>Favorites</span>
                </NavLink>
                <NavLink
                  to="/learner/history"
                  className={({ isActive }) => `admin-user-menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <BookIcon size={16} />
                  <span>Learning History</span>
                </NavLink>
              </>
            )}

            {user && (user.role === 'learner' || user.role === 'mentor') && user.allow_role_switching !== false && user.allow_role_switching !== 'false' && (
              <button
                type="button"
                className="admin-user-menu-item"
                onClick={handleSwitchMode}
              >
                <RefreshIcon size={16} />
                <span>{user.role === 'mentor' ? 'Switch to Learner' : 'Switch to Mentor'}</span>
              </button>
            )}

            {user && (user.role === 'admin' || user.role === 'superadmin') && portalType !== 'admin' && (
              <button
                type="button"
                className="admin-user-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/admin');
                }}
              >
                <ShieldIcon size={16} />
                <span>Return to Admin</span>
              </button>
            )}

            {user && (user.role === 'admin' || user.role === 'superadmin') && portalType === 'admin' && (
              <>
                <NavLink
                  to="/learner/dashboard"
                  className="admin-user-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <SearchIcon size={16} />
                  <span>View as Learner</span>
                </NavLink>
                <NavLink
                  to="/mentor/dashboard"
                  className="admin-user-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <MentorIcon size={16} />
                  <span>View as Mentor</span>
                </NavLink>
              </>
            )}

            {(portalType === 'mentor' || portalType === 'learner') && (
              <button
                type="button"
                className="admin-user-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setShowHelpCenter(true);
                }}
              >
                <HelpCircleIcon size={16} />
                <span>Help &amp; FAQs</span>
              </button>
            )}

            <div className="admin-user-menu-divider" />

            <button
              type="button"
              className="admin-user-menu-item danger"
              onClick={handleLogout}
            >
              <LogOutIcon size={16} />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* Help Menu Flyout Trigger for Mentor & Learner */}
        {(portalType === 'mentor' || portalType === 'learner') && (
          <div className="admin-help-wrapper" ref={helpMenuRef}>
            <button
              type="button"
              className={`admin-help-btn ${helpOpen ? 'open' : ''}`}
              data-tour="help-menu"
              onClick={() => setHelpOpen((prev) => !prev)}
              title={isCollapsed ? "Help & Support" : undefined}
              aria-haspopup="true"
              aria-expanded={helpOpen}
            >
              <span className="admin-help-icon">
                <HelpCircleIcon size={18} />
              </span>
              <span className="admin-help-label">Help</span>
              <span className="admin-help-arrow">
                <ChevronRightIcon size={14} />
              </span>
            </button>

            {helpOpen && (
              <div className="admin-help-flyout" role="menu" aria-label="Help Options">
                <button
                  type="button"
                  className="admin-help-flyout-item"
                  style={{ color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onClick={() => {
                    setHelpOpen(false);
                    startTour(portalType);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CrownIcon size={14} /> Platform tour
                  </span>
                  <span style={{ fontSize: '9.5px', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>
                    Guide
                  </span>
                </button>
                <button
                  type="button"
                  className="admin-help-flyout-item"
                  onClick={() => {
                    setHelpOpen(false);
                    setShowHelpCenter(true);
                  }}
                >
                  Help center
                </button>
                <button
                  type="button"
                  className="admin-help-flyout-item"
                  onClick={() => {
                    setHelpOpen(false);
                    setShowSupportRequests(true);
                  }}
                >
                  My support requests
                </button>
                <button
                  type="button"
                  className="admin-help-flyout-item"
                  onClick={() => {
                    setHelpOpen(false);
                    setShowWhatsNew(true);
                  }}
                >
                  What's new
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Card Trigger */}
        <div
          ref={userChipRef}
          className={`admin-user-chip ${menuOpen ? 'open' : ''}`}
          data-tour="user-menu"
          onClick={() => setMenuOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setMenuOpen((prev) => !prev);
            }
          }}
          title={isCollapsed ? `${user?.name || 'User'} (Account & preferences)` : "Account & preferences menu"}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <div className="avatar-sm">
            {initials(user?.name)}
            {unreadCount > 0 && <span className="admin-user-dot" title={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`} />}
          </div>
          <div className="admin-user-info">
            <div className="admin-user-name" title={user?.name || 'User'}>
              {user?.name || 'User'}
            </div>
            <div className="admin-user-role" style={{ display: 'flex', alignItems: 'center' }}>
              <span>{user?.role || ''}</span>
              {portalType === 'mentor' && (
                <span className="admin-user-avail-status" title="Available for sessions">
                  <span className="avail-dot"></span> Available
                </span>
              )}
            </div>
          </div>
          <div className="admin-user-chevron">
            <ChevronUpIcon size={16} />
          </div>
        </div>
      </div>

      {/* Help & Support Modals */}
      <HelpCenterModal
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        onOpenSupport={() => setShowSupportRequests(true)}
      />
      <SupportRequestsModal
        isOpen={showSupportRequests}
        onClose={() => setShowSupportRequests(false)}
        user={user}
        portalType={portalType}
      />
      <WhatsNewModal
        isOpen={showWhatsNew}
        onClose={() => setShowWhatsNew(false)}
      />
    </aside>
  );
}
