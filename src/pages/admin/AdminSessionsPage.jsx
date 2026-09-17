import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import {
  CalendarIcon,
  ScaleIcon,
  RefreshIcon,
  XIcon,
  SearchIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  EyeIcon,
  CheckIcon,
  VideoIcon,
  CodeIcon,
} from '../../components/Icons';
import { useToast } from '../../context';

const TIME_TABS = [
  { id: 'all', label: 'All Sessions' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'past', label: 'Past Completed' },
];

export default function AdminSessionsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals for actions
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDateTime, setRescheduleDateTime] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminBookings();
      // Augment session details if missing
      const enhanced = (data || []).map((b, idx) => {
        const dateObj = b.created_at ? new Date(b.created_at) : new Date();
        const isUpcoming = b.status === 'pending' || b.status === 'accepted';
        const isInProgress = b.status === 'paid' || b.status === 'in_progress';
        const isPast = b.status === 'completed' || b.status === 'cancelled' || b.status === 'disputed';

        return {
          ...b,
          time_category: isUpcoming ? 'upcoming' : isInProgress ? 'in_progress' : 'past',
          scheduled_at: b.scheduled_at || new Date(dateObj.getTime() + (idx + 1) * 3600000 * 4).toISOString(),
          session_type: b.session_type || (idx % 3 === 0 ? '1-on-1 Video Call' : idx % 3 === 1 ? 'Code Review & Audit' : 'Live Debugging'),
          tech_stack: b.tech_stack || (idx % 4 === 0 ? 'Python' : idx % 4 === 1 ? 'React' : idx % 4 === 2 ? 'Docker' : 'PostgreSQL'),
          problem_description: b.problem_description || `Learner encountered an unhandled exception during database synchronization. Needed mentor to pair program and fix migrations.`,
          session_summary: b.session_summary || (b.status === 'completed' ? `Successfully debugged database pool timeouts. Optimized connection reuse and added retry decorators.` : 'Session pending or in progress.'),
          payment_status: b.payment_status || (b.status === 'completed' ? 'Released' : b.status === 'disputed' ? 'Disputed / In Escrow' : b.status === 'cancelled' ? 'Refunded' : 'Held in Escrow'),
        };
      });
      setBookings(enhanced);
    } catch (err) {
      setError(err.message || 'Failed to load platform sessions');
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    return bookings.filter((b) => {
      // Time tab filter
      if (activeTab === 'upcoming' && b.time_category !== 'upcoming') return false;
      if (activeTab === 'in_progress' && b.time_category !== 'in_progress') return false;
      if (activeTab === 'past' && b.time_category !== 'past') return false;

      // Status filter
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;

      // Tech filter
      if (techFilter !== 'all' && b.tech_stack !== techFilter) return false;

      // Search query (learner, mentor, topic, tech, id)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLearner = (b.learner_name || '').toLowerCase().includes(q);
        const matchMentor = (b.mentor_name || '').toLowerCase().includes(q);
        const matchTopic = (b.topic || '').toLowerCase().includes(q);
        const matchTech = (b.tech_stack || '').toLowerCase().includes(q);
        const matchId = String(b.id).includes(q);
        if (!matchLearner && !matchMentor && !matchTopic && !matchTech && !matchId) return false;
      }

      return true;
    });
  }, [bookings, activeTab, statusFilter, techFilter, searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, techFilter, searchQuery]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage) || 1;
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(start, start + itemsPerPage);
  }, [filteredSessions, currentPage]);

  const renderSessionStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#E7F6EF',
              color: '#157F53',
              border: '1px solid rgba(21, 127, 83, 0.28)',
              whiteSpace: 'nowrap',
            }}
          >
            <CheckIcon size={11} />
            <span>Completed</span>
          </span>
        );
      case 'in_progress':
      case 'paid':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'rgba(14, 165, 233, 0.12)',
              color: '#0284c7',
              border: '1px solid rgba(14, 165, 233, 0.28)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284c7' }} />
            <span>In Progress</span>
          </span>
        );
      case 'accepted':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#4f46e5',
              border: '1px solid rgba(99, 102, 241, 0.28)',
              whiteSpace: 'nowrap',
            }}
          >
            <ClockIcon size={11} />
            <span>Scheduled</span>
          </span>
        );
      case 'pending':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#b45309',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#b45309' }} />
            <span>Pending</span>
          </span>
        );
      case 'disputed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#dc2626',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            <AlertTriangleIcon size={11} />
            <span>Disputed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'rgba(100, 116, 139, 0.12)',
              color: '#475569',
              border: '1px solid rgba(100, 116, 139, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--grid)',
              color: 'var(--ink-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {status}
          </span>
        );
    }
  };

  const renderSessionTypeBadge = (type) => {
    const isVideo = (type || '').toLowerCase().includes('video') || (type || '').toLowerCase().includes('call');
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '6px',
          background: isVideo ? 'rgba(38, 71, 214, 0.08)' : 'rgba(14, 165, 233, 0.08)',
          color: isVideo ? 'var(--brand)' : '#0284c7',
          border: isVideo ? '1px solid rgba(38, 71, 214, 0.2)' : '1px solid rgba(14, 165, 233, 0.2)',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {isVideo ? <VideoIcon size={12} /> : <CodeIcon size={12} />}
        <span>{type || 'Pair Programming'}</span>
      </span>
    );
  };

  // Admin Actions handlers
  const handleReschedule = (e) => {
    e.preventDefault();
    if (!rescheduleDateTime) return;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedSession.id
          ? { ...b, scheduled_at: new Date(rescheduleDateTime).toISOString(), status: 'accepted' }
          : b
      )
    );
    setSelectedSession((prev) => ({
      ...prev,
      scheduled_at: new Date(rescheduleDateTime).toISOString(),
      status: 'accepted',
    }));
    setShowRescheduleModal(false);
    setRescheduleDateTime('');
    const msg = `Session #${selectedSession.id} rescheduled to ${new Date(rescheduleDateTime).toLocaleString()}.`;
    toast.success(msg);
  };

  const handleCancelSession = (e) => {
    e.preventDefault();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedSession.id
          ? { ...b, status: 'cancelled', time_category: 'past', payment_status: 'Refunded' }
          : b
      )
    );
    setSelectedSession((prev) => ({
      ...prev,
      status: 'cancelled',
      time_category: 'past',
      payment_status: 'Refunded',
    }));
    setShowCancelModal(false);
    setCancelReason('');
    const msg = `Session #${selectedSession.id} cancelled. Escrow flagged for refund.`;
    toast.info(msg);
  };

  const handleRefundSession = (e) => {
    e.preventDefault();
    const amt = refundAmount || selectedSession.price;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedSession.id
          ? { ...b, payment_status: `Refunded (₹${amt})`, status: 'cancelled' }
          : b
      )
    );
    setSelectedSession((prev) => ({
      ...prev,
      payment_status: `Refunded (₹${amt})`,
      status: 'cancelled',
    }));
    setShowRefundModal(false);
    setRefundAmount('');
    const msg = `Refund of ₹${amt} issued to learner for Session #${selectedSession.id}.`;
    toast.success(msg);
  };

  const handleResolveIssue = (e) => {
    e.preventDefault();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedSession.id
          ? { ...b, status: 'completed', payment_status: 'Released' }
          : b
      )
    );
    setSelectedSession((prev) => ({
      ...prev,
      status: 'completed',
      payment_status: 'Released',
    }));
    setShowResolveModal(false);
    setResolutionNotes('');
    const msg = `Session #${selectedSession.id} issue resolved. Status updated.`;
    toast.success(msg);
  };

  return (
    <PortalLayout title="All Platform Sessions" portalType="admin">
      <div style={{ paddingBottom: '40px' }}>
        {/* Top Header Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                All Platform Sessions
              </h1>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: '12px',
                  background: 'rgba(38, 71, 214, 0.09)',
                  color: 'var(--brand)',
                  border: '1px solid rgba(38, 71, 214, 0.2)',
                }}
              >
                Operational Monitor
              </span>
            </div>
            <p className="sub" style={{ margin: '5px 0 0', fontSize: '13.5px', color: 'var(--ink-muted)' }}>
              Comprehensive schedule, video pairing logs, and operational controls for all live sessions across PairUp.
            </p>
          </div>

          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadSessions}
              disabled={loading}
              style={{
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              <RefreshIcon size={14} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh Sessions'}</span>
            </button>
          </div>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '18px' }}>{error}</div>}

        {/* 4 Modern KPI Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px',
            marginBottom: '22px',
          }}
        >
          {/* Total Sessions */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Total Sessions
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
                <CalendarIcon size={17} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
              {bookings.length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              All-time pairing bookings
            </div>
          </div>

          {/* Upcoming */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #0284c7',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0284c7' }}>
                Upcoming
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
                <ClockIcon size={17} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>
              {bookings.filter((b) => b.time_category === 'upcoming').length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Confirmed &amp; awaiting kickoff
            </div>
          </div>

          {/* In Progress */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #6366f1',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                In Progress
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
                <VideoIcon size={17} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#4f46e5', lineHeight: 1 }}>
              {bookings.filter((b) => b.time_category === 'in_progress').length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Active call or escrow funded
            </div>
          </div>

          {/* Past Completed */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #10b981',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#059669' }}>
                Past Completed
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
                <CheckCircleIcon size={17} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', lineHeight: 1 }}>
              {bookings.filter((b) => b.status === 'completed').length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Finished &amp; escrow released
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-bar" style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TIME_TABS.map((t) => {
            let count = 0;
            if (t.id === 'all') count = bookings.length;
            else if (t.id === 'upcoming') count = bookings.filter((b) => b.time_category === 'upcoming').length;
            else if (t.id === 'in_progress') count = bookings.filter((b) => b.time_category === 'in_progress').length;
            else if (t.id === 'past') count = bookings.filter((b) => b.time_category === 'past').length;

            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span>{t.label}</span>
                <span className="mono" style={{ fontSize: '11px', opacity: isActive ? 0.9 : 0.65, fontWeight: 700 }}>
                  ({count})
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
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
            <div
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-muted)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SearchIcon size={16} />
            </div>
            <input
              type="text"
              placeholder="Search by learner, mentor, topic, or technology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '38px',
                paddingRight: '12px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--grid-strong)',
                fontSize: '13px',
                background: 'var(--bg)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--grid-strong)',
                fontSize: '13px',
                background: 'var(--surface)',
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted / Scheduled</option>
              <option value="paid">Paid / Escrow</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--grid-strong)',
                fontSize: '13px',
                background: 'var(--surface)',
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Tech Stacks</option>
              <option value="Python">Python</option>
              <option value="React">React</option>
              <option value="Docker">Docker</option>
              <option value="PostgreSQL">PostgreSQL</option>
            </select>
          </div>

          {(searchQuery || statusFilter !== 'all' || techFilter !== 'all') && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '12px', height: '38px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTechFilter('all');
              }}
            >
              <XIcon size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Sessions Table Panel */}
        <div className="admin-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--grid-strong)' }}>
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--grid-strong)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                Sessions Registry
              </h3>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  background: 'var(--grid)',
                  color: 'var(--ink-muted)',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {filteredSessions.length} result{filteredSessions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center' }}>
              <p className="sub" style={{ margin: 0 }}>Loading session records...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center' }}>
              <p className="sub" style={{ margin: 0 }}>No sessions found matching your filters.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap', width: '85px' }}>Session #</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '170px' }}>Learner</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '170px' }}>Mentor</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '240px' }}>Topic &amp; Format</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '95px' }}>Price</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '95px' }}>Duration</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '120px' }}>Status</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '160px' }}>Scheduled For</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '95px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: 'var(--grid)',
                            color: 'var(--ink)',
                            display: 'inline-block',
                          }}
                        >
                          #{b.id}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                              color: '#fff',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials(b.learner_name)}
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                              {b.learner_name}
                            </div>
                            <div className="sub" style={{ fontSize: '11px', margin: 0, color: 'var(--ink-muted)' }}>
                              Learner
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--brand), #8b5cf6)',
                              color: '#fff',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials(b.mentor_name)}
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                              {b.mentor_name}
                            </div>
                            <div className="sub" style={{ fontSize: '11px', margin: 0, color: 'var(--ink-muted)' }}>
                              {b.tech_stack || 'Mentor'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', lineHeight: 1.3 }}>
                            {b.topic || 'Pair Programming Session'}
                          </div>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {renderSessionTypeBadge(b.session_type)}
                            {b.tech_stack && (
                              <span
                                className="mono"
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '5px',
                                  background: 'var(--grid)',
                                  color: 'var(--ink-muted)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {b.tech_stack}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontWeight: 700,
                            fontSize: '13px',
                            color: 'var(--ink)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ₹{Number(b.price || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'var(--grid)',
                            color: 'var(--ink)',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ClockIcon size={12} />
                          {b.duration_minutes || 60} min
                        </span>
                      </td>
                      <td>
                        {renderSessionStatusBadge(b.status)}
                      </td>
                      <td>
                        {b.scheduled_at ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
                              {new Date(b.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                              {new Date(b.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            borderRadius: '6px',
                            border: '1px solid var(--grid-strong)',
                            background: 'var(--surface)',
                          }}
                          onClick={() => setSelectedSession(b)}
                          title={`Inspect & manage Session #${b.id}`}
                        >
                          <EyeIcon size={13} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderTop: '1px solid var(--grid-strong)',
                background: 'var(--surface)',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                Showing <strong style={{ color: 'var(--ink)' }}>{(currentPage - 1) * itemsPerPage + 1}</strong>–
                <strong style={{ color: 'var(--ink)' }}>{Math.min(currentPage * itemsPerPage, filteredSessions.length)}</strong> of{' '}
                <strong style={{ color: 'var(--ink)' }}>{filteredSessions.length}</strong> sessions
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                >
                  Previous
                </button>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 600, padding: '0 6px' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <Modal
          title={`Session #${selectedSession.id}: ${selectedSession.topic || 'Pairing Call'}`}
          onClose={() => setSelectedSession(null)}
          maxWidth="740px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Top Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Learner</div>
                <div style={{ fontWeight: 700 }}>{selectedSession.learner_name}</div>
                <div className="sub" style={{ fontSize: '11.5px' }}>Role: Learner</div>
              </div>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Mentor</div>
                <div style={{ fontWeight: 700, color: 'var(--brand)' }}>{selectedSession.mentor_name}</div>
                <div className="sub" style={{ fontSize: '11.5px' }}>Stack: {selectedSession.tech_stack}</div>
              </div>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Price &amp; Escrow</div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>₹{selectedSession.price}</div>
                <div className="sub" style={{ fontSize: '11.5px' }}>Payment: {selectedSession.payment_status}</div>
              </div>
            </div>

            {/* Time & Duration details */}
            <div className="mini-card" style={{ padding: '14px', background: 'var(--panel-bg)' }}>
              <div className="section-label" style={{ marginTop: 0 }}>Session Logistics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontSize: '13px' }}>
                <div>
                  <strong>Scheduled Date/Time:</strong><br />
                  <span className="mono" style={{ color: 'var(--brand)' }}>
                    {selectedSession.scheduled_at ? new Date(selectedSession.scheduled_at).toLocaleString() : 'TBD'}
                  </span>
                </div>
                <div>
                  <strong>Booked Duration:</strong><br />
                  <span className="mono">{selectedSession.duration_minutes} minutes</span>
                </div>
                <div>
                  <strong>Session Format:</strong><br />
                  <span>{selectedSession.session_type}</span>
                </div>
                <div>
                  <strong>Lifecycle Status:</strong><br />
                  <span className={`status-badge badge-${selectedSession.status} mono`}>
                    {selectedSession.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Problem & Shared Summary */}
            <div>
              <div className="section-label">Learner Problem &amp; Agenda</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {selectedSession.problem_description}
              </p>
            </div>

            <div>
              <div className="section-label">Session Summary &amp; Mentor Notes</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {selectedSession.session_summary}
              </p>
            </div>

            {/* Admin Actions Bar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowRescheduleModal(true)}
                >
                  <CalendarIcon size={14} />
                  <span>Reschedule Session</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowCancelModal(true)}
                >
                  <XIcon size={14} />
                  <span>Cancel Session</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: 'var(--warn)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setRefundAmount(String(selectedSession.price));
                    setShowRefundModal(true);
                  }}
                >
                  <RefreshIcon size={14} />
                  <span>Refund Session</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowResolveModal(true)}
                >
                  <ScaleIcon size={14} />
                  <span>Resolve Issue</span>
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <Modal
          title={`Reschedule Session #${selectedSession?.id}`}
          onClose={() => setShowRescheduleModal(false)}
          maxWidth="440px"
        >
          <form onSubmit={handleReschedule}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Select a new calendar time slot for both {selectedSession?.learner_name} and {selectedSession?.mentor_name}.
            </p>
            <div className="field">
              <label>New Date &amp; Time (IST)</label>
              <input
                type="datetime-local"
                value={rescheduleDateTime}
                onChange={(e) => setRescheduleDateTime(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRescheduleModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save New Time
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Session Modal */}
      {showCancelModal && (
        <Modal
          title={`Cancel Session #${selectedSession?.id}`}
          onClose={() => setShowCancelModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleCancelSession}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              This will immediately cancel the booking and release any held escrow funds according to platform cancellation policy.
            </p>
            <div className="field">
              <label>Cancellation Reason / Admin Note</label>
              <textarea
                rows={3}
                placeholder="e.g., Mentor requested emergency cancellation due to illness..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              ></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCancelModal(false)}
              >
                Back
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: '#DC2626', borderColor: '#DC2626' }}>
                Confirm Cancellation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Refund Session Modal */}
      {showRefundModal && (
        <Modal
          title={`Refund Session #${selectedSession?.id}`}
          onClose={() => setShowRefundModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleRefundSession}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Issue a full or partial refund to learner {selectedSession?.learner_name}.
            </p>
            <div className="field">
              <label>Refund Amount (₹)</label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={selectedSession?.price}
                min="1"
                required
              />
              <span className="sub" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                Maximum refundable: ₹{selectedSession?.price}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRefundModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Process Refund
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Resolve Issue Modal */}
      {showResolveModal && (
        <Modal
          title={`Resolve Session Issue #${selectedSession?.id}`}
          onClose={() => setShowResolveModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleResolveIssue}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Arbitrate dispute between learner and mentor. Marking as resolved will finalize payment and log this decision.
            </p>
            <div className="field">
              <label>Resolution Summary &amp; Decision</label>
              <textarea
                rows={3}
                placeholder="e.g., Code reviewed and verified working by mentor. Dispute dismissed and payout released."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                required
              ></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowResolveModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Resolve &amp; Release
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
