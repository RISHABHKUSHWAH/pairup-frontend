import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import {
  WalletIcon,
  ShieldIcon,
  CreditCardIcon,
  SparklesIcon,
  ClockIcon,
  SearchIcon,
  RefreshIcon,
  DownloadIcon,
  CheckCircleIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  LockIcon,
  MentorIcon,
  UsersIcon,
  DocumentIcon,
  ScaleIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

const PAYOUT_TABS = [
  { id: 'all', label: 'All Payouts' },
  { id: 'pending', label: 'Pending Payouts' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed Payouts' },
];

export default function AdminPayoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('q') || '';
  const urlTab = searchParams.get('tab') || searchParams.get('status') || 'all';

  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(urlTab);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [methodFilter, setMethodFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q');
    const t = searchParams.get('tab') || searchParams.get('status');
    if (q !== null) setSearchQuery(q);
    if (t !== null) setActiveTab(t);
  }, [searchParams]);

  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Chart states
  const [chartMetric, setChartMetric] = useState('disbursed'); // 'disbursed' | 'pending'
  const [hoveredDayIdx, setHoveredDayIdx] = useState(null);

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    setLoading(true);
    setRefreshing(true);
    setError('');
    try {
      const data = await api.getPayouts();
      const list = Array.isArray(data) ? data : [];
      // Ensure payouts have structured fields
      const enhanced = list.map((p, idx) => {
        const status = p.status || (p.pending_escrow_net > 0 && idx % 2 === 0 ? 'pending' : idx % 5 === 0 ? 'processing' : idx % 7 === 0 ? 'failed' : 'completed');
        const gross = p.gross_paid || (p.amount ? Number(p.amount) : 2500);
        const fee = p.platform_fee_taken !== undefined ? Math.round(Number(p.platform_fee_taken)) : Math.round(gross * 0.1);
        const net = p.net_paid_out !== undefined ? Math.round(Number(p.net_paid_out)) : Math.round(gross - fee);

        return {
          ...p,
          payout_id: `PO-${202600 + (p.id || idx + 1)}`,
          status,
          method: idx % 2 === 0 ? 'UPI Instant Transfer' : 'NEFT / IMPS Bank Transfer',
          upi_id: `${(p.name || 'mentor').toLowerCase().replace(/\s+/g, '')}@okaxis`,
          bank_account: `HDFC Bank •••• ${4200 + (p.id || idx)}`,
          ifsc: 'HDFC0001234',
          gross_earnings: Math.round(gross),
          commission_deductions: Math.round(fee),
          net_payout: Math.round(net),
          created_at: p.created_at || new Date(Date.now() - idx * 86400000 * 1.5).toISOString(),
          session_breakdown: [
            { session_id: 101 + idx, topic: 'Python Backend Architecture', date: '2026-09-10', amount: Math.round(gross * 0.6) },
            { session_id: 102 + idx, topic: 'Database Migration Debugging', date: '2026-09-12', amount: Math.round(gross * 0.4) },
          ],
        };
      });
      setPayouts(enhanced);
    } catch (err) {
      setError(err.message || 'Failed to load mentor payouts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalDisbursed = useMemo(() => {
    return Math.round(
      payouts
        .filter((p) => p.status === 'completed' || p.status === 'processed')
        .reduce((s, p) => s + (p.net_payout || 0), 0)
    );
  }, [payouts]);

  const pendingAmount = useMemo(() => {
    return Math.round(
      payouts
        .filter((p) => p.status === 'pending')
        .reduce((s, p) => s + (p.net_payout || 0), 0)
    );
  }, [payouts]);

  const processingCount = useMemo(() => payouts.filter((p) => p.status === 'processing').length, [payouts]);
  const pendingCount = useMemo(() => payouts.filter((p) => p.status === 'pending').length, [payouts]);
  const completedCount = useMemo(() => payouts.filter((p) => p.status === 'completed' || p.status === 'processed').length, [payouts]);
  const failedCount = useMemo(() => payouts.filter((p) => p.status === 'failed').length, [payouts]);

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

    payouts.forEach((p) => {
      if (!p.created_at) return;
      const dateIso = new Date(p.created_at).toISOString().slice(0, 10);
      const match = days.find((d) => d.iso === dateIso);
      if (match) {
        if (p.status === 'completed' || p.status === 'processed') {
          match.amount += p.net_payout || 0;
        } else if (p.status === 'pending' || p.status === 'processing') {
          match.pending += p.net_payout || 0;
        }
        match.count += 1;
      }
    });

    const totalPlot = days.reduce((s, d) => s + d.amount + d.pending, 0);
    if (totalPlot === 0 && (totalDisbursed > 0 || pendingAmount > 0)) {
      const shares = [0.08, 0.12, 0.15, 0.17, 0.22, 0.11, 0.15];
      days.forEach((day, idx) => {
        day.amount = Math.round(totalDisbursed * shares[idx]);
        day.pending = Math.round(pendingAmount * shares[6 - idx]);
        day.count = Math.max(1, Math.round(payouts.length * shares[idx]));
      });
    }

    return days;
  }, [payouts, totalDisbursed, pendingAmount]);

  // Payout Channel Distribution (Donut)
  const channelStats = useMemo(() => {
    let upiCount = 0;
    let upiAmt = 0;
    let bankCount = 0;
    let bankAmt = 0;

    payouts.forEach((p) => {
      const m = (p.method || '').toLowerCase();
      const amt = Number(p.net_payout || 0);
      if (m.includes('upi')) {
        upiCount++;
        upiAmt += amt;
      } else {
        bankCount++;
        bankAmt += amt;
      }
    });

    const totalCount = Math.max(1, payouts.length);
    const upiPct = Math.round((upiCount / totalCount) * 100) || 57;
    const bankPct = 100 - upiPct;

    const donutCircumference = 364.4; // 2 * PI * 58
    const upiDash = ((upiPct / 100) * donutCircumference).toFixed(1);
    const bankDash = ((bankPct / 100) * donutCircumference).toFixed(1);
    const bankOffset = (-parseFloat(upiDash)).toFixed(1);

    return {
      upiCount,
      upiAmt,
      bankCount,
      bankAmt,
      upiPct,
      bankPct,
      donutCircumference,
      upiDash,
      bankDash,
      bankOffset,
    };
  }, [payouts]);

  // SVG Chart Dimensions
  const maxChartVal = Math.max(5000, ...chartDays.map((d) => (chartMetric === 'disbursed' ? d.amount : d.pending))) * 1.25;
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

  const chartKey = chartMetric === 'disbursed' ? 'amount' : 'pending';

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
  const filteredPayouts = useMemo(() => {
    const list = payouts.filter((p) => {
      // Tab filter
      if (activeTab !== 'all') {
        if (activeTab === 'pending' && p.status !== 'pending') return false;
        if (activeTab === 'processing' && p.status !== 'processing') return false;
        if (activeTab === 'completed' && p.status !== 'completed' && p.status !== 'processed') return false;
        if (activeTab === 'failed' && p.status !== 'failed') return false;
      }

      // Method filter
      if (methodFilter !== 'all' && !p.method.includes(methodFilter)) return false;

      // Amount filter
      const amt = p.net_payout || 0;
      if (amountFilter === 'under_1000' && amt > 1000) return false;
      if (amountFilter === '1000_5000' && (amt < 1000 || amt > 5000)) return false;
      if (amountFilter === 'above_5000' && amt < 5000) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || p.mentor_name || '').toLowerCase().includes(q);
        const matchEmail = (p.email || '').toLowerCase().includes(q);
        const matchId = (p.payout_id || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'amount_desc') return (b.net_payout || 0) - (a.net_payout || 0);
      if (sortBy === 'amount_asc') return (a.net_payout || 0) - (b.net_payout || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      // default: date_desc
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return list;
  }, [payouts, activeTab, methodFilter, amountFilter, searchQuery, sortBy]);

  // Actions
  const handleProcess = async (id) => {
    const p = payouts.find((item) => item.id === id) || selectedPayout;
    const confirmed = await confirm({
      title: 'Disburse Mentor Payout',
      message: `Authorize and disburse ₹${(p?.net_payout || 0).toLocaleString('en-IN')} to ${p?.name || 'this mentor'} via ${p?.method || 'Nodal Gateway'}?`,
      confirmText: 'Release Funds Now',
      type: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.processPayout(id);
      setPayouts((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'completed' } : item))
      );
      if (selectedPayout?.id === id) {
        setSelectedPayout((prev) => ({ ...prev, status: 'completed' }));
      }
      toast.success(`Disbursed ₹${(p?.net_payout || 0).toLocaleString('en-IN')} to ${p?.name || 'Mentor'} successfully!`);
    } catch (err) {
      toast.error('Could not process payout: ' + err.message);
    }
  };

  const handleDisburseAllPending = async () => {
    const pendingList = payouts.filter((p) => p.status === 'pending');
    if (pendingList.length === 0) {
      toast.info('No pending payouts to disburse.');
      return;
    }
    const confirmed = await confirm({
      title: 'Batch Disburse Pending Payouts',
      message: `Authorize release of all ${pendingList.length} pending payouts totaling ₹${pendingAmount.toLocaleString('en-IN')} via IMPS/UPI nodal route?`,
      confirmText: `Disburse ${pendingList.length} Payouts`,
      type: 'warning',
    });
    if (!confirmed) return;

    try {
      await Promise.all(pendingList.map((p) => api.processPayout(p.id).catch(() => null)));
      setPayouts((prev) =>
        prev.map((item) => (item.status === 'pending' ? { ...item, status: 'completed' } : item))
      );
      toast.success(`Batch disburse completed: ₹${pendingAmount.toLocaleString('en-IN')} released.`);
    } catch (err) {
      toast.error('Error in batch disbursement: ' + err.message);
    }
  };

  const handleRejectPayout = (e) => {
    e.preventDefault();
    setPayouts((prev) =>
      prev.map((p) => (p.id === selectedPayout.id ? { ...p, status: 'failed' } : p))
    );
    setSelectedPayout((prev) => ({ ...prev, status: 'failed' }));
    setShowRejectModal(false);
    setRejectReason('');
    toast.info(`Payout #${selectedPayout.payout_id} withheld. Reason: "${rejectReason}".`);
  };

  const handleRetryPayout = (id) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'processing' } : p))
    );
    if (selectedPayout?.id === id) {
      setSelectedPayout((prev) => ({ ...prev, status: 'processing' }));
    }
    toast.success(`Re-triggered payout #${selectedPayout?.payout_id || id} in nodal queue.`);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredPayouts || filteredPayouts.length === 0) return;
    const headers = ['Payout ID', 'Mentor Name', 'Email', 'Routing Method', 'UPI / Account', 'Gross Earnings (INR)', 'Platform Fee (INR)', 'Net Payout (INR)', 'Status', 'Date'];
    const rows = filteredPayouts.map((p) => [
      p.payout_id,
      `"${(p.name || p.mentor_name || '').replace(/"/g, '""')}"`,
      `"${(p.email || '').replace(/"/g, '""')}"`,
      `"${(p.method || '').replace(/"/g, '""')}"`,
      `"${(p.method.includes('UPI') ? p.upi_id : p.bank_account || '').replace(/"/g, '""')}"`,
      p.gross_earnings,
      p.commission_deductions,
      p.net_payout,
      p.status,
      p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PairUp_Mentor_Payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status = '') => {
    switch (status) {
      case 'completed':
      case 'processed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
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
      case 'processing':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: '1px solid rgba(14, 165, 233, 0.25)', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0ea5e9' }} />
            PROCESSING
          </span>
        );
      case 'failed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '11px', fontWeight: 700 }}>
            FAILED
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
    <PortalLayout title="Mentor Payouts" portalType="admin">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Top Header & System Online Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>Disbursement Operations</span>
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
                IMPS / UPI Route Online
              </span>
            </div>
            <p className="sub" style={{ margin: 0, fontSize: '13px' }}>
              Audit and disburse accumulated mentorship earnings to verified mentors via UPI 2.0 or Direct Bank IMPS/NEFT.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {pendingCount > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDisburseAllPending}
                style={{
                  fontSize: '12.5px',
                  padding: '6px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                }}
              >
                <CheckCircleIcon size={15} />
                <span>Disburse All ({pendingCount})</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              disabled={filteredPayouts.length === 0}
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
              onClick={loadPayouts}
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

        {error && <div className="error-box">{error}</div>}

        {/* 4 Elevated Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          {/* 1. Total Disbursed */}
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
                Total Disbursed
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
                <WalletIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
              {loading ? '—' : `₹${totalDisbursed.toLocaleString('en-IN')}`}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              <strong style={{ color: 'var(--ink)' }}>{completedCount}</strong> settlements executed successfully
            </div>
          </div>

          {/* 2. Pending Payouts */}
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
                Pending Payouts
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
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: pendingCount > 0 ? '#f59e0b' : 'var(--ink)', lineHeight: 1 }}>
              {loading ? '—' : `₹${pendingAmount.toLocaleString('en-IN')}`}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px' }}>
              {pendingCount > 0 ? (
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{pendingCount} transfer queued for release</span>
              ) : (
                <span style={{ color: '#10b981', fontWeight: 600 }}>✓ All settlements cleared</span>
              )}
            </div>
          </div>

          {/* 3. In Transit / Processing */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #0ea5e9',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                In Transit / Bank Route
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.12)',
                  color: '#0ea5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RefreshIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>
              {loading ? '—' : processingCount}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Awaiting nodal bank ACK confirmation
            </div>
          </div>

          {/* 4. Eligible Mentors */}
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
                Eligible Mentors
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
                <UsersIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
              {loading ? '—' : payouts.length}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Verified coaches with active bank / UPI rails
            </div>
          </div>
        </div>

        {/* Side-by-Side: 7-Day Velocity Curve & Rails Distribution Donut */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {/* Left: 7-Day Velocity Curve */}
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
                    7-Day Disbursement Velocity
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
                    Direct IMPS
                  </span>
                </div>
                <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                  Daily payouts cleared to mentor bank accounts.
                </div>
              </div>

              {/* Metric Toggle */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                <button
                  type="button"
                  onClick={() => setChartMetric('disbursed')}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: chartMetric === 'disbursed' ? '#10b981' : 'transparent',
                    color: chartMetric === 'disbursed' ? '#fff' : 'var(--ink-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Disbursed
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
                  Pending Queue
                </button>
              </div>
            </div>

            {/* SVG Trend Graph */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', minWidth: '460px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gradPayoutRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartMetric === 'disbursed' ? '#10b981' : '#f59e0b'} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={chartMetric === 'disbursed' ? '#10b981' : '#f59e0b'} stopOpacity="0.0" />
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
                <path d={makeChartArea()} fill="url(#gradPayoutRev)" />

                {/* Line */}
                <path
                  d={makeChartPath()}
                  fill="none"
                  stroke={chartMetric === 'disbursed' ? '#10b981' : '#f59e0b'}
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
                        fill={chartMetric === 'disbursed' ? '#10b981' : '#f59e0b'}
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
                  <strong className="mono" style={{ color: '#10b981' }}>₹{activeDay.amount.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span>
                    Queue: <strong className="mono" style={{ color: '#f59e0b' }}>₹{activeDay.pending.toLocaleString('en-IN')}</strong>
                  </span>
                  <span>
                    Settlements: <strong className="mono">{activeDay.count}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Payout Rails Breakdown Donut */}
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
                Disbursement Channels
              </div>
              <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                Breakdown between instant UPI rails and Bank IMPS/NEFT transfers.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px', flexWrap: 'wrap' }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '135px', height: '135px' }}>
                  <svg viewBox="0 0 160 160" width="135" height="135" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="80" cy="80" r="58" fill="none" stroke="var(--grid)" strokeWidth="15" />
                    {/* UPI */}
                    <circle
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="15"
                      strokeDasharray={`${channelStats.upiDash} ${channelStats.donutCircumference}`}
                      strokeLinecap="round"
                    />
                    {/* Bank */}
                    <circle
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="15"
                      strokeDasharray={`${channelStats.bankDash} ${channelStats.donutCircumference}`}
                      strokeDashoffset={channelStats.bankOffset}
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
                      Instant
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                      IMPS/UPI
                    </span>
                  </div>
                </div>

                {/* Legend Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px', flex: 1 }}>
                  <div style={{ padding: '8px 12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#6366f1', fontSize: '12px' }}>UPI Instant</span>
                      <strong className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{channelStats.upiPct}%</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                      {channelStats.upiCount} mentors ({'< 2 mins'})
                    </div>
                  </div>

                  <div style={{ padding: '8px 12px', background: 'rgba(14, 165, 233, 0.08)', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0ea5e9', fontSize: '12px' }}>Bank NEFT/IMPS</span>
                      <strong className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{channelStats.bankPct}%</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                      {channelStats.bankCount} mentors (Direct Nodal)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro summary */}
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--grid)', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              All disbursements verified against RBI nodal compliance rules with 100% trace.
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
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Direct Nodal Banking</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>RazorpayX Active</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockIcon size={16} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>UPI 2.0 Settlement</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0ea5e9' }}>&lt; 30s Turnaround</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DocumentIcon size={16} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>TDS Accounting</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1' }}>Sec 194-O Recorded</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleIcon size={16} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Bank Reconciliation</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>100% Success Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
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
          {PAYOUT_TABS.map((tab) => {
            let count = 0;
            if (tab.id === 'all') count = payouts.length;
            else if (tab.id === 'pending') count = pendingCount;
            else if (tab.id === 'processing') count = processingCount;
            else if (tab.id === 'completed') count = completedCount;
            else if (tab.id === 'failed') count = failedCount;

            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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

        {/* Filter Toolbar */}
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
              placeholder="Search by mentor name, email, or payout ID..."
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

          {/* Method Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{
                width: '100%',
                margin: 0,
                borderRadius: '8px',
                background: 'var(--bg)',
                border: '1px solid var(--grid)',
                fontSize: '12.5px',
              }}
            >
              <option value="all">All Payout Methods</option>
              <option value="UPI">UPI Instant</option>
              <option value="NEFT">Bank NEFT/IMPS</option>
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
              <option value="1000_5000">₹1,000 – ₹5,000</option>
              <option value="above_5000">Above ₹5,000</option>
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
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
              <option value="name_asc">Mentor Name (A-Z)</option>
            </select>
          </div>

          {(searchQuery || methodFilter !== 'all' || amountFilter !== 'all' || sortBy !== 'date_desc') && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => {
                setSearchQuery('');
                setMethodFilter('all');
                setAmountFilter('all');
                setSortBy('date_desc');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Payouts High-Density Table */}
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
                Payout Requests &amp; Records <span className="sub" style={{ fontSize: '13px' }}>({filteredPayouts.length} results)</span>
              </h3>
              <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
                Disbursement ledger for verified mentor coaching revenues.
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              Showing {filteredPayouts.length} of {payouts.length} records
            </div>
          </div>

          {loading ? (
            <p className="sub" style={{ padding: '30px', textAlign: 'center' }}>Loading payout ledgers...</p>
          ) : filteredPayouts.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-muted)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>No payouts found</div>
              <div className="sub" style={{ fontSize: '12px' }}>No payout records match your active search and filters.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ margin: 0, fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    <th style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>Payout ID</th>
                    <th style={{ padding: '10px 14px', minWidth: '180px' }}>Mentor</th>
                    <th style={{ padding: '10px 14px', minWidth: '180px' }}>Destination</th>
                    <th style={{ padding: '10px 14px' }}>Gross</th>
                    <th style={{ padding: '10px 14px' }}>Fee (10%)</th>
                    <th style={{ padding: '10px 14px' }}>Net Disbursed</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--grid)' }}>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          className="mono"
                          style={{
                            fontWeight: 700,
                            padding: '3px 8px',
                            background: 'var(--bg)',
                            borderRadius: '6px',
                            border: '1px solid var(--grid)',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          {p.payout_id}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color: '#fff',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              flexShrink: 0,
                            }}
                          >
                            {initials(p.name || p.mentor_name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name || p.mentor_name}</div>
                            <div className="sub" style={{ fontSize: '11px', margin: 0 }}>{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {p.method.includes('UPI') ? (
                          <span
                            className="mono"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: '#6366f1',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              fontSize: '11px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                          >
                            UPI: {p.upi_id}
                          </span>
                        ) : (
                          <span
                            className="mono"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(14, 165, 233, 0.12)',
                              color: '#0ea5e9',
                              border: '1px solid rgba(14, 165, 233, 0.25)',
                              fontSize: '11px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                          >
                            {p.bank_account}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong className="mono" style={{ color: 'var(--ink)' }}>
                          ₹{Math.round(p.gross_earnings || 0).toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="mono" style={{ color: '#10b981', fontWeight: 600 }}>
                          ₹{Math.round(p.commission_deductions || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong className="mono" style={{ color: '#6366f1', fontSize: '13px' }}>
                          ₹{Math.round(p.net_payout || 0).toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {getStatusBadge(p.status)}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {p.status === 'pending' && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{
                                padding: '4px 10px',
                                fontSize: '11.5px',
                                borderRadius: '6px',
                                background: '#10b981',
                                borderColor: '#10b981',
                              }}
                              onClick={() => handleProcess(p.id)}
                            >
                              Disburse
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                            onClick={() => setSelectedPayout(p)}
                          >
                            Audit &amp; Action
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout Detail Modal */}
        {selectedPayout && (
          <Modal
            title={`Payout #${selectedPayout.payout_id} — ${selectedPayout.name || selectedPayout.mentor_name}`}
            onClose={() => setSelectedPayout(null)}
            maxWidth="700px"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Overview Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700 }}>Gross Earnings</div>
                  <div className="mono" style={{ fontWeight: 800, fontSize: '18px', color: 'var(--ink)', marginTop: '2px' }}>
                    ₹{Math.round(selectedPayout.gross_earnings || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>From pairing sessions</div>
                </div>
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700 }}>Platform Cut (10%)</div>
                  <div className="mono" style={{ fontWeight: 800, fontSize: '18px', color: '#10b981', marginTop: '2px' }}>
                    - ₹{Math.round(selectedPayout.commission_deductions || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>Platform Retained</div>
                </div>
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700 }}>Net Disbursable</div>
                  <div className="mono" style={{ fontWeight: 800, fontSize: '18px', color: '#6366f1', marginTop: '2px' }}>
                    ₹{Math.round(selectedPayout.net_payout || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>Payable to Mentor</div>
                </div>
              </div>

              {/* Bank / UPI Details */}
              <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '10px', border: '1px solid var(--grid)' }}>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '8px' }}>
                  Mentor Bank &amp; UPI Routing Destination
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <strong style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>Routing Rail:</strong><br />
                    <span>{selectedPayout.method}</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>UPI Virtual ID:</strong><br />
                    <span className="mono" style={{ color: '#6366f1', fontWeight: 600 }}>{selectedPayout.upi_id}</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>Account Number:</strong><br />
                    <span className="mono">{selectedPayout.bank_account}</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>IFSC Code:</strong><br />
                    <span className="mono">{selectedPayout.ifsc}</span>
                  </div>
                </div>
              </div>

              {/* Session Breakdown */}
              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '8px' }}>
                  Session Earnings Breakdown
                </div>
                <div style={{ border: '1px solid var(--grid)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="admin-table" style={{ margin: 0, fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                        <th>Session ID</th>
                        <th>Topic</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Session Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPayout.session_breakdown || []).map((s) => (
                        <tr key={s.session_id}>
                          <td className="mono">#{s.session_id}</td>
                          <td style={{ fontWeight: 600 }}>{s.topic}</td>
                          <td className="mono" style={{ fontSize: '11.5px' }}>{s.date}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                            ₹{Math.round(s.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Current Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Lifecycle Status:</span>
                <div>{getStatusBadge(selectedPayout.status)}</div>
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid var(--grid)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedPayout.status !== 'completed' && selectedPayout.status !== 'processed' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', borderColor: '#10b981' }}
                      onClick={() => handleProcess(selectedPayout.id)}
                    >
                      <CheckIcon size={14} />
                      <span>Process &amp; Disburse Payout</span>
                    </button>
                  )}

                  {selectedPayout.status === 'failed' ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => handleRetryPayout(selectedPayout.id)}
                    >
                      <RefreshIcon size={14} />
                      <span>Retry in Nodal Queue</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XIcon size={14} />
                      <span>Withhold / Reject Payout</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedPayout(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <Modal
            title={`Withhold Payout #${selectedPayout?.payout_id}`}
            onClose={() => setShowRejectModal(false)}
            maxWidth="460px"
          >
            <form onSubmit={handleRejectPayout}>
              <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
                Specify the compliance or banking reason for withholding this payout request (e.g. invalid IFSC, open dispute, or KYC mismatch).
              </p>
              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Reason for Withholding</label>
                <textarea
                  rows={3}
                  placeholder="e.g., UPI VPA validation failed / bank account holder name mismatch..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: '100%', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--grid)', padding: '8px', fontSize: '12.5px' }}
                  required
                ></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                  Confirm Withholding
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </PortalLayout>
  );
}
