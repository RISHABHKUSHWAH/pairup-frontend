import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import TransactionDetailModal from '../../components/TransactionDetailModal';
import { api, mentorPayoutSettings, apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import { usePlatformCommission } from '../../utils';
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
  const { effectiveMentorFeePercent, mentorTaxPercent } = usePlatformCommission();
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
      const [data, payouts] = await Promise.all([
        api.getMyPayments(),
        apiFetch('/api/payouts/mine', { auth: true }).catch(() => null),
      ]);
      setPayments(Array.isArray(data) ? data : []);
      if (Array.isArray(payouts) && payouts.length > 0) {
        setWithdrawals(payouts);
        const key = user?.id ? `pairup_mentor_withdrawals_${user.id}` : 'pairup_mentor_withdrawals';
        localStorage.setItem(key, JSON.stringify(payouts));
      }
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

  // Default demo transactions matching the Upwork ledger format in user screenshots
  const demoTransactions = useMemo(
    () => [
      {
        id: 'tx_demo_1',
        refId: 'TX-10701',
        date: '2026-10-07T14:30:00Z',
        type: 'Fixed-price',
        typeLabel: 'Fixed-price',
        clientName: 'DG',
        contractTitle: 'Mirth developer',
        milestoneTitle: 'Milestone 7 - Powell',
        grossAmount: 200.0,
        mentorFee: 20.0,
        mentorTax: 3.8,
        mentorCommissionPercent: 10.0,
        mentorTaxPercent: 18.0,
        netAmount: 176.2,
        amount: 176.2,
        flowSign: '+',
        flow: 'credit',
        status: 'Added',
        contractId: 1,
      },
      {
        id: 'tx_demo_2',
        refId: 'TX-10702',
        date: '2026-10-07T11:15:00Z',
        type: 'Fixed-price',
        typeLabel: 'Fixed-price',
        clientName: 'DG',
        contractTitle: 'Mirth developer',
        milestoneTitle: 'Milestone 6 - Dominion',
        grossAmount: 100.0,
        mentorFee: 10.0,
        mentorTax: 1.9,
        mentorCommissionPercent: 10.0,
        mentorTaxPercent: 18.0,
        netAmount: 88.1,
        amount: 88.1,
        flowSign: '+',
        flow: 'credit',
        status: 'Added',
        contractId: 1,
      },
      {
        id: 'tx_demo_3',
        refId: 'TX-10703',
        date: '2026-10-07T09:00:00Z',
        type: 'Fixed-price',
        typeLabel: 'Fixed-price',
        clientName: 'DG',
        contractTitle: 'Mirth developer',
        milestoneTitle: 'Milestone 5 - Allen count lab integration',
        grossAmount: 1075.0,
        mentorFee: 107.5,
        mentorTax: 20.43,
        mentorCommissionPercent: 10.0,
        mentorTaxPercent: 18.0,
        netAmount: 947.07,
        amount: 947.07,
        flowSign: '+',
        flow: 'credit',
        status: 'Added',
        contractId: 1,
      },
      {
        id: 'tx_demo_4',
        refId: 'W-499101',
        date: '2026-07-01T15:20:00Z',
        type: 'Withdrawal',
        typeLabel: 'Withdrawal',
        clientName: 'Bank Transfer 4991',
        counterparty: 'Bank Transfer 4991',
        contractTitle: 'Bank Transfer 4991',
        milestoneTitle: '',
        grossAmount: 594.67,
        mentorFee: 0,
        mentorTax: 0,
        netAmount: 594.67,
        amount: 594.67,
        flowSign: '-',
        flow: 'debit',
        status: 'Completed',
      },
      {
        id: 'tx_demo_5',
        refId: 'TX-10604',
        date: '2026-06-08T16:00:00Z',
        type: 'Fixed-price',
        typeLabel: 'Fixed-price',
        clientName: 'DG',
        contractTitle: 'Mirth developer',
        milestoneTitle: 'Milestone 4 - Dominion',
        grossAmount: 100.0,
        mentorFee: 10.0,
        mentorTax: 1.9,
        mentorCommissionPercent: 10.0,
        mentorTaxPercent: 18.0,
        netAmount: 88.1,
        amount: 88.1,
        flowSign: '+',
        flow: 'credit',
        status: 'Added',
        contractId: 1,
      },
      {
        id: 'tx_demo_6',
        refId: 'TX-10603',
        date: '2026-06-08T14:10:00Z',
        type: 'Fixed-price',
        typeLabel: 'Fixed-price',
        clientName: 'DG',
        contractTitle: 'Mirth developer',
        milestoneTitle: 'Milestone 3 - Powell DW2',
        grossAmount: 450.0,
        mentorFee: 45.0,
        mentorTax: 8.55,
        mentorCommissionPercent: 10.0,
        mentorTaxPercent: 18.0,
        netAmount: 396.45,
        amount: 396.45,
        flowSign: '+',
        flow: 'credit',
        status: 'Added',
        contractId: 1,
      },
      {
        id: 'tx_demo_7',
        refId: 'TX-10602',
        date: '2026-06-08T10:30:00Z',
        type: 'Fixed-price',
        typeLabel: 'Fixed-price',
        clientName: 'DG',
        contractTitle: 'Mirth developer',
        milestoneTitle: 'Milestone 2 - Powell recovery',
        grossAmount: 125.0,
        mentorFee: 12.5,
        mentorTax: 2.38,
        mentorCommissionPercent: 10.0,
        mentorTaxPercent: 18.0,
        netAmount: 110.12,
        amount: 110.12,
        flowSign: '+',
        flow: 'credit',
        status: 'Added',
        contractId: 1,
      },
      {
        id: 'tx_demo_8',
        refId: 'W-499102',
        date: '2026-05-27T17:45:00Z',
        type: 'Withdrawal',
        typeLabel: 'Withdrawal',
        clientName: 'Bank Transfer 4991',
        counterparty: 'Bank Transfer 4991',
        contractTitle: 'Bank Transfer 4991',
        milestoneTitle: '',
        grossAmount: 198.22,
        mentorFee: 0,
        mentorTax: 0,
        netAmount: 198.22,
        amount: 198.22,
        flowSign: '-',
        flow: 'debit',
        status: 'Completed',
      },
      {
        id: 'tx_demo_9',
        refId: 'TX-10501',
        date: '2026-05-27T12:00:00Z',
        type: 'Fixed-price',
        typeLabel: 'Fixed-price',
        clientName: 'DG',
        contractTitle: 'Mirth developer',
        milestoneTitle: 'Milestone 1 - Mirth developer',
        grossAmount: 225.0,
        mentorFee: 22.5,
        mentorTax: 4.05,
        mentorCommissionPercent: 10.0,
        mentorTaxPercent: 18.0,
        netAmount: 198.22,
        amount: 198.22,
        flowSign: '+',
        flow: 'credit',
        status: 'Added',
        contractId: 1,
      },
    ],
    []
  );

  // Transform raw payments and withdrawals into unified chronological transaction records
  const allMovements = useMemo(() => {
    const list = [];

    payments.forEach((p) => {
      const gross = Number(p.gross_amount || p.amount || 0);
      const commPct = Number(p.mentor_commission_percent !== undefined && Number(p.mentor_commission_percent) >= 0 ? p.mentor_commission_percent : effectiveMentorFeePercent);
      const taxPct = Number(p.mentor_tax_percent !== undefined && Number(p.mentor_tax_percent) >= 0 ? p.mentor_tax_percent : mentorTaxPercent);
      const mFee = Number(
        p.mentor_fee !== undefined && Number(p.mentor_fee) > 0
          ? p.mentor_fee
          : (p.platform_fee !== undefined && Number(p.platform_fee) > 0 ? p.platform_fee : Math.round(gross * (commPct / 100) * 100) / 100)
      );
      const mTax = Number(
        p.mentor_tax !== undefined && Number(p.mentor_tax) > 0
          ? p.mentor_tax
          : Math.round(mFee * (taxPct / 100) * 100) / 100
      );
      const net = Number(
        p.net_mentor_payout !== undefined && Number(p.net_mentor_payout) > 0
          ? p.net_mentor_payout
          : (p.net_amount !== undefined && Number(p.net_amount) > 0 ? p.net_amount : Math.max(0, Math.round((gross - mFee - mTax) * 100) / 100))
      );
      const date = p.created_at || new Date().toISOString();
      const topic = p.topic || 'Pairing Session';
      const learner = p.learner_name || 'DG';
      const isReleased = p.status === 'released';
      const isRefunded = p.status === 'refunded';

      const typeLabel = p.contract_id ? 'Fixed-price' : (p.type || 'Session');
      const contractTitle = p.contract_title || topic;
      const milestoneTitle = p.contract_id ? (p.milestone_title || `Milestone 1 - ${topic}`) : `1 hr session on ${topic}`;

      list.push({
        id: `tx_${p.id}`,
        paymentId: p.id,
        refId: `TX-${p.id}`,
        date,
        type: typeLabel,
        typeLabel,
        category: 'Earnings',
        clientName: learner,
        counterparty: learner,
        contractTitle,
        milestoneTitle,
        topic,
        description: contractTitle,
        subtitle: milestoneTitle,
        amount: net,
        grossAmount: gross,
        platformFee: mFee,
        mentorFee: mFee,
        mentorTax: mTax,
        mentorCommissionPercent: commPct,
        mentorTaxPercent: taxPct,
        netAmount: net,
        flow: isRefunded ? 'debit' : 'credit',
        flowSign: isRefunded ? '-' : '+',
        clearedImpact: isReleased ? net : 0,
        status: isReleased ? 'Added' : (isRefunded ? 'Refunded' : 'Pending'),
        rawStatus: p.status,
        bookingId: p.booking_id,
        contractId: p.contract_id,
      });
    });

    withdrawals.forEach((w) => {
      const amt = Number(w.amount || 0);
      const date = w.date || new Date().toISOString();
      const method = w.method || 'Bank Transfer 4991';
      list.push({
        id: `tx_disb_${w.id}`,
        refId: `W-${w.id}`,
        date,
        type: 'Withdrawal',
        typeLabel: 'Withdrawal',
        category: 'Disbursement',
        clientName: method,
        counterparty: method,
        contractTitle: method,
        milestoneTitle: '',
        topic: 'Funds Withdrawal',
        description: method,
        subtitle: '',
        amount: amt,
        grossAmount: amt,
        platformFee: 0,
        mentorFee: 0,
        mentorTax: 0,
        mentorCommissionPercent: 0,
        mentorTaxPercent: 0,
        netAmount: amt,
        flow: 'debit',
        flowSign: '-',
        clearedImpact: -amt,
        status: w.status || 'Completed',
        rawStatus: w.status || 'Completed',
        bookingId: null,
        contractId: null,
      });
    });

    if (list.length === 0) {
      return demoTransactions;
    }

    // Sort descending (newest first)
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return list;
  }, [payments, withdrawals, demoTransactions]);

  // Aggregated Summary Statistics
  const summaryMetrics = useMemo(() => {
    const list = allMovements;
    const totalGross = list.filter((m) => m.type !== 'Withdrawal').reduce((sum, p) => sum + Number(p.grossAmount || 0), 0);
    const totalFees = list.filter((m) => m.type !== 'Withdrawal').reduce((sum, p) => sum + Number(p.mentorFee || 0), 0);
    const releasedNet = list.filter((m) => m.status === 'Added' && m.type !== 'Withdrawal').reduce((sum, p) => sum + Number(p.netAmount || 0), 0);
    const escrowHeld = list.filter((m) => m.status === 'Pending').reduce((sum, p) => sum + Number(p.netAmount || 0), 0);
    const totalDisbursed = list.filter((m) => m.type === 'Withdrawal').reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const availableBalance = Math.max(0, releasedNet - totalDisbursed);

    return {
      totalGross,
      totalFees,
      releasedNet,
      escrowHeld,
      totalDisbursed,
      availableBalance,
    };
  }, [allMovements]);

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

    // Also persist to backend API for mobile app sync
    try {
      apiFetch('/api/payouts/mine', {
        method: 'POST',
        body: JSON.stringify({ amount: amt, method: newWithdrawal.method }),
        auth: true,
      }).catch(() => null);
    } catch (_) {}

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
          <div className="ledger-stat-sub">{effectiveMentorFeePercent}% PairUp service commission</div>
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
            <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--grid-strong)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--grid-strong)', color: 'var(--ink-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '14px 20px', fontWeight: 600, width: '16%' }}>Date</th>
                    <th style={{ padding: '14px 16px', fontWeight: 600, width: '16%' }}>Type</th>
                    <th style={{ padding: '14px 16px', fontWeight: 600, width: '40%' }}>Client / Description</th>
                    <th style={{ padding: '14px 16px', fontWeight: 600, width: '13%', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, width: '15%', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMovements.map((movement) => {
                    const isDebit = movement.flow === 'debit' || movement.type === 'Withdrawal';
                    const isCredit = !isDebit;
                    const clientName = movement.clientName || movement.counterparty || 'DG';
                    const clientInitial = (clientName.trim().charAt(0) || 'D').toUpperCase();

                    return (
                      <tr
                        key={movement.id}
                        onClick={() => {
                          setSelectedMovement(movement);
                          setDetailModalOpen(true);
                        }}
                        style={{
                          borderBottom: '1px solid var(--grid)',
                          cursor: 'pointer',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Date */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', color: 'var(--ink)' }}>
                          {movement.date
                            ? new Date(movement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'N/A'}
                        </td>

                        {/* Type */}
                        <td style={{ padding: '16px 16px', color: 'var(--ink)', fontWeight: 500 }}>
                          {movement.typeLabel || movement.type || 'Fixed-price'}
                        </td>

                        {/* Client / Description */}
                        <td style={{ padding: '16px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '14px' }}>
                                {movement.contractTitle || movement.description}
                              </div>
                              {movement.milestoneTitle ? (
                                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                                  {movement.milestoneTitle}
                                </div>
                              ) : null}
                            </div>

                            {/* Client Pill if applicable */}
                            {movement.type !== 'Withdrawal' && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <div
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: 'var(--grid)',
                                    border: '1px solid var(--grid-strong)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    color: 'var(--ink)',
                                  }}
                                >
                                  {clientInitial}
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                                  {clientName}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: movement.status === 'Added' ? 'var(--add-bg, #e7f6ef)' : 'var(--grid, #e3e6ec)',
                              color: movement.status === 'Added' ? 'var(--add, #157f53)' : 'var(--ink, #12141c)',
                              border: movement.status === 'Added' ? '1px solid var(--add, #157f53)' : '1px solid var(--border, #d2d6e0)',
                              textTransform: 'capitalize',
                            }}
                          >
                            {movement.status}
                          </span>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
                              fontWeight: 700,
                              fontSize: '14px',
                              color: isCredit ? 'var(--add, #157f53)' : 'var(--ink, #12141c)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>{movement.flowSign || (isCredit ? '+' : '-')}{formatINR(movement.amount)}</span>
                            <ChevronRightIcon size={14} style={{ color: 'var(--ink-muted)' }} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* No more transactions footer */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 0',
                  color: 'var(--ink-muted)',
                  fontSize: '13px',
                  borderTop: '1px solid var(--grid)',
                }}
              >
                No more transactions.
              </div>
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

      {/* Upwork-style Transaction Detail Modal */}
      {detailModalOpen && (
        <TransactionDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedMovement(null);
          }}
          transaction={selectedMovement}
        />
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
