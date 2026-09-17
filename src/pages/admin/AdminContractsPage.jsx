import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials, formatCurrency, formatDateTime } from '../../api/client';
import {
  DocumentIcon,
  ShieldIcon,
  ScaleIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  SearchIcon,
  RefreshIcon,
  UserIcon,
  EyeIcon,
  CheckIcon,
} from '../../components/Icons';
import { useToast } from '../../context';

export default function AdminContractsPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status') || 'all';
  const urlSearch = searchParams.get('search') || searchParams.get('q') || '';

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const s = searchParams.get('status');
    const q = searchParams.get('search') || searchParams.get('q');
    if (s !== null) setStatusFilter(s);
    if (q !== null) setSearchQuery(q);
  }, [searchParams]);

  // Dispute resolution modal state
  const [disputeModalContract, setDisputeModalContract] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('release_to_mentor');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Quick detail modal state
  const [previewContract, setPreviewContract] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getContracts();
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = async (contractId) => {
    setPreviewLoading(true);
    try {
      const details = await api.getContract(contractId);
      setPreviewContract(details);
    } catch (err) {
      toast.error('Failed to load contract details: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!disputeModalContract) return;

    setSubmittingAction(true);
    setError('');
    try {
      const res = await api.adminResolveContract(
        disputeModalContract.id,
        resolutionAction,
        adminNotes
      );
      toast.success(res.message || 'Dispute resolved successfully.');
      setDisputeModalContract(null);
      setAdminNotes('');
      await loadContracts();
    } catch (err) {
      toast.error(err.message || 'Failed to resolve dispute');
      setError(err.message || 'Failed to resolve dispute');
    } finally {
      setSubmittingAction(false);
    }
  };

  // KPIs
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter((c) => c.status === 'active').length;
  const completedContracts = contracts.filter((c) => c.status === 'completed').length;
  const disputedContracts = contracts.filter((c) => c.status === 'disputed').length;
  const totalEscrowHeld = contracts
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (c.total_price || 0), 0);

  // Filtering & Sorting
  const filteredContracts = useMemo(() => {
    let list = contracts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (c.title || '').toLowerCase().includes(q);
        const matchTech = (c.technology || '').toLowerCase().includes(q);
        const matchMentor = (c.mentor_name || '').toLowerCase().includes(q);
        const matchLearner = (c.learner_name || '').toLowerCase().includes(q);
        const matchId = String(c.id).includes(q);
        const matchMentorId = String(c.mentor_id || '') === q;
        const matchLearnerId = String(c.learner_id || '') === q;
        if (!matchTitle && !matchTech && !matchMentor && !matchLearner && !matchId && !matchMentorId && !matchLearnerId) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortBy === 'amount_high') return (b.total_price || 0) - (a.total_price || 0);
      if (sortBy === 'amount_low') return (a.total_price || 0) - (b.total_price || 0);
      if (sortBy === 'progress') {
        const pctA = ((a.completed_sessions || 0) / (a.total_sessions || 1));
        const pctB = ((b.completed_sessions || 0) / (b.total_sessions || 1));
        return pctB - pctA;
      }
      return 0;
    });

    return list;
  }, [contracts, statusFilter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage) || 1;
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContracts.slice(start, start + itemsPerPage);
  }, [filteredContracts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, sortBy]);

  const renderContractStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 700,
              background: 'rgba(14, 165, 233, 0.12)',
              color: '#0284c7',
              border: '1px solid rgba(14, 165, 233, 0.28)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284c7' }} />
            Active · In Progress
          </span>
        );
      case 'completed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.28)',
            }}
          >
            <CheckIcon size={12} />
            Completed · Released
          </span>
        );
      case 'disputed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#dc2626',
              border: '1px solid rgba(239, 68, 68, 0.35)',
            }}
          >
            <AlertTriangleIcon size={12} />
            Under Dispute
          </span>
        );
      case 'completed_by_mentor':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <ClockIcon size={12} />
            Awaiting Review
          </span>
        );
      case 'proposed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 600,
              background: 'rgba(100, 116, 139, 0.12)',
              color: '#475569',
              border: '1px solid rgba(100, 116, 139, 0.25)',
            }}
          >
            Proposed
          </span>
        );
      case 'declined':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 600,
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#991b1b',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            Declined
          </span>
        );
      default:
        return <span className="status-badge badge-cancelled">{status}</span>;
    }
  };

  const renderEscrowBadge = (escrowStatus) => {
    switch (escrowStatus) {
      case 'held':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.14)',
              color: '#b45309',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <ShieldIcon size={11} />
            Held in Escrow
          </span>
        );
      case 'released':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.14)',
              color: '#047857',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckIcon size={11} />
            Released
          </span>
        );
      case 'refunded':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(168, 85, 247, 0.14)',
              color: '#7e22ce',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            Refunded
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'var(--grid)',
              color: 'var(--ink-muted)',
            }}
          >
            {escrowStatus || 'Unfunded'}
          </span>
        );
    }
  };

  return (
    <PortalLayout title="Mentorship Contracts" portalType="admin">
      <div style={{ paddingBottom: '50px' }}>
        {/* Page Top Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '22px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                Mentorship Contracts Management
              </h1>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }}
              >
                Admin Oversight
              </span>
            </div>
            <p className="sub" style={{ margin: '6px 0 0', fontSize: '13.5px', color: 'var(--ink-muted)' }}>
              Monitor multi-session curricula, oversee platform escrow balances, and arbitrate contract disputes.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadContracts}
            style={{
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '8px',
            }}
          >
            <RefreshIcon size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Data</span>
          </button>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '18px' }}>{error}</div>}

        {/* 5 KPI Cards Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px',
            marginBottom: '22px',
          }}
        >
          {/* Total Contracts */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Total Contracts
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
                <DocumentIcon size={18} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
              {totalContracts}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              All agreements created
            </div>
          </div>

          {/* Active Curricula */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #0284c7',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Active (In Progress)
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.12)',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClockIcon size={18} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>
              {activeContracts}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Live ongoing sessions
            </div>
          </div>

          {/* Locked in Escrow */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #d97706',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Locked in Escrow
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.14)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', lineHeight: 1 }}>
              {formatCurrency(totalEscrowHeld)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Protected platform funds
            </div>
          </div>

          {/* Completed & Released */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #059669',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Completed &amp; Released
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircleIcon size={18} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', lineHeight: 1 }}>
              {completedContracts}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Successfully concluded
            </div>
          </div>

          {/* Under Dispute */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: disputedContracts > 0 ? '3px solid #dc2626' : '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: disputedContracts > 0 ? '#dc2626' : 'var(--ink-muted)' }}>
                Under Dispute
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: disputedContracts > 0 ? 'rgba(239, 68, 68, 0.14)' : 'var(--grid)',
                  color: disputedContracts > 0 ? '#dc2626' : 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangleIcon size={18} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: disputedContracts > 0 ? '#dc2626' : 'var(--ink)', lineHeight: 1 }}>
              {disputedContracts}
            </div>
            <div style={{ fontSize: '11.5px', color: disputedContracts > 0 ? '#dc2626' : 'var(--ink-muted)', marginTop: '8px', fontWeight: disputedContracts > 0 ? 600 : 400 }}>
              {disputedContracts > 0 ? 'Action required immediately' : 'Zero active disputes'}
            </div>
          </div>
        </div>

        {/* Filter, Tabs, Search & Sort Bar */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '18px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Top Row: Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {[
              { id: 'all', label: 'All', count: totalContracts },
              { id: 'active', label: 'Active', count: activeContracts },
              { id: 'proposed', label: 'Proposed', count: contracts.filter((c) => c.status === 'proposed').length },
              { id: 'completed_by_mentor', label: 'Awaiting Review', count: contracts.filter((c) => c.status === 'completed_by_mentor').length },
              { id: 'completed', label: 'Completed', count: completedContracts },
              { id: 'disputed', label: 'Disputed', count: disputedContracts, isAlert: disputedContracts > 0 },
              { id: 'declined', label: 'Declined', count: contracts.filter((c) => c.status === 'declined').length },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '12.5px',
                    fontWeight: isActive ? 700 : 500,
                    border: '1px solid',
                    borderColor: isActive
                      ? 'var(--ink)'
                      : tab.isAlert
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'var(--grid-strong)',
                    background: isActive
                      ? 'var(--ink)'
                      : tab.isAlert
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'var(--bg)',
                    color: isActive
                      ? 'var(--surface)'
                      : tab.isAlert
                      ? '#dc2626'
                      : 'var(--ink)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: isActive
                        ? 'rgba(255,255,255,0.2)'
                        : tab.isAlert
                        ? '#dc2626'
                        : 'var(--grid-strong)',
                      color: isActive
                        ? '#fff'
                        : tab.isAlert
                        ? '#fff'
                        : 'var(--ink-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Row: Search, Sort & Counter */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '6px',
              borderTop: '1px solid var(--grid)',
            }}
          >
            {/* Search Box */}
            <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '420px' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-muted)',
                  pointerEvents: 'none',
                  display: 'flex',
                }}
              >
                <SearchIcon size={14} />
              </span>
              <input
                type="text"
                placeholder="Search contracts by title, learner, mentor, or tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 32px 7px 34px',
                  borderRadius: '8px',
                  border: '1px solid var(--grid-strong)',
                  fontSize: '13px',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--ink-muted)',
                    fontSize: '14px',
                    padding: 0,
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown & Quick Counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--grid-strong)',
                    fontSize: '12.5px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="newest">Newest Created</option>
                  <option value="oldest">Oldest Created</option>
                  <option value="amount_high">Highest Amount</option>
                  <option value="amount_low">Lowest Amount</option>
                  <option value="progress">Most Progress</option>
                </select>
              </div>

              <span style={{ fontSize: '12px', color: 'var(--ink-muted)', paddingLeft: '4px' }}>
                Showing <strong>{filteredContracts.length}</strong> of {totalContracts}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Contracts Table */}
        {loading ? (
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '14px',
              border: '1px solid var(--grid-strong)',
              padding: '60px 20px',
              textAlign: 'center',
            }}
          >
            <div className="spinner-sm" style={{ margin: '0 auto 14px' }} />
            <p className="sub" style={{ fontSize: '14px', margin: 0 }}>
              Loading platform contracts...
            </p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '14px',
              border: '1px solid var(--grid-strong)',
              padding: '50px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--grid)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: 'var(--ink-muted)',
              }}
            >
              <DocumentIcon size={26} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--ink)' }}>
              No contracts found
            </div>
            <p className="sub" style={{ fontSize: '13px', maxWidth: '380px', margin: '8px auto 16px' }}>
              {searchQuery
                ? `No agreements matching "${searchQuery}". Try adjusting your keywords or clearing filters.`
                : statusFilter !== 'all'
                ? `No mentorship contracts with status "${statusFilter}".`
                : 'No mentorship contracts have been created yet on the platform.'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12.5px' }}
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--bg)',
                      borderBottom: '1px solid var(--grid-strong)',
                      color: 'var(--ink-muted)',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '14px 18px', width: '25%' }}>Contract Details</th>
                    <th style={{ padding: '14px 16px', width: '15%' }}>Learner</th>
                    <th style={{ padding: '14px 16px', width: '15%' }}>Mentor</th>
                    <th style={{ padding: '14px 16px', width: '15%' }}>Progress</th>
                    <th style={{ padding: '14px 16px', width: '12%' }}>Escrow &amp; Price</th>
                    <th style={{ padding: '14px 16px', width: '13%' }}>Contract Status</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right', width: '15%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContracts.map((c) => {
                    const completed = c.completed_sessions || 0;
                    const total = c.total_sessions || 1;
                    const progressPct = Math.min(100, Math.round((completed / total) * 100));
                    const isDisputed = c.status === 'disputed';
                    const pricePerSession = Math.round(c.total_price / total);

                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--grid)',
                          borderLeft: isDisputed ? '4px solid #ef4444' : '4px solid transparent',
                          background: isDisputed ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* 1. Contract Info */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span
                              className="mono"
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: isDisputed ? 'rgba(239, 68, 68, 0.12)' : 'var(--accent-soft)',
                                color: isDisputed ? '#dc2626' : 'var(--accent)',
                              }}
                            >
                              #{c.id}
                            </span>
                            <Link
                              to={`/contracts/${c.id}`}
                              target="_blank"
                              style={{
                                fontWeight: 700,
                                fontSize: '13.5px',
                                color: 'var(--ink)',
                                textDecoration: 'none',
                                lineHeight: 1.35,
                              }}
                              title="View Contract Workspace Hub"
                            >
                              {c.title}
                            </Link>
                          </div>

                          {/* Tech Stack Pills */}
                          {c.technology && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '6px 0 4px' }}>
                              {c.technology
                                .split(',')
                                .filter(Boolean)
                                .slice(0, 3)
                                .map((tech, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: 600,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'var(--grid)',
                                      color: 'var(--ink-muted)',
                                    }}
                                  >
                                    {tech.trim()}
                                  </span>
                                ))}
                            </div>
                          )}

                          {/* Timestamp */}
                          <div
                            className="mono"
                            style={{
                              fontSize: '11px',
                              color: 'var(--ink-faint)',
                              marginTop: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>📅</span>
                            <span>{formatDateTime(c.created_at)}</span>
                          </div>
                        </td>

                        {/* 2. Learner Column */}
                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)',
                              }}
                            >
                              {initials(c.learner_name)}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.learner_name || 'Learner'}
                              </div>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  color: 'var(--ink-muted)',
                                  display: 'inline-block',
                                }}
                              >
                                Learner
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Mentor Column */}
                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #059669, #0d9488)',
                                color: '#fff',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                              }}
                            >
                              {initials(c.mentor_name)}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.mentor_name || 'Mentor'}
                              </div>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  color: '#059669',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                Verified Mentor
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Milestone Progress Column */}
                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                              {completed} of {total} sessions
                            </span>
                            <span className="mono" style={{ fontSize: '11.5px', fontWeight: 700, color: progressPct === 100 ? '#059669' : 'var(--accent)' }}>
                              {progressPct}%
                            </span>
                          </div>

                          {/* Progress Track */}
                          <div
                            style={{
                              height: '7px',
                              background: 'var(--grid)',
                              borderRadius: '999px',
                              overflow: 'hidden',
                              marginBottom: '6px',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${progressPct}%`,
                                borderRadius: '999px',
                                background:
                                  progressPct === 100
                                    ? 'linear-gradient(90deg, #10b981, #059669)'
                                    : 'linear-gradient(90deg, var(--brand), #3b82f6)',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>⏱️</span>
                            <span>{c.session_duration_minutes || 60}m / session</span>
                          </div>
                        </td>

                        {/* 5. Escrow & Price Column */}
                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                          <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>
                            {formatCurrency(c.total_price)}
                          </div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)', margin: '2px 0 6px' }}>
                            ~{formatCurrency(pricePerSession)}/sess
                          </div>
                          <div>{renderEscrowBadge(c.escrow_status)}</div>
                        </td>

                        {/* 6. Contract Status Column */}
                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                          <div>{renderContractStatusBadge(c.status)}</div>

                          {/* Dispute Callout Alert */}
                          {isDisputed && c.dispute_reason && (
                            <div
                              style={{
                                marginTop: '8px',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                fontSize: '11px',
                                color: '#dc2626',
                                lineHeight: 1.3,
                                maxWidth: '200px',
                              }}
                            >
                              <div style={{ fontWeight: 700, marginBottom: '2px' }}>Dispute Filed:</div>
                              <div style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.dispute_reason}>
                                "{c.dispute_reason}"
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 7. Actions Column */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                            {/* Urgent Dispute Resolve Action */}
                            {isDisputed && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{
                                  fontSize: '11.5px',
                                  padding: '5px 10px',
                                  background: '#dc2626',
                                  borderColor: '#dc2626',
                                  color: '#fff',
                                  fontWeight: 700,
                                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                onClick={() => {
                                  setDisputeModalContract(c);
                                  setResolutionAction('release_to_mentor');
                                  setAdminNotes('');
                                }}
                              >
                                <ScaleIcon size={12} />
                                <span>Resolve Dispute</span>
                              </button>
                            )}

                            <div style={{ display: 'flex', gap: '6px' }}>
                              {/* Quick View */}
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{
                                  fontSize: '11.5px',
                                  padding: '4px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                onClick={() => handleOpenPreview(c.id)}
                                title="Quick inspect syllabus & sessions"
                              >
                                <EyeIcon size={12} />
                                <span>Detail</span>
                              </button>

                              {/* Direct Link to Hub */}
                              <Link
                                to={`/contracts/${c.id}`}
                                className="btn btn-secondary"
                                style={{
                                  fontSize: '11.5px',
                                  padding: '4px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                target="_blank"
                                title="Open full contract hub in new tab"
                              >
                                <span>Hub ↗</span>
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination & Summary Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                background: 'var(--bg)',
                borderTop: '1px solid var(--grid-strong)',
                fontSize: '12.5px',
                color: 'var(--ink-muted)',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                Showing <strong>{filteredContracts.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * itemsPerPage, filteredContracts.length)}</strong> of{' '}
                <strong>{filteredContracts.length}</strong> matching contracts
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{ fontSize: '11.5px', padding: '3px 10px' }}
                  >
                    Previous
                  </button>

                  <span style={{ fontSize: '12px', padding: '0 6px' }}>
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    style={{ fontSize: '11.5px', padding: '3px 10px' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Dispute Resolution Modal */}
      <Modal
        isOpen={!!disputeModalContract}
        onClose={() => setDisputeModalContract(null)}
        title={`Resolve Contract Dispute #${disputeModalContract?.id}`}
      >
        {disputeModalContract && (
          <form onSubmit={handleResolveDispute}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--del)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--del)', marginBottom: '4px' }}>
                Dispute Reason:
              </div>
              <p style={{ margin: 0, color: 'var(--ink)' }}>
                "{disputeModalContract.dispute_reason || 'No specific reason provided'}"
              </p>
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ink-muted)' }}>
                Contract Amount in Escrow: <strong>{formatCurrency(disputeModalContract.total_price)}</strong>
              </div>
            </div>

            <div className="field">
              <label>Select Resolution Action</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--grid)',
                    background: resolutionAction === 'release_to_mentor' ? 'var(--accent-soft)' : 'var(--bg)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value="release_to_mentor"
                    checked={resolutionAction === 'release_to_mentor'}
                    onChange={(e) => setResolutionAction(e.target.value)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Release Escrow to Mentor ({disputeModalContract.mentor_name})</div>
                    <div className="sub" style={{ fontSize: '11.5px' }}>
                      Marks contract completed and transfers {formatCurrency(disputeModalContract.total_price)} payout to mentor.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--grid)',
                    background: resolutionAction === 'refund_to_learner' ? 'var(--accent-soft)' : 'var(--bg)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value="refund_to_learner"
                    checked={resolutionAction === 'refund_to_learner'}
                    onChange={(e) => setResolutionAction(e.target.value)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Refund Escrow to Learner ({disputeModalContract.learner_name})</div>
                    <div className="sub" style={{ fontSize: '11.5px' }}>
                      Cancels contract and refunds {formatCurrency(disputeModalContract.total_price)} back to learner.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="field">
              <label>Admin Audit Log Notes</label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Explain the findings from session notes, chat logs, and justification for this ruling..."
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDisputeModalContract(null)}
                style={{ flex: 1 }}
                disabled={submittingAction}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, background: resolutionAction === 'refund_to_learner' ? 'var(--del)' : 'var(--add)' }}
                disabled={submittingAction}
              >
                {submittingAction ? 'Executing...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Contract Quick Preview Drawer/Modal */}
      <Modal
        isOpen={!!previewContract}
        onClose={() => setPreviewContract(null)}
        title={previewContract ? `Contract #${previewContract.id}: ${previewContract.title}` : 'Contract Details'}
      >
        {previewLoading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <div className="spinner-sm" style={{ margin: '0 auto 10px' }} />
            <p className="sub">Loading contract details...</p>
          </div>
        ) : previewContract ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Meta summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '12px',
                background: 'var(--bg)',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: 'var(--ink-muted)' }}>Learner:</span>{' '}
                <strong>{previewContract.learner_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-muted)' }}>Mentor:</span>{' '}
                <strong>{previewContract.mentor_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-muted)' }}>Total Amount:</span>{' '}
                <strong style={{ color: 'var(--ink)' }}>{formatCurrency(previewContract.total_price)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-muted)' }}>Escrow Status:</span>{' '}
                <strong style={{ textTransform: 'uppercase' }}>{previewContract.escrow_status || 'Unfunded'}</strong>
              </div>
            </div>

            {/* Curriculum Topics */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                Curriculum Syllabus ({previewContract.topics?.length || 0} topics)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {previewContract.topics && previewContract.topics.length > 0 ? (
                  previewContract.topics.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg)',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span className="mono" style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>
                        #{idx + 1}
                      </span>
                      <span>{t}</span>
                    </div>
                  ))
                ) : (
                  <p className="sub" style={{ fontSize: '12px', fontStyle: 'italic' }}>No topics recorded.</p>
                )}
              </div>
            </div>

            {/* Milestone Sessions */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                Milestone Sessions ({previewContract.sessions?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {previewContract.sessions && previewContract.sessions.length > 0 ? (
                  previewContract.sessions.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>#{s.session_number}: {s.topic}</strong>
                        <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>
                          {s.scheduled_at ? formatDateTime(s.scheduled_at) : 'Not scheduled'} · {s.duration_minutes}m
                        </div>
                      </div>
                      <span
                        className={`status-pill ${s.status}`}
                        style={{ fontSize: '10.5px', textTransform: 'capitalize' }}
                      >
                        {s.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="sub" style={{ fontSize: '12px', fontStyle: 'italic' }}>Sessions not yet activated.</p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Link
                to={`/contracts/${previewContract.id}`}
                className="btn btn-primary"
                target="_blank"
                style={{ fontSize: '12px' }}
              >
                Open Full Contract Hub ↗
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPreviewContract(null)}
                style={{ fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PortalLayout>
  );
}
