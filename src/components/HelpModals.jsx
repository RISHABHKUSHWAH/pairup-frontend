import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import { useToast } from '../context';
import { adminSupport } from '../api/storage/adminStorage';
import {
  HelpCircleIcon,
  SearchIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  MailIcon,
  StarIcon,
  ShieldCheckIcon,
  XIcon,
} from './Icons';

export function HelpCenterModal({ isOpen, onClose, onOpenSupport }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      category: 'payments',
      q: 'How does the escrow payment system protect me?',
      a: 'When booking a session or accepting a problem proposal, payment is held safely in escrow. Funds are ONLY released to the mentor after the learner marks the session complete or 48 hours elapse without dispute.',
    },
    {
      id: 2,
      category: 'sessions',
      q: 'How do I join a live 1-on-1 coding session?',
      a: 'Navigate to "Sessions" in the sidebar. When your session time arrives, click "Join Live Room". You will enter an integrated room equipped with WebRTC video, Monaco code editor, screen sharing, and chat.',
    },
    {
      id: 3,
      category: 'sessions',
      q: 'Can I reschedule a session if something comes up?',
      a: 'Yes. From your Sessions list, click "Reschedule" on any confirmed session. Your peer will receive an instant notification with your proposed new date and time.',
    },
    {
      id: 4,
      category: 'problems',
      q: 'How does posting a problem request work?',
      a: 'Learners can post technical bugs, code review requests, or architecture challenges with a description and budget. Verified mentors review requests and submit competitive proposals with their approach and timeline.',
    },
    {
      id: 5,
      category: 'payments',
      q: 'When and how do mentors receive payouts?',
      a: 'Earnings accumulate in your mentor wallet once sessions complete. You can configure bank account (NEFT/RTGS/IMPS) or UPI details in Settings > Payouts to withdraw earnings on a weekly or instant schedule.',
    },
    {
      id: 6,
      category: 'safety',
      q: 'What should I do if my peer does not show up?',
      a: 'If your mentor or learner does not join within 15 minutes of the scheduled time, click "Report Issue / Dispute" in the session card. Escrow is immediately frozen and our support team will review logs and process a 100% refund.',
    },
  ];

  const filteredFaqs = faqs.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesQuery =
      !searchQuery ||
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Help Center & Knowledge Base"
      subtitle="Find quick answers regarding escrow security, live sessions, proposals, and payouts"
      icon={<HelpCircleIcon size={18} />}
      maxWidth="700px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Full Platform Guide Quick Access Banner */}
        <div
          style={{
            background: 'var(--accent-soft)',
            border: '1px solid rgba(38, 71, 214, 0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                Full Platform Guides
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                Step-by-step handbooks for both learners and mentors
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              to="/help?category=learner"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px', padding: '5px 12px', textDecoration: 'none' }}
            >
              🎓 Learner Guide
            </Link>
            <Link
              to="/help?category=mentor"
              onClick={onClose}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '12px', padding: '5px 12px', textDecoration: 'none' }}
            >
              💻 Mentor Guide
            </Link>
          </div>
        </div>

        {/* Search Header */}
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-faint)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            className="input"
            placeholder="Search FAQs, escrow rules, sessions, payouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px', paddingRight: searchQuery ? '36px' : '14px', width: '100%', fontSize: '13.5px' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'payments', label: 'Payments & Escrow' },
            { id: 'sessions', label: 'Live Sessions' },
            { id: 'problems', label: 'Problems & Proposals' },
            { id: 'safety', label: 'Safety & Disputes' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '6px 13px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                background: selectedCategory === cat.id ? 'var(--accent)' : 'var(--bg)',
                borderColor: selectedCategory === cat.id ? 'var(--accent)' : 'var(--grid-strong)',
                color: selectedCategory === cat.id ? '#fff' : 'var(--ink-muted)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
          {filteredFaqs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'var(--bg)',
                borderRadius: '12px',
                border: '1px dashed var(--grid-strong)',
                color: 'var(--ink-muted)',
              }}
            >
              <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: 'var(--ink)' }}>
                No matching answers found
              </p>
              <p style={{ margin: 0, fontSize: '12.5px' }}>
                Try another query or submit a question to our engineering support team.
              </p>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  style={{
                    border: '1px solid var(--grid)',
                    borderRadius: '10px',
                    background: isOpen ? 'var(--surface)' : 'var(--bg)',
                    boxShadow: isOpen ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                    borderColor: isOpen ? 'var(--accent)' : 'var(--grid)',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink)',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ color: 'var(--ink-muted)', marginLeft: '12px', flex: 'none' }}>
                      {isOpen ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '0 16px 14px',
                        fontSize: '12.5px',
                        color: 'var(--ink-muted)',
                        lineHeight: '1.6',
                        borderTop: '1px dashed var(--grid)',
                        paddingTop: '10px',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--grid)',
            paddingTop: '14px',
            marginTop: '4px',
          }}
        >
          <Link
            to="/help"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ExternalLinkIcon size={14} /> View Full Documentation
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              onClose();
              if (onOpenSupport) onOpenSupport();
            }}
          >
            <MailIcon size={14} /> My Support Requests
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function SupportRequestsModal({ isOpen, onClose, user, portalType = 'learner' }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'new'
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedTicket, setExpandedTicket] = useState(null);

  const storageKey = `pairup_support_tickets_${user?.id || 'guest'}`;

  const getFreshTickets = () => {
    try {
      const centralTickets = adminSupport.getTickets();
      const centralMap = new Map(centralTickets.map((t) => [t.id, t]));

      // 1. Absorb any locally created tickets in this browser
      try {
        const allKeys = Object.keys(localStorage);
        allKeys.forEach((key) => {
          if (key && key.startsWith('pairup_support_tickets_')) {
            try {
              const raw = localStorage.getItem(key);
              const parsed = JSON.parse(raw || '[]');
              if (Array.isArray(parsed)) {
                parsed.forEach((lt) => {
                  if (lt && lt.id && !centralMap.has(lt.id)) {
                    adminSupport.createTicket(lt);
                    centralMap.set(lt.id, lt);
                  }
                });
              }
            } catch {}
          }
        });
      } catch {}

      // 2. Fetch all tickets relevant to this portal (Learner gets learner tickets, Mentor gets mentor tickets, plus user's own tickets)
      const effectiveRole = portalType || user?.role || 'learner';
      const userTickets = adminSupport.getUserTickets(user?.id, user?.email, effectiveRole);

      // 3. Final map pass: STRICTLY guarantee every single ticket has the latest central status, official response, and activity history
      let list = userTickets.map((t) => {
        if (centralMap.has(t.id)) {
          return { ...t, ...centralMap.get(t.id) };
        }
        return t;
      });

      // 4. If expandedTicket is set (e.g. user clicked a notification for a ticket), ensure it is visible in the list
      if (expandedTicket && centralMap.has(expandedTicket) && !list.some((t) => t.id === expandedTicket)) {
        list = [centralMap.get(expandedTicket), ...list];
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(list));
      } catch {}

      return list;
    } catch {
      return [];
    }
  };

  const [tickets, setTickets] = useState(getFreshTickets);

  const [form, setForm] = useState({
    subject: '',
    category: 'Billing & Escrow',
    priority: 'Normal',
    description: '',
  });

  React.useEffect(() => {
    const handleOpenWithTicket = (e) => {
      if (e.detail?.ticketId) {
        setExpandedTicket(e.detail.ticketId);
        setActiveTab('tickets');
      }
    };
    window.addEventListener('pairup_open_support_ticket', handleOpenWithTicket);
    return () => window.removeEventListener('pairup_open_support_ticket', handleOpenWithTicket);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    const refreshTickets = async () => {
      const fresh = getFreshTickets();
      setTickets(fresh);
      try {
        await adminSupport.syncWithBackend();
        const updated = getFreshTickets();
        setTickets(updated);
      } catch {}
    };

    refreshTickets();

    window.addEventListener('pairup_support_tickets_updated', refreshTickets);
    window.addEventListener('storage', refreshTickets);
    const interval = setInterval(refreshTickets, 3000);

    return () => {
      window.removeEventListener('pairup_support_tickets_updated', refreshTickets);
      window.removeEventListener('storage', refreshTickets);
      clearInterval(interval);
    };
  }, [isOpen, user?.id, user?.email, portalType, storageKey, expandedTicket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.warning('Please enter a subject and detailed description.');
      return;
    }

    const effectiveRole = portalType || user?.role || 'learner';

    const newTicket = {
      id: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      user_id: user?.id || 'guest',
      user_name: user?.name || user?.username || (effectiveRole === 'mentor' ? 'Mentor User' : 'Learner User'),
      user_email: user?.email || 'user@example.com',
      user_role: effectiveRole,
      subject: form.subject.trim(),
      category: form.category,
      priority: form.priority,
      status: 'Open',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      description: form.description.trim(),
      response: '',
      history: [
        {
          by: `${user?.name || user?.username || (effectiveRole === 'mentor' ? 'Mentor User' : 'Learner User')} (${effectiveRole})`,
          text: 'Ticket opened.',
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
        },
      ],
    };

    try {
      adminSupport.createTicket(newTicket);
      await adminSupport.syncWithBackend();
    } catch {}

    const fresh = getFreshTickets();
    setTickets(fresh);

    setForm({ subject: '', category: 'Billing & Escrow', priority: 'Normal', description: '' });
    setActiveTab('tickets');
    setExpandedTicket(newTicket.id);
    toast.success(`Support ticket ${newTicket.id} submitted successfully!`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Support Requests"
      subtitle="Track your open inquiries or submit questions directly to our engineering team"
      icon={<MailIcon size={18} />}
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Modern Segmented Tab Switcher */}
        <div className="segmented-tabs">
          <button
            type="button"
            className={`segmented-tab ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <span>My Tickets</span>
            <span className="segmented-tab-badge">{tickets.length}</span>
          </button>
          <button
            type="button"
            className={`segmented-tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            <PlusIcon size={14} />
            <span>Submit New Ticket</span>
          </button>
        </div>

        {/* Tab 1: Tickets List View */}
        {activeTab === 'tickets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Status Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { id: 'all', label: `All (${tickets.length})` },
                { id: 'Open', label: `Open (${tickets.filter((t) => t.status === 'Open').length})` },
                { id: 'In Review', label: `In Review (${tickets.filter((t) => t.status === 'In Review').length})` },
                { id: 'Resolved', label: `Resolved (${tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    background: statusFilter === tab.id ? 'var(--accent)' : 'var(--bg)',
                    borderColor: statusFilter === tab.id ? 'var(--accent)' : 'var(--grid-strong)',
                    color: statusFilter === tab.id ? '#fff' : 'var(--ink-muted)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
              {tickets.filter((t) => {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'Resolved') return t.status === 'Resolved' || t.status === 'Closed';
                return t.status === statusFilter;
              }).length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    background: 'var(--bg)',
                    borderRadius: '14px',
                    border: '1px dashed var(--grid-strong)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MailIcon size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                      No support tickets found
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-muted)', maxWidth: '360px' }}>
                      {statusFilter !== 'all'
                        ? `No tickets currently match the "${statusFilter}" status filter.`
                        : 'Have an inquiry about escrow releases, live sessions, or a technical bug? Submit a ticket anytime.'}
                    </p>
                  </div>
                  {statusFilter !== 'all' ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', marginTop: '4px' }}
                      onClick={() => setStatusFilter('all')}
                    >
                      Show All Tickets
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '12.5px', marginTop: '4px' }}
                      onClick={() => setActiveTab('new')}
                    >
                      <PlusIcon size={14} /> Submit a Request
                    </button>
                  )}
                </div>
              ) : (
                tickets
                  .filter((t) => {
                    if (statusFilter === 'all') return true;
                    if (statusFilter === 'Resolved') return t.status === 'Resolved' || t.status === 'Closed';
                    return t.status === statusFilter;
                  })
                  .map((t) => {
                    const isExp = expandedTicket === t.id;
                    const statusColor =
                      t.status === 'Resolved' || t.status === 'Closed'
                        ? 'var(--success)'
                        : t.status === 'In Review'
                        ? '#F59E0B'
                        : 'var(--accent)';

                    const statusBg =
                      t.status === 'Resolved' || t.status === 'Closed'
                        ? 'var(--add-bg)'
                        : t.status === 'In Review'
                        ? 'var(--warn-bg)'
                        : 'var(--accent-soft)';

                    const priorityClass =
                      t.priority === 'Urgent'
                        ? 'urgent'
                        : t.priority === 'High'
                        ? 'high'
                        : 'normal';

                    return (
                      <div
                        key={t.id}
                        className={`ticket-card ${isExp ? 'is-expanded' : ''}`}
                        onClick={() => setExpandedTicket(isExp ? null : t.id)}
                      >
                        {/* Top Row: Ticket ID, Subject & Status Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <span className="ticket-badge">{t.id}</span>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '13.5px',
                                color: 'var(--ink)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {t.subject}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 'none' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                background: statusBg,
                                color: statusColor,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: statusColor,
                                }}
                              />
                              {t.status}
                            </span>
                            <span style={{ color: 'var(--ink-muted)', display: 'flex', alignItems: 'center' }}>
                              {isExp ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                            </span>
                          </div>
                        </div>

                        {/* Metadata line */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '8px',
                            fontSize: '12px',
                            color: 'var(--ink-muted)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>Category: <strong style={{ color: 'var(--ink)' }}>{t.category}</strong></span>
                          <span>•</span>
                          <span className={`priority-pill ${priorityClass}`}>
                            Priority: {t.priority}
                          </span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ClockIcon size={12} /> {t.date}
                          </span>
                        </div>

                        {/* Expanded details */}
                        {isExp && (
                          <div
                            style={{
                              marginTop: '12px',
                              paddingTop: '12px',
                              borderTop: '1px solid var(--grid)',
                              fontSize: '13px',
                              lineHeight: '1.55',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* User inquiry */}
                            <div
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--grid)',
                                borderRadius: '8px',
                                padding: '12px 14px',
                              }}
                            >
                              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '4px' }}>
                                YOUR INQUIRY:
                              </div>
                              <div style={{ color: 'var(--ink)' }}>
                                {t.description}
                              </div>
                            </div>

                            {/* Official Support Response */}
                            {t.response ? (
                              <div
                                style={{
                                  background: 'var(--surface)',
                                  padding: '12px 14px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--grid)',
                                  borderLeftWidth: '3px',
                                  borderLeftColor: statusColor,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <span
                                    style={{
                                      background: 'var(--accent-soft)',
                                      color: 'var(--accent)',
                                      padding: '2px 7px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <ShieldCheckIcon size={12} /> PairUp Support Desk
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>Official Response</span>
                                </div>
                                <div style={{ color: 'var(--ink)', fontSize: '13px', lineHeight: '1.5' }}>
                                  {t.response}
                                </div>
                              </div>
                            ) : (
                              <div
                                style={{
                                  background: 'var(--surface)',
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  border: '1px dashed var(--grid-strong)',
                                  fontSize: '12px',
                                  color: 'var(--ink-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <ClockIcon size={14} style={{ color: 'var(--warn)' }} />
                                <span>Awaiting staff first response. Our support engineering team monitors tickets 24/7.</span>
                              </div>
                            )}

                            {/* History Timeline */}
                            {t.history && t.history.length > 0 && (
                              <div style={{ marginTop: '2px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Activity Timeline
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {t.history.map((h, hIdx) => (
                                    <div key={hIdx} style={{ fontSize: '11.5px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                      <span style={{ color: 'var(--accent)', fontSize: '10px' }}>●</span>
                                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{h.by}:</span>
                                      <span style={{ color: 'var(--ink-muted)', flex: 1 }}>{h.text}</span>
                                      <span className="mono" style={{ fontSize: '10.5px', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{h.time}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: New Ticket Form */}
        {activeTab === 'new' && (
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'var(--bg)',
              border: '1px solid var(--grid)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            {/* Subject field */}
            <div>
              <label className="label" htmlFor="ticket-subject" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subject</span>
                <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 400 }}>
                  Brief summary of your question or issue
                </span>
              </label>
              <input
                id="ticket-subject"
                type="text"
                className="input"
                placeholder="e.g. Escrow payout clearance or live session audio question"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
                autoFocus
              />
            </div>

            {/* Category & Priority Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label" htmlFor="ticket-category">Category</label>
                <select
                  id="ticket-category"
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Billing & Escrow">💳 Billing &amp; Escrow</option>
                  <option value="Live Sessions">🎥 Live Sessions &amp; Audio</option>
                  <option value="Problems & Proposals">📝 Problems &amp; Proposals</option>
                  <option value="Account & Verification">🛡️ Account &amp; Verification</option>
                  <option value="Bug Report">🐛 Technical Bug Report</option>
                  <option value="Other">💬 General Inquiries</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="ticket-priority">Priority</label>
                <select
                  id="ticket-priority"
                  className="input"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="Normal">🟢 Normal (4–8h turnaround)</option>
                  <option value="High">🟡 High (Upcoming session)</option>
                  <option value="Urgent">🔴 Urgent (Active session issue)</option>
                </select>
              </div>
            </div>

            {/* Description field */}
            <div>
              <label className="label" htmlFor="ticket-desc" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Detailed Description</span>
                <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 400 }}>
                  Include session ID or steps if applicable
                </span>
              </label>
              <textarea
                id="ticket-desc"
                className="input"
                rows="4"
                placeholder="Please describe what happened, relevant session ID, and how our support engineers can help..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            {/* SLA notice card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--accent-soft)',
                border: '1px solid rgba(38,71,214,0.18)',
                fontSize: '12px',
                color: 'var(--ink)',
              }}
            >
              <ShieldCheckIcon size={18} style={{ color: 'var(--accent)', flex: 'none' }} />
              <span>
                Our engineering team monitors support requests 24/7. High priority and urgent session tickets receive prompt attention.
              </span>
            </div>

            {/* Form actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveTab('tickets')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <MailIcon size={14} />
                <span>Submit Ticket</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export function WhatsNewModal({ isOpen, onClose }) {
  const releases = [
    {
      version: 'v2.5',
      date: 'September 2026',
      badge: 'Latest Update',
      items: [
        {
          title: 'Sidebar Quick-Fold & Keyboard Shortcut',
          desc: 'Toggle between compact icon-only view and full navigation with the sidebar fold toggle or Ctrl+B shortcut.',
        },
        {
          title: 'Integrated Help Center & Support Modals',
          desc: 'Search comprehensive FAQs, submit support tickets directly, and track resolution updates in real time.',
        },
        {
          title: 'Direct Help Flyout Submenu',
          desc: 'Quickly access documentation, support requests, and release changelogs from the persistent (?) Help sidebar menu.',
        },
      ],
    },
    {
      version: 'v2.4',
      date: 'August 2026',
      items: [
        {
          title: 'Mentor Availability & Working Hours Engine',
          desc: 'Configure weekly recurring schedules with timezone preservation, customizable session slot durations, and live booking sync.',
        },
        {
          title: 'User Account Popover Menu',
          desc: 'Streamlined account dropdown with role switching, live notification badges, and availability status toggle.',
        },
      ],
    },
    {
      version: 'v2.3',
      date: 'July 2026',
      items: [
        {
          title: 'Explore Problems Marketplace',
          desc: 'Open board for mentors to browse learner challenges, filter by technical tags, and submit competitive proposals.',
        },
        {
          title: 'Interactive Live Session Room',
          desc: 'WebRTC video and audio conferencing coupled with collaborative Monaco code editing and note-taking.',
        },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="What's New in PairUp"
      subtitle="Discover recent updates, feature additions, and platform improvements"
      icon={<StarIcon size={18} />}
      maxWidth="640px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
        {releases.map((rel) => (
          <div
            key={rel.version}
            style={{
              border: '1px solid var(--grid)',
              borderRadius: '12px',
              background: 'var(--bg)',
              padding: '16px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)' }}>{rel.version}</span>
                {rel.badge && (
                  <span
                    style={{
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      border: '1px solid rgba(38,71,214,0.18)',
                    }}
                  >
                    {rel.badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {rel.date}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rel.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', marginTop: '2px', flex: 'none' }}>
                    <CheckCircleIcon size={15} />
                  </span>
                  <div style={{ fontSize: '12.5px', lineHeight: '1.5' }}>
                    <strong style={{ color: 'var(--ink)' }}>{item.title}: </strong>
                    <span style={{ color: 'var(--ink-muted)' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

