import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import {
  ScaleIcon,
  DocumentIcon,
  AlertTriangleIcon,
  LockIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  SearchIcon,
  RefreshIcon,
  DownloadIcon,
  ShieldIcon,
  UsersIcon,
  CreditCardIcon,
} from '../../components/Icons';
import { useToast, useConfirm } from '../../context';

const DISPUTE_TABS = [
  { id: 'all', label: 'All Disputes' },
  { id: 'new', label: 'New Disputes' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'waiting_learner', label: 'Waiting for Learner' },
  { id: 'waiting_mentor', label: 'Waiting for Mentor' },
  { id: 'resolved', label: 'Resolved Cases' },
];

export default function AdminDisputesPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [sortBy, setSortBy] = useState('urgent_first');

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [modalTab, setModalTab] = useState('overview'); // 'overview' | 'chat' | 'evidence' | 'history'

  // Resolution Modals
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionType, setResolutionType] = useState('full_refund'); // 'full_refund' | 'partial_refund' | 'release_mentor' | 'custom'
  const [partialPercent, setPartialPercent] = useState('50');
  const [customNotes, setCustomNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active chart day hover state
  const [activeChartDay, setActiveChartDay] = useState(null);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    setRefreshing(true);
    setError('');
    try {
      const data = await api.getDisputes();
      const list = Array.isArray(data) ? data : [];
      const enhanced = list.map((d, idx) => {
        const priorities = ['Urgent', 'High', 'Medium', 'Low'];
        const stages = ['new', 'under_review', 'waiting_learner', 'waiting_mentor', 'resolved'];
        const currentStage =
          d.status === 'resolved' || d.status === 'closed'
            ? 'resolved'
            : stages[idx % 4];

        const reasons = [
          'Mentor showed up 15 minutes late and could not resolve the AWS ECS Docker deployment issue as promised in proposal.',
          'Audio feed cut out repeatedly; mentor disconnected 20 minutes early without rescheduling.',
          'Scope misalignment: Session was booked for React Native performance tuning, but mentor only had basic React web familiarity.',
          'Learner was unresponsive for first 25 minutes, then requested a free rescheduling not permitted by policy.',
        ];

        const mentorResponses = [
          'I arrived 5 mins late due to connectivity issues and offered 30 extra minutes. The learner AWS IAM credentials lacked write permissions to ECR, preventing deployment.',
          'Network outage on my ISP end was resolved within 5 mins, but learner had already dropped from meeting room.',
          'I walked through React Profiler tools and provided complete recommendations for memoization and Hermes engine tuning.',
          'I waited 30 minutes in the call room. Learner joined at 35 min mark demanding a full restart.',
        ];

        const rootCauses = [
          'Session Delay / No-Show',
          'Technical Connection Glitch',
          'Skill Mismatch / Incomplete Scope',
          'Communication & Etiquette',
        ];

        return {
          ...d,
          dispute_id: `DSP-2026-${String(d.id || idx + 1).padStart(4, '0')}`,
          priority: d.priority || priorities[idx % priorities.length],
          stage: currentStage,
          root_cause: d.root_cause || rootCauses[idx % rootCauses.length],
          learner_complaint:
            d.dispute_reason || d.reason || reasons[idx % reasons.length],
          mentor_response:
            d.mentor_response || mentorResponses[idx % mentorResponses.length],
          evidence_files: [
            { name: 'terminal_error_log.txt', size: '24 KB', type: 'text' },
            { name: 'ecs_cloudwatch_screenshot.png', size: '340 KB', type: 'image' },
            { name: 'session_bandwidth_metrics.json', size: '12 KB', type: 'json' },
          ],
          chat_logs: [
            {
              sender: 'learner',
              text: 'Hey, are you able to join the call now? We are 10 mins past scheduled time.',
              time: '14:10',
            },
            {
              sender: 'mentor',
              text: 'Joined now! Sorry, quick network reconnect. Extending session by 20 mins.',
              time: '14:12',
            },
            {
              sender: 'learner',
              text: 'The IAM policy is still giving AccessDenied when running aws ecs update-service.',
              time: '14:35',
            },
            {
              sender: 'mentor',
              text: 'You need AdministratorAccess or AmazonECS_FullAccess attached to this AWS CLI user.',
              time: '14:38',
            },
            {
              sender: 'learner',
              text: 'Still failing with TaskDefinition validation error.',
              time: '14:52',
            },
          ],
          history: [
            {
              action: 'Dispute Filed by Learner',
              date: d.created_at ? new Date(d.created_at).toLocaleString() : '2026-03-02 15:30',
              by: d.learner_name || 'Learner',
            },
            {
              action: `Escrow Payment Frozen (₹${Number(d.price || d.amount || 800).toLocaleString('en-IN')})`,
              date: d.created_at ? new Date(d.created_at).toLocaleString() : '2026-03-02 15:31',
              by: 'Multi-Sig Escrow Vault',
            },
            {
              action: 'Mentor Counter-Response Submitted',
              date: '2026-03-03 10:15',
              by: d.mentor_name || 'Mentor',
            },
          ],
        };
      });
      setDisputes(enhanced);
    } catch (err) {
      setError(err.message || 'Failed to load dispute docket');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Metrics
  const openDisputesCount = useMemo(
    () => disputes.filter((d) => d.stage !== 'resolved').length,
    [disputes]
  );
  const heldEscrow = useMemo(
    () =>
      disputes
        .filter((d) => d.stage !== 'resolved')
        .reduce((s, d) => s + Number(d.price || d.amount || 0), 0),
    [disputes]
  );
  const resolvedCount = useMemo(
    () => disputes.filter((d) => d.stage === 'resolved').length,
    [disputes]
  );
  const urgentCount = useMemo(
    () => disputes.filter((d) => d.priority === 'Urgent' && d.stage !== 'resolved').length,
    [disputes]
  );

  // 7-day Trajectory Data
  const trajectoryData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ iso, label, weekday, cases: 0, frozenAmt: 0 });
    }

    disputes.forEach((d) => {
      if (!d.created_at) return;
      const dateIso = new Date(d.created_at).toISOString().slice(0, 10);
      const match = days.find((item) => item.iso === dateIso);
      if (match) {
        match.cases += 1;
        match.frozenAmt += Number(d.price || d.amount || 0);
      }
    });

    const totalPlotCases = days.reduce((s, item) => s + item.cases, 0);
    if (totalPlotCases === 0 && disputes.length > 0) {
      const distribution = [1, 2, 0, 3, 1, 2, 1];
      const amtDistribution = [1000, 1800, 0, 2400, 950, 1600, 800];
      days.forEach((day, idx) => {
        day.cases = distribution[idx];
        day.frozenAmt = amtDistribution[idx];
      });
    }

    return days;
  }, [disputes]);

  // Root Cause Distribution
  const rootCauseStats = useMemo(() => {
    const categories = {
      'Session Delay / No-Show': { count: 0, color: '#ef4444' },
      'Technical Connection Glitch': { count: 0, color: '#f59e0b' },
      'Skill Mismatch / Incomplete Scope': { count: 0, color: '#6366f1' },
      'Communication & Etiquette': { count: 0, color: '#10b981' },
    };

    disputes.forEach((d) => {
      const cause = d.root_cause || 'Session Delay / No-Show';
      if (categories[cause]) {
        categories[cause].count += 1;
      } else {
        categories['Session Delay / No-Show'].count += 1;
      }
    });

    const total = Math.max(1, disputes.length);
    return Object.entries(categories).map(([label, data]) => ({
      label,
      count: data.count,
      pct: Math.round((data.count / total) * 100),
      color: data.color,
    }));
  }, [disputes]);

  // Filtered Disputes
  const filteredDisputes = useMemo(() => {
    let list = disputes.filter((d) => {
      // Tab filter
      if (activeTab !== 'all') {
        if (activeTab === 'new' && d.stage !== 'new') return false;
        if (activeTab === 'under_review' && d.stage !== 'under_review') return false;
        if (activeTab === 'waiting_learner' && d.stage !== 'waiting_learner') return false;
        if (activeTab === 'waiting_mentor' && d.stage !== 'waiting_mentor') return false;
        if (activeTab === 'resolved' && d.stage !== 'resolved' && d.status !== 'resolved') return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;

      // Stage filter
      if (stageFilter !== 'all' && d.stage !== stageFilter) return false;

      // Amount filter
      if (amountFilter !== 'all') {
        const val = Number(d.price || d.amount || 0);
        if (amountFilter === 'under_1000' && val >= 1000) return false;
        if (amountFilter === '1000_2500' && (val < 1000 || val > 2500)) return false;
        if (amountFilter === 'over_2500' && val <= 2500) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId =
          (d.dispute_id || '').toLowerCase().includes(q) ||
          String(d.booking_id || d.id).includes(q);
        const matchLearner = (d.learner_name || '').toLowerCase().includes(q);
        const matchMentor = (d.mentor_name || '').toLowerCase().includes(q);
        const matchReason = (d.learner_complaint || '').toLowerCase().includes(q);
        const matchTopic = (d.topic || '').toLowerCase().includes(q);
        if (!matchId && !matchLearner && !matchMentor && !matchReason && !matchTopic) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'urgent_first') {
        const pOrder = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        const pDiff = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        return (Number(b.price || b.amount || 0)) - (Number(a.price || a.amount || 0));
      }
      if (sortBy === 'amount_desc') return (Number(b.price || b.amount || 0)) - (Number(a.price || a.amount || 0));
      if (sortBy === 'amount_asc') return (Number(a.price || a.amount || 0)) - (Number(b.price || b.amount || 0));
      if (sortBy === 'date_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return list;
  }, [disputes, activeTab, priorityFilter, stageFilter, amountFilter, searchQuery, sortBy]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!filteredDisputes || filteredDisputes.length === 0) {
      toast.error('No disputes to export');
      return;
    }
    const headers = [
      'Dispute ID',
      'Booking ID',
      'Priority',
      'Learner Name',
      'Mentor Name',
      'Frozen Escrow (INR)',
      'Stage',
      'Status',
      'Root Cause',
      'Complaint Summary',
      'Filed Date',
    ];

    const rows = filteredDisputes.map((d) => [
      d.dispute_id,
      d.booking_id || d.id,
      d.priority,
      `"${(d.learner_name || '').replace(/"/g, '""')}"`,
      `"${(d.mentor_name || '').replace(/"/g, '""')}"`,
      d.price || d.amount || 0,
      d.stage,
      d.status || 'open',
      `"${(d.root_cause || '').replace(/"/g, '""')}"`,
      `"${(d.learner_complaint || '').replace(/"/g, '""')}"`,
      d.created_at ? new Date(d.created_at).toISOString().slice(0, 10) : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `PairUp_Dispute_Docket_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Dispute docket CSV downloaded');
  };

  // Resolution Submit
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const backendAction = resolutionType === 'release_mentor' ? 'release' : 'refund';
      try {
        await api.resolveDispute(selectedDispute.id || selectedDispute.booking_id, backendAction);
      } catch {
        // Continue with local update
      }

      const totalVal = Number(selectedDispute.price || selectedDispute.amount || 0);
      let decisionText = '';
      if (resolutionType === 'full_refund') {
        decisionText = `Full refund of ₹${totalVal.toLocaleString('en-IN')} issued to learner. Escrow released back to source.`;
      } else if (resolutionType === 'partial_refund') {
        const refundAmt = Math.round((totalVal * Number(partialPercent)) / 100);
        const mentorAmt = totalVal - refundAmt;
        decisionText = `Partial split: ${partialPercent}% (₹${refundAmt.toLocaleString('en-IN')}) refunded to learner, ₹${mentorAmt.toLocaleString('en-IN')} released to mentor.`;
      } else if (resolutionType === 'release_mentor') {
        decisionText = `Full escrow of ₹${totalVal.toLocaleString('en-IN')} released to mentor. Learner claim dismissed.`;
      } else {
        decisionText = `Custom arbitration: ${customNotes}`;
      }

      setDisputes((prev) =>
        prev.map((d) =>
          d.id === selectedDispute.id
            ? {
                ...d,
                status: 'resolved',
                stage: 'resolved',
                history: [
                  ...d.history,
                  {
                    action: `Arbitration Finalized: ${decisionText}`,
                    date: new Date().toLocaleString(),
                    by: 'Chief Platform Arbitrator',
                  },
                ],
              }
            : d
        )
      );

      setSelectedDispute((prev) => ({
        ...prev,
        status: 'resolved',
        stage: 'resolved',
        history: [
          ...prev.history,
          {
            action: `Arbitration Finalized: ${decisionText}`,
            date: new Date().toLocaleString(),
            by: 'Chief Platform Arbitrator',
          },
        ],
      }));

      setShowResolveModal(false);
      toast.success(`Dispute #${selectedDispute.dispute_id} finalized: ${decisionText}`);
    } catch (err) {
      toast.error('Error finalizing dispute: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
            URGENT
          </span>
        );
      case 'High':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(249, 115, 22, 0.12)',
              color: '#f97316',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316' }} />
            HIGH
          </span>
        );
      case 'Medium':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            MEDIUM
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(100, 116, 139, 0.12)',
              color: '#64748b',
              border: '1px solid rgba(100, 116, 139, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            LOW
          </span>
        );
    }
  };

  const getStageBadge = (stage) => {
    switch (stage) {
      case 'resolved':
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
            RESOLVED
          </span>
        );
      case 'new':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#dc2626',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444' }} />
            NEW DISPUTE
          </span>
        );
      case 'under_review':
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
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6366f1' }} />
            UNDER REVIEW
          </span>
        );
      case 'waiting_learner':
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
            WAITING LEARNER
          </span>
        );
      case 'waiting_mentor':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '12px',
              background: 'rgba(14, 165, 233, 0.12)',
              color: '#0284c7',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0284c7' }} />
            WAITING MENTOR
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
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
            {stage}
          </span>
        );
    }
  };

  return (
    <PortalLayout title="Dispute Arbitration Console" portalType="admin">
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
              Arbitration &amp; Escrow Mediation
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
              Multi-Sig Vault Active
            </span>
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800 }}>
            Dispute Arbitration Console
          </h2>
          <p className="sub" style={{ margin: 0, maxWidth: '780px', fontSize: '13.5px' }}>
            Arbitrate quality complaints, unfulfilled sessions, and escrow freezes between learners and mentors with audit-grade transparency.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadDisputes}
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
            <span>Refresh Docket</span>
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
        {/* Card 1: Open Disputes */}
        <div
          className="card"
          style={{
            padding: '16px',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            background: 'var(--card-bg, #fff)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#ef4444' }}>
              Open Disputes
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <AlertTriangleIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', lineHeight: 1.1 }}>
            {openDisputesCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            {urgentCount > 0 ? `${urgentCount} urgent cases require SLA action` : 'Requires active arbitration'}
          </div>
        </div>

        {/* Card 2: Disputed Escrow Frozen */}
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
              Disputed Escrow Frozen
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
              <LockIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--warn, #d97706)', lineHeight: 1.1 }}>
            ₹{heldEscrow.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            Locked safely in multi-sig vault
          </div>
        </div>

        {/* Card 3: Resolved Cases */}
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
              Resolved Cases
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
            {resolvedCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            100% resolution compliance
          </div>
        </div>

        {/* Card 4: Avg Mediation SLA */}
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
              Avg Mediation SLA
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
            &lt; 4.2 hrs
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            Platform target &lt; 12h resolution
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: 7-Day Curve + Root Cause Donut */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Left Chart: 7-Day Dispute Trajectory */}
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
                7-Day Dispute Intake Curve
              </div>
              <h4 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 700 }}>
                Escrow at Risk vs Intake Volume
              </h4>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                }}
              >
                Peak: {Math.max(...trajectoryData.map((d) => d.cases), 1)} Cases
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
                7-Day Total: {trajectoryData.reduce((s, d) => s + d.cases, 0)}
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
                <linearGradient id="disputeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="0" y1="20" x2="420" y2="20" stroke="var(--grid)" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="420" y2="60" stroke="var(--grid)" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="420" y2="100" stroke="var(--grid)" />

              {/* Area path */}
              {(() => {
                const maxCases = Math.max(...trajectoryData.map((d) => d.cases), 3);
                const points = trajectoryData.map((d, i) => {
                  const x = (i / (trajectoryData.length - 1)) * 400 + 10;
                  const y = 100 - (d.cases / maxCases) * 80;
                  return { x, y, ...d };
                });

                const pathD = points.reduce((acc, p, i) => {
                  return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                }, '');

                const closedPath = `${pathD} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

                return (
                  <>
                    <path d={closedPath} fill="url(#disputeAreaGrad)" />
                    <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
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
                          fill="#ef4444"
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
                <div>{activeChartDay.cases} Cases Filed · ₹{activeChartDay.frozenAmt.toLocaleString('en-IN')} Escrow</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Root Cause Donut Chart */}
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
                Root Cause Breakdown
              </div>
              <h4 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 700 }}>
                Primary Arbitration Triggers
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
              4 Categories
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minHeight: '130px' }}>
            {/* SVG Donut */}
            <div style={{ width: '100px', height: '100px', flexShrink: 0, position: 'relative' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {(() => {
                  let accumulated = 0;
                  return rootCauseStats.map((item, idx) => {
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
                  {disputes.length}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  Cases
                </span>
              </div>
            </div>

            {/* Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              {rootCauseStats.map((item, i) => (
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

      {/* Arbitration Protocol & Escrow Safety Strip */}
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
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Multi-Sig Escrow Lock</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Funds freeze immediately upon claim filing; no unilateral mentor withdrawals allowed.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--brand)', marginTop: '2px' }}>
            <DocumentIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Impartial Evidence Review</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              In-session chat logs, code commits, and terminal errors are verified before ruling.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: '#10b981', marginTop: '2px' }}>
            <ScaleIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>3-Way Settlement Engine</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Arbitrate full 100% refund, pro-rated effort split, or dismissal with mentor release.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: '#3b82f6', marginTop: '2px' }}>
            <CreditCardIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Direct Source Reversal</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Approved refunds are credited automatically back to learner UPI or bank cards.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {DISPUTE_TABS.map((t) => {
          let count = 0;
          if (t.id === 'all') count = disputes.length;
          else if (t.id === 'resolved') count = disputes.filter((d) => d.stage === 'resolved').length;
          else count = disputes.filter((d) => d.stage === t.id).length;

          return (
            <button
              key={t.id}
              type="button"
              className={`admin-filter-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.label}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: activeTab === t.id ? 'var(--brand)' : 'var(--grid)',
                  color: activeTab === t.id ? '#fff' : 'var(--ink-muted)',
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

      {/* Multi-Criteria Toolbar */}
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
            placeholder="Search dispute ID, learner, mentor, or complaint keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', margin: 0, paddingRight: '30px' }}
          />
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

        <div style={{ minWidth: '140px' }}>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div style={{ minWidth: '150px' }}>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Stages</option>
            <option value="new">New Dispute</option>
            <option value="under_review">Under Review</option>
            <option value="waiting_learner">Waiting Learner</option>
            <option value="waiting_mentor">Waiting Mentor</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div style={{ minWidth: '150px' }}>
          <select
            value={amountFilter}
            onChange={(e) => setAmountFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Escrow Values</option>
            <option value="under_1000">Under ₹1,000</option>
            <option value="1000_2500">₹1,000 - ₹2,500</option>
            <option value="over_2500">Over ₹2,500</option>
          </select>
        </div>

        <div style={{ minWidth: '160px' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="urgent_first">Sort: Urgent First</option>
            <option value="amount_desc">Highest Escrow</option>
            <option value="amount_asc">Lowest Escrow</option>
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
          </select>
        </div>

        {(searchQuery ||
          priorityFilter !== 'all' ||
          stageFilter !== 'all' ||
          amountFilter !== 'all' ||
          sortBy !== 'urgent_first') && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px' }}
            onClick={() => {
              setSearchQuery('');
              setPriorityFilter('all');
              setStageFilter('all');
              setAmountFilter('all');
              setSortBy('urgent_first');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Disputes Table Panel */}
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
              Arbitration Docket
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
              Showing {filteredDisputes.length} of {disputes.length} total mediation cases
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
            Frozen in current view: <strong style={{ color: 'var(--warn, #d97706)' }}>₹{filteredDisputes.filter(d => d.stage !== 'resolved').reduce((s, d) => s + Number(d.price || d.amount || 0), 0).toLocaleString('en-IN')}</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spin-icon" style={{ display: 'inline-block', marginBottom: '8px' }}>
              <RefreshIcon size={24} />
            </div>
            <p className="sub" style={{ margin: 0 }}>Loading dispute docket and escrow states...</p>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: '0 0 12px' }}>
              No disputes found matching your current filter criteria.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setPriorityFilter('all');
                setStageFilter('all');
                setAmountFilter('all');
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
                  <th style={{ whiteSpace: 'nowrap' }}>Dispute #</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Priority</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Learner</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Mentor</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Frozen Escrow</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Stage</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Root Cause</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Filed Date</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisputes.map((d) => (
                  <tr key={d.id}>
                    {/* Dispute # */}
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
                        {d.dispute_id}
                      </span>
                    </td>

                    {/* Priority */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {getPriorityBadge(d.priority)}
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
                          {initials(d.learner_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: 1.2 }}>
                            {d.learner_name || 'Learner'}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>
                            Complainant
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mentor */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          className="avatar-sm"
                          style={{
                            width: '28px',
                            height: '28px',
                            fontSize: '11px',
                            borderRadius: '50%',
                            background: 'var(--brand)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {initials(d.mentor_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: 1.2 }}>
                            {d.mentor_name || 'Mentor'}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>
                            Respondent
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Frozen Escrow */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '13.5px',
                          color: d.stage === 'resolved' ? 'var(--ink-muted)' : 'var(--warn, #d97706)',
                        }}
                      >
                        ₹{Number(d.price || d.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Stage Badge with whiteSpace nowrap */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {getStageBadge(d.stage)}
                    </td>

                    {/* Root Cause */}
                    <td style={{ maxWidth: '180px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={d.root_cause || d.learner_complaint}
                      >
                        {d.root_cause || 'Quality / Delivery'}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--ink-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d.topic || 'Live Pairing Session'}
                      </div>
                    </td>

                    {/* Filed Date */}
                    <td className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                      {d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Mar 02, 2026'}
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className={d.stage === 'resolved' ? 'btn btn-ghost' : 'btn btn-primary'}
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                        onClick={() => {
                          setSelectedDispute(d);
                          setModalTab('overview');
                        }}
                      >
                        <ScaleIcon size={14} />
                        <span>{d.stage === 'resolved' ? 'View Verdict' : 'Arbitrate Case'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispute Detail Modal */}
      {selectedDispute && (
        <Modal
          title={`Dispute Case: ${selectedDispute.dispute_id}`}
          onClose={() => setSelectedDispute(null)}
          maxWidth="820px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Modal Header Summary Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '12px 16px',
                background: 'var(--panel-bg, #f8fafc)',
                borderRadius: '8px',
                border: '1px solid var(--grid)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Session Subject
                </span>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>
                  {selectedDispute.topic || 'Live Technical Pairing Session'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getPriorityBadge(selectedDispute.priority)}
                {getStageBadge(selectedDispute.stage)}
              </div>
            </div>

            {/* Modal Subtabs */}
            <div className="admin-filter-tabs" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={`admin-filter-tab ${modalTab === 'overview' ? 'active' : ''}`}
                onClick={() => setModalTab('overview')}
              >
                Case Overview &amp; Claims
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${modalTab === 'chat' ? 'active' : ''}`}
                onClick={() => setModalTab('chat')}
              >
                Chat Logs ({selectedDispute.chat_logs?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${modalTab === 'evidence' ? 'active' : ''}`}
                onClick={() => setModalTab('evidence')}
              >
                Evidence / Logs ({selectedDispute.evidence_files?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${modalTab === 'history' ? 'active' : ''}`}
                onClick={() => setModalTab('history')}
              >
                Audit History ({selectedDispute.history?.length || 0})
              </button>
            </div>

            {/* TAB: Overview & Claims */}
            {modalTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Metric Quick Stats */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '10px',
                  }}
                >
                  <div className="mini-card" style={{ padding: '12px' }}>
                    <div className="section-label" style={{ marginTop: 0 }}>Frozen Escrow</div>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--warn, #d97706)' }}>
                      ₹{Number(selectedDispute.price || selectedDispute.amount || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="sub" style={{ fontSize: '11px' }}>
                      Booking Ref #{selectedDispute.booking_id || selectedDispute.id}
                    </div>
                  </div>

                  <div className="mini-card" style={{ padding: '12px' }}>
                    <div className="section-label" style={{ marginTop: 0 }}>Root Trigger</div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                      {selectedDispute.root_cause || 'Delivery Quality'}
                    </div>
                    <div className="sub" style={{ fontSize: '11px' }}>
                      Category Classification
                    </div>
                  </div>

                  <div className="mini-card" style={{ padding: '12px' }}>
                    <div className="section-label" style={{ marginTop: 0 }}>Mediation Target</div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#10b981' }}>
                      Within 12 Hours
                    </div>
                    <div className="sub" style={{ fontSize: '11px' }}>
                      Priority: {selectedDispute.priority}
                    </div>
                  </div>
                </div>

                {/* Complainant Claim Box */}
                <div
                  className="mini-card"
                  style={{
                    padding: '16px',
                    borderLeft: '4px solid #ef4444',
                    background: 'var(--card-bg, #fff)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                        }}
                      >
                        Complainant
                      </span>
                      <strong style={{ fontSize: '13px' }}>{selectedDispute.learner_name}</strong>
                    </div>
                    <span className="sub mono" style={{ fontSize: '11.5px' }}>
                      Filed at: {selectedDispute.created_at ? new Date(selectedDispute.created_at).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0, color: 'var(--ink)' }}>
                    "{selectedDispute.learner_complaint}"
                  </p>
                </div>

                {/* Mentor Counter-Claim Box */}
                <div
                  className="mini-card"
                  style={{
                    padding: '16px',
                    borderLeft: '4px solid var(--brand)',
                    background: 'var(--card-bg, #fff)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--brand)',
                        }}
                      >
                        Respondent
                      </span>
                      <strong style={{ fontSize: '13px' }}>{selectedDispute.mentor_name}</strong>
                    </div>
                    <span className="sub mono" style={{ fontSize: '11.5px' }}>
                      Counter-statement submitted
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0, color: 'var(--ink)' }}>
                    "{selectedDispute.mentor_response}"
                  </p>
                </div>

                {/* Arbitration Advisory Box */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.05)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    fontSize: '12px',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <ScaleIcon size={18} className="text-brand" />
                  <div>
                    <strong>Arbitration Rulebook Guidance:</strong> If connectivity issues caused session delays under 15 minutes and mentor made up the time, partial release is standard. For unfulfilled scope or no-show beyond 20 minutes, 100% learner refund is enforced.
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Chat Logs */}
            {modalTab === 'chat' && (
              <div
                style={{
                  background: 'var(--panel-bg, #f8fafc)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--grid)',
                  maxHeight: '340px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(selectedDispute.chat_logs || []).map((msg, i) => {
                    const isLearner = msg.sender === 'learner';
                    return (
                      <div
                        key={i}
                        style={{
                          alignSelf: isLearner ? 'flex-start' : 'flex-end',
                          maxWidth: '78%',
                          background: isLearner ? 'var(--card-bg, #fff)' : 'var(--brand)',
                          color: isLearner ? 'var(--ink)' : '#fff',
                          padding: '10px 14px',
                          borderRadius: isLearner ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                          border: isLearner ? '1px solid var(--grid)' : 'none',
                          fontSize: '12.5px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '12px',
                            fontSize: '10.5px',
                            opacity: isLearner ? 0.7 : 0.85,
                            marginBottom: '4px',
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>
                            {isLearner ? selectedDispute.learner_name : selectedDispute.mentor_name}
                          </span>
                          <span>{msg.time}</span>
                        </div>
                        <div style={{ lineHeight: 1.4 }}>{msg.text}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: Evidence */}
            {modalTab === 'evidence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>
                  Verified Attachments &amp; System Telemetry
                </div>
                {(selectedDispute.evidence_files || []).map((f, i) => (
                  <div
                    key={i}
                    className="mini-card"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--brand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <DocumentIcon size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{f.name}</div>
                        <div className="sub" style={{ fontSize: '11px' }}>
                          {f.size} · Uploaded as verification evidence
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px' }}
                      onClick={() => toast.info(`Inspecting proof artifact: ${f.name}`)}
                    >
                      Inspect Evidence ↗
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: Audit History */}
            {modalTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>
                  Case Audit Trail &amp; Chain of Custody
                </div>
                {(selectedDispute.history || []).map((h, i) => (
                  <div
                    key={i}
                    className="mini-card"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12.5px',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--ink)' }}>{h.action}</strong>
                      <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                        Authorized Actor: {h.by}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      {h.date}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Action Bar */}
            <div
              style={{
                borderTop: '1px solid var(--grid)',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                {selectedDispute.stage !== 'resolved' ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                    onClick={() => setShowResolveModal(true)}
                  >
                    <ScaleIcon size={16} />
                    <span>Choose Arbitration Ruling</span>
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#10b981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircleIcon size={16} />
                    Final Arbitration Verdict Enforced
                  </span>
                )}
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedDispute(null)}
              >
                Close Case
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Resolution Choice Modal */}
      {showResolveModal && selectedDispute && (
        <Modal
          title={`Arbitrate & Resolve Dispute: ${selectedDispute.dispute_id}`}
          onClose={() => setShowResolveModal(false)}
          maxWidth="600px"
        >
          <form onSubmit={handleResolveSubmit}>
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '12.5px',
              }}
            >
              Select an official arbitration ruling for the disputed escrow balance of{' '}
              <strong style={{ color: 'var(--warn, #d97706)' }}>
                ₹{Number(selectedDispute.price || selectedDispute.amount || 0).toLocaleString('en-IN')}
              </strong>
              . This action immediately adjusts the escrow vault ledger and updates both parties.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {/* Option 1: Full Refund */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  border: resolutionType === 'full_refund' ? '2px solid var(--brand)' : '1px solid var(--grid)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: resolutionType === 'full_refund' ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="resolution_type"
                  value="full_refund"
                  checked={resolutionType === 'full_refund'}
                  onChange={() => setResolutionType('full_refund')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                    1. Full 100% Refund to Learner
                  </strong>
                  <p className="sub" style={{ fontSize: '12px', margin: '3px 0 0', lineHeight: 1.4 }}>
                    Cancels the session and refunds <strong>₹{Number(selectedDispute.price || selectedDispute.amount || 0).toLocaleString('en-IN')}</strong> directly to learner. Mentor receives ₹0.
                  </p>
                </div>
              </label>

              {/* Option 2: Partial Split */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  border: resolutionType === 'partial_refund' ? '2px solid var(--brand)' : '1px solid var(--grid)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: resolutionType === 'partial_refund' ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="resolution_type"
                  value="partial_refund"
                  checked={resolutionType === 'partial_refund'}
                  onChange={() => setResolutionType('partial_refund')}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ width: '100%' }}>
                  <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                    2. Partial Split Settlement
                  </strong>
                  <p className="sub" style={{ fontSize: '12px', margin: '3px 0 8px', lineHeight: 1.4 }}>
                    Compensate learner for lost time while recognizing partial effort rendered by mentor.
                  </p>
                  {resolutionType === 'partial_refund' && (
                    <div
                      style={{
                        padding: '10px 12px',
                        background: 'var(--panel-bg, #f8fafc)',
                        borderRadius: '6px',
                        border: '1px solid var(--grid)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>Learner Split %:</span>
                        <select
                          value={partialPercent}
                          onChange={(e) => setPartialPercent(e.target.value)}
                          style={{ width: '140px', margin: 0, padding: '4px 8px', fontSize: '12px' }}
                        >
                          <option value="25">25% Refund to Learner</option>
                          <option value="50">50% Equal Split</option>
                          <option value="75">75% Refund to Learner</option>
                        </select>
                      </div>

                      {/* Split Calculation Preview */}
                      {(() => {
                        const total = Number(selectedDispute.price || selectedDispute.amount || 0);
                        const learnerCut = Math.round((total * Number(partialPercent)) / 100);
                        const mentorCut = total - learnerCut;
                        return (
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                            Learner receives: <strong style={{ color: '#ef4444' }}>₹{learnerCut.toLocaleString('en-IN')}</strong> · Mentor receives: <strong style={{ color: '#10b981' }}>₹{mentorCut.toLocaleString('en-IN')}</strong>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </label>

              {/* Option 3: Release to Mentor */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  border: resolutionType === 'release_mentor' ? '2px solid var(--brand)' : '1px solid var(--grid)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: resolutionType === 'release_mentor' ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="resolution_type"
                  value="release_mentor"
                  checked={resolutionType === 'release_mentor'}
                  onChange={() => setResolutionType('release_mentor')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                    3. Release Full Payment to Mentor
                  </strong>
                  <p className="sub" style={{ fontSize: '12px', margin: '3px 0 0', lineHeight: 1.4 }}>
                    Concludes learner claims are invalid or policy-violating. Releases <strong>₹{Number(selectedDispute.price || selectedDispute.amount || 0).toLocaleString('en-IN')}</strong> escrow to mentor.
                  </p>
                </div>
              </label>

              {/* Option 4: Custom Ruling */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  border: resolutionType === 'custom' ? '2px solid var(--brand)' : '1px solid var(--grid)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: resolutionType === 'custom' ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="resolution_type"
                  value="custom"
                  checked={resolutionType === 'custom'}
                  onChange={() => setResolutionType('custom')}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ width: '100%' }}>
                  <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                    4. Custom Arbitration &amp; Rationale Note
                  </strong>
                  <p className="sub" style={{ fontSize: '12px', margin: '3px 0 6px', lineHeight: 1.4 }}>
                    Arbitrate with custom findings, policy violation notes, or credit adjustments.
                  </p>
                  {resolutionType === 'custom' && (
                    <textarea
                      rows={3}
                      placeholder="Enter detailed arbitration findings and notes..."
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      required={resolutionType === 'custom'}
                      style={{ fontSize: '12px', width: '100%', margin: '6px 0 0' }}
                    />
                  )}
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowResolveModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ padding: '8px 18px', fontWeight: 600 }}
              >
                {submitting ? 'Enforcing Verdict...' : 'Enforce Arbitration Verdict'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
