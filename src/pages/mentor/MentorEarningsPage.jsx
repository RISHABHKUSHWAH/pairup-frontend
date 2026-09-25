import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, mentorPayoutSettings } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import {
  CreditCardIcon,
  WalletIcon,
  RupeeIcon,
  ShieldIcon,
  ClockIcon,
  CheckCircleIcon,
  BarChartIcon,
  TrendingUpIcon,
  SearchIcon,
  RefreshIcon,
  UserIcon,
  DownloadIcon,
  DocumentIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../components/Icons';

export default function MentorEarningsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [payoutMethod, setPayoutMethod] = useState(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Chart state
  const [timeframe, setTimeframe] = useState('7d'); // '7d' | '30d' | '6m'
  const [chartMetric, setChartMetric] = useState('net'); // 'net' | 'gross' | 'sessions'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    loadEarnings();
    if (user) {
      setPayoutMethod(mentorPayoutSettings.getPayoutMethod(user));
      try {
        const key = user.id ? `pairup_mentor_withdrawals_${user.id}` : 'pairup_mentor_withdrawals';
        const storedW = localStorage.getItem(key);
        if (storedW) setWithdrawals(JSON.parse(storedW));
      } catch {}
    }
  }, [user]);

  const loadEarnings = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getMyPayments();
      setPayments(Array.isArray(data) ? data : []);
      if (isManualRefresh) {
        toast.success('Earnings and transactions refreshed');
      }
    } catch (err) {
      setError(err.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Safe and clean Currency Formatter (avoids awkward single decimals like ₹9,560.7)
  const formatINR = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Core Financial Aggregates
  const totalGross = useMemo(() => {
    return payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  }, [payments]);

  const totalPlatformFees = useMemo(() => {
    return payments.reduce((s, p) => s + Number(p.platform_fee || 0), 0);
  }, [payments]);

  const releasedNet = useMemo(() => {
    return payments
      .filter((p) => p.status === 'released')
      .reduce((s, p) => s + Number(p.net_amount !== undefined ? p.net_amount : (p.amount - (p.platform_fee || 0))), 0);
  }, [payments]);

  const escrowNet = useMemo(() => {
    return payments
      .filter((p) => p.status === 'held' || p.status === 'held_in_escrow' || p.status === 'escrow')
      .reduce((s, p) => s + Number(p.net_amount !== undefined ? p.net_amount : (p.amount - (p.platform_fee || 0))), 0);
  }, [payments]);

  const totalPaidOut = useMemo(() => {
    return withdrawals.reduce((s, w) => s + Number(w.amount || 0), 0);
  }, [withdrawals]);

  const availableBalance = Math.max(0, releasedNet - totalPaidOut);

  // Pipeline Distribution Calculations
  const totalPipeline = releasedNet + escrowNet + totalPlatformFees;
  const releasedPercent = totalPipeline > 0 ? Math.round((releasedNet / totalPipeline) * 100) : 0;
  const escrowPercent = totalPipeline > 0 ? Math.round((escrowNet / totalPipeline) * 100) : 0;
  const feePercent = totalPipeline > 0 ? Math.max(0, 100 - releasedPercent - escrowPercent) : 0;

  // Search params & URL deep linking for sidebar options
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';
  const actionParam = searchParams.get('action');

  // Automatically open Request Payout modal if action=withdraw
  useEffect(() => {
    if (actionParam === 'withdraw') {
      if (availableBalance > 0) {
        setWithdrawAmount(availableBalance.toString());
      }
      setPayoutModalOpen(true);
    }
  }, [actionParam, availableBalance]);

  // Smooth scroll to sections when tab parameter is present
  useEffect(() => {
    if (currentTab === 'transactions') {
      const el = document.getElementById('transactions-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (currentTab === 'billings') {
      const el = document.getElementById('chart-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (currentTab === 'reports') {
      const el = document.getElementById('reports-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (currentTab === 'taxes') {
      const el = document.getElementById('taxes-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTab]);

  // Export Financial CSV Statement
  const handleExportCSV = () => {
    if (!payments || payments.length === 0) {
      toast.info('No transaction records available to export.');
      return;
    }
    const headers = ['Transaction ID', 'Date', 'Learner', 'Topic', 'Gross Amount (INR)', 'Platform Fee (INR)', 'Net Cleared (INR)', 'Status'];
    const rows = payments.map((p) => [
      p.id,
      p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '',
      `"${(p.learner_name || 'Learner').replace(/"/g, '""')}"`,
      `"${(p.topic || 'Pairing Session').replace(/"/g, '""')}"`,
      p.amount || 0,
      p.platform_fee || 0,
      p.net_amount || 0,
      p.status || 'released',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pairup_financial_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Financial statement CSV downloaded successfully.');
  };

  // Download Annual Tax Summary
  const handleDownloadTaxSummary = () => {
    const gross = releasedNet + totalPlatformFees;
    const summaryText = `PAIRUP PLATFORM - ANNUAL MENTOR TAX STATEMENT
Financial Year: 2026-2027
Date Generated: ${new Date().toLocaleDateString()}
Mentor Name: ${user?.name || 'Verified Mentor'}
Mentor Email: ${user?.email || 'N/A'}
PAN Identification: ••••• 7821K (Individual Consultant - Verified)
GST Compliance: Exempt (< INR 20,00,000 threshold under Section 22 CGST Act)
--------------------------------------------------------------------------------
1. Gross Mentoring Billings:       INR ${gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
2. PairUp Intermediary Commission: INR ${totalPlatformFees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
3. Net Disbursed Earnings:         INR ${releasedNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
4. TDS Withheld (Sec 194J/194H):   INR 0.00 (Marketplace facilitator exemption)
5. Total Withdrawn to Bank:        INR ${totalPaidOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
--------------------------------------------------------------------------------
This is an electronically generated annual tax statement for personal filing and records.`;
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pairup_annual_tax_statement_FY26-27_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Annual tax statement downloaded.');
  };

  // Chart Data Generator
  const chartData = useMemo(() => {
    const now = new Date();

    if (timeframe === '7d') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = d.getDate();
        days.push({
          key: iso,
          label: `${weekday}, ${d.toLocaleDateString('en-US', { month: 'short' })} ${dayNum}`,
          shortLabel: `${weekday} ${dayNum}`,
          net: 0,
          gross: 0,
          fee: 0,
          sessions: 0,
        });
      }

      payments.forEach((p) => {
        const pDate = (p.created_at || '').slice(0, 10);
        const matched = days.find((d) => d.key === pDate);
        if (matched) {
          const gross = Number(p.amount || 0);
          const fee = Number(p.platform_fee || 0);
          const net = Number(p.net_amount !== undefined ? p.net_amount : gross - fee);
          matched.net += net;
          matched.gross += gross;
          matched.fee += fee;
          matched.sessions += 1;
        }
      });

      return days;
    }

    if (timeframe === '30d') {
      const days = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = d.getDate();
        days.push({
          key: iso,
          label: `${weekday}, ${d.toLocaleDateString('en-US', { month: 'short' })} ${dayNum}`,
          shortLabel: i % 5 === 0 ? `${d.toLocaleDateString('en-US', { month: 'short' })} ${dayNum}` : '',
          net: 0,
          gross: 0,
          fee: 0,
          sessions: 0,
        });
      }

      payments.forEach((p) => {
        const pDate = (p.created_at || '').slice(0, 10);
        const matched = days.find((d) => d.key === pDate);
        if (matched) {
          const gross = Number(p.amount || 0);
          const fee = Number(p.platform_fee || 0);
          const net = Number(p.net_amount !== undefined ? p.net_amount : gross - fee);
          matched.net += net;
          matched.gross += gross;
          matched.fee += fee;
          matched.sessions += 1;
        }
      });

      return days;
    }

    // '6m' timeframe
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const isoMonth = d.toISOString().slice(0, 7); // 'YYYY-MM'
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const shortLabel = d.toLocaleDateString('en-US', { month: 'short' });
      months.push({
        key: isoMonth,
        label,
        shortLabel,
        net: 0,
        gross: 0,
        fee: 0,
        sessions: 0,
      });
    }

    payments.forEach((p) => {
      const pMonth = (p.created_at || '').slice(0, 7);
      const matched = months.find((m) => m.key === pMonth);
      if (matched) {
        const gross = Number(p.amount || 0);
        const fee = Number(p.platform_fee || 0);
        const net = Number(p.net_amount !== undefined ? p.net_amount : gross - fee);
        matched.net += net;
        matched.gross += gross;
        matched.fee += fee;
        matched.sessions += 1;
      }
    });

    return months;
  }, [payments, timeframe]);

  // Chart summary metrics
  const periodTotalNet = useMemo(() => chartData.reduce((s, d) => s + d.net, 0), [chartData]);
  const periodTotalGross = useMemo(() => chartData.reduce((s, d) => s + d.gross, 0), [chartData]);
  const periodTotalSessions = useMemo(() => chartData.reduce((s, d) => s + d.sessions, 0), [chartData]);
  const peakItem = useMemo(() => {
    let peak = chartData[0];
    chartData.forEach((d) => {
      if (d[chartMetric] > (peak ? peak[chartMetric] : 0)) {
        peak = d;
      }
    });
    return peak;
  }, [chartData, chartMetric]);

  const avgSessionVal = periodTotalSessions > 0 ? Math.round(periodTotalGross / periodTotalSessions) : 0;

  // SVG Chart Geometry
  const svgW = 760;
  const svgH = 220;
  const padL = 60;
  const padR = 25;
  const padT = 25;
  const padB = 40;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const rawMaxVal = Math.max(...chartData.map((d) => d[chartMetric]), 0);
  const maxChartVal = Math.max(
    rawMaxVal * 1.15,
    chartMetric === 'sessions' ? 5 : 500
  );

  const getChartX = (idx) => {
    if (chartData.length <= 1) return padL + chartW / 2;
    return padL + (idx / (chartData.length - 1)) * chartW;
  };

  const getChartY = (val) => {
    const ratio = maxChartVal > 0 ? val / maxChartVal : 0;
    return padT + chartH - ratio * chartH;
  };

  // Smooth Catmull-Rom or Cubic Bezier Spline Path
  const makeSmoothPath = () => {
    if (chartData.length === 0) return '';
    const pts = chartData.map((d, i) => ({ x: getChartX(i), y: getChartY(d[chartMetric]) }));

    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const makeAreaPath = () => {
    if (chartData.length === 0) return '';
    const linePath = makeSmoothPath();
    const lastX = getChartX(chartData.length - 1);
    const firstX = getChartX(0);
    const bottomY = padT + chartH;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const chartThemeColor =
    chartMetric === 'net' ? '#10b981' : chartMetric === 'gross' ? '#2647D6' : '#0284c7';

  // Payout Handler
  const handleRequestPayout = (e) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amt > availableBalance) {
      toast.error('Amount exceeds your available balance.');
      return;
    }

    const newWithdrawal = {
      id: 'w_' + Date.now(),
      amount: amt,
      method:
        selectedMethod === 'bank'
          ? `${payoutMethod?.bankName || 'HDFC Bank'} (${payoutMethod?.accountNumber ? payoutMethod.accountNumber.slice(-4) : 'Direct'})`
          : `UPI (${payoutMethod?.upiId || user?.email || 'UPI Transfer'})`,
      date: new Date().toISOString(),
      status: 'Processing',
    };

    const updated = [newWithdrawal, ...withdrawals];
    setWithdrawals(updated);
    const key = user?.id ? `pairup_mentor_withdrawals_${user.id}` : 'pairup_mentor_withdrawals';
    localStorage.setItem(key, JSON.stringify(updated));

    toast.success(`Payout request of ₹${amt.toLocaleString('en-IN')} submitted successfully! Funds arrive in 1-2 business days.`);
    setPayoutModalOpen(false);
    setWithdrawAmount('');
  };

  // Filtered Payments for the Table
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        (p.learner_name && p.learner_name.toLowerCase().includes(q)) ||
        (p.topic && p.topic.toLowerCase().includes(q)) ||
        (p.booking_id && String(p.booking_id).includes(q));

      if (!matchesSearch) return false;
      if (filterStatus === 'all') return true;
      if (filterStatus === 'released') return p.status === 'released';
      if (filterStatus === 'held') return p.status === 'held' || p.status === 'held_in_escrow' || p.status === 'escrow';
      return p.status === filterStatus;
    });
  }, [payments, search, filterStatus]);

  const totalItems = filteredPayments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to first page when search, filter, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, pageSize]);

  // Keep currentPage valid if items count shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedPayments = useMemo(() => {
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, startIndex, endIndex]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis-start');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <PortalLayout
      title="Finances"
      portalType="mentor"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => loadEarnings(true)}
            disabled={refreshing}
            title="Refresh transactions"
          >
            <RefreshIcon size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            disabled={availableBalance <= 0}
            onClick={() => {
              setWithdrawAmount(availableBalance.toString());
              setPayoutModalOpen(true);
            }}
          >
            <CreditCardIcon size={14} />
            <span>Request Payout</span>
          </button>
        </div>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Track your earned pairing fees, funds currently held in escrow, platform commission deductions, and withdrawal history.
      </p>

      {/* Finances Sub-Navigation Tab Strip */}
      <div className="finances-tab-nav">
        <button
          type="button"
          className={`finances-tab-btn ${currentTab === 'overview' && !actionParam ? 'active' : ''}`}
          onClick={() => {
            setSearchParams({});
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <BarChartIcon size={15} />
          <span>Overview</span>
        </button>

        <Link
          to="/mentor/transactions"
          className="finances-tab-btn"
        >
          <ClockIcon size={15} />
          <span>Transactions</span>
        </Link>

        <button
          type="button"
          className={`finances-tab-btn ${actionParam === 'withdraw' ? 'active' : ''}`}
          onClick={() => {
            setSearchParams({ action: 'withdraw' });
            if (availableBalance > 0) setWithdrawAmount(availableBalance.toString());
            setPayoutModalOpen(true);
          }}
        >
          <CreditCardIcon size={15} />
          <span>Withdraw earnings</span>
        </button>

        <Link
          to="/mentor/billings"
          className="finances-tab-btn"
        >
          <WalletIcon size={15} />
          <span>Billings and earnings</span>
        </Link>

        <Link
          to="/mentor/reports"
          className="finances-tab-btn"
        >
          <RupeeIcon size={15} />
          <span>My reports</span>
        </Link>

        <Link
          to="/mentor/taxes"
          className="finances-tab-btn"
        >
          <ShieldIcon size={15} />
          <span>Taxes</span>
        </Link>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* 1. TOP 4 EXECUTIVE STAT CARDS */}
      <div id="overview-section" className="earnings-stats-grid">
        {/* Card 1: Total Earnings (Net) */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">Total Earnings (Net)</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <WalletIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: '#10b981' }}>
            {formatINR(releasedNet)}
          </div>
          <div className="earnings-stat-desc">Cumulative earned from sessions</div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            ● 100% Cleared &amp; Verified
          </div>
        </div>

        {/* Card 2: Available Balance */}
        <div className="earnings-stat-card active-brand">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label" style={{ color: 'var(--accent)' }}>Available Balance</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <CreditCardIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: 'var(--accent)' }}>
            {formatINR(availableBalance)}
          </div>
          <div className="earnings-stat-desc">Ready for direct bank payout</div>
          <div className="earnings-stat-pill" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
            ● Ready for Bank Transfer
          </div>
        </div>

        {/* Card 3: Held in Escrow */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label" style={{ color: '#d97706' }}>Held in Escrow</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <ShieldIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: '#f59e0b' }}>
            {formatINR(escrowNet)}
          </div>
          <div className="earnings-stat-desc">Pending active session completion</div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#b45309' }}>
            ● Escrow Protected
          </div>
        </div>

        {/* Card 4: Total Paid Out */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">Total Paid Out</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'var(--grid)', color: 'var(--ink-muted)' }}>
              <CheckCircleIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value">
            {formatINR(totalPaidOut)}
          </div>
          <div className="earnings-stat-desc">Transferred to your bank account</div>
          <div className="earnings-stat-pill" style={{ background: 'var(--grid)', color: 'var(--ink-muted)' }}>
            ● {withdrawals.length} Historical Transfers
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE EARNINGS TRAJECTORY GRAPH PANEL */}
      <div id="chart-section" className="earnings-chart-panel">
        <div className="earnings-chart-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUpIcon size={18} style={{ color: chartThemeColor }} />
              <h3 className="earnings-chart-title">Financial Performance &amp; Trajectory</h3>
            </div>
            <p className="earnings-chart-sub">
              Interactive trend analysis of your cleared earnings, gross billings, and session activity
            </p>
          </div>

          <div className="earnings-chart-controls">
            {/* Metric Switcher */}
            <div className="earnings-segmented-group">
              <button
                type="button"
                className={`earnings-seg-btn ${chartMetric === 'net' ? 'active-emerald' : ''}`}
                onClick={() => setChartMetric('net')}
              >
                Net Earnings
              </button>
              <button
                type="button"
                className={`earnings-seg-btn ${chartMetric === 'gross' ? 'active-indigo' : ''}`}
                onClick={() => setChartMetric('gross')}
              >
                Gross Volume
              </button>
              <button
                type="button"
                className={`earnings-seg-btn ${chartMetric === 'sessions' ? 'active-sky' : ''}`}
                onClick={() => setChartMetric('sessions')}
              >
                Sessions
              </button>
            </div>

            {/* Timeframe Switcher */}
            <div className="earnings-segmented-group">
              <button
                type="button"
                className={`earnings-seg-btn ${timeframe === '7d' ? 'active' : ''}`}
                onClick={() => setTimeframe('7d')}
              >
                7 Days
              </button>
              <button
                type="button"
                className={`earnings-seg-btn ${timeframe === '30d' ? 'active' : ''}`}
                onClick={() => setTimeframe('30d')}
              >
                30 Days
              </button>
              <button
                type="button"
                className={`earnings-seg-btn ${timeframe === '6m' ? 'active' : ''}`}
                onClick={() => setTimeframe('6m')}
              >
                6 Months
              </button>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ width: '100%', height: 'auto', minWidth: '540px', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="earningsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartThemeColor} stopOpacity="0.32" />
                <stop offset="100%" stopColor={chartThemeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Ticks & Reference Grid */}
            {[0, Math.round(maxChartVal * 0.33), Math.round(maxChartVal * 0.66), Math.round(maxChartVal)].map((tick) => {
              const y = getChartY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={padL + chartW}
                    y2={y}
                    stroke="var(--grid)"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 8}
                    y={y + 3.5}
                    fontSize="10"
                    textAnchor="end"
                    fill="var(--ink-muted)"
                    fontFamily="IBM Plex Mono"
                  >
                    {chartMetric === 'sessions'
                      ? tick
                      : tick >= 1000
                      ? `₹${Math.round(tick / 1000)}k`
                      : `₹${tick}`}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <path d={makeAreaPath()} fill="url(#earningsAreaGrad)" />

            {/* Line Stroke */}
            <path
              d={makeSmoothPath()}
              fill="none"
              stroke={chartThemeColor}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points and Interactivity */}
            {chartData.map((pt, i) => {
              const x = getChartX(i);
              const y = getChartY(pt[chartMetric]);
              const isHovered = hoveredIndex === i;

              return (
                <g
                  key={pt.key}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Bottom Date Labels */}
                  {(timeframe !== '30d' || pt.shortLabel) && (
                    <text
                      x={x}
                      y={padT + chartH + 18}
                      fontSize="10.5"
                      textAnchor="middle"
                      fill={isHovered ? 'var(--ink)' : 'var(--ink-muted)'}
                      fontWeight={isHovered ? 700 : 500}
                      fontFamily="IBM Plex Mono"
                    >
                      {pt.shortLabel}
                    </text>
                  )}

                  {/* Vertical Hover Crosshair */}
                  {isHovered && (
                    <line
                      x1={x}
                      y1={padT}
                      x2={x}
                      y2={padT + chartH}
                      stroke="var(--ink-muted)"
                      strokeDasharray="3 3"
                      strokeWidth="1.2"
                    />
                  )}

                  {/* Point Circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : pt[chartMetric] > 0 ? 4 : 2.5}
                    fill={chartThemeColor}
                    stroke="var(--surface)"
                    strokeWidth="2"
                    style={{ transition: 'all 0.15s ease' }}
                  />

                  {/* Expanded Click Area for Hover Target */}
                  <rect
                    x={x - (chartW / (chartData.length * 2))}
                    y={padT}
                    width={chartW / Math.max(1, chartData.length)}
                    height={chartH}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>

          {/* Floating Tooltip Card on Hover */}
          {hoveredIndex !== null && chartData[hoveredIndex] && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(82, Math.max(18, ((getChartX(hoveredIndex) / svgW) * 100)))}%`,
                top: `${Math.max(10, ((getChartY(chartData[hoveredIndex][chartMetric]) / svgH) * 100) - 42)}%`,
                transform: 'translate(-50%, -100%)',
                background: 'var(--surface)',
                border: `1.5px solid ${chartThemeColor}`,
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                pointerEvents: 'none',
                zIndex: 10,
                minWidth: '150px',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600, marginBottom: '4px' }}>
                {chartData[hoveredIndex].label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: chartThemeColor, fontFamily: 'JetBrains Mono' }}>
                  {chartMetric === 'sessions'
                    ? `${chartData[hoveredIndex].sessions} sessions`
                    : formatINR(chartData[hoveredIndex][chartMetric])}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
                  {chartMetric}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', borderTop: '1px solid var(--grid)', paddingTop: '4px' }}>
                Gross: <strong>{formatINR(chartData[hoveredIndex].gross)}</strong> · Fee: <strong>{formatINR(chartData[hoveredIndex].fee)}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Mini KPI Summary Strip */}
        <div className="earnings-kpi-strip">
          <div className="earnings-kpi-box">
            <span className="earnings-kpi-box-label">Period Total Net</span>
            <span className="earnings-kpi-box-val" style={{ color: '#10b981' }}>
              {formatINR(periodTotalNet)}
            </span>
            <span className="earnings-kpi-box-sub">Net payout for {timeframe === '7d' ? 'last 7 days' : timeframe === '30d' ? 'last 30 days' : 'last 6 months'}</span>
          </div>

          <div className="earnings-kpi-box">
            <span className="earnings-kpi-box-label">Period Gross Volume</span>
            <span className="earnings-kpi-box-val" style={{ color: 'var(--accent)' }}>
              {formatINR(periodTotalGross)}
            </span>
            <span className="earnings-kpi-box-sub">Total learner pairing spend</span>
          </div>

          <div className="earnings-kpi-box">
            <span className="earnings-kpi-box-label">Highest Earning Peak</span>
            <span className="earnings-kpi-box-val">
              {formatINR(peakItem ? peakItem.net : 0)}
            </span>
            <span className="earnings-kpi-box-sub">{peakItem ? peakItem.label : 'N/A'}</span>
          </div>

          <div className="earnings-kpi-box">
            <span className="earnings-kpi-box-label">Average per Session</span>
            <span className="earnings-kpi-box-val">
              {formatINR(avgSessionVal)}
            </span>
            <span className="earnings-kpi-box-sub">Across {periodTotalSessions} sessions</span>
          </div>
        </div>

        {/* Multi-Segment Escrow & Earnings Pipeline */}
        <div id="reports-section" className="earnings-pipeline-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', color: 'var(--ink)' }}>
              Financial Pipeline &amp; Reports Distribution
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                Total Volume: <strong>{formatINR(totalPipeline)}</strong>
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={handleExportCSV}
                title="Download CSV Statement"
              >
                <DownloadIcon size={13} />
                <span>Export Statement (CSV)</span>
              </button>
            </div>
          </div>

          <div className="earnings-pipeline-track">
            <div
              className="earnings-pipeline-segment"
              style={{ width: `${releasedPercent}%`, background: '#10b981' }}
              title={`Cleared Earnings: ${releasedPercent}% (${formatINR(releasedNet)})`}
            />
            <div
              className="earnings-pipeline-segment"
              style={{ width: `${escrowPercent}%`, background: '#f59e0b' }}
              title={`Held in Escrow: ${escrowPercent}% (${formatINR(escrowNet)})`}
            />
            <div
              className="earnings-pipeline-segment"
              style={{ width: `${feePercent}%`, background: '#6366f1' }}
              title={`Platform Fee: ${feePercent}% (${formatINR(totalPlatformFees)})`}
            />
          </div>

          <div className="earnings-pipeline-legend">
            <div className="earnings-pipeline-legend-item">
              <span className="earnings-legend-dot" style={{ background: '#10b981' }} />
              <span>Cleared Earnings: <strong>{formatINR(releasedNet)}</strong> ({releasedPercent}%)</span>
            </div>
            <div className="earnings-pipeline-legend-item">
              <span className="earnings-legend-dot" style={{ background: '#f59e0b' }} />
              <span>Held in Escrow: <strong>{formatINR(escrowNet)}</strong> ({escrowPercent}%)</span>
            </div>
            <div className="earnings-pipeline-legend-item">
              <span className="earnings-legend-dot" style={{ background: '#6366f1' }} />
              <span>Platform Fee (10%): <strong>{formatINR(totalPlatformFees)}</strong> ({feePercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LINKED PAYOUT ACCOUNT CARD */}
      <div id="withdraw-section" className="earnings-payout-account-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <WalletIcon size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              Linked Payout Account: {payoutMethod?.bankName || 'HDFC Bank'} ({payoutMethod?.accountNumber || '••••••••4819'})
              <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                VERIFIED
              </span>
            </div>
            <div className="sub" style={{ fontSize: '12px', margin: '4px 0 0', color: 'var(--ink-muted)' }}>
              IFSC: <strong>{payoutMethod?.ifsc || 'HDFC0001234'}</strong> • Account Holder: <strong>{payoutMethod?.holderName || 'Alex Rivera'}</strong> • PAN: <strong>{payoutMethod?.pan || 'ABCDE1234F'}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '6px 10px' }}>
            AUTO-PAYOUT: {payoutMethod?.payoutSchedule || 'WEEKLY'}
          </span>
          <Link to="/mentor/settings" className="btn btn-secondary" style={{ fontSize: '12px' }}>
            Manage in Settings →
          </Link>
        </div>
      </div>

      {/* 4. RECENT WITHDRAWALS IN PROGRESS */}
      {withdrawals.length > 0 && (
        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="section-label" style={{ marginTop: 0, marginBottom: '12px' }}>
            Recent Payout Requests
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {withdrawals.slice(0, 3).map((w) => (
              <div
                key={w.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--grid-strong)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                    Bank Transfer: {formatINR(w.amount)}
                  </div>
                  <div className="sub" style={{ fontSize: '11.5px', margin: '2px 0 0' }}>
                    Destination: {w.method} • {new Date(w.date).toLocaleString()}
                  </div>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TAXES & COMPLIANCE SECTION */}
      <div id="taxes-section" className="taxes-compliance-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldIcon size={18} style={{ color: 'var(--brand)' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                Taxes &amp; Compliance Center
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
              Fiscal year 2026-2027 declarations, TDS withholding, and tax documentation
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleDownloadTaxSummary}
            title="Download Annual Tax Summary"
          >
            <DownloadIcon size={14} />
            <span>Download Annual Tax Statement</span>
          </button>
        </div>

        <div className="taxes-grid">
          <div className="tax-item-box">
            <div className="tax-item-label">PAN Identification</div>
            <div className="tax-item-val" style={{ letterSpacing: '0.05em' }}>••••• 7821K</div>
            <div className="tax-item-sub">Status: Individual Consultant (Verified)</div>
          </div>

          <div className="tax-item-box">
            <div className="tax-item-label">GST Compliance Status</div>
            <div className="tax-item-val" style={{ color: '#10b981' }}>Exempt</div>
            <div className="tax-item-sub">Below ₹20,00,000 services turnover threshold</div>
          </div>

          <div className="tax-item-box">
            <div className="tax-item-label">TDS Withheld (Sec 194J)</div>
            <div className="tax-item-val">{formatINR(0)}</div>
            <div className="tax-item-sub">Marketplace facilitation model</div>
          </div>

          <div className="tax-item-box">
            <div className="tax-item-label">Gross Taxable Invoiced</div>
            <div className="tax-item-val" style={{ color: 'var(--accent)' }}>
              {formatINR(releasedNet + totalPlatformFees)}
            </div>
            <div className="tax-item-sub">Subject to individual income filing</div>
          </div>
        </div>
      </div>

      {/* 6. SESSION TRANSACTION HISTORY TABLE */}
      <div id="transactions-section" className="admin-panel" style={{ borderRadius: '14px', border: '1px solid var(--grid-strong)' }}>
        <div
          className="admin-panel-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            padding: '18px 22px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Session Transaction History</h3>
            <div className="sub" style={{ fontSize: '12.5px', marginTop: '3px' }}>
              Detailed breakdown of learner gross payment, 10% platform fee, and net earnings
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '10px', color: 'var(--ink-faint)', pointerEvents: 'none' }}>
                <SearchIcon size={14} />
              </span>
              <input
                type="text"
                className="search"
                placeholder="Filter by learner or topic..."
                style={{
                  width: '230px',
                  padding: '7px 12px 7px 32px',
                  fontSize: '12.5px',
                  borderRadius: '8px',
                  border: '1px solid var(--grid-strong)',
                }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--ink-faint)',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <select
              style={{
                padding: '7px 12px',
                fontSize: '12.5px',
                borderRadius: '8px',
                border: '1px solid var(--grid-strong)',
                background: 'var(--surface)',
                color: 'var(--ink)',
              }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="released">Released (Cleared)</option>
              <option value="held">Held in Escrow</option>
            </select>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              onClick={handleExportCSV}
              title="Export Transactions CSV"
            >
              <DownloadIcon size={14} />
              <span>Export CSV</span>
            </button>

            <Link
              to="/mentor/transactions"
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(38,75,228,0.06)', color: 'var(--brand)', borderColor: 'rgba(38,75,228,0.2)' }}
              title="Open dedicated account movements ledger"
            >
              <ClockIcon size={14} />
              <span>Account Ledger</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: 0 }}>Loading earnings log...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: 0 }}>No payment transactions recorded matching your search.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Topic</th>
                    <th>Gross Amount</th>
                    <th>Platform Fee (10%)</th>
                    <th>Net Earnings</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((p) => {
                    const gross = Number(p.amount || 0);
                    const fee = Number(p.platform_fee !== undefined ? p.platform_fee : Math.round(gross * 0.1));
                    const net = Number(p.net_amount !== undefined ? p.net_amount : gross - fee);

                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'var(--accent-soft)',
                                color: 'var(--accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '11px',
                                fontFamily: 'JetBrains Mono',
                                flexShrink: 0,
                              }}
                            >
                              {(p.learner_name || 'L')[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600 }}>{p.learner_name || 'Learner'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: 'var(--ink)' }}>{p.topic || 'Pairing session'}</div>
                          {p.booking_id && (
                            <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono', color: 'var(--ink-muted)' }}>
                              #Session {p.booking_id}
                            </span>
                          )}
                          {p.contract_id && (
                            <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono', color: 'var(--accent)', marginLeft: '6px' }}>
                              #Contract {p.contract_id}
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono' }}>{formatINR(gross)}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--ink-muted)' }}>
                          −{formatINR(fee)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#10b981' }}>
                          {formatINR(net)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              p.status === 'released'
                                ? 'badge-success'
                                : p.status === 'held' || p.status === 'escrow'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                            style={{ fontSize: '10.5px' }}
                          >
                            {p.status === 'released' ? 'RELEASED' : p.status === 'held' ? 'HELD' : p.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                          {new Date(p.created_at || Date.now()).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            {totalItems > 0 && (
              <div className="ledger-pagination-bar">
                <div className="ledger-pagination-info">
                  Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of <strong>{totalItems}</strong> transactions
                </div>

                <div className="ledger-pagination-controls">
                  {/* Page Size Selector */}
                  <div className="ledger-page-size-wrap">
                    <span className="ledger-page-size-label">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="ledger-page-size-select"
                      aria-label="Rows per page"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  {/* Navigation Buttons */}
                  {totalPages > 1 && (
                    <div className="ledger-page-nav">
                      <button
                        type="button"
                        className="ledger-page-btn nav-arrow"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        title="First Page"
                        aria-label="First Page"
                      >
                        «
                      </button>
                      <button
                        type="button"
                        className="ledger-page-btn nav-arrow"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        title="Previous Page"
                        aria-label="Previous Page"
                      >
                        <ChevronLeftIcon size={13} />
                      </button>

                      {getPageNumbers().map((item, idx) => {
                        if (typeof item === 'string') {
                          return (
                            <span key={`ellipsis-${idx}`} className="ledger-page-ellipsis">
                              …
                            </span>
                          );
                        }
                        return (
                          <button
                            key={`page-${item}`}
                            type="button"
                            className={`ledger-page-btn ${currentPage === item ? 'active' : ''}`}
                            onClick={() => setCurrentPage(item)}
                            aria-label={`Page ${item}`}
                            aria-current={currentPage === item ? 'page' : undefined}
                          >
                            {item}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        className="ledger-page-btn nav-arrow"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        title="Next Page"
                        aria-label="Next Page"
                      >
                        <ChevronRightIcon size={13} />
                      </button>
                      <button
                        type="button"
                        className="ledger-page-btn nav-arrow"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        title="Last Page"
                        aria-label="Last Page"
                      >
                        »
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 6. REQUEST PAYOUT MODAL */}
      <Modal
        isOpen={payoutModalOpen}
        onClose={() => setPayoutModalOpen(false)}
        title="Request Payout to Bank"
      >
        <form onSubmit={handleRequestPayout}>
          <div
            style={{
              padding: '16px',
              background: 'var(--accent-soft)',
              borderRadius: '10px',
              border: '1px solid var(--accent)',
              marginBottom: '16px',
            }}
          >
            <div className="sub" style={{ fontSize: '11.5px', color: 'var(--accent-ink)', fontWeight: 600 }}>
              Available Balance Ready for Payout
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)', marginTop: '2px', fontFamily: 'JetBrains Mono' }}>
              {formatINR(availableBalance)}
            </div>
          </div>

          <div className="field">
            <label style={{ fontWeight: 600, fontSize: '13px' }}>Amount to Withdraw (₹)</label>
            <input
              type="number"
              min="100"
              max={availableBalance}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="e.g. 5000"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '15px',
                borderRadius: '8px',
                border: '1px solid var(--grid-strong)',
                fontFamily: 'JetBrains Mono',
              }}
              required
            />
            <div className="sub" style={{ fontSize: '11.5px', marginTop: '4px' }}>
              Minimum withdrawal amount is ₹100. Funds arrive in 1-2 business days.
            </div>
          </div>

          <div className="field">
            <label style={{ fontWeight: 600, fontSize: '13px' }}>Select Payout Destination</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: selectedMethod === 'bank' ? '1.5px solid var(--accent)' : '1px solid var(--grid-strong)',
                  background: selectedMethod === 'bank' ? 'var(--accent-soft)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="payoutMethod"
                  checked={selectedMethod === 'bank'}
                  onChange={() => setSelectedMethod('bank')}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                    {payoutMethod?.bankName || 'HDFC Bank'} ({payoutMethod?.accountNumber || '••••••••4819'})
                  </div>
                  <div className="sub" style={{ fontSize: '11px', margin: '2px 0 0' }}>
                    NEFT / RTGS direct verified bank transfer
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: selectedMethod === 'upi' ? '1.5px solid var(--accent)' : '1px solid var(--grid-strong)',
                  background: selectedMethod === 'upi' ? 'var(--accent-soft)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="payoutMethod"
                  checked={selectedMethod === 'upi'}
                  onChange={() => setSelectedMethod('upi')}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                    UPI Instant Transfer
                  </div>
                  <div className="sub" style={{ fontSize: '11px', margin: '2px 0 0' }}>
                    {payoutMethod?.upiId || `${user?.email ? user.email.split('@')[0] : 'alex'}@okhdfcbank`}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setPayoutModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Submit Withdrawal
            </button>
          </div>
        </form>
      </Modal>
    </PortalLayout>
  );
}
