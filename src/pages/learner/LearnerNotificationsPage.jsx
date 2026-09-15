import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { learnerNotifications, notificationsApi } from '../../api/client';
import { resolveNotificationLink } from '../../utils';
import { DocumentIcon, ClockIcon, MessageIcon, CreditCardIcon, StarIcon, ScaleIcon, BellIcon, CheckIcon, SettingsIcon, MailIcon } from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function LearnerNotificationsPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener('pairup_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('pairup_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const formatTime = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now - date) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`;
      return date.toLocaleDateString();
    } catch (_) {
      return 'Recent';
    }
  };

  const loadNotifications = async () => {
    let remote = [];
    try {
      const data = await notificationsApi.list();
      if (Array.isArray(data)) {
        remote = data.map((n) => ({
          id: n.id,
          type: n.type || 'system',
          title: n.title,
          body: n.message,
          time: formatTime(n.created_at),
          read: n.is_read,
          link: n.link,
        }));
      }
    } catch (_) {}

    const localData = learnerNotifications.getNotifications();
    if (remote.length > 0) {
      const remoteIds = new Set(remote.map((r) => String(r.id)));
      const combined = [...remote, ...localData.filter((l) => !remoteIds.has(String(l.id)))];
      setNotifications(combined);
    } else {
      setNotifications(localData);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
    } catch (_) {}
    const updated = learnerNotifications.markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleViewDetail = async (item) => {
    if (!item.read) {
      handleMarkRead(item.id);
    }
    if (item.type === 'support' || item.ticketId) {
      window.dispatchEvent(new CustomEvent('pairup_open_support_ticket', { detail: { ticketId: item.ticketId } }));
      return;
    }
    const targetLink = resolveNotificationLink(item, 'learner');
    if (targetLink) {
      navigate(targetLink);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
    } catch (_) {}
    learnerNotifications.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    const isConfirmed = await confirm({
      title: 'Clear All Notifications?',
      message: 'Are you sure you want to clear all notifications? This action cannot be undone.',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await notificationsApi.clearAll();
    } catch (_) {}
    learnerNotifications.clearAll();
    setNotifications([]);
    toast.success('All notifications have been cleared.');
  };

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.read;
    return n.type === activeFilter;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'proposal': return <DocumentIcon size={18} />;
      case 'session': return <ClockIcon size={18} />;
      case 'message': return <MessageIcon size={18} />;
      case 'payment': return <CreditCardIcon size={18} />;
      case 'review': return <StarIcon size={18} />;
      case 'refund': return <ScaleIcon size={18} />;
      case 'support': return <MailIcon size={18} />;
      default: return <BellIcon size={18} />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'proposal': return 'Proposal';
      case 'session': return 'Session';
      case 'message': return 'Message';
      case 'payment': return 'Payment';
      case 'review': return 'Review';
      case 'refund': return 'Refund / Dispute';
      case 'support': return 'Support Desk';
      default: return 'Update';
    }
  };

  return (
    <PortalLayout
      title="Notification Center"
      portalType="learner"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleMarkAllRead}
          >
            <CheckIcon size={14} />
            <span>Mark All Read</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12.5px', color: 'var(--warn)' }}
            onClick={handleClearAll}
          >
            Clear All
          </button>
          <Link
            to="/learner/settings"
            className="btn btn-primary"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <SettingsIcon size={14} />
            <span>Notification Settings</span>
          </Link>
        </div>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        Stay up-to-date with mentor proposals, upcoming pairing sessions, escrow releases, and messages.
      </p>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs">
        <button
          type="button"
          className={`admin-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeFilter === 'unread' ? 'active' : ''}`}
          onClick={() => setActiveFilter('unread')}
        >
          Unread ({notifications.filter((n) => !n.read).length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeFilter === 'proposal' ? 'active' : ''}`}
          onClick={() => setActiveFilter('proposal')}
        >
          Proposals
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeFilter === 'session' ? 'active' : ''}`}
          onClick={() => setActiveFilter('session')}
        >
          Sessions
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeFilter === 'message' ? 'active' : ''}`}
          onClick={() => setActiveFilter('message')}
        >
          Messages
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeFilter === 'payment' ? 'active' : ''}`}
          onClick={() => setActiveFilter('payment')}
        >
          Payments
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeFilter === 'review' ? 'active' : ''}`}
          onClick={() => setActiveFilter('review')}
        >
          Reviews
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeFilter === 'refund' ? 'active' : ''}`}
          onClick={() => setActiveFilter('refund')}
        >
          Refunds &amp; Disputes
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeFilter === 'support' ? 'active' : ''}`}
          onClick={() => setActiveFilter('support')}
        >
          Support
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--muted)' }}>
            <BellIcon size={32} />
          </div>
          <p>No notifications found under this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                backgroundColor: item.read ? 'var(--surface)' : 'var(--accent-soft)',
                borderColor: item.read ? 'var(--grid-strong)' : 'var(--accent)',
                transition: 'all .15s ease',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                }}
              >
                {getIcon(item.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{ fontWeight: 700, fontSize: '14px', cursor: 'pointer', color: 'var(--ink)' }}
                      onClick={() => handleViewDetail(item)}
                      title="Click to view details page"
                    >
                      {item.title}
                    </span>
                    <span className="tag" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                      {getTypeLabel(item.type)}
                    </span>
                  </div>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                    {item.time}
                  </span>
                </div>

                <p className="sub" style={{ margin: '4px 0 10px', fontSize: '13px', lineHeight: 1.5 }}>
                  {item.body}
                </p>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '11.5px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                    onClick={() => handleViewDetail(item)}
                  >
                    View Details →
                  </button>
                  {!item.read && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '11.5px', padding: '5px 10px' }}
                      onClick={() => handleMarkRead(item.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
