import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import AdminCategoryNav from '../../components/AdminCategoryNav';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import {
  UsersIcon,
  MentorIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  RefreshIcon,
  DownloadIcon,
  MailIcon,
  TrendingUpIcon,
  SearchIcon,
  FilterIcon,
  ExternalLinkIcon,
  ShieldIcon,
  SendIcon,
  CheckIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function AdminSignupsTrackingPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();

  // Filters & State
  const [range, setRange] = useState('30d');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modals & User Details
  const [selectedUser, setSelectedUser] = useState(null);
  const [showManualActivateModal, setShowManualActivateModal] = useState(false);
  const [userToActivate, setUserToActivate] = useState(null);
  const [showBulkResendModal, setShowBulkResendModal] = useState(false);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null);

  useEffect(() => {
    loadData();
  }, [range, roleFilter, statusFilter, page, pageSize]);

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
      const res = await api.getSignupsTracking({
        range,
        role: roleFilter,
        status: statusFilter,
        search,
        page,
        page_size: pageSize,
      });
      setData(res);
    } catch (err) {
      toast.error('Failed to load signup tracking data: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Manual Account Activation
  const handleManualActivate = async (user) => {
    setUserToActivate(user);
    setShowManualActivateModal(true);
  };

  const confirmManualActivate = async () => {
    if (!userToActivate) return;
    setActionLoadingId(userToActivate.id);
    try {
      const res = await api.adminManualActivateUser(userToActivate.id);
      toast.success(res.message || `Activated account for ${userToActivate.name}!`);
      setShowManualActivateModal(false);
      setUserToActivate(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to activate account');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resend single user verification email
  const handleResendActivation = async (user) => {
    setActionLoadingId(user.id);
    try {
      const res = await api.adminResendUserActivation(user.id);
      toast.success(res.message || `Activation email dispatched to ${user.email}!`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch activation email');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk resend activation emails
  const handleBulkResend = async () => {
    setBulkLoading(true);
    try {
      const res = await api.adminBulkResendActivations();
      toast.success(res.message || `Dispatched activation emails in bulk!`);
      setShowBulkResendModal(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch bulk activation emails');
    } finally {
      setBulkLoading(false);
    }
  };

  // Copy direct activation link
  const handleCopyActivationLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success('Activation URL copied to clipboard! You can share this directly with the user.');
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data || !data.users || data.users.length === 0) {
      toast.error('No user data available to export');
      return;
    }
    let csv = 'ID,Name,Email,Role,Status,Registered At,Token Created At,Token Age (Hours),Activation URL\n';
    data.users.forEach((u) => {
      csv += `"${u.id}","${(u.name || '').replace(/"/g, '""')}","${u.email}","${u.role}","${u.status_label}","${u.created_at || ''}","${u.token_created_at || ''}","${u.token_age_hours || ''}","${u.web_activation_url || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pairup-signups-tracking-${range}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported signup tracking CSV!');
  };

  const summary = data?.summary || {};
  const dailyTrends = data?.daily_trends || [];
  const funnel = data?.funnel || [];
  const users = data?.users || [];
  const pagination = data?.pagination || { total_count: 0, page: 1, total_pages: 1 };

  // Max value for daily trend bars
  const maxTrendVal = useMemo(() => {
    if (!dailyTrends.length) return 10;
    const max = Math.max(...dailyTrends.map((d) => d.signups), 1);
    return max;
  }, [dailyTrends]);

  return (
    <PortalLayout role="admin">
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
        {/* Category Navigation Bar */}
        <AdminCategoryNav category="users" />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginTop: 12, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUpIcon size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Signup & Activation Tracking
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Monitor onboarding funnel, real-time activation rates, token expiration, and unverified accounts.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Time Range Selector */}
            <div style={{ display: 'flex', background: '#F1F5F9', padding: 3, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 Days' },
                { id: '14d', label: '14 Days' },
                { id: '30d', label: '30 Days' },
                { id: '90d', label: '90 Days' },
                { id: 'all', label: 'All Time' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setRange(t.id); setPage(1); }}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: range === t.id ? '#FFFFFF' : 'transparent',
                    color: range === t.id ? '#0F172A' : '#64748B',
                    boxShadow: range === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Bulk Resend Button */}
            <button
              onClick={() => setShowBulkResendModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: '#6366F1',
                background: '#EEF2FF',
                border: '1px solid #C7D2FE',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              title="Resend activation emails to all pending users"
            >
              <MailIcon size={15} />
              <span>Bulk Resend Emails</span>
              {summary.pending_count > 0 && (
                <span style={{ background: '#6366F1', color: '#FFFFFF', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                  {summary.pending_count + (summary.expired_count || 0)}
                </span>
              )}
            </button>

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
              <span>Export CSV</span>
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

        {/* Top KPI Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Card 1: Total Signups */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Total Signups</span>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UsersIcon size={18} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#0F172A' }}>
                {summary.total_signups || 0}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>
                {range.toUpperCase()}
              </span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#64748B', display: 'flex', gap: 12 }}>
              <span>Learners: <strong style={{ color: '#0F172A' }}>{summary.learners?.total || 0}</strong></span>
              <span>•</span>
              <span>Mentors: <strong style={{ color: '#0F172A' }}>{summary.mentors?.total || 0}</strong></span>
            </div>
          </div>

          {/* Card 2: Activated Accounts & Rate */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Activated Accounts</span>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleIcon size={18} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#10B981' }}>
                {summary.activated_count || 0}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '2px 8px', borderRadius: 6 }}>
                {summary.activation_rate || 0}% rate
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ marginTop: 12, width: '100%', height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, summary.activation_rate || 0)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10B981, #059669)',
                  borderRadius: 3,
                }}
              />
            </div>
          </div>

          {/* Card 3: Pending Activation (<48h) */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Pending Verification</span>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockIcon size={18} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#D97706' }}>
                {summary.pending_count || 0}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#D97706' }}>
                Token active (&lt;48h)
              </span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
              Awaiting user email link click
            </div>
          </div>

          {/* Card 4: Expired Verification (>48h) */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Expired Tokens</span>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangleIcon size={18} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#EF4444' }}>
                {summary.expired_count || 0}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#EF4444' }}>
                Stale (&gt;48h)
              </span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
              Requires resend or admin activation
            </div>
          </div>
        </div>

        {/* Charts & Funnel Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, marginBottom: 24 }}>
          {/* Trend Bar Chart */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '22px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Daily Signups & Activations Trend
                </h3>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Tracking new accounts and verification rates over the last {dailyTrends.length} days
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
                  <span style={{ width: 10, height: 10, background: '#3B82F6', borderRadius: 2 }} />
                  Signups
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
                  <span style={{ width: 10, height: 10, background: '#10B981', borderRadius: 2 }} />
                  Activated
                </span>
              </div>
            </div>

            {/* Daily Bars Container */}
            <div style={{ height: 190, display: 'flex', alignItems: 'flex-end', gap: dailyTrends.length > 15 ? 4 : 8, paddingTop: 20, borderBottom: '1px solid #E2E8F0' }}>
              {dailyTrends.map((d, idx) => {
                const signupHeight = Math.max(4, Math.round((d.signups / maxTrendVal) * 150));
                const activatedHeight = Math.max(2, Math.round((d.activated / maxTrendVal) * 150));
                const isHovered = hoveredTrendIdx === idx;

                return (
                  <div
                    key={d.date}
                    onMouseEnter={() => setHoveredTrendIdx(idx)}
                    onMouseLeave={() => setHoveredTrendIdx(null)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          marginBottom: 8,
                          background: '#0F172A',
                          color: '#FFFFFF',
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 11,
                          whiteSpace: 'nowrap',
                          zIndex: 20,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.label} ({d.date})</div>
                        <div>Signups: <strong>{d.signups}</strong> (L: {d.learners}, M: {d.mentors})</div>
                        <div>Activated: <strong style={{ color: '#34D399' }}>{d.activated}</strong></div>
                        <div>Conversion: <strong>{d.rate}%</strong></div>
                      </div>
                    )}

                    {/* Dual Bars */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center' }}>
                      <div
                        style={{
                          width: '45%',
                          maxWidth: 16,
                          height: signupHeight,
                          background: isHovered ? '#1D4ED8' : '#3B82F6',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.2s ease',
                        }}
                      />
                      <div
                        style={{
                          width: '45%',
                          maxWidth: 16,
                          height: activatedHeight,
                          background: isHovered ? '#047857' : '#10B981',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#94A3B8' }}>
              <span>{dailyTrends[0]?.label || ''}</span>
              <span>{dailyTrends[Math.floor(dailyTrends.length / 2)]?.label || ''}</span>
              <span>{dailyTrends[dailyTrends.length - 1]?.label || ''}</span>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '22px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px 0', color: '#0F172A' }}>
              Acquisition & Verification Funnel
            </h3>
            <span style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 16 }}>
              Drop-off from registration submission to active platform engagement
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnel.map((step, idx) => (
                <div key={step.stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: step.color,
                          color: '#FFFFFF',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                        {step.stage}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <strong style={{ fontSize: 14, color: '#0F172A' }}>{step.count}</strong>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>({step.percent}%)</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(2, step.percent))}%`,
                        height: '100%',
                        background: step.color,
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{step.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Role Comparison Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Learners */}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px 20px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#E0E7FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UsersIcon size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Learner Signups</h4>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {summary.learners?.activated || 0} activated of {summary.learners?.total || 0} total
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#4F46E5' }}>
                {summary.learners?.activation_rate || 0}%
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>Activation Rate</div>
            </div>
          </div>

          {/* Mentors */}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px 20px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#EDE9FE', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MentorIcon size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Mentor Signups</h4>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {summary.mentors?.activated || 0} activated of {summary.mentors?.total || 0} total
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#7C3AED' }}>
                {summary.mentors?.activation_rate || 0}%
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>Activation Rate</div>
            </div>
          </div>
        </div>

        {/* Tracking & Management Table Section */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {/* Table Header Controls */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginRight: 4 }}>Status:</span>
              {[
                { id: 'all', label: 'All Accounts' },
                { id: 'activated', label: 'Activated' },
                { id: 'pending', label: 'Pending (<48h)' },
                { id: 'expired', label: 'Expired (>48h)' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setStatusFilter(s.id); setPage(1); }}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 20,
                    border: statusFilter === s.id ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                    background: statusFilter === s.id ? '#EFF6FF' : '#FFFFFF',
                    color: statusFilter === s.id ? '#1D4ED8' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}

              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginLeft: 10, marginRight: 4 }}>Role:</span>
              {[
                { id: 'all', label: 'All Roles' },
                { id: 'learner', label: 'Learners' },
                { id: 'mentor', label: 'Mentors' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setRoleFilter(r.id); setPage(1); }}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 20,
                    border: roleFilter === r.id ? '1px solid #6366F1' : '1px solid #E2E8F0',
                    background: roleFilter === r.id ? '#EEF2FF' : '#FFFFFF',
                    color: roleFilter === r.id ? '#4338CA' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 260 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                placeholder="Search by user name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  fontSize: 13,
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px 18px' }}>User Details</th>
                  <th style={{ padding: '12px 18px' }}>Role</th>
                  <th style={{ padding: '12px 18px' }}>Signup Date</th>
                  <th style={{ padding: '12px 18px' }}>Verification Status</th>
                  <th style={{ padding: '12px 18px' }}>Token Lifecycle</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 18px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshIcon size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      Loading signup tracking data...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 18px', textAlign: 'center', color: '#64748B' }}>
                      No user accounts found matching your selected filters.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isActivated = u.status_label === 'activated';
                    const isExpired = u.status_label === 'expired';
                    const isPending = u.status_label === 'pending';
                    const isBusy = actionLoadingId === u.id;

                    return (
                      <tr
                        key={u.id}
                        style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* User Identity */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: u.role === 'mentor' ? '#EDE9FE' : '#E0E7FF',
                                color: u.role === 'mentor' ? '#7C3AED' : '#4338CA',
                                fontWeight: 700,
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {initials(u.name || u.email)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>{u.name}</div>
                              <div style={{ fontSize: 12, color: '#64748B' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: u.role === 'mentor' ? '#F3E8FF' : '#E0F2FE',
                              color: u.role === 'mentor' ? '#7E22CE' : '#0369A1',
                            }}
                          >
                            {u.role}
                          </span>
                          {u.mentor_approval_status && (
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                              Profile: {u.mentor_approval_status}
                            </div>
                          )}
                        </td>

                        {/* Signup Date */}
                        <td style={{ padding: '14px 18px', color: '#334155' }}>
                          <div>{u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>
                            {u.created_at ? new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px' }}>
                          {isActivated ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 9px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: '#ECFDF5',
                                color: '#059669',
                              }}
                            >
                              <CheckCircleIcon size={14} />
                              Verified & Active
                            </span>
                          ) : isExpired ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 9px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: '#FEF2F2',
                                color: '#DC2626',
                              }}
                            >
                              <AlertTriangleIcon size={14} />
                              Token Expired (&gt;48h)
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 9px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: '#FFFBEB',
                                color: '#D97706',
                              }}
                            >
                              <ClockIcon size={14} />
                              Pending Verification
                            </span>
                          )}
                        </td>

                        {/* Token Lifecycle */}
                        <td style={{ padding: '14px 18px' }}>
                          {isActivated ? (
                            <span style={{ color: '#059669', fontSize: 12 }}>Completed onboarding</span>
                          ) : (
                            <div>
                              <div style={{ fontSize: 12, color: '#334155' }}>
                                Age: <strong>{u.token_age_hours !== null ? `${u.token_age_hours} hrs` : 'Just sent'}</strong>
                              </div>
                              {isPending && u.hours_until_expiry !== null && (
                                <div style={{ fontSize: 11, color: '#D97706' }}>
                                  Expires in {u.hours_until_expiry} hrs
                                </div>
                              )}
                              {isExpired && (
                                <div style={{ fontSize: 11, color: '#DC2626' }}>
                                  Link no longer valid
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {/* Copy Activation URL */}
                            {!isActivated && u.web_activation_url && (
                              <button
                                onClick={() => handleCopyActivationLink(u.web_activation_url)}
                                title="Copy direct verification link to clipboard"
                                style={{
                                  padding: '5px 8px',
                                  fontSize: 12,
                                  color: '#475569',
                                  background: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                }}
                              >
                                Copy Link
                              </button>
                            )}

                            {/* Resend Activation */}
                            {!isActivated && (
                              <button
                                onClick={() => handleResendActivation(u)}
                                disabled={isBusy}
                                title="Resend branded activation email"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '5px 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#4F46E5',
                                  background: '#EEF2FF',
                                  border: '1px solid #C7D2FE',
                                  borderRadius: 6,
                                  cursor: isBusy ? 'not-allowed' : 'pointer',
                                }}
                              >
                                <MailIcon size={13} />
                                Resend
                              </button>
                            )}

                            {/* Manual Activate */}
                            {!isActivated && (
                              <button
                                onClick={() => handleManualActivate(u)}
                                disabled={isBusy}
                                title="Manually verify and activate account"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '5px 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#FFFFFF',
                                  background: '#10B981',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: isBusy ? 'not-allowed' : 'pointer',
                                }}
                              >
                                <CheckIcon size={13} />
                                Activate
                              </button>
                            )}

                            {/* Activated State link */}
                            {isActivated && (
                              <Link
                                to={`/admin/users?search=${encodeURIComponent(u.email)}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#3B82F6',
                                  textDecoration: 'none',
                                  padding: '5px 10px',
                                }}
                              >
                                View User
                                <ExternalLinkIcon size={13} />
                              </Link>
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

          {/* Pagination Footer */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#F8FAFC' }}>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              Showing {users.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(pagination.total_count, page * pageSize)} of {pagination.total_count} accounts
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

      {/* Manual Activation Modal */}
      {showManualActivateModal && userToActivate && (
        <Modal
          title="Manual Account Activation"
          onClose={() => setShowManualActivateModal(false)}
        >
          <div style={{ padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleIcon size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  Activate {userToActivate.name}?
                </h4>
                <div style={{ fontSize: 13, color: '#64748B' }}>{userToActivate.email} ({userToActivate.role})</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              This administrator action immediately marks the user's email as verified and activates their account for login, bypassing token email verification.
            </p>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#64748B' }}>
              <div><strong>Registration Date:</strong> {new Date(userToActivate.created_at).toLocaleString()}</div>
              <div><strong>Current Status:</strong> {userToActivate.status_label.toUpperCase()}</div>
              <div><strong>Audit Record:</strong> This manual activation will be recorded in the Admin Audit Log.</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowManualActivateModal(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmManualActivate}
                disabled={actionLoadingId === userToActivate.id}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: '#10B981',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {actionLoadingId === userToActivate.id ? 'Activating...' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Resend Confirmation Modal */}
      {showBulkResendModal && (
        <Modal
          title="Bulk Dispatch Activation Emails"
          onClose={() => setShowBulkResendModal(false)}
        >
          <div style={{ padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EEF2FF', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MailIcon size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  Resend Verification Emails
                </h4>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  Target: All unverified and expired accounts
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Are you sure you want to generate fresh verification tokens and re-send activation emails to all accounts that have not yet verified their email?
            </p>

            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#92400E' }}>
              <strong>Notice:</strong> This will dispatch emails to approximately{' '}
              <strong>{summary.pending_count + (summary.expired_count || 0)}</strong> unverified users. Each user will receive a freshly generated token valid for 48 hours.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowBulkResendModal(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkResend}
                disabled={bulkLoading}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: '#6366F1',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {bulkLoading ? 'Dispatching...' : 'Dispatch All Emails'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PortalLayout>
  );
}
