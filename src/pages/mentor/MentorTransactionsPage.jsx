import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  SearchIcon,
  RefreshIcon,
  DownloadIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  CheckIcon,
  AlertCircleIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../components/Icons';

export default function MentorTransactionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data states
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Payout states
  const [payoutMethod, setPayoutMethod] = useState(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bank');

  // Filter and search states
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'incoming' | 'escrow' | 'fee' | 'disbursement'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | '7d' | '30d' | 'this_month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (newest first) | 'asc' (oldest first)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Detail Modal State
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadTransactionsData();
    if (user) {
      setPayoutMethod(mentorPayoutSettings.getPayoutMethod(user));
      try {
        const key = user.id ? `pairup_mentor_withdrawals_${user.id}` : 'pairup_mentor_withdrawals';
        const storedW = localStorage.getItem(key);
        if (storedW) setWithdrawals(JSON.parse(storedW));
      } catch {}
    }
  }, [user]);

  // Check URL query parameters (e.g. ?action=withdraw)
  useEffect(() => {
    if (searchParams.get('action') === 'withdraw') {
      setPayoutModalOpen(true);
    }
  }, [searchParams]);

  const loadTransactionsData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getMyPayments();
      setPayments(Array.isArray(data) ? data : []);
      if (isManualRefresh) {
        toast.success('Ledger and movements refreshed successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load transaction history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Indian Rupee Currency Formatter
  const formatINR = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Aggregated Summary Statistics
  const summaryMetrics = useMemo(() => {
    const totalGross = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalFees = payments.reduce((sum, p) => sum + Number(p.platform_fee || 0), 0);

    const releasedNet = payments
      .filter((p) => p.status === 'released')
      .reduce((sum, p) => sum + Number(p.net_amount !== undefined ? p.net_amount : (p.amount - (p.platform_fee || 0))), 0);

    const escrowHeld = payments
      .filter((p) => p.status === 'held' || p.status === 'held_in_escrow' || p.status === 'escrow')
      .reduce((sum, p) => sum + Number(p.net_amount !== undefined ? p.net_amount : (p.amount - (p.platform_fee || 0))), 0);

    const totalDisbursed = withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const availableBalance = Math.max(0, releasedNet - totalDisbursed);

    return {
      totalGross,
      totalFees,
      releasedNet,
      escrowHeld,
      totalDisbursed,
      availableBalance,
    };
  }, [payments, withdrawals]);

  // Transform raw payments and withdrawals into a unified chronological ledger
  const allMovements = useMemo(() => {
    const list = [];

    // 1. Process session payments into accounting movements
    payments.forEach((p) => {
      const gross = Number(p.amount || 0);
      const fee = Number(p.platform_fee || 0);
      const net = Number(p.net_amount !== undefined ? p.net_amount : (p.amount - fee));
      const date = p.created_at || new Date().toISOString();
      const topic = p.topic || 'Pairing Session';
      const learner = p.learner_name || 'Learner';
      const isReleased = p.status === 'released';
      const isRefunded = p.status === 'refunded';

      if (isReleased) {
        // Movement A: Incoming Client Payment (Gross Credit)
        list.push({
          id: `tx_in_${p.id}`,
          refId: `PAY-${p.id}`,
          date,
          type: 'incoming',
          typeLabel: 'Client Payment',
          category: 'Credit',
          counterparty: learner,
          topic,
          description: `Incoming client payment for "${topic}"`,
          amount: gross,
          flow: 'credit',
          flowSign: '+',
          clearedImpact: 0,
          status: 'Settled',
          grossAmount: gross,
          platformFee: fee,
          netAmount: net,
          bookingId: p.booking_id,
          contractId: p.contract_id,
          rawStatus: p.status,
          notes: `Learner ${learner} paid ₹${gross.toLocaleString('en-IN')} for session.`,
        });

        // Movement B: Platform Service Fee Deduction (Debit)
        list.push({
          id: `tx_fee_${p.id}`,
          refId: `FEE-${p.id}`,
          date,
          type: 'fee',
          typeLabel: 'Platform Fee (10%)',
          category: 'Debit',
          counterparty: 'PairUp Platform',
          topic,
          description: `10% PairUp service fee deduction on "${topic}"`,
          amount: fee,
          flow: 'debit',
          flowSign: '-',
          clearedImpact: 0,
          status: 'Deducted',
          grossAmount: gross,
          platformFee: fee,
          netAmount: net,
          bookingId: p.booking_id,
          contractId: p.contract_id,
          rawStatus: p.status,
          notes: 'Standard 10% intermediary commission deducted by platform.',
        });

        // Movement C: Escrow Release into Available Balance (Credit)
        list.push({
          id: `tx_rel_${p.id}`,
          refId: `REL-${p.id}`,
          date,
          type: 'escrow_release',
          typeLabel: 'Escrow Release',
          category: 'Credit',
          counterparty: 'PairUp Escrow Vault',
          topic,
          description: `Escrow funds cleared & credited for "${topic}"`,
          amount: net,
          flow: 'credit',
          flowSign: '+',
          clearedImpact: net,
          status: 'Cleared to Balance',
          grossAmount: gross,
          platformFee: fee,
          netAmount: net,
          bookingId: p.booking_id,
          contractId: p.contract_id,
          rawStatus: p.status,
          notes: 'Session marked complete and escrow vault released net proceeds.',
        });
      } else if (isRefunded) {
        // Movement: Refund Debit
        list.push({
          id: `tx_ref_${p.id}`,
          refId: `REF-${p.id}`,
          date,
          type: 'refund',
          typeLabel: 'Session Refund',
          category: 'Debit',
          counterparty: learner,
          topic,
          description: `Refund issued for "${topic}"`,
          amount: gross,
          flow: 'debit',
          flowSign: '-',
          clearedImpact: 0,
          status: 'Refunded',
          grossAmount: gross,
          platformFee: fee,
          netAmount: net,
          bookingId: p.booking_id,
          contractId: p.contract_id,
          rawStatus: p.status,
          notes: 'Payment returned to learner upon dispute or cancellation.',
        });
      } else {
        // Status is 'held' or 'escrow': Payment in escrow hold
        list.push({
          id: `tx_in_${p.id}`,
          refId: `PAY-${p.id}`,
          date,
          type: 'incoming',
          typeLabel: 'Client Payment',
          category: 'Credit',
          counterparty: learner,
          topic,
          description: `Incoming client payment for "${topic}" (Pending)`,
          amount: gross,
          flow: 'credit',
          flowSign: '+',
          clearedImpact: 0,
          status: 'Pending Session',
          grossAmount: gross,
          platformFee: fee,
          netAmount: net,
          bookingId: p.booking_id,
          contractId: p.contract_id,
          rawStatus: p.status,
          notes: 'Authorized by learner; awaiting session conclusion.',
        });

        list.push({
          id: `tx_escrow_${p.id}`,
          refId: `ESC-${p.id}`,
          date,
          type: 'escrow',
          typeLabel: 'Escrow Deposit',
          category: 'Escrow Hold',
          counterparty: 'PairUp Escrow Vault',
          topic,
          description: `Secured in Escrow Vault for "${topic}"`,
          amount: net,
          flow: 'escrow',
          flowSign: '•',
          clearedImpact: 0,
          status: 'Held in Escrow',
          grossAmount: gross,
          platformFee: fee,
          netAmount: net,
          bookingId: p.booking_id,
          contractId: p.contract_id,
          rawStatus: p.status,
          notes: 'Guaranteed funds protected in escrow until mentor & learner confirm session completion.',
        });
      }
    });

    // 2. Process disbursements (mentor payouts)
    withdrawals.forEach((w) => {
      const amt = Number(w.amount || 0);
      list.push({
        id: `tx_disb_${w.id}`,
        refId: `DISB-${w.id}`,
        date: w.date || new Date().toISOString(),
        type: 'disbursement',
        typeLabel: 'Bank Disbursement',
        category: 'Debit',
        counterparty: w.method || 'Bank Transfer',
        topic: 'Funds Withdrawal',
        description: `Disbursement transfer to ${w.method || 'registered payout account'}`,
        amount: amt,
        flow: 'debit',
        flowSign: '-',
        clearedImpact: -amt,
        status: w.status || 'Completed',
        grossAmount: amt,
        platformFee: 0,
        netAmount: amt,
        bookingId: null,
        contractId: null,
        rawStatus: w.status,
        notes: `Direct disbursement to verified account: ${w.method}`,
      });
    });

    // Sort chronologically ascending to calculate running balance
    list.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Compute cumulative running cleared balance
    let runningBalance = 0;
    const ledgerWithBalance = list.map((item) => {
      runningBalance += item.clearedImpact;
      return {
        ...item,
        runningBalance: Math.max(0, runningBalance),
      };
    });

    return ledgerWithBalance;
  }, [payments, withdrawals]);

  // Filtered and Sorted Ledger
  const filteredMovements = useMemo(() => {
    let result = [...allMovements];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.refId.toLowerCase().includes(q) ||
          m.counterparty.toLowerCase().includes(q) ||
          m.topic.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.typeLabel.toLowerCase().includes(q)
      );
    }

    // Movement type filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'incoming') {
        result = result.filter((m) => m.type === 'incoming');
      } else if (typeFilter === 'escrow') {
        result = result.filter((m) => m.type === 'escrow' || m.type === 'escrow_release');
      } else if (typeFilter === 'fee') {
        result = result.filter((m) => m.type === 'fee');
      } else if (typeFilter === 'disbursement') {
        result = result.filter((m) => m.type === 'disbursement');
      }
    }

    // Date range filter
    if (dateFilter !== 'all') {
      const now = new Date();
      if (dateFilter === '7d') {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - 7);
        result = result.filter((m) => new Date(m.date) >= cutoff);
      } else if (dateFilter === '30d') {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - 30);
        result = result.filter((m) => new Date(m.date) >= cutoff);
      } else if (dateFilter === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter((m) => new Date(m.date) >= startOfMonth);
      } else if (dateFilter === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          result = result.filter((m) => new Date(m.date) >= start);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          result = result.filter((m) => new Date(m.date) <= end);
        }
      }
    }

    // Sort order (default newest first)
    if (sortOrder === 'desc') {
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      result.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return result;
  }, [allMovements, search, typeFilter, dateFilter, startDate, endDate, sortOrder]);

  // Pagination calculations
  const totalItems = filteredMovements.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to first page when search, filter, date, sort, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, dateFilter, startDate, endDate, sortOrder, pageSize]);

  // Keep currentPage valid if items count shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedMovements = useMemo(() => {
    return filteredMovements.slice(startIndex, endIndex);
  }, [filteredMovements, startIndex, endIndex]);

  // Smart page numbers array with ellipses
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

  // Horizontal scroll helpers for left-to-right table inspection
  const tableScrollRef = useRef(null);
  const handleScrollTable = (direction) => {
    if (tableScrollRef.current) {
      const scrollAmount = 350;
      tableScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Export full ledger to CSV
  const handleExportCSV = () => {
    if (filteredMovements.length === 0) {
      toast.info('No ledger movements to export with current filters.');
      return;
    }

    const headers = [
      'Reference ID',
      'Date & Time',
      'Movement Type',
      'Category',
      'Counterparty',
      'Description',
      'Flow Amount (INR)',
      'Gross (INR)',
      'Service Fee (INR)',
      'Net Settled (INR)',
      'Running Balance (INR)',
      'Status',
    ];

    const rows = filteredMovements.map((m) => [
      m.refId,
      new Date(m.date).toLocaleString('en-IN'),
      `"${m.typeLabel}"`,
      `"${m.category}"`,
      `"${m.counterparty.replace(/"/g, '""')}"`,
      `"${m.description.replace(/"/g, '""')}"`,
      `${m.flowSign}${m.amount}`,
      m.grossAmount || 0,
      m.platformFee || 0,
      m.netAmount || 0,
      m.runningBalance || 0,
      `"${m.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pairup_ledger_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Account movements ledger CSV exported successfully.');
  };

  // Request Payout Handler
  const handleRequestPayout = (e) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }
    if (amt > summaryMetrics.availableBalance) {
      toast.error('Amount exceeds your current available balance.');
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

    toast.success(`Disbursement of ₹${amt.toLocaleString('en-IN')} requested! Funds will credit within 1-2 business days.`);
    setPayoutModalOpen(false);
    setWithdrawAmount('');
  };

  // Badge Renderer for Movement Type
  const renderTypeBadge = (type) => {
    switch (type) {
      case 'incoming':
        return (
          <span className="ledger-badge ledger-badge--incoming" title="Client Payment (Inflow)">
            <ArrowDownLeftIcon size={12} />
            <span>Client Payment</span>
          </span>
        );
      case 'escrow':
        return (
          <span className="ledger-badge ledger-badge--escrow" title="Funds Held in Escrow Vault">
            <ShieldIcon size={12} />
            <span>Escrow Deposit</span>
          </span>
        );
      case 'escrow_release':
        return (
          <span className="ledger-badge ledger-badge--release" title="Escrow Released to Cleared Balance">
            <CheckCircleIcon size={12} />
            <span>Escrow Release</span>
          </span>
        );
      case 'fee':
        return (
          <span className="ledger-badge ledger-badge--fee" title="PairUp Platform Service Fee (10%)">
            <RupeeIcon size={12} />
            <span>Platform Fee (10%)</span>
          </span>
        );
      case 'disbursement':
        return (
          <span className="ledger-badge ledger-badge--disbursement" title="Payout Disbursement to Bank / UPI">
            <ArrowUpRightIcon size={12} />
            <span>Disbursement</span>
          </span>
        );
      case 'refund':
        return (
          <span className="ledger-badge ledger-badge--refund" title="Session Refund Debit">
            <AlertCircleIcon size={12} />
            <span>Refund</span>
          </span>
        );
      default:
        return (
          <span className="ledger-badge ledger-badge--default">
            <span>{type}</span>
          </span>
        );
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (status) => {
    if (status === 'Cleared to Balance' || status === 'Settled' || status === 'Completed') {
      return (
        <span className="badge badge-success" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckIcon size={11} /> {status}
        </span>
      );
    }
    if (status === 'Held in Escrow' || status === 'Pending Session') {
      return (
        <span className="badge badge-warning" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ShieldIcon size={11} /> {status}
        </span>
      );
    }
    if (status === 'Deducted') {
      return (
        <span className="badge badge-secondary" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {status}
        </span>
      );
    }
    if (status === 'Processing') {
      return (
        <span className="badge badge-info" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ClockIcon size={11} /> {status}
        </span>
      );
    }
    return <span className="badge badge-secondary" style={{ fontSize: '11px' }}>{status}</span>;
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
            onClick={() => loadTransactionsData(true)}
            disabled={refreshing}
            title="Refresh transactions and balance ledger"
          >
            <RefreshIcon size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleExportCSV}
            title="Export full ledger statement as CSV"
          >
            <DownloadIcon size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            disabled={summaryMetrics.availableBalance <= 0}
            onClick={() => {
              setWithdrawAmount(summaryMetrics.availableBalance.toString());
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
        Chronological ledger of all account movements, including incoming client payments, platform service fee deductions, escrow deposits, and completed disbursements.
      </p>

      {/* Finances Sub-Navigation Tab Strip */}
      <div className="finances-tab-nav">
        <Link to="/mentor/earnings?tab=overview" className="finances-tab-btn">
          <BarChartIcon size={15} />
          <span>Overview</span>
        </Link>

        <Link to="/mentor/transactions" className="finances-tab-btn active">
          <ClockIcon size={15} />
          <span>Transactions</span>
        </Link>

        <button
          type="button"
          className="finances-tab-btn"
          onClick={() => {
            if (summaryMetrics.availableBalance > 0) setWithdrawAmount(summaryMetrics.availableBalance.toString());
            setPayoutModalOpen(true);
          }}
        >
          <CreditCardIcon size={15} />
          <span>Withdraw earnings</span>
        </button>

        <Link to="/mentor/billings" className="finances-tab-btn">
          <WalletIcon size={15} />
          <span>Billings and earnings</span>
        </Link>

        <Link to="/mentor/reports" className="finances-tab-btn">
          <RupeeIcon size={15} />
          <span>My reports</span>
        </Link>

        <Link to="/mentor/taxes" className="finances-tab-btn">
          <ShieldIcon size={15} />
          <span>Taxes</span>
        </Link>
      </div>

      {/* Account Balance & Movements Summary Strip */}
      <div className="ledger-summary-strip">
        <div className="ledger-stat-card">
          <div className="ledger-stat-header">
            <span className="ledger-stat-label">TOTAL INFLOW</span>
            <div className="ledger-stat-icon-wrapper inflow">
              <ArrowDownLeftIcon size={16} />
            </div>
          </div>
          <div className="ledger-stat-val text-success">{formatINR(summaryMetrics.totalGross)}</div>
          <div className="ledger-stat-sub">Gross client session billings</div>
        </div>

        <div className="ledger-stat-card">
          <div className="ledger-stat-header">
            <span className="ledger-stat-label">ESCROW HELD</span>
            <div className="ledger-stat-icon-wrapper escrow">
              <ShieldIcon size={16} />
            </div>
          </div>
          <div className="ledger-stat-val text-warning">{formatINR(summaryMetrics.escrowHeld)}</div>
          <div className="ledger-stat-sub">Locked until session verification</div>
        </div>

        <div className="ledger-stat-card">
          <div className="ledger-stat-header">
            <span className="ledger-stat-label">PLATFORM FEES</span>
            <div className="ledger-stat-icon-wrapper fee">
              <RupeeIcon size={16} />
            </div>
          </div>
          <div className="ledger-stat-val" style={{ color: 'var(--ink-muted)' }}>{formatINR(summaryMetrics.totalFees)}</div>
          <div className="ledger-stat-sub">10% PairUp service commission</div>
        </div>

        <div className="ledger-stat-card">
          <div className="ledger-stat-header">
            <span className="ledger-stat-label">NET CLEARED</span>
            <div className="ledger-stat-icon-wrapper cleared">
              <CheckCircleIcon size={16} />
            </div>
          </div>
          <div className="ledger-stat-val" style={{ color: 'var(--brand)' }}>{formatINR(summaryMetrics.releasedNet)}</div>
          <div className="ledger-stat-sub">Total earnings settled post-fee</div>
        </div>

        <div className="ledger-stat-card">
          <div className="ledger-stat-header">
            <span className="ledger-stat-label">DISBURSED</span>
            <div className="ledger-stat-icon-wrapper disbursed">
              <ArrowUpRightIcon size={16} />
            </div>
          </div>
          <div className="ledger-stat-val text-danger">{formatINR(summaryMetrics.totalDisbursed)}</div>
          <div className="ledger-stat-sub">Transferred to Bank / UPI</div>
        </div>

        <div className="ledger-stat-card highlighted">
          <div className="ledger-stat-header">
            <span className="ledger-stat-label">AVAILABLE BALANCE</span>
            <div className="ledger-stat-icon-wrapper available">
              <WalletIcon size={16} />
            </div>
          </div>
          <div className="ledger-stat-val text-emerald">{formatINR(summaryMetrics.availableBalance)}</div>
          <div className="ledger-stat-sub" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Withdrawable funds</span>
            {summaryMetrics.availableBalance > 0 && (
              <button
                type="button"
                className="ledger-inline-withdraw-btn"
                onClick={() => {
                  setWithdrawAmount(summaryMetrics.availableBalance.toString());
                  setPayoutModalOpen(true);
                }}
              >
                Withdraw
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Card */}
      <div className="ledger-card">
        {/* Ledger Control & Filter Toolbar */}
        <div className="ledger-toolbar">
          <div className="ledger-search-box">
            <SearchIcon size={16} className="ledger-search-icon" />
            <input
              type="text"
              placeholder="Filter by Ref ID, learner, topic, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ledger-search-input"
            />
            {search && (
              <button type="button" className="ledger-clear-search-btn" onClick={() => setSearch('')}>
                ×
              </button>
            )}
          </div>

          <div className="ledger-filter-controls">
            {/* Date Range Selector */}
            <div className="ledger-date-filter-wrap">
              <CalendarIcon size={14} style={{ color: 'var(--ink-muted)' }} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="ledger-select"
                aria-label="Filter by date"
              >
                <option value="all">All Dates</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {/* Custom Date Inputs if selected */}
            {dateFilter === 'custom' && (
              <div className="ledger-custom-date-inputs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="ledger-date-input"
                  aria-label="Start date"
                />
                <span style={{ color: 'var(--ink-faint)', fontSize: '12px' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="ledger-date-input"
                  aria-label="End date"
                />
              </div>
            )}

            {/* Sort Toggle */}
            <button
              type="button"
              className="ledger-sort-btn"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              title={sortOrder === 'desc' ? 'Newest first (Click for Oldest first)' : 'Oldest first (Click for Newest first)'}
            >
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
              {sortOrder === 'desc' ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
            </button>
          </div>
        </div>

        {/* Movement Type Filter Tabs */}
        <div className="ledger-type-tabs">
          <button
            type="button"
            className={`ledger-type-tab ${typeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            All Movements <span className="ledger-tab-count">({allMovements.length})</span>
          </button>
          <button
            type="button"
            className={`ledger-type-tab ${typeFilter === 'incoming' ? 'active' : ''}`}
            onClick={() => setTypeFilter('incoming')}
          >
            Client Payments <span className="ledger-tab-count">({allMovements.filter((m) => m.type === 'incoming').length})</span>
          </button>
          <button
            type="button"
            className={`ledger-type-tab ${typeFilter === 'escrow' ? 'active' : ''}`}
            onClick={() => setTypeFilter('escrow')}
          >
            Escrow Deposits & Releases <span className="ledger-tab-count">({allMovements.filter((m) => m.type === 'escrow' || m.type === 'escrow_release').length})</span>
          </button>
          <button
            type="button"
            className={`ledger-type-tab ${typeFilter === 'fee' ? 'active' : ''}`}
            onClick={() => setTypeFilter('fee')}
          >
            Service Fees <span className="ledger-tab-count">({allMovements.filter((m) => m.type === 'fee').length})</span>
          </button>
          <button
            type="button"
            className={`ledger-type-tab ${typeFilter === 'disbursement' ? 'active' : ''}`}
            onClick={() => setTypeFilter('disbursement')}
          >
            Disbursements <span className="ledger-tab-count">({allMovements.filter((m) => m.type === 'disbursement').length})</span>
          </button>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
            <RefreshIcon size={24} className="spin" style={{ marginBottom: '12px', display: 'inline-block' }} />
            <div>Loading accounting ledger movements...</div>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="ledger-empty-state">
            <ClockIcon size={40} style={{ color: 'var(--ink-faint)', marginBottom: '12px' }} />
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>No account movements found</div>
            <p style={{ fontSize: '13px', color: 'var(--ink-muted)', maxWidth: '420px', margin: '6px auto 16px' }}>
              {search || typeFilter !== 'all' || dateFilter !== 'all'
                ? 'No transaction records match the selected filter criteria. Try resetting your search or filters.'
                : 'Account movements will appear here once learners book pairing sessions or payout requests are initiated.'}
            </p>
            {(search || typeFilter !== 'all' || dateFilter !== 'all') && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12.5px' }}
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                  setDateFilter('all');
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Horizontal Scroll Guide Toolbar */}
            <div className="ledger-scroll-toolbar">
              <div className="ledger-scroll-hint">
                <span className="ledger-scroll-hint-dot"></span>
                <span>← Scroll table horizontally to view complete financial breakdown &amp; actions →</span>
              </div>
              <div className="ledger-scroll-nav-btns">
                <button
                  type="button"
                  className="ledger-scroll-nav-btn"
                  onClick={() => handleScrollTable('left')}
                  title="Scroll table left"
                  aria-label="Scroll table left"
                >
                  <ChevronLeftIcon size={14} />
                  <span>Scroll Left</span>
                </button>
                <button
                  type="button"
                  className="ledger-scroll-nav-btn"
                  onClick={() => handleScrollTable('right')}
                  title="Scroll table right"
                  aria-label="Scroll table right"
                >
                  <span>Scroll Right</span>
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>

            {/* Horizontally Scrollable Ledger Container */}
            <div className="ledger-table-scroll-wrap" ref={tableScrollRef}>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '135px' }}>Date &amp; Time</th>
                    <th style={{ minWidth: '105px' }}>Ref ID</th>
                    <th style={{ minWidth: '170px' }}>Movement Type</th>
                    <th style={{ minWidth: '280px' }}>Description &amp; Counterparty</th>
                    <th style={{ minWidth: '140px', textAlign: 'right' }}>Movement Amount</th>
                    <th style={{ minWidth: '140px', textAlign: 'right' }}>Running Balance</th>
                    <th style={{ minWidth: '145px', textAlign: 'center' }}>Status</th>
                    <th style={{ minWidth: '95px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMovements.map((movement) => {
                    const isCredit = movement.flow === 'credit';
                    const isDebit = movement.flow === 'debit';
                    const isEscrow = movement.flow === 'escrow';

                    return (
                      <tr
                        key={movement.id}
                        className="ledger-row"
                        onClick={() => {
                          setSelectedMovement(movement);
                          setDetailModalOpen(true);
                        }}
                      >
                        {/* Date & Time */}
                        <td className="ledger-col-date">
                          <div className="ledger-date-main">
                            {movement.date ? new Date(movement.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </div>
                          <div className="ledger-date-sub">
                            {movement.date ? new Date(movement.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>

                        {/* Ref ID */}
                        <td className="ledger-col-ref">
                          <span className="ledger-ref-code">{movement.refId}</span>
                        </td>

                        {/* Movement Type Badge */}
                        <td className="ledger-col-type">
                          {renderTypeBadge(movement.type)}
                        </td>

                        {/* Description & Counterparty */}
                        <td className="ledger-col-desc">
                          <div className="ledger-desc-title" title={movement.description}>
                            {movement.description}
                          </div>
                          <div className="ledger-desc-counterparty">
                            <span className="counterparty-label">Party:</span> {movement.counterparty}
                          </div>
                        </td>

                        {/* Flow Amount */}
                        <td className="ledger-col-amount" style={{ textAlign: 'right' }}>
                          <span
                            className={`ledger-amount-value ${
                              isCredit ? 'credit' : isDebit ? 'debit' : 'escrow'
                            }`}
                          >
                            {movement.flowSign}
                            {formatINR(movement.amount)}
                          </span>
                        </td>

                        {/* Running Balance */}
                        <td className="ledger-col-balance" style={{ textAlign: 'right' }}>
                          <span className="ledger-balance-value">
                            {formatINR(movement.runningBalance)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="ledger-col-status" style={{ textAlign: 'center' }}>
                          {renderStatusBadge(movement.status)}
                        </td>

                        {/* Action */}
                        <td className="ledger-col-action" style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="ledger-view-btn"
                            title="View complete transaction breakdown"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMovement(movement);
                              setDetailModalOpen(true);
                            }}
                          >
                            Details
                          </button>
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
                  Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of <strong>{totalItems}</strong> account movements
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
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
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

        {/* Ledger Footer Summary */}
        <div className="ledger-footer-bar">
          <div className="ledger-footer-info">
            Total of <strong>{filteredMovements.length}</strong> movements matching filters
          </div>
          <div className="ledger-footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => window.print()}
            >
              Print Ledger View
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={handleExportCSV}
            >
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Movement Detail Modal */}
      {detailModalOpen && selectedMovement && (
        <Modal
          title={`Movement Detail — ${selectedMovement.refId}`}
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedMovement(null);
          }}
        >
          <div className="movement-detail-card">
            {/* Header Badge & Amount */}
            <div className="movement-detail-hero">
              <div className="movement-detail-badge-row">
                {renderTypeBadge(selectedMovement.type)}
                {renderStatusBadge(selectedMovement.status)}
              </div>
              <div
                className={`movement-detail-amount ${
                  selectedMovement.flow === 'credit'
                    ? 'credit'
                    : selectedMovement.flow === 'debit'
                    ? 'debit'
                    : 'escrow'
                }`}
              >
                {selectedMovement.flowSign}
                {formatINR(selectedMovement.amount)}
              </div>
              <div className="movement-detail-cat">{selectedMovement.category} Movement</div>
            </div>

            {/* Audit Trail Breakdown Grid */}
            <div className="movement-audit-grid">
              <div className="audit-row">
                <span className="audit-label">Reference ID</span>
                <span className="audit-val font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {selectedMovement.refId}
                  <button
                    type="button"
                    className="audit-copy-btn"
                    title="Copy Reference ID"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMovement.refId);
                      toast.success('Reference ID copied to clipboard');
                    }}
                  >
                    Copy
                  </button>
                </span>
              </div>

              <div className="audit-row">
                <span className="audit-label">Timestamp</span>
                <span className="audit-val">
                  {new Date(selectedMovement.date).toLocaleString('en-IN', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>

              <div className="audit-row">
                <span className="audit-label">Counterparty</span>
                <span className="audit-val">{selectedMovement.counterparty}</span>
              </div>

              <div className="audit-row">
                <span className="audit-label">Description</span>
                <span className="audit-val">{selectedMovement.description}</span>
              </div>

              {selectedMovement.topic && (
                <div className="audit-row">
                  <span className="audit-label">Topic / Service</span>
                  <span className="audit-val">{selectedMovement.topic}</span>
                </div>
              )}

              {/* Financial Decomposition if applicable */}
              {selectedMovement.grossAmount > 0 && (
                <>
                  <div className="audit-divider" />
                  <div className="audit-row">
                    <span className="audit-label">Gross Client Billing</span>
                    <span className="audit-val">{formatINR(selectedMovement.grossAmount)}</span>
                  </div>
                  <div className="audit-row">
                    <span className="audit-label">PairUp Service Fee (10%)</span>
                    <span className="audit-val text-danger">- {formatINR(selectedMovement.platformFee)}</span>
                  </div>
                  <div className="audit-row font-bold">
                    <span className="audit-label">Net Settled to Mentor</span>
                    <span className="audit-val text-success">{formatINR(selectedMovement.netAmount)}</span>
                  </div>
                </>
              )}

              <div className="audit-divider" />
              <div className="audit-row">
                <span className="audit-label">Running Cleared Balance</span>
                <span className="audit-val font-bold text-emerald">{formatINR(selectedMovement.runningBalance)}</span>
              </div>

              <div className="audit-row">
                <span className="audit-label">Audit Notes</span>
                <span className="audit-val text-faint" style={{ fontStyle: 'italic' }}>
                  {selectedMovement.notes}
                </span>
              </div>
            </div>

            {/* Escrow Guarantee Disclaimer */}
            <div className="ledger-escrow-banner">
              <ShieldIcon size={16} className="text-brand" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)', lineHeight: '1.4' }}>
                All PairUp transactions are recorded in the marketplace ledger with cryptographic verification and dual-custody escrow protection.
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedMovement(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payout Request Modal */}
      {payoutModalOpen && (
        <Modal
          title="Request Earnings Disbursement"
          isOpen={payoutModalOpen}
          onClose={() => setPayoutModalOpen(false)}
        >
          <form onSubmit={handleRequestPayout}>
            <div style={{ marginBottom: '16px', background: 'var(--bg)', padding: '14px', borderRadius: '8px', border: '1px solid var(--grid)' }}>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                Available For Payout
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatINR(summaryMetrics.availableBalance)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-faint)', marginTop: '4px' }}>
                Escrow funds are released to available balance once sessions are completed.
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                Withdrawal Amount (₹ INR)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--ink-muted)' }}>
                  ₹
                </span>
                <input
                  type="number"
                  className="form-control"
                  style={{ paddingLeft: '28px', fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 600 }}
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={summaryMetrics.availableBalance}
                  min={1}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Min payout: ₹100</span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  onClick={() => setWithdrawAmount(summaryMetrics.availableBalance.toString())}
                >
                  Withdraw All ({formatINR(summaryMetrics.availableBalance)})
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                Payout Destination
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    border: selectedMethod === 'bank' ? '2px solid var(--brand)' : '1px solid var(--grid)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedMethod === 'bank' ? 'rgba(38,75,228,0.04)' : 'var(--surface)',
                  }}
                >
                  <input
                    type="radio"
                    name="payoutMethod"
                    value="bank"
                    checked={selectedMethod === 'bank'}
                    onChange={() => setSelectedMethod('bank')}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>
                      Bank Account ({payoutMethod?.bankName || 'HDFC Bank'})
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      A/C: •••• {payoutMethod?.accountNumber ? payoutMethod.accountNumber.slice(-4) : '4421'} • IFSC: {payoutMethod?.ifsc || 'HDFC0001234'}
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    border: selectedMethod === 'upi' ? '2px solid var(--brand)' : '1px solid var(--grid)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedMethod === 'upi' ? 'rgba(38,75,228,0.04)' : 'var(--surface)',
                  }}
                >
                  <input
                    type="radio"
                    name="payoutMethod"
                    value="upi"
                    checked={selectedMethod === 'upi'}
                    onChange={() => setSelectedMethod('upi')}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Instant UPI Transfer</div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      ID: {payoutMethod?.upiId || `${user?.email ? user.email.split('@')[0] : 'mentor'}@okaxis`}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPayoutModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > summaryMetrics.availableBalance}
              >
                Confirm Payout ({formatINR(withdrawAmount || 0)})
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
