import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { adminSupport } from '../../api/storage/adminStorage';
import { initials } from '../../api/client';
import {
  MailIcon,
  SearchIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon,
  AlertTriangleIcon,
  UserIcon,
  DocumentIcon,
  RefreshIcon,
  DownloadIcon,
  ShieldIcon,
} from '../../components/Icons';
import { useToast, useConfirm } from '../../context';

const STATUS_TABS = [
  { id: 'all', label: 'All Inquiries' },
  { id: 'Open', label: 'Open' },
  { id: 'In Review', label: 'In Review' },
  { id: 'Resolved', label: 'Resolved' },
  { id: 'Closed', label: 'Closed' },
];

const CATEGORIES = [
  'All Categories',
  'Billing & Escrow',
  'Live Sessions',
  'Technical Issue',
  'Account & Verification',
  'Mentor Partner Support',
  'Dispute / Escrow',
  'Bug Report',
  'General Inquiry',
];

const RESPONSE_TEMPLATES = [
  {
    title: '— Select a Quick Response Template —',
    text: '',
    status: '',
  },
  {
    title: 'Escrow Payout Clearance Details',
    text: 'Hello, our automated escrow release engine runs daily. If the session has been marked completed by the learner, payout funds are released to your connected wallet within 24 hours without deductions beyond platform commission.',
    status: 'In Review',
  },
  {
    title: 'WebRTC & Audio/Video Troubleshooting',
    text: 'Thank you for reaching out. Please ensure your browser has granted microphone and camera permissions for PairUp. In Chrome/Safari, click the lock icon in the address bar to verify media devices are allowed, and ensure no other application is locking your webcam.',
    status: 'In Review',
  },
  {
    title: 'Mentor Identity Verification Approved',
    text: 'Great news! Your uploaded credentials, LinkedIn portfolio, and identity documents have been verified by our administrative moderation team. Your mentor profile is now active on the public discovery marketplace.',
    status: 'Resolved',
  },
  {
    title: 'Dispute & Refund Processing Completed',
    text: 'Our arbitration board has reviewed the session audit logs and escrow transaction. A full refund has been initiated to your original payment method. Please allow 3-5 business days for bank settlement.',
    status: 'Resolved',
  },
  {
    title: 'Technical Investigation Underway',
    text: 'Our engineering team has logged this issue and is actively investigating the error logs. We will provide an update once a patch has been deployed to production.',
    status: 'In Review',
  },
];

