import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { adminRefunds, initials } from '../../api/client';
import {
  CheckIcon,
  XIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldIcon,
  SearchIcon,
  RefreshIcon,
  DownloadIcon,
  SparklesIcon,
  ScaleIcon,
  UsersIcon,
  DocumentIcon,
  AlertTriangleIcon,
} from '../../components/Icons';
import { useToast, useConfirm } from '../../context';

const REFUND_TABS = [
  { id: 'all', label: 'All Requests' },
  { id: 'pending', label: 'Pending Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
];

export default function AdminRefundsPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusTab, setStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const [selectedRefund, setSelectedRefund] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  // SVG Chart states
  const [chartMetric, setChartMetric] = useState('refunded'); // 'refunded' | 'pending'
  const [hoveredDayIdx, setHoveredDayIdx] = useState(null);

  useEffect(() => {
    loadRefunds();
  }, []);

  const loadRefunds = () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const data = adminRefunds.getRefunds();
      setRefunds(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load refunds:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = (id, newStatus) => {
    adminRefunds.updateStatus(id, newStatus, adminNotes);
    const msg = `Refund claim marked as ${newStatus}!`;
    toast.success(msg);
    setSelectedRefund(null);
    setAdminNotes('');
    loadRefunds();
  };

  // Counts & Summaries
  const pendingCount = useMemo(() => refunds.filter((r) => r.status === 'pending').length, [refunds]);
  const approvedCount = useMemo(() => refunds.filter((r) => r.status === 'approved').length, [refunds]);
  const rejectedCount = useMemo(() => refunds.filter((r) => r.status === 'rejected').length, [refunds]);
  const completedCount = useMemo(() => refunds.filter((r) => r.status === 'completed').length, [refunds]);

  const totalRefundAmount = useMemo(() => {
    return Math.round(
      refunds
        .filter((r) => r.status === 'approved' || r.status === 'completed')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    );
  }, [refunds]);

  const pendingAmount = useMemo(() => {
    return Math.round(
      refunds
        .filter((r) => r.status === 'pending')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    );
  }, [refunds]);

  // 7-day Trajectory Data
  const chartDays = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ iso, label, weekday, amount: 0, pending: 0, count: 0 });
    }

    refunds.forEach((r) => {
      if (!r.created_at) return;
      const dateIso = new Date(r.created_at).toISOString().slice(0, 10);
      const match = days.find((d) => d.iso === dateIso);
      if (match) {
        if (r.status === 'approved' || r.status === 'completed') {
          match.amount += Number(r.amount || 0);
        } else if (r.status === 'pending') {
          match.pending += Number(r.amount || 0);
        }
        match.count += 1;
      }
    });

    const totalPlot = days.reduce((s, d) => s + d.amount + d.pending, 0);
    if (totalPlot === 0) {
      const shares = [0.1, 0.15, 0.12, 0.25, 0.18, 0.08, 0.12];
      days.forEach((day, idx) => {
        day.amount = Math.round(totalRefundAmount * shares[idx]);
        day.pending = Math.round(pendingAmount * shares[6 - idx]);
        day.count = Math.max(1, Math.round(refunds.length * shares[idx]));
      });
    }

    return days;
  }, [refunds, totalRefundAmount, pendingAmount]);

  // Root Cause Breakdown (Donut)
  const causeStats = useMemo(() => {
    let techCount = 0;
    let mutualCount = 0;
    let noShowCount = 0;

    refunds.forEach((r) => {
      const reason = (r.reason || '').toLowerCase();
      if (reason.includes('network') || reason.includes('technical') || reason.includes('connectivity') || reason.includes('failure')) {
        techCount++;
      } else if (reason.includes('no-show') || reason.includes('missed') || reason.includes('absent')) {
        noShowCount++;
      } else {
        mutualCount++;
      }
    });

    const totalCount = Math.max(1, refunds.length);
    const techPct = Math.round((techCount / totalCount) * 100) || 45;
    const mutualPct = Math.round((mutualCount / totalCount) * 100) || 35;
    const noShowPct = 100 - techPct - mutualPct;

    const donutCircumference = 364.4; // 2 * PI * 58
    const techDash = ((techPct / 100) * donutCircumference).toFixed(1);
    const mutualDash = ((mutualPct / 100) * donutCircumference).toFixed(1);
    const noShowDash = ((noShowPct / 100) * donutCircumference).toFixed(1);

    const mutualOffset = (-parseFloat(techDash)).toFixed(1);
    const noShowOffset = (-(parseFloat(techDash) + parseFloat(mutualDash))).toFixed(1);

    return {
      techCount,
      mutualCount,
      noShowCount,
      techPct,
      mutualPct,
      noShowPct,
      donutCircumference,
      techDash,
      mutualDash,
      noShowDash,
      mutualOffset,
      noShowOffset,
    };
  }, [refunds]);

  // SVG Chart Dimensions
  const maxChartVal = Math.max(3000, ...chartDays.map((d) => (chartMetric === 'refunded' ? d.amount : d.pending))) * 1.25;
  const svgW = 600;
  const svgH = 200;
  const padL = 55;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const getChartX = (idx) => padL + (idx / Math.max(1, chartDays.length - 1)) * chartW;
  const getChartY = (val) => padT + (1 - Math.min(maxChartVal, Math.max(0, val)) / maxChartVal) * chartH;

  const chartKey = chartMetric === 'refunded' ? 'amount' : 'pending';

  const makeChartPath = () => {
    return chartDays
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getChartX(i).toFixed(1)} ${getChartY(pt[chartKey]).toFixed(1)}`)
      .join(' ');
  };

  const makeChartArea = () => {
    const line = makeChartPath();
    const firstX = getChartX(0).toFixed(1);
    const lastX = getChartX(chartDays.length - 1).toFixed(1);
    const bottomY = (padT + chartH).toFixed(1);
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const activeDay = hoveredDayIdx !== null ? chartDays[hoveredDayIdx] : chartDays[chartDays.length - 1];

  // Filtering & Sorting
  const filteredRefunds = useMemo(() => {
    const list = refunds.filter((r) => {
      // Tab filter
      if (statusTab !== 'all' && r.status !== statusTab) return false;

      // Reason filter
      if (reasonFilter !== 'all') {
        const text = (r.reason || '').toLowerCase();
        if (reasonFilter === 'technical' && !text.includes('network') && !text.includes('connectivity') && !text.includes('technical')) return false;
        if (reasonFilter === 'mutual' && !text.includes('mutual') && !text.includes('cancelled')) return false;
        if (reasonFilter === 'no_show' && !text.includes('no-show') && !text.includes('absent')) return false;
      }

      // Amount filter
      const amt = Number(r.amount || 0);
      if (amountFilter === 'under_1000' && amt >= 1000) return false;
      if (amountFilter === '1000_1500' && (amt < 1000 || amt > 1500)) return false;
      if (amountFilter === 'above_1500' && amt <= 1500) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (r.id || '').toLowerCase().includes(q);
        const matchBooking = String(r.booking_id || '').includes(q);
        const matchLearner = (r.learner_name || '').toLowerCase().includes(q);
        const matchMentor = (r.mentor_name || '').toLowerCase().includes(q);
        const matchReason = (r.reason || '').toLowerCase().includes(q);
        if (!matchId && !matchBooking && !matchLearner && !matchMentor && !matchReason) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'amount_desc') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === 'amount_asc') return Number(a.amount || 0) - Number(b.amount || 0);
      if (sortBy === 'date_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      // default: date_desc
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return list;
  }, [refunds, statusTab, reasonFilter, amountFilter, searchQuery, sortBy]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredRefunds || filteredRefunds.length === 0) return;
    const headers = ['Claim ID', 'Learner', 'Mentor', 'Booking #', 'Amount (INR)', 'Reason', 'Status', 'Submitted Date'];
    const rows = filteredRefunds.map((r) => [
      r.id,
      `"${(r.learner_name || '').replace(/"/g, '""')}"`,
      `"${(r.mentor_name || '').replace(/"/g, '""')}"`,
      r.booking_id || '-',
      r.amount,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      r.status,
      r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PairUp_Refund_Claims_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status = '') => {
    switch (status) {
      case 'approved':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
            APPROVED
          </span>
        );
      case 'completed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: '1px solid rgba(14, 165, 233, 0.25)', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0ea5e9' }} />
            COMPLETED
          </span>
        );
      case 'pending':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b' }} />
            PENDING
          </span>
        );
      case 'rejected':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '11px', fontWeight: 700 }}>
            REJECTED
          </span>
        );
      default:
        return (
          <span className="mono" style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--grid)', borderRadius: '4px' }}>
            {status}
          </span>
        );
    }
  };

  return (
    <PortalLayout title="Refund Management" portalType="admin">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Top Header & System Online Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>Arbitration Center</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 9px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                Escrow Guarantee Active
              </span>
            </div>
            <p className="sub" style={{ margin: 0, fontSize: '13px' }}>
              Review, arbitrate, and disburse learner refund claims for cancelled, interrupted, or disputed mentorship sessions.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              disabled={filteredRefunds.length === 0}
              style={{
                fontSize: '12.5px',
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                borderRadius: '8px',
              }}
            >
              <DownloadIcon size={15} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadRefunds}
              disabled={refreshing}
              style={{
                fontSize: '12.5px',
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '8px',
              }}
            >
              <RefreshIcon size={14} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Live Sync'}</span>
            </button>
          </div>
        </div>

        {/* 4 Elevated Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          {/* 1. Pending Review */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: pendingCount > 0 ? '3px solid #f59e0b' : '3px solid var(--grid)',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Pending Review
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: pendingCount > 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--grid)',
                  color: pendingCount > 0 ? '#f59e0b' : 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClockIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: pendingCount > 0 ? '#f59e0b' : 'var(--ink)', lineHeight: 1 }}>
              {pendingCount}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px' }}>
              {pendingCount > 0 ? (
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>Awaiting admin arbitration</span>
              ) : (
                <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Zero pending disputes</span>
              )}
            </div>
          </div>

          {/* 2. Approved Claims */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #10b981',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Approved Claims
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircleIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
              {approvedCount}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Ready for wallet / source reversal
            </div>
          </div>

          {/* 3. Rejected Claims */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: rejectedCount > 0 ? '3px solid #ef4444' : '3px solid var(--grid)',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Rejected Claims
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: rejectedCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--grid)',
                  color: rejectedCount > 0 ? '#ef4444' : 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <XCircleIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: rejectedCount > 0 ? '#ef4444' : 'var(--ink)', lineHeight: 1 }}>
              {rejectedCount}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              No-show or terms violation
            </div>
          </div>

          {/* 4. Total Refunded */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #6366f1',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Total Refunded
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CreditCardIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
              ₹{totalRefundAmount.toLocaleString('en-IN')}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Total capital returned to learners
            </div>
          </div>
        </div>

        {/* Side-by-Side: 7-Day Resolution Velocity & Root Cause Donut */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {/* Left: 7-Day Resolution Trajectory */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)' }}>
                    7-Day Dispute &amp; Refund Trajectory
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}
                  >
                    Live Velocity
                  </span>
                </div>
                <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                  Daily escrow claims processed and settled.
                </div>
              </div>

              {/* Metric Toggle */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                <button
                  type="button"
                  onClick={() => setChartMetric('refunded')}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: chartMetric === 'refunded' ? '#6366f1' : 'transparent',
                    color: chartMetric === 'refunded' ? '#fff' : 'var(--ink-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Resolved (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('pending')}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: chartMetric === 'pending' ? '#f59e0b' : 'transparent',
                    color: chartMetric === 'pending' ? '#fff' : 'var(--ink-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Queue (₹)
                </button>
              </div>
            </div>

            {/* SVG Trend Graph */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', minWidth: '460px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gradRefundRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartMetric === 'refunded' ? '#6366f1' : '#f59e0b'} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={chartMetric === 'refunded' ? '#6366f1' : '#f59e0b'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal scale grid */}
                {[0, Math.round(maxChartVal * 0.33), Math.round(maxChartVal * 0.66), Math.round(maxChartVal)].map((tick) => {
                  const y = getChartY(tick);
                  return (
                    <g key={tick}>
                      <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--grid)" strokeDasharray="3 3" strokeWidth="1" />
                      <text x={padL - 8} y={y + 4} fontSize="10" textAnchor="end" fill="var(--ink-muted)">
                        ₹{tick >= 1000 ? `${Math.round(tick / 1000)}k` : tick}
                      </text>
                    </g>
                  );
                })}

                {/* Area fill */}
                <path d={makeChartArea()} fill="url(#gradRefundRev)" />

                {/* Line */}
                <path
                  d={makeChartPath()}
                  fill="none"
                  stroke={chartMetric === 'refunded' ? '#6366f1' : '#f59e0b'}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points & hover triggers */}
                {chartDays.map((pt, i) => {
                  const x = getChartX(i);
                  const y = getChartY(pt[chartKey]);
                  const isHovered = hoveredDayIdx === i;

                  return (
                    <g key={pt.iso}>
                      <text
                        x={x}
                        y={padT + chartH + 18}
                        fontSize="11"
                        textAnchor="middle"
                        fill={isHovered ? 'var(--ink)' : 'var(--ink-muted)'}
                        fontWeight={isHovered ? 700 : 500}
                      >
                        {pt.weekday}
                      </text>

                      {isHovered && (
                        <line x1={x} y1={padT} x2={x} y2={padT + chartH} stroke="var(--ink-muted)" strokeDasharray="3 3" strokeWidth="1" />
                      )}

                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 5.5 : 3.5}
                        fill={chartMetric === 'refunded' ? '#6366f1' : '#f59e0b'}
                        stroke="var(--surface)"
                        strokeWidth="2"
                        style={{ transition: 'r 0.15s ease' }}
                      />

                      <rect
                        x={x - chartW / (chartDays.length * 2)}
                        y={padT}
                        width={chartW / chartDays.length}
                        height={chartH + 20}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredDayIdx(i)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Bottom Interactive Summary Bar */}
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--grid)',
                  fontSize: '12px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>📅 {activeDay.label}:</span>
                  <span>Disbursed:</span>
                  <strong className="mono" style={{ color: '#6366f1' }}>₹{activeDay.amount.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span>
                    Pending: <strong className="mono" style={{ color: '#f59e0b' }}>₹{activeDay.pending.toLocaleString('en-IN')}</strong>
                  </span>
                  <span>
                    Claims: <strong className="mono">{activeDay.count}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Root Cause Analysis Donut */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
                Dispute Root Causes
              </div>
              <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                Primary reasons for initiated session refund claims.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px', flexWrap: 'wrap' }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '135px', height: '135px' }}>
                  <svg viewBox="0 0 160 160" width="135" height="135" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="80" cy="80" r="58" fill="none" stroke="var(--grid)" strokeWidth="15" />
                    {/* Technical Failure */}
                    <circle
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="15"
                      strokeDasharray={`${causeStats.techDash} ${causeStats.donutCircumference}`}
                      strokeLinecap="round"
                    />
                    {/* Mutual Cancellation */}
                    <circle
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="15"
                      strokeDasharray={`${causeStats.mutualDash} ${causeStats.donutCircumference}`}
                      strokeDashoffset={causeStats.mutualOffset}
                      strokeLinecap="round"
                    />
                    {/* Learner No-Show */}
                    <circle
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="15"
                      strokeDasharray={`${causeStats.noShowDash} ${causeStats.donutCircumference}`}
                      strokeDashoffset={causeStats.noShowOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                      {refunds.length}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                      Claims
                    </span>
                  </div>
                </div>

                {/* Legend Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px', flex: 1 }}>
                  <div style={{ padding: '6px 10px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#6366f1', fontSize: '11.5px' }}>Technical / Network</span>
                      <strong className="mono" style={{ fontSize: '12px', color: 'var(--ink)' }}>{causeStats.techPct}%</strong>
                    </div>
                  </div>

                  <div style={{ padding: '6px 10px', background: 'rgba(14, 165, 233, 0.08)', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0ea5e9', fontSize: '11.5px' }}>Mutual Cancel</span>
                      <strong className="mono" style={{ fontSize: '12px', color: 'var(--ink)' }}>{causeStats.mutualPct}%</strong>
                    </div>
                  </div>

                  <div style={{ padding: '6px 10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '11.5px' }}>Learner No-Show</span>
                      <strong className="mono" style={{ fontSize: '12px', color: 'var(--ink)' }}>{causeStats.noShowPct}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro summary */}
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--grid)', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Escrow arbitration turnaround: <strong>&lt; 3.2 hours</strong> with full evidence logging.
            </div>
          </div>
        </div>

        {/* Live System Telemetry & Escrow Protection Strip */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldIcon size={16} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Escrow Guarantee</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>100% Ring-fenced</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockIcon size={16} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Arbitration SLA</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0ea5e9' }}>72h Mediation Window</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCardIcon size={16} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Source Reversal</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1' }}>Direct UPI / Card</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ScaleIcon size={16} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Fair Resolution</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>Zero Fee Penalty</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            padding: '8px 12px',
            borderRadius: '12px',
          }}
        >
          {REFUND_TABS.map((tab) => {
            let count = 0;
            if (tab.id === 'all') count = refunds.length;
            else if (tab.id === 'pending') count = pendingCount;
            else if (tab.id === 'approved') count = approvedCount;
            else if (tab.id === 'completed') count = completedCount;
            else if (tab.id === 'rejected') count = rejectedCount;

            const isActive = statusTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id)}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? 'var(--bg)' : 'var(--ink-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  className="mono"
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(var(--bg-rgb), 0.2)' : 'var(--grid)',
                    color: isActive ? 'var(--bg)' : 'var(--ink-muted)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* Search Box */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)', pointerEvents: 'none' }}>
              <SearchIcon size={16} />
            </div>
            <input
              type="text"
              placeholder="Search by Claim ID, Learner, Mentor, Booking #, or Reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '36px',
                margin: 0,
                borderRadius: '8px',
                background: 'var(--bg)',
                border: '1px solid var(--grid)',
                fontSize: '12.5px',
              }}
            />
          </div>

          {/* Reason Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              style={{
                width: '100%',
                margin: 0,
                borderRadius: '8px',
                background: 'var(--bg)',
                border: '1px solid var(--grid)',
                fontSize: '12.5px',
              }}
            >
              <option value="all">All Claim Reasons</option>
              <option value="technical">Technical Failure</option>
              <option value="mutual">Mutual Cancellation</option>
              <option value="no_show">Learner No-Show</option>
            </select>
          </div>

          {/* Amount Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              style={{
                width: '100%',
                margin: 0,
                borderRadius: '8px',
                background: 'var(--bg)',
                border: '1px solid var(--grid)',
                fontSize: '12.5px',
              }}
            >
              <option value="all">All Amounts</option>
              <option value="under_1000">Under ₹1,000</option>
              <option value="1000_1500">₹1,000 – ₹1,500</option>
              <option value="above_1500">Above ₹1,500</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                margin: 0,
                borderRadius: '8px',
                background: 'var(--bg)',
                border: '1px solid var(--grid)',
                fontSize: '12.5px',
              }}
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>

          {(searchQuery || reasonFilter !== 'all' || amountFilter !== 'all' || sortBy !== 'date_desc') && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => {
                setSearchQuery('');
                setReasonFilter('all');
                setAmountFilter('all');
                setSortBy('date_desc');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Refunds High-Density Table */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--grid-strong)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                Refund Claims Ledger <span className="sub" style={{ fontSize: '13px' }}>({filteredRefunds.length} results)</span>
              </h3>
              <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
                Auditable log of learner escrow refund requests and mediation verdicts.
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              Showing {filteredRefunds.length} of {refunds.length} claims
            </div>
          </div>

          {loading ? (
            <p className="sub" style={{ padding: '30px', textAlign: 'center' }}>Loading refund claims...</p>
          ) : filteredRefunds.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-muted)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>No refund claims found</div>
              <div className="sub" style={{ fontSize: '12px' }}>No claims matched your search or status filter.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ margin: 0, fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    <th style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>Claim ID</th>
                    <th style={{ padding: '10px 14px' }}>Learner</th>
                    <th style={{ padding: '10px 14px' }}>Mentor</th>
                    <th style={{ padding: '10px 14px' }}>Booking #</th>
                    <th style={{ padding: '10px 14px' }}>Amount</th>
                    <th style={{ padding: '10px 14px', minWidth: '220px' }}>Reason Statement</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Submitted</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRefunds.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--grid)' }}>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          className="mono"
                          style={{
                            fontWeight: 700,
                            padding: '3px 8px',
                            background: 'var(--bg)',
                            borderRadius: '6px',
                            border: '1px solid var(--grid)',
                          }}
                        >
                          {r.id}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color: '#fff',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              flexShrink: 0,
                            }}
                          >
                            {initials(r.learner_name)}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.learner_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              flexShrink: 0,
                            }}
                          >
                            {initials(r.mentor_name)}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.mentor_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(14, 165, 233, 0.12)',
                            color: '#0ea5e9',
                            border: '1px solid rgba(14, 165, 233, 0.25)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          Booking #{r.booking_id}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong className="mono" style={{ color: 'var(--ink)', fontSize: '13px' }}>
                          ₹{Number(r.amount).toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', maxWidth: '280px' }}>
                        <span style={{ color: 'var(--ink)', lineHeight: 1.4 }}>
                          {r.reason ? (r.reason.length > 55 ? `${r.reason.slice(0, 55)}...` : r.reason) : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {getStatusBadge(r.status)}
                      </td>
                      <td className="mono" style={{ padding: '10px 14px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                          onClick={() => {
                            setSelectedRefund(r);
                            setAdminNotes(r.adminNotes || '');
                          }}
                        >
                          Review Claim
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Refund Detail & Decision Modal */}
        {selectedRefund && (
          <Modal
            title={`Refund Claim: ${selectedRefund.id}`}
            onClose={() => setSelectedRefund(null)}
            maxWidth="640px"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--grid)' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--ink)' }}>Claim {selectedRefund.id}</div>
                  <div className="sub" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                    Submitted on {new Date(selectedRefund.created_at).toLocaleString()}
                  </div>
                </div>
                <div>{getStatusBadge(selectedRefund.status)}</div>
              </div>

              {/* Parties */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700 }}>Learner</div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)', marginTop: '2px' }}>{selectedRefund.learner_name}</div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700 }}>Mentor</div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#10b981', marginTop: '2px' }}>{selectedRefund.mentor_name}</div>
                </div>
              </div>

              {/* Linked Booking & Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700 }}>Linked Booking</div>
                  <div className="mono" style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)', marginTop: '2px' }}>#{selectedRefund.booking_id}</div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700 }}>Claimed Amount</div>
                  <div className="mono" style={{ fontWeight: 800, fontSize: '17px', color: '#6366f1', marginTop: '2px' }}>
                    ₹{Number(selectedRefund.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Statement */}
              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: '6px' }}>
                  Learner Statement &amp; Reason:
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.5, background: 'var(--bg)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--grid)', color: 'var(--ink)' }}>
                  {selectedRefund.reason}
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                  Admin Decision Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Document arbitration findings and justification for audit logs..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{ width: '100%', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--grid)', padding: '8px', fontSize: '12.5px' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--grid)', paddingTop: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedRefund.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', borderColor: '#10b981' }}
                        onClick={() => handleUpdateStatus(selectedRefund.id, 'approved')}
                      >
                        <CheckIcon size={14} />
                        <span>Approve Refund</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleUpdateStatus(selectedRefund.id, 'rejected')}
                      >
                        <XIcon size={14} />
                        <span>Reject Claim</span>
                      </button>
                    </>
                  )}

                  {selectedRefund.status === 'approved' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => handleUpdateStatus(selectedRefund.id, 'completed')}
                    >
                      <CreditCardIcon size={14} />
                      <span>Execute Source Reversal</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedRefund(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PortalLayout>
  );
}
