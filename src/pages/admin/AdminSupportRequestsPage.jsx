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
  ChevronDownIcon,
  UserIcon,
  DocumentIcon,
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
    try {
      const local = adminSupport.getTickets();
      setTickets(local);
      const remote = await adminSupport.syncWithBackend();
      if (remote && Array.isArray(remote)) {
        setTickets(remote);
      }
    } catch (err) {
      toast.error('Failed to load support requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();

    const handleSync = () => {
      try {
        const data = adminSupport.getTickets();
        setTickets(data);
      } catch {}
    };

    window.addEventListener('pairup_support_tickets_updated', handleSync);
    window.addEventListener('storage', handleSync);

    // Cross-browser polling every 3 seconds to pull in tickets created in other browsers
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

        // Status tab (case-insensitive)
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
        if (selectedCategory !== 'All Categories' && (t.category || '').toLowerCase() !== selectedCategory.toLowerCase()) return false;

        // Priority
        if (priorityFilter !== 'all' && (t.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) return false;

        // Role
        if (roleFilter !== 'all' && (t.user_role || 'learner').toLowerCase() !== roleFilter.toLowerCase()) return false;

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
  const urgentCount = tickets.filter((t) => {
    const p = (t?.priority || '').toLowerCase();
    const st = (t?.status || '').toLowerCase();
    return p === 'urgent' && st !== 'resolved' && st !== 'closed';
  }).length;

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
      // Update internal note first if changed
      if (internalNote !== selectedTicket.admin_notes) {
        adminSupport.updateTicket(selectedTicket.id, { admin_notes: internalNote });
      }

      // Send reply and update status
      const updatedList = adminSupport.replyTicket(
        selectedTicket.id,
        responseText.trim(),
        newStatus,
        'Support Lead Admin'
      );
      setTickets(updatedList);

      const refreshed = updatedList.find((t) => t.id === selectedTicket.id);
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
      setTickets(updatedList);
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
      setTickets(updated);
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
      setTickets(adminSupport.getTickets());
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

  return (
    <PortalLayout
      title="Support Requests & Inquiries"
      portalType="admin"
      actions={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" className="btn btn-ghost" onClick={loadTickets} title="Refresh support queue">
            ↻ Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusIcon size={15} /> Log Ticket
          </button>
        </div>
      }
    >
      {/* Metric Cards Row */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div className="card" style={{ padding: '16px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--ink-muted)' }}>
            Total Inquiries
          </div>
          <div className="stat-num" style={{ color: 'var(--ink)' }}>
            {tickets.length}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>
            All-time platform tickets
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '3px solid #EF4444' }}>
          <div className="section-label" style={{ marginTop: 0, color: '#EF4444' }}>
            Open Tickets
          </div>
          <div className="stat-num" style={{ color: '#EF4444' }}>
            {openCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>
            {urgentCount > 0 ? (
              <span style={{ color: '#DC2626', fontWeight: 600 }}>⚠️ {urgentCount} urgent attention needed</span>
            ) : (
              'Awaiting staff first response'
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '3px solid #F59E0B' }}>
          <div className="section-label" style={{ marginTop: 0, color: '#F59E0B' }}>
            In Review
          </div>
          <div className="stat-num" style={{ color: '#F59E0B' }}>
            {reviewCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>
            Currently under investigation
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '3px solid var(--success, #10B981)' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--success, #10B981)' }}>
            Resolved & Closed
          </div>
          <div className="stat-num" style={{ color: 'var(--success, #10B981)' }}>
            {resolvedCount}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>
            {tickets.length ? Math.round((resolvedCount / tickets.length) * 100) : 100}% resolution rate
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {STATUS_TABS.map((tab) => {
          let count = tickets.length;
          if (tab.id !== 'all') {
            count = tickets.filter((t) => t.status === tab.id).length;
          }
          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-filter-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}{' '}
              <span className="mono" style={{ fontSize: '11px', opacity: 0.75, marginLeft: '4px' }}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px',
          marginBottom: '18px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by ticket ID, user name, email, subject, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', margin: 0, paddingLeft: '36px' }}
          />
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-muted)',
              display: 'flex',
              pointerEvents: 'none',
            }}
          >
            <SearchIcon size={16} />
          </span>
        </div>

        <div style={{ minWidth: '180px' }}>
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
      </div>

      {/* Tickets Table / List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-muted)' }}>
            Loading support tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div
            style={{
              padding: '50px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'var(--surface-sunken)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink-muted)',
              }}
            >
              <MailIcon size={24} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
                No support requests match your filters
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-muted)' }}>
                Try adjusting your search criteria or resetting filters.
              </p>
            </div>
            {(searchQuery || selectedCategory !== 'All Categories' || priorityFilter !== 'all' || roleFilter !== 'all' || activeTab !== 'all') && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px' }}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All Categories');
                  setPriorityFilter('all');
                  setRoleFilter('all');
                  setActiveTab('all');
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--grid)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ticket ID
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Requester
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Subject & Category
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Priority
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Created
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => {
                  const isUrgent = ticket.priority === 'Urgent';
                  const isHigh = ticket.priority === 'High';
                  const priorityColor = isUrgent ? '#DC2626' : isHigh ? '#F59E0B' : 'var(--ink-muted)';
                  const priorityBg = isUrgent ? 'rgba(239, 68, 68, 0.12)' : isHigh ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface-sunken)';

                  const statusColor =
                    ticket.status === 'Resolved' || ticket.status === 'Closed'
                      ? 'var(--success, #10B981)'
                      : ticket.status === 'In Review'
                      ? '#F59E0B'
                      : 'var(--accent)';

                  const statusBg =
                    ticket.status === 'Resolved' || ticket.status === 'Closed'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : ticket.status === 'In Review'
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'var(--accent-soft)';

                  const roleColor =
                    ticket.user_role === 'mentor' ? '#8B5CF6' : ticket.user_role === 'admin' ? '#EC4899' : '#4F46E5';

                  return (
                    <tr
                      key={ticket.id}
                      style={{
                        borderBottom: '1px solid var(--grid)',
                        transition: 'background 0.15s ease',
                      }}
                      className="hover-row"
                    >
                      {/* Ticket ID */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'var(--surface-sunken)',
                            color: 'var(--ink)',
                            border: '1px solid var(--grid)',
                          }}
                        >
                          {ticket.id}
                        </span>
                      </td>

                      {/* Requester */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'var(--accent-soft)',
                              color: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {initials(ticket.user_name || 'User')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{ticket.user_name}</span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  textTransform: 'uppercase',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  fontWeight: 700,
                                  background: `${roleColor}1A`,
                                  color: roleColor,
                                }}
                              >
                                {ticket.user_role || 'learner'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                              {ticket.user_email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Category */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', maxWidth: '340px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'var(--surface-sunken)',
                              color: 'var(--ink-muted)',
                              border: '1px solid var(--grid)',
                            }}
                          >
                            {ticket.category || 'General Inquiry'}
                          </span>
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: 'var(--ink)',
                            marginBottom: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={ticket.subject}
                        >
                          {ticket.subject}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--ink-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ticket.description}
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: priorityBg,
                            color: priorityColor,
                          }}
                        >
                          {isUrgent && <span style={{ fontSize: '12px' }}>🚨</span>}
                          {ticket.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <select
                          value={ticket.status}
                          onChange={(e) => handleQuickStatusChange(ticket.id, e.target.value)}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '12px',
                            background: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusColor}44`,
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

                      {/* Created Date */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12.5px', color: 'var(--ink)', fontWeight: 500 }}>
                          {ticket.date || (ticket.created_at ? ticket.created_at.split('T')[0] : 'Today')}
                        </div>
                        {ticket.response ? (
                          <div style={{ fontSize: '10.5px', color: 'var(--success, #10B981)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircleIcon size={12} /> Replied
                          </div>
                        ) : (
                          <div style={{ fontSize: '10.5px', color: '#EF4444' }}>
                            Awaiting reply
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => handleOpenDetail(ticket)}
                          >
                            Inspect & Reply
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ color: '#DC2626', padding: '5px 8px' }}
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
          subtitle={`Submitted on ${selectedTicket.date} by ${selectedTicket.user_name} (${selectedTicket.user_role})`}
          icon={<MailIcon size={20} />}
          maxWidth="760px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Requester & Meta Overview Card */}
            <div
              style={{
                background: 'var(--surface-sunken)',
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
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                  {selectedTicket.user_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  {selectedTicket.user_email}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  Category & Priority
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
                  {selectedTicket.category}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: selectedTicket.priority === 'Urgent' ? '#DC2626' : 'var(--accent)' }}>
                  Priority: {selectedTicket.priority}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  Current Status
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background:
                        selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed'
                          ? 'rgba(16, 185, 129, 0.14)'
                          : 'var(--accent-soft)',
                      color:
                        selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed'
                          ? 'var(--success, #10B981)'
                          : 'var(--accent)',
                    }}
                  >
                    {selectedTicket.status}
                  </span>
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
                  background: 'var(--bg)',
                  padding: '14px',
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

            {/* Ticket Activity / History Timeline */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
                Activity & Response History
              </div>
              <div
                style={{
                  background: 'var(--surface)',
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
                {/* Initial Creation event */}
                <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                  <div style={{ color: 'var(--accent)', flexShrink: 0 }}>●</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{selectedTicket.user_name}</span>{' '}
                    <span style={{ color: 'var(--ink-muted)' }}>opened ticket:</span>{' '}
                    <span style={{ fontStyle: 'italic', color: 'var(--ink)' }}>"{selectedTicket.subject}"</span>
                  </div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', flexShrink: 0 }}>
                    {selectedTicket.date}
                  </div>
                </div>

                {/* History list if available */}
                {selectedTicket.history &&
                  selectedTicket.history.map((hist, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                      <div style={{ color: 'var(--success, #10B981)', flexShrink: 0 }}>✓</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{hist.by}:</span>{' '}
                        <span style={{ color: 'var(--ink)' }}>{hist.text}</span>
                      </div>
                      <div style={{ color: 'var(--ink-muted)', fontSize: '11px', flexShrink: 0 }}>
                        {hist.time}
                      </div>
                    </div>
                  ))}

                {/* Latest active official response if present */}
                {selectedTicket.response && (
                  <div
                    style={{
                      marginTop: '4px',
                      padding: '10px',
                      background: 'rgba(59, 130, 246, 0.06)',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--accent)',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '3px' }}>
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
                background: 'var(--surface-sunken)',
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
                    className="btn btn-secondary"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSendReply}
                    disabled={submittingReply}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <MailIcon size={14} />
                    {submittingReply ? 'Sending...' : 'Send Reply & Update'}
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
              className="btn btn-secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusIcon size={14} /> Create Ticket
            </button>
          </div>
        </form>
      </Modal>
    </PortalLayout>
  );
}
