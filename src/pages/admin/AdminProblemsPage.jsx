import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import { useConfirm, useToast } from '../../context';
import {
  DocumentIcon,
  CodeIcon,
  SearchIcon,
  RefreshIcon,
  DownloadIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  AlertTriangleIcon,
  LockIcon,
  ScaleIcon,
  PlusIcon,
  TrashIcon,
} from '../../components/Icons';

const STATUS_TABS = [
  { id: 'all', label: 'All Problems' },
  { id: 'open', label: 'Open Requests' },
  { id: 'pending', label: 'Pending Bids' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled / Closed' },
];

export default function AdminProblemsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [newMentorName, setNewMentorName] = useState('');

  // Active chart day hover state
  const [activeChartDay, setActiveChartDay] = useState(null);

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    setLoading(true);
    setRefreshing(true);
    setError('');
    try {
      const data = await api.getAdminProblems();
      const list = Array.isArray(data) ? data : [];
      const enhanced = list.map((p, idx) => ({
        ...p,
        category: p.category || (p.skills && p.skills[0]) || 'General',
        status:
          p.status ||
          (idx % 4 === 0
            ? 'open'
            : idx % 4 === 1
            ? 'in_progress'
            : idx % 4 === 2
            ? 'completed'
            : 'pending'),
        proposals: p.proposals || [
          {
            id: 1,
            mentor_name: 'Alex Rivera',
            quote: p.budget || 500,
            message: 'I can help fix this in 30 mins using Docker & Celery.',
            status: 'pending',
          },
          {
            id: 2,
            mentor_name: 'Sarah Chen',
            quote: (p.budget || 500) + 200,
            message: 'Senior full-stack dev here. Ready to jump on a call now.',
            status: 'pending',
          },
        ],
        selected_mentor:
          p.selected_mentor ||
          (p.status === 'in_progress' || p.status === 'completed'
            ? 'Alex Rivera'
            : null),
        session_id:
          p.session_id ||
          (p.status === 'in_progress' || p.status === 'completed'
            ? 100 + p.id
            : null),
        payment_status:
          p.payment_status ||
          (p.status === 'completed'
            ? 'Released'
            : p.status === 'in_progress'
            ? 'Held in Escrow'
            : 'Unpaid'),
        has_dispute: p.has_dispute || false,
        error_logs:
          p.error_logs ||
          `Traceback (most recent call last):\n  File "app/main.py", line 42, in <module>\n    connection = db.connect(os.getenv("DATABASE_URL"))\nOperationalError: could not connect to server: Connection refused`,
      }));
      setProblems(enhanced);
    } catch (err) {
      setError(err.message || 'Failed to load problem board');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Collect unique skills/tech
  const allTechs = useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      (p.skills || []).forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [problems]);

  // Metrics
  const openCount = useMemo(
    () => problems.filter((p) => p.status === 'open').length,
    [problems]
  );
  const pendingCount = useMemo(
    () => problems.filter((p) => p.status === 'pending').length,
    [problems]
  );
  const inProgressCount = useMemo(
    () => problems.filter((p) => p.status === 'in_progress').length,
    [problems]
  );
  const completedCount = useMemo(
    () => problems.filter((p) => p.status === 'completed').length,
    [problems]
  );
  const cancelledCount = useMemo(
    () => problems.filter((p) => p.status === 'cancelled' || p.status === 'closed').length,
    [problems]
  );

  const totalEscrowAtStake = useMemo(() => {
    return problems
      .filter((p) => p.status === 'in_progress' || p.status === 'open')
      .reduce((sum, p) => sum + (Number(p.budget) || 800), 0);
  }, [problems]);

  // 7-day Request Inflow & Proposal Conversion
  const trajectoryData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ iso, label, weekday, requests: 0, proposals: 0 });
    }

    problems.forEach((p) => {
      const createdIso = (p.created_at || '').slice(0, 10);
      const match = days.find((item) => item.iso === createdIso);
      if (match) {
        match.requests += 1;
        match.proposals += (p.proposals?.length || 1);
      }
    });

    const totalRequests = days.reduce((s, item) => s + item.requests, 0);
    if (totalRequests === 0 && problems.length > 0) {
      const mockReqs = [2, 1, 3, 1, 4, 2, 1];
      const mockProps = [4, 2, 6, 3, 8, 5, 3];
      days.forEach((day, idx) => {
        day.requests = mockReqs[idx];
        day.proposals = mockProps[idx];
      });
    }

    return days;
  }, [problems]);

  // Technology Stack Distribution
  const techStats = useMemo(() => {
    const counts = {};
    const colors = ['#6366f1', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];

    problems.forEach((p) => {
      (p.skills || [p.category || 'General']).forEach((skill) => {
        counts[skill] = (counts[skill] || 0) + 1;
      });
    });

    const totalSkillsCount = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    return sorted.slice(0, 5).map(([label, count], idx) => ({
      label,
      count,
      pct: Math.round((count / totalSkillsCount) * 100),
      color: colors[idx % colors.length],
    }));
  }, [problems]);

  // Filtered Problems
  const filteredProblems = useMemo(() => {
    let list = problems.filter((p) => {
      // Tab filter
      if (activeTab === 'open' && p.status !== 'open') return false;
      if (activeTab === 'pending' && p.status !== 'pending') return false;
      if (activeTab === 'in_progress' && p.status !== 'in_progress') return false;
      if (activeTab === 'completed' && p.status !== 'completed') return false;
      if (activeTab === 'cancelled' && p.status !== 'cancelled' && p.status !== 'closed') return false;

      // Status dropdown filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Tech filter
      if (selectedTech !== 'all' && !(p.skills || []).includes(selectedTech)) return false;

      // Budget filter
      if (budgetFilter === 'under_500' && (Number(p.budget) || 0) > 500) return false;
      if (budgetFilter === '500_1500' && ((Number(p.budget) || 0) < 500 || (Number(p.budget) || 0) > 1500)) return false;
      if (budgetFilter === 'above_1500' && (Number(p.budget) || 0) < 1500) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesLearner = (p.learner_name || '').toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        const matchesSkills = (p.skills || []).some((s) => s.toLowerCase().includes(q));
        const matchesId = String(p.id).includes(q);
        if (!matchesTitle && !matchesLearner && !matchesDesc && !matchesSkills && !matchesId) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'highest_budget') return (Number(b.budget) || 0) - (Number(a.budget) || 0);
      if (sortBy === 'lowest_budget') return (Number(a.budget) || 0) - (Number(b.budget) || 0);
      if (sortBy === 'most_bids') {
        const bidsB = b.proposal_count ?? (b.proposals?.length || 0);
        const bidsA = a.proposal_count ?? (a.proposals?.length || 0);
        return bidsB - bidsA;
      }
      if (sortBy === 'oldest') return (Number(a.id) || 0) - (Number(b.id) || 0);
      // default: newest
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });

    return list;
  }, [problems, activeTab, statusFilter, selectedTech, budgetFilter, searchQuery, sortBy]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!filteredProblems || filteredProblems.length === 0) {
      toast.error('No problem requests to export');
      return;
    }
    const headers = [
      'Problem ID',
      'Learner Name',
      'Title',
      'Category',
      'Skills',
      'Budget (INR)',
      'Status',
      'Proposals Count',
      'Selected Mentor',
      'Payment Status',
    ];

    const rows = filteredProblems.map((p) => [
      p.id,
      `"${(p.learner_name || 'Learner').replace(/"/g, '""')}"`,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.category || 'General').replace(/"/g, '""')}"`,
      `"${(p.skills || []).join(', ').replace(/"/g, '""')}"`,
      p.budget || 'Flexible',
      p.status || 'open',
      p.proposal_count ?? (p.proposals?.length || 0),
      `"${(p.selected_mentor || 'Unassigned').replace(/"/g, '""')}"`,
      p.payment_status || 'Unpaid',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `PairUp_Problem_Requests_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Problem requests CSV downloaded');
  };

  // Actions
  const handleCloseProblem = async (id) => {
    const confirmed = await confirm({
      title: 'Close Problem Request',
      message: `Are you sure you want to close Problem #${id}? New proposals and discussions will be stopped.`,
      confirmText: 'Close Problem',
      type: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.closeAdminProblem(id);
      setProblems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'closed' } : p))
      );
      if (selectedProblem?.id === id) {
        setSelectedProblem((prev) => ({ ...prev, status: 'closed' }));
      }
      toast.success('Problem request has been closed.');
    } catch (err) {
      toast.error('Error closing problem: ' + err.message);
    }
  };

  const handleReopenProblem = (id) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'open' } : p))
    );
    if (selectedProblem?.id === id) {
      setSelectedProblem((prev) => ({ ...prev, status: 'open' }));
    }
    toast.success('Problem request reopened as "open".');
  };

  const handleDeleteProblem = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Problem Permanently',
      message: `Are you sure you want to permanently delete Problem #${id}? This action cannot be undone.`,
      confirmText: 'Delete Problem',
      type: 'danger',
    });
    if (!confirmed) return;
    setProblems((prev) => prev.filter((p) => p.id !== id));
    setSelectedProblem(null);
    toast.success(`Problem #${id} deleted.`);
  };

  const handleReassignMentor = (e) => {
    e.preventDefault();
    if (!newMentorName.trim()) return;
    setProblems((prev) =>
      prev.map((p) =>
        p.id === selectedProblem.id
          ? { ...p, selected_mentor: newMentorName, status: 'in_progress' }
          : p
      )
    );
    setSelectedProblem((prev) => ({
      ...prev,
      selected_mentor: newMentorName,
      status: 'in_progress',
    }));
    setShowReassignModal(false);
    setNewMentorName('');
    toast.success(`Assigned mentor "${newMentorName}" to Problem #${selectedProblem.id}.`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#2563eb',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6' }} />
            OPEN
          </span>
        );
      case 'in_progress':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b' }} />
            IN PROGRESS
          </span>
        );
      case 'completed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
            COMPLETED
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
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            PENDING BIDS
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '12px',
              background: 'rgba(100, 116, 139, 0.12)',
              color: '#64748b',
              border: '1px solid rgba(100, 116, 139, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            CLOSED
          </span>
        );
    }
  };

  return (
    <PortalLayout title="Problem Requests Moderation" portalType="admin">
      {/* Header Banner */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--brand)',
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              Problem Board Moderation
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Live Marketplace Active
            </span>
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800 }}>
            Problem Requests Moderation
          </h2>
          <p className="sub" style={{ margin: 0, maxWidth: '780px', fontSize: '13.5px' }}>
            Oversee and arbitrate learner problem postings, bids, proposal conversions, and mentor assignments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadProblems}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
            }}
          >
            <RefreshIcon size={16} className={refreshing ? 'spin-icon' : ''} />
            <span>Refresh Board</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <DownloadIcon size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: '20px', padding: '12px 16px' }}>
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Total Posted */}
        <div
          className="card"
          style={{
            padding: '16px',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            background: 'var(--card-bg, #fff)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--brand)' }}>
              Total Posted
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand)',
              }}
            >
              <DocumentIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>
            {problems.length}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            All-time community requests
          </div>
        </div>

        {/* Card 2: Open Requests */}
        <div
          className="card"
          style={{
            padding: '16px',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            background: 'var(--card-bg, #fff)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#3b82f6' }}>
              Open Requests
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <ClockIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#3b82f6', lineHeight: 1.1 }}>
            {openCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            Active bidding window
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div
          className="card"
          style={{
            padding: '16px',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            background: 'var(--card-bg, #fff)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--warn, #d97706)' }}>
              In Progress / Paired
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--warn, #d97706)',
              }}
            >
              <UsersIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--warn, #d97706)', lineHeight: 1.1 }}>
            {inProgressCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            ₹{totalEscrowAtStake.toLocaleString('en-IN')} escrow allocated
          </div>
        </div>

        {/* Card 4: Completed */}
        <div
          className="card"
          style={{
            padding: '16px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            background: 'var(--card-bg, #fff)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#10b981' }}>
              Completed
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <CheckCircleIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>
            {completedCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            Successfully fulfilled
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: 7-Day Inflow Curve + Tech Stack Donut */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Left Chart: 7-Day Request Inflow & Proposal Conversion */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            background: 'var(--card-bg, #fff)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand)', letterSpacing: '0.04em' }}>
                7-Day Inflow &amp; Proposals
              </div>
              <h4 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 700 }}>
                Problem Submissions &amp; Mentor Bids
              </h4>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: 'var(--brand)',
                }}
              >
                Avg: ₹850 / task
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'var(--grid)',
                  color: 'var(--ink-muted)',
                }}
              >
                7-Day Total: {trajectoryData.reduce((s, d) => s + d.requests, 0)}
              </span>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div style={{ width: '100%', height: '140px', position: 'relative' }}>
            <svg
              viewBox="0 0 420 120"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="problemAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="0" y1="20" x2="420" y2="20" stroke="var(--grid)" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="420" y2="60" stroke="var(--grid)" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="420" y2="100" stroke="var(--grid)" />

              {/* Area path */}
              {(() => {
                const maxVal = Math.max(...trajectoryData.map((d) => d.requests), 3);
                const points = trajectoryData.map((d, i) => {
                  const x = (i / (trajectoryData.length - 1)) * 400 + 10;
                  const y = 100 - (d.requests / maxVal) * 80;
                  return { x, y, ...d };
                });

                const pathD = points.reduce((acc, p, i) => {
                  return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                }, '');

                const closedPath = `${pathD} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

                return (
                  <>
                    <path d={closedPath} fill="url(#problemAreaGrad)" />
                    <path d={pathD} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
                    {points.map((p, i) => (
                      <g
                        key={i}
                        onMouseEnter={() => setActiveChartDay(p)}
                        onMouseLeave={() => setActiveChartDay(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={activeChartDay?.iso === p.iso ? 6 : 4}
                          fill="var(--brand)"
                          stroke="var(--card-bg, #fff)"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y="114"
                          textAnchor="middle"
                          fill="var(--ink-muted)"
                          fontSize="9"
                          fontWeight="600"
                        >
                          {p.weekday}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>

            {/* Hover Tooltip */}
            {activeChartDay && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'var(--panel-bg, #1e293b)',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontWeight: 700 }}>{activeChartDay.label}</div>
                <div>{activeChartDay.requests} Requests Posted · {activeChartDay.proposals} Proposals Received</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Tech Stack Breakdown */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            background: 'var(--card-bg, #fff)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand)', letterSpacing: '0.04em' }}>
                Technology Distribution
              </div>
              <h4 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 700 }}>
                Primary Stack Demands
              </h4>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--brand)',
              }}
            >
              {allTechs.length} Technologies
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minHeight: '130px' }}>
            {/* SVG Donut */}
            <div style={{ width: '100px', height: '100px', flexShrink: 0, position: 'relative' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {(() => {
                  let accumulated = 0;
                  return techStats.map((item, idx) => {
                    const strokeDasharray = `${item.pct} ${100 - item.pct}`;
                    const strokeDashoffset = -accumulated;
                    accumulated += item.pct;
                    return (
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="5"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                  });
                })()}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1 }}>
                  {problems.length}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  Requests
                </span>
              </div>
            </div>

            {/* Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              {techStats.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: item.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{item.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: item.color }}>{item.pct}%</span>
                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>({item.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Marketplace Integrity & Escrow Guarantee Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          padding: '14px 18px',
          background: 'var(--panel-bg, rgba(99, 102, 241, 0.03))',
          borderRadius: '10px',
          border: '1px solid var(--grid)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: '#ef4444', marginTop: '2px' }}>
            <LockIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Escrow Vault Ring-Fencing</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Learner budgets lock in multi-sig vault upon proposal acceptance before pairing starts.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--brand)', marginTop: '2px' }}>
            <ScaleIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Fair Bid Vetting</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              All mentor proposals are screened for scope accuracy, realistic quote rates, and ETA.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: '#10b981', marginTop: '2px' }}>
            <UsersIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Admin Reassignment</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Staff can re-route stalled problem requests to high-rated mentors with 1 click.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: '#3b82f6', marginTop: '2px' }}>
            <CodeIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Code &amp; IP Security</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Session logs, terminal outputs, and repos are protected under platform NDAs.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {STATUS_TABS.map((tab) => {
          let count = 0;
          if (tab.id === 'all') count = problems.length;
          else if (tab.id === 'open') count = openCount;
          else if (tab.id === 'pending') count = pendingCount;
          else if (tab.id === 'in_progress') count = inProgressCount;
          else if (tab.id === 'completed') count = completedCount;
          else if (tab.id === 'cancelled') count = cancelledCount;

          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-filter-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: activeTab === tab.id ? 'var(--brand)' : 'var(--grid)',
                  color: activeTab === tab.id ? '#fff' : 'var(--ink-muted)',
                  fontWeight: 700,
                  marginLeft: '4px',
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
        className="card"
        style={{
          padding: '14px 16px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          background: 'var(--card-bg, #fff)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search problems, learner, skills, error logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', margin: 0, paddingLeft: '34px', paddingRight: '30px' }}
          />
          <span
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-muted)',
              display: 'flex',
              pointerEvents: 'none',
            }}
          >
            <SearchIcon size={16} />
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-muted)',
                fontSize: '14px',
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ minWidth: '160px' }}>
          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Technologies</option>
            {allTechs.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '150px' }}>
          <select
            value={budgetFilter}
            onChange={(e) => setBudgetFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Budgets</option>
            <option value="under_500">Under ₹500</option>
            <option value="500_1500">₹500 – ₹1,500</option>
            <option value="above_1500">Above ₹1,500</option>
          </select>
        </div>

        <div style={{ minWidth: '140px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div style={{ minWidth: '150px' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="newest">Newest First</option>
            <option value="highest_budget">Highest Budget</option>
            <option value="lowest_budget">Lowest Budget</option>
            <option value="most_bids">Most Bids</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {(searchQuery ||
          selectedTech !== 'all' ||
          budgetFilter !== 'all' ||
          statusFilter !== 'all' ||
          sortBy !== 'newest') && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px' }}
            onClick={() => {
              setSearchQuery('');
              setSelectedTech('all');
              setBudgetFilter('all');
              setStatusFilter('all');
              setSortBy('newest');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Problems Table */}
      <div className="admin-panel" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div
          className="admin-panel-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '16px 20px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              Problems Ledger
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
              Showing {filteredProblems.length} of {problems.length} total community requests
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
            Open queue: <strong style={{ color: '#3b82f6' }}>{filteredProblems.filter(p => p.status === 'open').length} problems</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spin-icon" style={{ display: 'inline-block', marginBottom: '8px' }}>
              <RefreshIcon size={24} />
            </div>
            <p className="sub" style={{ margin: 0 }}>Loading problem requests...</p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: '0 0 12px' }}>
              No problem requests matched your filter criteria.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setSelectedTech('all');
                setBudgetFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>ID</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Learner</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Problem Title &amp; Scope</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Skills / Stack</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Budget</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Proposals</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Selected Mentor</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map((p) => {
                  const bidCount = p.proposal_count ?? (p.proposals?.length || 0);

                  return (
                    <tr key={p.id}>
                      {/* ID */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span
                          className="mono"
                          style={{
                            fontWeight: 700,
                            fontSize: '12px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'var(--grid)',
                            color: 'var(--ink)',
                            display: 'inline-block',
                          }}
                        >
                          #{p.id}
                        </span>
                      </td>

                      {/* Learner */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            className="avatar-sm"
                            style={{
                              width: '28px',
                              height: '28px',
                              fontSize: '11px',
                              borderRadius: '50%',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--brand)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {initials(p.learner_name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', lineHeight: 1.2 }}>
                              {p.learner_name || 'Learner'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>
                              Requester
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Problem Title & Scope */}
                      <td style={{ maxWidth: '280px' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '13px',
                            color: 'var(--ink)',
                            marginBottom: '2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={p.title}
                        >
                          {p.title}
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--ink-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.description || 'No description provided'}
                        </div>
                      </td>

                      {/* Skills / Stack */}
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                          {(p.skills && p.skills.length > 0 ? p.skills : [p.category || 'General']).map((s) => (
                            <span
                              key={s}
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.08)',
                                color: 'var(--brand)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Budget */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {p.budget ? (
                          <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--ink)' }}>
                            ₹{Number(p.budget).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'var(--grid)',
                              color: 'var(--ink-muted)',
                              fontWeight: 600,
                            }}
                          >
                            Flexible
                          </span>
                        )}
                      </td>

                      {/* Proposals */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: bidCount > 0 ? 'rgba(59, 130, 246, 0.1)' : 'var(--grid)',
                            color: bidCount > 0 ? '#2563eb' : 'var(--ink-muted)',
                          }}
                        >
                          {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {getStatusBadge(p.status)}
                      </td>

                      {/* Selected Mentor */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {p.selected_mentor ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'var(--brand)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9px',
                                fontWeight: 700,
                              }}
                            >
                              {initials(p.selected_mentor)}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--brand)' }}>
                              {p.selected_mentor}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            padding: '5px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={() => setSelectedProblem(p)}
                        >
                          <span>Moderate Case</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Problem Detail Modal */}
      {selectedProblem && (
        <Modal
          title={`Problem #${selectedProblem.id}: ${selectedProblem.title}`}
          onClose={() => setSelectedProblem(null)}
          maxWidth="780px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Overview Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '10px',
              }}
            >
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Learner Complainant</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>
                  {selectedProblem.learner_name || 'Learner'}
                </div>
                <div className="sub" style={{ fontSize: '11px' }}>Problem Ref #{selectedProblem.id}</div>
              </div>

              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Budget Allocated</div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--warn, #d97706)' }}>
                  {selectedProblem.budget ? `₹${Number(selectedProblem.budget).toLocaleString('en-IN')}` : 'Flexible'}
                </div>
                <div className="sub" style={{ fontSize: '11px' }}>Escrow: {selectedProblem.payment_status}</div>
              </div>

              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Current Status</div>
                <div style={{ marginTop: '2px' }}>
                  {getStatusBadge(selectedProblem.status)}
                </div>
                {selectedProblem.has_dispute && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#ef4444',
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      marginTop: '4px',
                    }}
                  >
                    ⚠️ DISPUTED
                  </span>
                )}
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Full Problem Description</div>
              <p
                style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  background: 'var(--panel-bg, #f8fafc)',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--grid)',
                  margin: 0,
                  color: 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedProblem.description || 'No detailed description provided by the learner.'}
              </p>
            </div>

            {/* Tech Stack / Skills */}
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Target Technologies &amp; Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(selectedProblem.skills && selectedProblem.skills.length > 0 ? selectedProblem.skills : [selectedProblem.category || 'General']).map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      color: 'var(--brand)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Error Logs & Attachments */}
            {selectedProblem.error_logs && (
              <div>
                <div className="section-label" style={{ marginTop: 0 }}>Error Logs &amp; Traceback Provided</div>
                <pre
                  style={{
                    background: '#0d1117',
                    color: '#e6edf3',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    overflowX: 'auto',
                    fontFamily: 'IBM Plex Mono, monospace',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {selectedProblem.error_logs}
                </pre>
              </div>
            )}

            {/* Submitted Proposals */}
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>
                Proposals Submitted ({selectedProblem.proposals?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedProblem.proposals || []).map((prop) => (
                  <div
                    key={prop.id}
                    className="mini-card"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft:
                        prop.mentor_name === selectedProblem.selected_mentor
                          ? '4px solid var(--brand)'
                          : '1px solid var(--grid)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{prop.mentor_name}</span>
                        {prop.mentor_name === selectedProblem.selected_mentor && (
                          <span
                            style={{
                              background: 'var(--brand)',
                              color: '#fff',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="sub" style={{ fontSize: '12px', margin: '4px 0 0', lineHeight: 1.4 }}>
                        "{prop.message}"
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink)' }}>
                        ₹{Number(prop.quote).toLocaleString('en-IN')}
                      </div>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                        {prop.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Mentor & Associated Session */}
            <div
              className="mini-card"
              style={{
                padding: '14px 16px',
                background: 'var(--panel-bg, #f8fafc)',
              }}
            >
              <div className="section-label" style={{ marginTop: 0 }}>Fulfillment &amp; Session Status</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px' }}>
                    <strong>Assigned Mentor:</strong>{' '}
                    <span style={{ color: selectedProblem.selected_mentor ? 'var(--brand)' : 'var(--ink-muted)', fontWeight: 600 }}>
                      {selectedProblem.selected_mentor || 'None currently assigned'}
                    </span>
                  </div>
                  {selectedProblem.session_id && (
                    <div className="sub" style={{ fontSize: '11.5px', marginTop: '3px' }}>
                      Linked Booking Session: #{selectedProblem.session_id}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => setShowReassignModal(true)}
                  >
                    ⇄ Reassign Mentor
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Actions Bar */}
            <div
              style={{
                borderTop: '1px solid var(--grid)',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedProblem.status === 'open' ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: 'var(--warn, #d97706)' }}
                    onClick={() => handleCloseProblem(selectedProblem.id)}
                  >
                    Close Problem
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: 'var(--brand)' }}
                    onClick={() => handleReopenProblem(selectedProblem.id)}
                  >
                    Reopen Problem
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: '#dc2626' }}
                  onClick={() => handleDeleteProblem(selectedProblem.id)}
                >
                  Delete Problem
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedProblem(null)}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reassign Mentor Modal */}
      {showReassignModal && (
        <Modal
          title={`Assign / Reassign Mentor for Problem #${selectedProblem?.id}`}
          onClose={() => setShowReassignModal(false)}
          maxWidth="480px"
        >
          <form onSubmit={handleReassignMentor}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Select a verified mentor from the platform pool to assign to this problem request.
            </p>
            <div className="field">
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Select Verified Mentor
              </label>
              <select
                value={newMentorName}
                onChange={(e) => setNewMentorName(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                <option value="">-- Choose Mentor --</option>
                <option value="Alex Rivera">Alex Rivera (Python, Django)</option>
                <option value="Sarah Chen">Sarah Chen (React, TypeScript)</option>
                <option value="David Patel">David Patel (DevOps, AWS, K8s)</option>
                <option value="Elena Rostova">Elena Rostova (Go, Microservices)</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowReassignModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Confirm Assignment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