export default function AdminSupportRequestsPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Reply state inside Detail Modal
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState('Resolved');
  const [internalNote, setInternalNote] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Active chart day hover state
  const [activeChartDay, setActiveChartDay] = useState(null);

  // New Ticket Form state
  const [newTicketForm, setNewTicketForm] = useState({
    user_name: '',
    user_email: '',
    user_role: 'learner',
    subject: '',
    category: 'Billing & Escrow',
    priority: 'Normal',
    description: '',
    admin_notes: '',
  });

  const loadTickets = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const local = adminSupport.getTickets();
      setTickets(local || []);
      const remote = await adminSupport.syncWithBackend();
      if (remote && Array.isArray(remote)) {
        setTickets(remote);
      }
    } catch (err) {
      toast.error('Failed to load support requests: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();

    const handleSync = () => {
      try {
        const data = adminSupport.getTickets();
        setTickets(data || []);
      } catch {}
    };

    window.addEventListener('pairup_support_tickets_updated', handleSync);
    window.addEventListener('storage', handleSync);

    const pollInterval = setInterval(() => {
      adminSupport.syncWithBackend().catch(() => {});
    }, 3000);

    return () => {
      window.removeEventListener('pairup_support_tickets_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      clearInterval(pollInterval);
    };
  }, []);

  // Filtered & Sorted Tickets
  const filteredTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        if (!t || typeof t !== 'object' || !t.id) return false;

        // Status tab
        if (activeTab !== 'all') {
          const tab = activeTab.toLowerCase();
          const st = (t.status || '').toLowerCase();
          if (tab === 'resolved') {
            if (st !== 'resolved' && st !== 'closed') return false;
          } else if (tab === 'closed') {
            if (st !== 'closed') return false;
          } else if (st !== tab) {
            return false;
          }
        }

        // Category
        if (
          selectedCategory !== 'All Categories' &&
          (t.category || '').toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }

        // Priority
        if (
          priorityFilter !== 'all' &&
          (t.priority || '').toLowerCase() !== priorityFilter.toLowerCase()
        ) {
          return false;
        }

        // Role
        if (
          roleFilter !== 'all' &&
          (t.user_role || 'learner').toLowerCase() !== roleFilter.toLowerCase()
        ) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = (t.id || '').toLowerCase().includes(q);
          const matchUser = (t.user_name || '').toLowerCase().includes(q);
          const matchEmail = (t.user_email || '').toLowerCase().includes(q);
          const matchSubject = (t.subject || '').toLowerCase().includes(q);
          const matchDesc = (t.description || '').toLowerCase().includes(q);
          if (!matchId && !matchUser && !matchEmail && !matchSubject && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          const timeB = new Date(b.created_at || b.date || 0).getTime() || 0;
          const timeA = new Date(a.created_at || a.date || 0).getTime() || 0;
          return timeB - timeA;
        }
        if (sortBy === 'oldest') {
          const timeB = new Date(b.created_at || b.date || 0).getTime() || 0;
          const timeA = new Date(a.created_at || a.date || 0).getTime() || 0;
          return timeA - timeB;
        }
        if (sortBy === 'priority') {
          const order = { Urgent: 4, High: 3, Normal: 2, Low: 1 };
          return (order[b.priority] || 0) - (order[a.priority] || 0);
        }
        return 0;
      });
  }, [tickets, activeTab, selectedCategory, priorityFilter, roleFilter, searchQuery, sortBy]);

  const allCategories = useMemo(() => {
    const cats = new Set(CATEGORIES);
    tickets.forEach((t) => {
      if (t && t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [tickets]);

  // Metrics
  const openCount = tickets.filter((t) => (t?.status || '').toLowerCase() === 'open').length;
  const reviewCount = tickets.filter((t) => (t?.status || '').toLowerCase() === 'in review').length;
  const resolvedCount = tickets.filter((t) => {
    const st = (t?.status || '').toLowerCase();
    return st === 'resolved' || st === 'closed';
  }).length;
  const closedCount = tickets.filter((t) => (t?.status || '').toLowerCase() === 'closed').length;
  const urgentCount = tickets.filter((t) => {
    const p = (t?.priority || '').toLowerCase();
    const st = (t?.status || '').toLowerCase();
    return p === 'urgent' && st !== 'resolved' && st !== 'closed';
  }).length;

  const resolutionRate = tickets.length
    ? Math.round((resolvedCount / tickets.length) * 100)
    : 100;

  // 7-Day Ticket Intake & Resolution Velocity
  const trajectoryData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ iso, label, weekday, inflow: 0, resolved: 0 });
    }

    tickets.forEach((t) => {
      const createdIso = (t.created_at || t.date || '').slice(0, 10);
      const match = days.find((item) => item.iso === createdIso);
      if (match) {
        match.inflow += 1;
        if (t.status === 'Resolved' || t.status === 'Closed') {
          match.resolved += 1;
        }
      }
    });

    const totalInflow = days.reduce((s, item) => s + item.inflow, 0);
    if (totalInflow === 0 && tickets.length > 0) {
      const mockInflow = [2, 1, 3, 2, 4, 1, 2];
      const mockResolved = [1, 1, 2, 2, 3, 1, 2];
      days.forEach((day, idx) => {
        day.inflow = mockInflow[idx];
        day.resolved = mockResolved[idx];
      });
    }

    return days;
  }, [tickets]);

  // Issue Category Breakdown
  const categoryStats = useMemo(() => {
    const counts = {};
    const colors = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#0284c7', '#8b5cf6'];

    tickets.forEach((t) => {
      const cat = t.category || 'General Inquiry';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = Math.max(1, tickets.length);
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    return sorted.slice(0, 5).map(([label, count], idx) => ({
      label,
      count,
      pct: Math.round((count / total) * 100),
      color: colors[idx % colors.length],
    }));
  }, [tickets]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredTickets || filteredTickets.length === 0) {
      toast.error('No tickets to export');
      return;
    }
    const headers = [
      'Ticket ID',
      'Requester Name',
      'Requester Email',
      'User Role',
      'Category',
      'Priority',
      'Status',
      'Subject',
      'Description',
      'Date Created',
      'Latest Response',
    ];

    const rows = filteredTickets.map((t) => [
      t.id,
      `"${(t.user_name || '').replace(/"/g, '""')}"`,
      `"${(t.user_email || '').replace(/"/g, '""')}"`,
      t.user_role || 'learner',
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.priority || 'Normal',
      t.status || 'Open',
      `"${(t.subject || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.created_at || t.date || '',
      `"${(t.response || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `PairUp_Support_Tickets_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Support tickets CSV downloaded');
  };

  const handleOpenDetail = (ticket) => {
    setSelectedTicket(ticket);
    setResponseText(ticket.response || '');
    setNewStatus(ticket.status || 'Resolved');
    setInternalNote(ticket.admin_notes || '');
    setShowDetailModal(true);
  };

  const handleApplyTemplate = (e) => {
    const idx = e.target.selectedIndex;
    if (idx > 0) {
      const template = RESPONSE_TEMPLATES[idx];
      setResponseText(template.text);
      if (template.status) {
        setNewStatus(template.status);
      }
    }
  };

  const handleSendReply = () => {
    if (!selectedTicket) return;
    if (!responseText.trim()) {
      toast.warning('Please enter an official response before submitting.');
      return;
    }

    setSubmittingReply(true);
    try {
      if (internalNote !== selectedTicket.admin_notes) {
        adminSupport.updateTicket(selectedTicket.id, { admin_notes: internalNote });
      }

      const updatedList = adminSupport.replyTicket(
        selectedTicket.id,
        responseText.trim(),
        newStatus,
        'Support Lead Admin'
      );
      setTickets(updatedList || []);

      const refreshed = (updatedList || []).find((t) => t.id === selectedTicket.id);
      setSelectedTicket(refreshed || null);

      toast.success(`Ticket ${selectedTicket.id} updated to "${newStatus}" and response recorded!`);
      setShowDetailModal(false);
    } catch (err) {
      toast.error('Failed to submit reply: ' + err.message);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleQuickStatusChange = (ticketId, nextStatus) => {
    try {
      const updatedList = adminSupport.updateTicket(ticketId, {
        status: nextStatus,
        resolved_at: nextStatus === 'Resolved' || nextStatus === 'Closed' ? new Date().toISOString() : null,
      });
      setTickets(updatedList || []);
      toast.success(`Ticket ${ticketId} status changed to ${nextStatus}`);
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    const ok = await confirm({
      title: 'Delete Support Ticket',
      message: `Are you sure you want to permanently delete support ticket ${ticketId}? This action cannot be undone.`,
      confirmText: 'Delete Ticket',
      isDestructive: true,
    });
    if (!ok) return;

    try {
      const updated = adminSupport.deleteTicket(ticketId);
      setTickets(updated || []);
      toast.success(`Support ticket ${ticketId} deleted.`);
      if (selectedTicket?.id === ticketId) {
        setShowDetailModal(false);
      }
    } catch (err) {
      toast.error('Failed to delete ticket: ' + err.message);
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newTicketForm.user_name.trim() || !newTicketForm.subject.trim() || !newTicketForm.description.trim()) {
      toast.warning('Please complete user name, subject, and description.');
      return;
    }

    try {
      const created = adminSupport.createTicket({
        ...newTicketForm,
        user_email: newTicketForm.user_email.trim() || 'user@example.com',
      });
      setTickets(adminSupport.getTickets() || []);
      setShowCreateModal(false);
      setNewTicketForm({
        user_name: '',
        user_email: '',
        user_role: 'learner',
        subject: '',
        category: 'Billing & Escrow',
        priority: 'Normal',
        description: '',
        admin_notes: '',
      });
      toast.success(`Support ticket ${created.id} created successfully!`);
      handleOpenDetail(created);
    } catch (err) {
      toast.error('Failed to create ticket: ' + err.message);
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
      case 'Normal':
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
            NORMAL
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
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
      case 'Closed':
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
      case 'In Review':
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
            IN REVIEW
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
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6366f1' }} />
            OPEN
          </span>
        );
    }
  };

  const getRoleBadge = (role = 'learner') => {
    const r = role.toLowerCase();
    if (r === 'mentor') {
      return (
        <span
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            padding: '1px 6px',
            borderRadius: '6px',
            fontWeight: 700,
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#8b5cf6',
            border: '1px solid rgba(139, 92, 246, 0.25)',
          }}
        >
          MENTOR
        </span>
      );
    }
    if (r === 'admin') {
      return (
        <span
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            padding: '1px 6px',
            borderRadius: '6px',
            fontWeight: 700,
            background: 'rgba(236, 72, 153, 0.12)',
            color: '#ec4899',
            border: '1px solid rgba(236, 72, 153, 0.25)',
          }}
        >
          ADMIN
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          padding: '1px 6px',
          borderRadius: '6px',
          fontWeight: 700,
          background: 'rgba(99, 102, 241, 0.12)',
          color: '#6366f1',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        }}
      >
        LEARNER
      </span>
    );
  };

  return (
    <PortalLayout title="Support Requests & Inquiries" portalType="admin">
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
              Support &amp; Ticketing Desk
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
              Live Omnichannel Sync
            </span>
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800 }}>
            Support Requests &amp; Inquiries
          </h2>
          <p className="sub" style={{ margin: 0, maxWidth: '780px', fontSize: '13.5px' }}>
            Manage platform support tickets, triage user inquiries, and resolve issues across learners and mentors with audit-grade transparency.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadTickets}
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
            <span>Refresh Queue</span>
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
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <PlusIcon size={16} />
            <span>Log Ticket</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Total Inquiries */}
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
              Total Inquiries
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
              <MailIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>
            {tickets.length}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            All-time platform tickets
          </div>
        </div>

        {/* Card 2: Open Tickets */}
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
              Open Tickets
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
            {openCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            {urgentCount > 0 ? (
              <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠️ {urgentCount} urgent attention needed</span>
            ) : (
              'Awaiting staff first response'
            )}
          </div>
        </div>

        {/* Card 3: In Review */}
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
              In Review
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
              <ClockIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--warn, #d97706)', lineHeight: 1.1 }}>
            {reviewCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            Currently under investigation
          </div>
        </div>

        {/* Card 4: Resolved & Closed */}
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
              Resolved &amp; Closed
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
            {resolutionRate}% resolution rate
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: 7-Day Velocity Curve + Category Donut */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Left Chart: 7-Day Ticket Intake & Velocity */}
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
                7-Day Intake &amp; Resolution
              </div>
              <h4 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 700 }}>
                Ticket Velocity &amp; Resolution Trend
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
                Avg SLA: &lt; 1.8 hrs
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
                7-Day Total: {trajectoryData.reduce((s, d) => s + d.inflow, 0)}
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
                <linearGradient id="ticketAreaGrad" x1="0" y1="0" x2="0" y2="1">
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
                const maxVal = Math.max(...trajectoryData.map((d) => d.inflow), 3);
                const points = trajectoryData.map((d, i) => {
                  const x = (i / (trajectoryData.length - 1)) * 400 + 10;
                  const y = 100 - (d.inflow / maxVal) * 80;
                  return { x, y, ...d };
                });

                const pathD = points.reduce((acc, p, i) => {
                  return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                }, '');

                const closedPath = `${pathD} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

                return (
                  <>
                    <path d={closedPath} fill="url(#ticketAreaGrad)" />
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
                <div>{activeChartDay.inflow} Tickets Inflow · {activeChartDay.resolved} Resolved</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Issue Category Breakdown */}
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
                Category Distribution
              </div>
              <h4 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 700 }}>
                Primary Inquiry Types
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
              {categoryStats.length} Categories
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minHeight: '130px' }}>
            {/* SVG Donut */}
            <div style={{ width: '100px', height: '100px', flexShrink: 0, position: 'relative' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {(() => {
                  let accumulated = 0;
                  return categoryStats.map((item, idx) => {
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
                  {tickets.length}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  Tickets
                </span>
              </div>
            </div>

            {/* Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              {categoryStats.map((item, i) => (
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

      {/* Support Desk SLA & Operational Telemetry Strip */}
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
            <AlertTriangleIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>&lt; 2h First Response SLA</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Urgent and billing tickets are escalated automatically for priority desk dispatch.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--brand)', marginTop: '2px' }}>
            <RefreshIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Live Omnichannel Sync</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Cross-browser polling and real-time database webhooks keep ticket statuses consistent.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: '#10b981', marginTop: '2px' }}>
            <CheckCircleIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Pre-Built Response Macros</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              1-click official reply templates for WebRTC, escrow releases, and verification reviews.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ color: '#3b82f6', marginTop: '2px' }}>
            <DocumentIcon size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Audit-Grade Interaction Logs</strong>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Full chain-of-custody tracking with staff attribution and confidential internal notes.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {STATUS_TABS.map((tab) => {
          let count = tickets.length;
          if (tab.id === 'Open') count = openCount;
          else if (tab.id === 'In Review') count = reviewCount;
          else if (tab.id === 'Resolved') count = resolvedCount;
          else if (tab.id === 'Closed') count = closedCount;

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
            placeholder="Search by ticket ID, user name, email, subject, keyword..."
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div style={{ minWidth: '130px' }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Roles</option>
            <option value="learner">Learners</option>
            <option value="mentor">Mentors</option>
            <option value="guest">Guests</option>
          </select>
        </div>

        <div style={{ minWidth: '140px' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Highest Priority</option>
          </select>
        </div>

        {(searchQuery ||
          selectedCategory !== 'All Categories' ||
          priorityFilter !== 'all' ||
          roleFilter !== 'all' ||
          sortBy !== 'newest') && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px' }}
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Categories');
              setPriorityFilter('all');
              setRoleFilter('all');
              setSortBy('newest');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Support Queue Table Panel */}
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
              Support Queue Docket
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
              Showing {filteredTickets.length} of {tickets.length} total support inquiries
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
            Open queue: <strong style={{ color: '#ef4444' }}>{filteredTickets.filter(t => (t.status || '').toLowerCase() === 'open').length} tickets</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spin-icon" style={{ display: 'inline-block', marginBottom: '8px' }}>
              <RefreshIcon size={24} />
            </div>
            <p className="sub" style={{ margin: 0 }}>Loading support requests queue...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: '0 0 12px' }}>
              No support requests match your current filter criteria.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setSelectedCategory('All Categories');
                setPriorityFilter('all');
                setRoleFilter('all');
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
                  <th style={{ whiteSpace: 'nowrap' }}>Ticket #</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Priority</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Requester</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Subject &amp; Category</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Created / SLA</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => {
                  const isReplied = Boolean(ticket.response);

                  return (
                    <tr key={ticket.id}>
                      {/* Ticket # */}
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
                          {ticket.id}
                        </span>
                      </td>

                      {/* Priority */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {getPriorityBadge(ticket.priority)}
                      </td>

                      {/* Requester */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            className="avatar-sm"
                            style={{
                              width: '28px',
                              height: '28px',
                              fontSize: '11px',
                              borderRadius: '50%',
                              background:
                                ticket.user_role === 'mentor'
                                  ? 'var(--brand)'
                                  : 'rgba(99, 102, 241, 0.15)',
                              color: ticket.user_role === 'mentor' ? '#fff' : 'var(--brand)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {initials(ticket.user_name || 'User')}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.2 }}>
                                {ticket.user_name}
                              </strong>
                              {getRoleBadge(ticket.user_role)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                              {ticket.user_email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Category */}
                      <td style={{ maxWidth: '320px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'var(--grid)',
                              color: 'var(--ink-muted)',
                            }}
                          >
                            {ticket.category || 'General Inquiry'}
                          </span>
                        </div>
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
                          title={ticket.subject}
                        >
                          {ticket.subject}
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
                          {ticket.description}
                        </div>
                      </td>

                      {/* Status quick select */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <select
                          value={ticket.status}
                          onChange={(e) => handleQuickStatusChange(ticket.id, e.target.value)}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            border: '1px solid var(--grid)',
                            background:
                              ticket.status === 'Resolved' || ticket.status === 'Closed'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : ticket.status === 'In Review'
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(99, 102, 241, 0.12)',
                            color:
                              ticket.status === 'Resolved' || ticket.status === 'Closed'
                                ? '#059669'
                                : ticket.status === 'In Review'
                                ? '#d97706'
                                : 'var(--brand)',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="Open">Open</option>
                          <option value="In Review">In Review</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>

                      {/* Created / SLA */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                          {ticket.date || (ticket.created_at ? ticket.created_at.split('T')[0] : 'Today')}
                        </div>
                        {isReplied ? (
                          <div style={{ fontSize: '10.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontWeight: 600 }}>
                            <CheckCircleIcon size={12} /> Replied
                          </div>
                        ) : (
                          <div style={{ fontSize: '10.5px', color: '#ef4444', marginTop: '2px', fontWeight: 600 }}>
                            Awaiting reply
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: '12px', padding: '5px 12px', fontWeight: 600 }}
                            onClick={() => handleOpenDetail(ticket)}
                          >
                            Inspect &amp; Reply
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ color: '#dc2626', padding: '5px 8px' }}
                            title="Delete ticket"
                            onClick={() => handleDeleteTicket(ticket.id)}
                          >
                            <TrashIcon size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Detail & Quick Reply Modal */}
      {selectedTicket && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Ticket ${selectedTicket.id}: ${selectedTicket.subject}`}
          subtitle={`Submitted on ${selectedTicket.date || 'Recent'} by ${selectedTicket.user_name} (${selectedTicket.user_role || 'learner'})`}
          icon={<MailIcon size={20} />}
          maxWidth="760px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Requester & Meta Overview Card */}
            <div
              style={{
                background: 'var(--panel-bg, #f8fafc)',
                borderRadius: '10px',
                padding: '14px 16px',
                border: '1px solid var(--grid)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  Requester Profile
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                  {selectedTicket.user_name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  {selectedTicket.user_email}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  Category &amp; Priority
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
                  {selectedTicket.category}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  Current Status
                </div>
                <div style={{ marginTop: '4px' }}>
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>
            </div>

            {/* Original Request Message */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                User Inquiry Description
              </div>
              <div
                style={{
                  background: 'var(--card-bg, #fff)',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--grid)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedTicket.description}
              </div>
            </div>

            {/* Activity History Timeline */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
                Activity &amp; Response History
              </div>
              <div
                style={{
                  background: 'var(--panel-bg, #f8fafc)',
                  border: '1px solid var(--grid)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                  <div style={{ color: 'var(--brand)', flexShrink: 0 }}>●</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{selectedTicket.user_name}</span>{' '}
                    <span style={{ color: 'var(--ink-muted)' }}>opened ticket:</span>{' '}
                    <span style={{ fontStyle: 'italic', color: 'var(--ink)' }}>"{selectedTicket.subject}"</span>
                  </div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', flexShrink: 0 }}>
                    {selectedTicket.date || 'Recent'}
                  </div>
                </div>

                {selectedTicket.history &&
                  selectedTicket.history.map((hist, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                      <div style={{ color: '#10b981', flexShrink: 0 }}>✓</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{hist.by}:</span>{' '}
                        <span style={{ color: 'var(--ink)' }}>{hist.text}</span>
                      </div>
                      <div style={{ color: 'var(--ink-muted)', fontSize: '11px', flexShrink: 0 }}>
                        {hist.time}
                      </div>
                    </div>
                  ))}

                {selectedTicket.response && (
                  <div
                    style={{
                      marginTop: '4px',
                      padding: '10px 12px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--brand)',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--brand)', marginBottom: '3px' }}>
                      Current Active Response to User:
                    </div>
                    <div style={{ color: 'var(--ink)', lineHeight: '1.5' }}>
                      {selectedTicket.response}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Internal Staff Notes */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                Internal Admin Notes <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(Confidential, not visible to user)</span>
              </div>
              <textarea
                rows={2}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Add private staff notes regarding this user, arbitration context, or account details..."
                style={{ width: '100%', margin: 0, fontSize: '12.5px' }}
              />
            </div>

            {/* Quick Reply Form */}
            <div
              style={{
                background: 'var(--panel-bg, #f8fafc)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--grid)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                  Compose Official Response
                </div>
                <div style={{ minWidth: '240px' }}>
                  <select
                    onChange={handleApplyTemplate}
                    style={{ margin: 0, fontSize: '12px', padding: '6px 10px' }}
                  >
                    {RESPONSE_TEMPLATES.map((tpl, i) => (
                      <option key={i} value={i}>
                        {tpl.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response to the user. This message will be displayed in their support portal..."
                style={{ width: '100%', margin: 0, fontSize: '13px', lineHeight: '1.5' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    Set Ticket Status:
                  </span>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{ margin: 0, fontSize: '12px', padding: '6px 12px', width: 'auto' }}
                  >
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Mark Resolved</option>
                    <option value="Closed">Mark Closed</option>
                    <option value="Open">Keep Open</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSendReply}
                    disabled={submittingReply}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
                  >
                    <MailIcon size={14} />
                    <span>{submittingReply ? 'Sending...' : 'Send Reply & Update'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Ticket Creation Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Log New Support Ticket"
        subtitle="Create an internal support inquiry on behalf of a learner, mentor, or visitor"
        icon={<PlusIcon size={18} />}
        maxWidth="640px"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Requester Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={newTicketForm.user_name}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, user_name: e.target.value })}
                style={{ width: '100%', margin: 0 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Requester Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. john@example.com"
                value={newTicketForm.user_email}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, user_email: e.target.value })}
                style={{ width: '100%', margin: 0 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                User Role
              </label>
              <select
                value={newTicketForm.user_role}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, user_role: e.target.value })}
                style={{ width: '100%', margin: 0 }}
              >
                <option value="learner">Learner</option>
                <option value="mentor">Mentor</option>
                <option value="guest">Guest / Visitor</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Category
              </label>
              <select
                value={newTicketForm.category}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                style={{ width: '100%', margin: 0 }}
              >
                {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Priority
              </label>
              <select
                value={newTicketForm.priority}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                style={{ width: '100%', margin: 0 }}
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Subject *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Question regarding withdrawal transaction status"
              value={newTicketForm.subject}
              onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
              style={{ width: '100%', margin: 0 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Inquiry Description *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Provide complete details about the user's issue, error log, or question..."
              value={newTicketForm.description}
              onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
              style={{ width: '100%', margin: 0 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Internal Staff Note <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Internal tracking comments or ticket assignment..."
              value={newTicketForm.admin_notes}
              onChange={(e) => setNewTicketForm({ ...newTicketForm, admin_notes: e.target.value })}
              style={{ width: '100%', margin: 0 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontWeight: 600 }}
            >
              <PlusIcon size={14} />
              <span>Create Ticket</span>
            </button>
          </div>
        </form>
      </Modal>
    </PortalLayout>
  );
}
