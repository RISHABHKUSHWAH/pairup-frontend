import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import AdminCategoryNav from '../../components/AdminCategoryNav';
import Modal from '../../components/Modal';
import { api, initials, formatCurrency, stars } from '../../api/client';
import {
  UsersIcon,
  MentorIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  RefreshIcon,
  DownloadIcon,
  SearchIcon,
  FilterIcon,
  SlidersIcon,
  EyeIcon,
  TrashIcon,
  MailIcon,
  CreditCardIcon,
  DocumentIcon,
  ExternalLinkIcon,
  CheckIcon,
  XIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function AdminAccountTrackingPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();

  // Filters & State
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlineFilter, setOnlineFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Drawer / Inspection
  const [inspectAccount, setInspectAccount] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview' | 'financial' | 'actions'

  useEffect(() => {
    loadData();
  }, [roleFilter, statusFilter, onlineFilter, sortBy, page, pageSize]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = async () => {
    if (!data) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.getAccountTracking({
        role: roleFilter,
        status: statusFilter,
        online: onlineFilter,
        search,
        sort_by: sortBy,
        page,
        page_size: pageSize,
      });
      setData(res);
      // Keep inspected account updated if open
      if (inspectAccount) {
        const updated = res.accounts?.find((a) => a.id === inspectAccount.id);
        if (updated) setInspectAccount(updated);
      }
    } catch (err) {
      toast.error('Failed to load account tracking data: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Toggle Suspend / Reactivate Account
  const handleToggleSuspend = async (account) => {
    const nextSuspended = !account.is_suspended;
    const actionLabel = nextSuspended ? 'Suspend' : 'Reactivate';

    const confirmed = await confirm({
      title: `${actionLabel} Account: ${account.name}`,
      message: `Are you sure you want to ${actionLabel.toLowerCase()} the account for ${account.email}? ${
        nextSuspended
          ? 'They will be immediately blocked from logging in, booking sessions, or creating contracts.'
          : 'Full platform privileges and login access will be immediately restored.'
      }`,
      confirmText: `Yes, ${actionLabel}`,
      type: nextSuspended ? 'danger' : 'success',
    });
    if (!confirmed) return;

    setActionLoadingId(account.id);
    try {
      const res = await api.adminToggleSuspendUser(account.id, nextSuspended);
      toast.success(res.message || `Account for ${account.name} ${nextSuspended ? 'suspended' : 'reactivated'}.`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update account status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Switch Role
  const handleSwitchRole = async (account, targetRole) => {
    if (!targetRole || targetRole === account.role) return;

    const confirmed = await confirm({
      title: `Switch Role for ${account.name}`,
      message: `Change user role from ${account.role.toUpperCase()} to ${targetRole.toUpperCase()}? This immediately updates platform dashboard navigation and permissions.`,
      confirmText: `Switch to ${targetRole}`,
      type: 'warning',
    });
    if (!confirmed) return;

    setActionLoadingId(account.id);
    try {
      const res = await api.adminSwitchUserRole(account.id, targetRole);
      toast.success(res.message || `Switched role to ${targetRole}!`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to switch user role');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject Deletion Request
  const handleRejectDeletion = async (account) => {
    const confirmed = await confirm({
      title: `Reject Deletion Request: ${account.name}`,
      message: `Reject account deletion request for ${account.email}? The user will receive an in-app notification and their account remains active.`,
      confirmText: 'Reject Request',
      type: 'warning',
    });
    if (!confirmed) return;

    setActionLoadingId(account.id);
    try {
      const res = await api.adminRejectDeletionRequest(account.id);
      toast.success(res.message || 'Deletion request rejected.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to reject deletion request');
    } finally {
      setActionLoadingId(null);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data || !data.accounts || data.accounts.length === 0) {
      toast.error('No account data available to export');
      return;
    }

    let csv = 'ID,Name,Email,Role,Status,Online,Email Verified,Total Spent,Total Earned,Pending Escrow,Sessions Total,Sessions Completed,Sessions Disputed,Contracts Active,Registered At\n';
    data.accounts.forEach((a) => {
      csv += `"${a.id}","${(a.name || '').replace(/"/g, '""')}","${a.email}","${a.role}","${a.is_suspended ? 'Suspended' : 'Active'}","${a.is_online ? 'Yes' : 'No'}","${a.is_email_verified ? 'Yes' : 'No'}","${a.total_spent}","${a.total_earned}","${a.pending_escrow}","${a.sessions_count}","${a.sessions_completed}","${a.sessions_disputed}","${a.contracts_active}","${a.created_at || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pairup-account-tracking-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported Account Tracking Report (CSV)!');
  };

  const summary = data?.summary || {};
  const accounts = data?.accounts || [];
  const pagination = data?.pagination || { total_count: 0, page: 1, total_pages: 1 };

  return (
    <PortalLayout role="admin">
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 20px' }}>
        {/* Category Navigation Bar */}
        <AdminCategoryNav category="users" />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginTop: 12, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SlidersIcon size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Account Tracking Table
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Real-time operational monitor of account statuses, workload activity, security flags, and financial ledgers.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <DownloadIcon size={15} />
              <span>Export Audit CSV</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={refreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                cursor: refreshing ? 'not-allowed' : 'pointer',
                color: '#64748B',
              }}
              title="Refresh tracking data"
            >
              <RefreshIcon size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Top KPI Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Card 1: Total Accounts */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Platform Accounts</span>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UsersIcon size={16} />
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>
              {summary.total_accounts || 0}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748B', display: 'flex', gap: 10 }}>
              <span style={{ color: '#10B981', fontWeight: 600 }}>{summary.active_accounts || 0} Active</span>
              <span>•</span>
              <span style={{ color: summary.suspended_accounts > 0 ? '#EF4444' : '#94A3B8', fontWeight: 600 }}>
                {summary.suspended_accounts || 0} Suspended
              </span>
            </div>
          </div>

          {/* Card 2: Live Presence & Role Distribution */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Live Presence</span>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockIcon size={16} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
              <span style={{ fontSize: 26, fontWeight: 800, color: '#10B981' }}>
                {summary.online_accounts || 0} Online
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748B', display: 'flex', gap: 10 }}>
              <span>Learners: <strong style={{ color: '#0F172A' }}>{summary.learners_count || 0}</strong></span>
              <span>•</span>
              <span>Mentors: <strong style={{ color: '#0F172A' }}>{summary.mentors_count || 0}</strong></span>
            </div>
          </div>

          {/* Card 3: Platform Spend & Escrow */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Platform Financials</span>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: '#EEF2FF', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCardIcon size={16} />
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>
              {formatCurrency(summary.total_platform_spend || 0)}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>
              Pending Escrow Holding: <strong style={{ color: '#6366F1' }}>{formatCurrency(summary.total_escrow_holding || 0)}</strong>
            </div>
          </div>

          {/* Card 4: Risk & Action Flags */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Risk & Review Flags</span>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangleIcon size={16} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#D97706' }}>
                {(summary.deletion_requests_count || 0) + (summary.disputed_accounts_count || 0)}
              </span>
              <span style={{ fontSize: 12, color: '#64748B' }}>flagged accounts</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748B', display: 'flex', gap: 10 }}>
              <span>Deletion Req: <strong style={{ color: '#EF4444' }}>{summary.deletion_requests_count || 0}</strong></span>
              <span>•</span>
              <span>Disputes: <strong style={{ color: '#D97706' }}>{summary.disputed_accounts_count || 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Account Tracking Table Card */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {/* Controls Bar */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'learner', label: 'Learners' },
                { id: 'mentor', label: 'Mentors' },
                { id: 'admin', label: 'Admins' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setRoleFilter(r.id); setPage(1); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 16,
                    border: roleFilter === r.id ? '1px solid #6366F1' : '1px solid #E2E8F0',
                    background: roleFilter === r.id ? '#EEF2FF' : '#FFFFFF',
                    color: roleFilter === r.id ? '#4F46E5' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {r.label}
                </button>
              ))}

              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginLeft: 10 }}>Status:</span>
              {[
                { id: 'all', label: 'All Statuses' },
                { id: 'active', label: 'Active' },
                { id: 'suspended', label: 'Suspended' },
                { id: 'deletion_requested', label: 'Deletion Req' },
                { id: 'disputed', label: 'Disputed' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setStatusFilter(s.id); setPage(1); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 16,
                    border: statusFilter === s.id ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                    background: statusFilter === s.id ? '#EFF6FF' : '#FFFFFF',
                    color: statusFilter === s.id ? '#1D4ED8' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}

              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginLeft: 10 }}>Presence:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'online', label: 'Online' },
                { id: 'offline', label: 'Offline' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setOnlineFilter(p.id); setPage(1); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 16,
                    border: onlineFilter === p.id ? '1px solid #10B981' : '1px solid #E2E8F0',
                    background: onlineFilter === p.id ? '#ECFDF5' : '#FFFFFF',
                    color: onlineFilter === p.id ? '#059669' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Search & Sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '7px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  background: '#FFFFFF',
                  color: '#334155',
                  outline: 'none',
                }}
              >
                <option value="-created_at">Sort: Newest First</option>
                <option value="created_at">Sort: Oldest First</option>
                <option value="-total_spent">Sort: Highest Spend</option>
                <option value="-total_earned">Sort: Highest Earned</option>
                <option value="-sessions_count">Sort: Most Sessions</option>
                <option value="name">Sort: Name (A-Z)</option>
              </select>

              {/* Search Box */}
              <div style={{ position: 'relative', width: 230 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                  <SearchIcon size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Search user, email, ID..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    fontSize: 12.5,
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px 18px', minWidth: 220 }}>Account</th>
                  <th style={{ padding: '12px 18px', minWidth: 100 }}>Role</th>
                  <th style={{ padding: '12px 18px', minWidth: 160 }}>Operational Status & Flags</th>
                  <th style={{ padding: '12px 18px', minWidth: 150 }}>Workload & Sessions</th>
                  <th style={{ padding: '12px 18px', minWidth: 140 }}>Financials</th>
                  <th style={{ padding: '12px 18px', minWidth: 110 }}>Joined</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', minWidth: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 18px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshIcon size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      Loading account tracking data...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 18px', textAlign: 'center', color: '#64748B' }}>
                      No accounts matched the active filters.
                    </td>
                  </tr>
                ) : (
                  accounts.map((a) => {
                    const isBusy = actionLoadingId === a.id;
                    const isSuspended = a.is_suspended;

                    return (
                      <tr
                        key={a.id}
                        style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Account Name & Identity */}
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ position: 'relative' }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 10,
                                  background: a.role === 'mentor' ? '#EDE9FE' : a.role === 'admin' ? '#FEF3C7' : '#E0E7FF',
                                  color: a.role === 'mentor' ? '#7C3AED' : a.role === 'admin' ? '#D97706' : '#4338CA',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {initials(a.name || a.email)}
                              </div>
                              {/* Online Presence Dot */}
                              <div
                                title={a.is_online ? 'Online now' : 'Offline'}
                                style={{
                                  position: 'absolute',
                                  bottom: -1,
                                  right: -1,
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: a.is_online ? '#10B981' : '#CBD5E1',
                                  border: '2px solid #FFFFFF',
                                  boxShadow: a.is_online ? '0 0 4px #10B981' : 'none',
                                }}
                              />
                            </div>

                            <div>
                              <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{a.name}</span>
                                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>#{a.id}</span>
                              </div>
                              <div style={{ fontSize: 12, color: '#64748B' }}>{a.email}</div>
                              {a.mentor_title && (
                                <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 500 }}>{a.mentor_title}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: a.role === 'mentor' ? '#F3E8FF' : a.role === 'admin' ? '#FEF3C7' : '#E0F2FE',
                              color: a.role === 'mentor' ? '#7E22CE' : a.role === 'admin' ? '#B45309' : '#0369A1',
                            }}
                          >
                            {a.role}
                          </span>
                        </td>

                        {/* Operational Status & Flags */}
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {/* Main Status */}
                            {isSuspended ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#DC2626', fontWeight: 600, fontSize: 12 }}>
                                <AlertTriangleIcon size={13} />
                                Suspended
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 600, fontSize: 12 }}>
                                <CheckCircleIcon size={13} />
                                Active Account
                              </span>
                            )}

                            {/* Flags */}
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {a.flags?.map((f, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background:
                                      f.severity === 'danger'
                                        ? '#FEE2E2'
                                        : f.severity === 'warning'
                                        ? '#FEF3C7'
                                        : f.severity === 'success'
                                        ? '#DCFCE7'
                                        : f.severity === 'purple'
                                        ? '#F3E8FF'
                                        : '#E0F2FE',
                                    color:
                                      f.severity === 'danger'
                                        ? '#B91C1C'
                                        : f.severity === 'warning'
                                        ? '#B45309'
                                        : f.severity === 'success'
                                        ? '#15803D'
                                        : f.severity === 'purple'
                                        ? '#7E22CE'
                                        : '#0369A1',
                                  }}
                                >
                                  {f.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Workload / Telemetry */}
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontSize: 12, color: '#334155' }}>
                            <strong>{a.sessions_count || 0}</strong> sessions ({a.sessions_completed || 0} done)
                          </div>
                          {a.sessions_disputed > 0 && (
                            <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>
                              ⚠️ {a.sessions_disputed} disputed
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                            {a.contracts_active > 0 ? (
                              <span style={{ color: '#6366F1', fontWeight: 600 }}>{a.contracts_active} active contracts</span>
                            ) : (
                              <span>{a.contracts_count || 0} contracts</span>
                            )}
                            {a.role === 'learner' && a.problems_count > 0 && (
                              <span> • {a.problems_count} problems</span>
                            )}
                          </div>
                        </td>

                        {/* Financial Ledger */}
                        <td style={{ padding: '12px 18px' }}>
                          {a.role === 'mentor' ? (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                                {formatCurrency(a.total_earned || 0)}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B' }}>
                                Escrow: {formatCurrency(a.pending_escrow || 0)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                                {formatCurrency(a.total_spent || 0)}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B' }}>
                                Lifetime Spend
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td style={{ padding: '12px 18px', color: '#64748B', fontSize: 12 }}>
                          {a.created_at ? new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>

                        {/* Action Buttons */}
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {/* Inspect Drawer Button */}
                            <button
                              onClick={() => { setInspectAccount(a); setDrawerTab('overview'); }}
                              title="Inspect full account drawer"
                              style={{
                                padding: '5px 8px',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#4338CA',
                                background: '#EEF2FF',
                                border: '1px solid #C7D2FE',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <EyeIcon size={13} />
                              Inspect
                            </button>

                            {/* Suspend / Reactivate */}
                            <button
                              onClick={() => handleToggleSuspend(a)}
                              disabled={isBusy}
                              title={isSuspended ? 'Reactivate account' : 'Suspend account'}
                              style={{
                                padding: '5px 8px',
                                fontSize: 12,
                                fontWeight: 600,
                                color: isSuspended ? '#059669' : '#DC2626',
                                background: isSuspended ? '#ECFDF5' : '#FEF2F2',
                                border: isSuspended ? '1px solid #A7F3D0' : '1px solid #FECACA',
                                borderRadius: 6,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isSuspended ? 'Reactivate' : 'Suspend'}
                            </button>

                            {/* Deletion Pending Button */}
                            {a.deletion_requested && (
                              <button
                                onClick={() => handleRejectDeletion(a)}
                                title="Reject pending account deletion request"
                                style={{
                                  padding: '5px 8px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: '#B45309',
                                  background: '#FEF3C7',
                                  border: '1px solid #FDE68A',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                }}
                              >
                                Reject Del
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#F8FAFC' }}>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              Showing {accounts.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(pagination.total_count, page * pageSize)} of {pagination.total_count} tracked accounts
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  borderRadius: 6,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  color: page <= 1 ? '#94A3B8' : '#334155',
                }}
              >
                Previous
              </button>

              <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                Page {pagination.page} of {pagination.total_pages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={page >= pagination.total_pages}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  borderRadius: 6,
                  cursor: page >= pagination.total_pages ? 'not-allowed' : 'pointer',
                  color: page >= pagination.total_pages ? '#94A3B8' : '#334155',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-Over Account Drawer */}
      {inspectAccount && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectAccount(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#FFFFFF',
              height: '100%',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.2s ease',
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: inspectAccount.role === 'mentor' ? '#EDE9FE' : '#E0E7FF',
                    color: inspectAccount.role === 'mentor' ? '#7C3AED' : '#4338CA',
                    fontWeight: 700,
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {initials(inspectAccount.name || inspectAccount.email)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                    {inspectAccount.name}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {inspectAccount.email} • ID #{inspectAccount.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectAccount(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6,
                }}
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 24px', background: '#F8FAFC' }}>
              {[
                { id: 'overview', label: 'Overview & Health' },
                { id: 'financial', label: 'Financial & Rates' },
                { id: 'actions', label: 'Quick Actions' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDrawerTab(t.id)}
                  style={{
                    padding: '12px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: drawerTab === t.id ? '#4F46E5' : '#64748B',
                    border: 'none',
                    borderBottom: drawerTab === t.id ? '2px solid #4F46E5' : '2px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {drawerTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Account Status Card */}
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 12 }}>
                      Account Health & Lifecycle
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                      <div>
                        <span style={{ color: '#64748B', fontSize: 11 }}>Login Access:</span>
                        <div style={{ fontWeight: 600, color: inspectAccount.is_suspended ? '#DC2626' : '#059669' }}>
                          {inspectAccount.is_suspended ? 'Suspended' : 'Active'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', fontSize: 11 }}>Email Verified:</span>
                        <div style={{ fontWeight: 600, color: inspectAccount.is_email_verified ? '#059669' : '#D97706' }}>
                          {inspectAccount.is_email_verified ? 'Verified' : 'Unverified'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', fontSize: 11 }}>Online Presence:</span>
                        <div style={{ fontWeight: 600, color: inspectAccount.is_online ? '#059669' : '#64748B' }}>
                          {inspectAccount.is_online ? 'Live Online' : 'Offline'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', fontSize: 11 }}>Account Role:</span>
                        <div style={{ fontWeight: 600, textTransform: 'uppercase', color: '#4F46E5' }}>
                          {inspectAccount.role}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deletion Request Alert if pending */}
                  {inspectAccount.deletion_requested && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', fontWeight: 700, fontSize: 13 }}>
                        <AlertTriangleIcon size={16} />
                        Account Deletion Requested
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#7F1D1D' }}>
                        Requested on {inspectAccount.deletion_requested_at || 'Recently'}.
                        {inspectAccount.deletion_request_reason && ` Reason: "${inspectAccount.deletion_request_reason}"`}
                      </p>
                    </div>
                  )}

                  {/* Activity Telemetry */}
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 12 }}>
                      Workload Telemetry
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                      <div style={{ background: '#FFFFFF', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{inspectAccount.sessions_count || 0}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>Total Sessions</div>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{inspectAccount.sessions_completed || 0}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>Completed</div>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: inspectAccount.sessions_disputed > 0 ? '#DC2626' : '#64748B' }}>
                          {inspectAccount.sessions_disputed || 0}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>Disputed</div>
                      </div>
                    </div>
                  </div>

                  {/* Registration Date */}
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    Registered On: <strong style={{ color: '#0F172A' }}>{inspectAccount.created_at ? new Date(inspectAccount.created_at).toLocaleString() : '—'}</strong>
                  </div>
                </div>
              )}

              {drawerTab === 'financial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Financial Stats */}
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 12 }}>
                      Financial Ledger
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 11, color: '#64748B' }}>Lifetime Spend</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                          {formatCurrency(inspectAccount.total_spent || 0)}
                        </div>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 11, color: '#64748B' }}>Total Payouts Earned</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>
                          {formatCurrency(inspectAccount.total_earned || 0)}
                        </div>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0', gridColumn: 'span 2' }}>
                        <div style={{ fontSize: 11, color: '#64748B' }}>Pending Escrow Holding</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#6366F1' }}>
                          {formatCurrency(inspectAccount.pending_escrow || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rates Card */}
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                      Effective Commission & Tax Rates
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
                      <div>Commission Rate: <strong>{inspectAccount.effective_commission_percent}%</strong> {inspectAccount.custom_commission_percent !== null ? '(Custom Rate)' : '(Platform Default)'}</div>
                      <div>Tax / GST Rate: <strong>{inspectAccount.effective_tax_percent}%</strong> {inspectAccount.custom_tax_percent !== null ? '(Custom Rate)' : '(Platform Default)'}</div>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'actions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Administrative Actions
                  </div>

                  {/* Suspend / Reactivate */}
                  <button
                    onClick={() => handleToggleSuspend(inspectAccount)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: inspectAccount.is_suspended ? '1px solid #A7F3D0' : '1px solid #FECACA',
                      background: inspectAccount.is_suspended ? '#ECFDF5' : '#FEF2F2',
                      color: inspectAccount.is_suspended ? '#059669' : '#DC2626',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{inspectAccount.is_suspended ? 'Reactivate Account Access' : 'Suspend Account Immediately'}</span>
                    <AlertTriangleIcon size={16} />
                  </button>

                  {/* Switch Role Buttons */}
                  <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                      Switch User Role
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['learner', 'mentor'].map((r) => (
                        <button
                          key={r}
                          onClick={() => handleSwitchRole(inspectAccount, r)}
                          disabled={inspectAccount.role === r}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: inspectAccount.role === r ? '1px solid #CBD5E1' : '1px solid #C7D2FE',
                            background: inspectAccount.role === r ? '#E2E8F0' : '#EEF2FF',
                            color: inspectAccount.role === r ? '#94A3B8' : '#4F46E5',
                            cursor: inspectAccount.role === r ? 'not-allowed' : 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {r} {inspectAccount.role === r ? '(Current)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct Message Link */}
                  <Link
                    to={`/chat?partner_id=${inspectAccount.id}`}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span>Send Direct Message</span>
                    <ExternalLinkIcon size={16} />
                  </Link>

                  {/* View In All Users */}
                  <Link
                    to={`/admin/users?search=${encodeURIComponent(inspectAccount.email)}`}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span>View In User Directory</span>
                    <ExternalLinkIcon size={16} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
