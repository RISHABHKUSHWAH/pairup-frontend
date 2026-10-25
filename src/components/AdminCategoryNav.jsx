import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  UsersIcon,
  MentorIcon,
  ShieldIcon,
  DocumentIcon,
  ClockIcon,
  ScaleIcon,
  CreditCardIcon,
  WalletIcon,
  PercentIcon,
  RefreshIcon,
  MailIcon,
  HelpCircleIcon,
  MessageIcon,
  BarChartIcon,
  TrendingUpIcon,
  SlidersIcon,
  SettingsIcon,
} from './Icons';

export const ADMIN_CATEGORIES = {
  users: {
    title: 'User Management',
    tabs: [
      { label: 'All Users', to: '/admin/users', icon: <UsersIcon size={15} /> },
      { label: 'Account Tracking', to: '/admin/account-tracking', icon: <SlidersIcon size={15} /> },
      { label: 'Mentors', to: '/admin/mentors', icon: <MentorIcon size={15} /> },
      { label: 'ID Verification', to: '/admin/verification', icon: <ShieldIcon size={15} /> },      { label: 'Signup & Activation', to: '/admin/signups-tracking', icon: <TrendingUpIcon size={15} /> },

    ],
  },
  operations: {
    title: 'Platform Operations',
    tabs: [
      { label: 'Problem Requests', to: '/admin/problems', icon: <DocumentIcon size={15} /> },
      { label: 'Contracts', to: '/admin/contracts', icon: <DocumentIcon size={15} /> },
      { label: 'Sessions', to: '/admin/sessions', icon: <ClockIcon size={15} /> },
      { label: 'Disputes', to: '/admin/disputes', icon: <ScaleIcon size={15} /> },
    ],
  },
  finances: {
    title: 'Financial Management',
    tabs: [
      { label: 'Payments', to: '/admin/payments', icon: <CreditCardIcon size={15} /> },
      { label: 'Payouts', to: '/admin/payouts', icon: <WalletIcon size={15} /> },
      { label: 'Commissions', to: '/admin/commissions', icon: <PercentIcon size={15} /> },
      { label: 'Refunds', to: '/admin/refunds', icon: <RefreshIcon size={15} /> },
    ],
  },
  communications: {
    title: 'Communications & Support',
    tabs: [
      { label: 'Mail Center', to: '/admin/mail', icon: <MailIcon size={15} /> },
      { label: 'Support Requests', to: '/admin/support', icon: <HelpCircleIcon size={15} /> },
      { label: 'Direct Messages', to: '/chat', icon: <MessageIcon size={15} /> },
    ],
  },
  logs: {
    title: 'Logs & Analytics',
    tabs: [
      { label: 'Audit Logs', to: '/admin/audit-logs', icon: <ClockIcon size={15} /> },
      { label: 'Reports & Analytics', to: '/admin/reports', icon: <BarChartIcon size={15} /> },
    ],
  },
  system: {
    title: 'System & Settings',
    tabs: [
      { label: 'Platform Settings', to: '/admin/settings', icon: <SettingsIcon size={15} /> },
      { label: 'Content CMS', to: '/admin/content', icon: <DocumentIcon size={15} /> },
    ],
  },
};

export default function AdminCategoryNav({ category, style = {} }) {
  const location = useLocation();

  const activeCategoryKey =
    category ||
    Object.keys(ADMIN_CATEGORIES).find((k) =>
      ADMIN_CATEGORIES[k].tabs.some(
        (t) => location.pathname === t.to || location.pathname.startsWith(t.to + '/')
      )
    );

  if (!activeCategoryKey || !ADMIN_CATEGORIES[activeCategoryKey]) return null;

  const currentCategory = ADMIN_CATEGORIES[activeCategoryKey];

  return (
    <nav
      className="finances-tab-nav admin-category-tab-nav"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--grid-strong)',
        ...style,
      }}
      aria-label={`${currentCategory.title} Category Navigation`}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '6px',
          background: 'rgba(38, 75, 228, 0.08)',
          color: 'var(--brand)',
          fontSize: '11.5px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginRight: '6px',
          flexShrink: 0,
        }}
      >
        <span>Category:</span>
        <span style={{ color: 'var(--ink)' }}>{currentCategory.title}</span>
      </div>

      {currentCategory.tabs.map((tab) => {
        const isActive = location.pathname === tab.to;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`finances-tab-btn ${isActive ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
