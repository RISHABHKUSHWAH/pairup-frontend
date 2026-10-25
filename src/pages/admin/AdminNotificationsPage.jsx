import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { adminNotifications, notificationsApi } from '../../api/client';
import { resolveNotificationLink } from '../../utils';
import {
  MegaphoneIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CheckIcon,
  BellIcon,
  UsersIcon,
  MessageIcon,
  DocumentIcon,
  ScaleIcon,
  TrashIcon,
  XIcon,
  RefreshIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const initialTab = searchParams.get('tab') || 'inbox';
  const [activeTab, setActiveTab] = useState(initialTab); // 'inbox' | 'history' | 'send' | 'templates' | 'alerts'
  const [inboxFilter, setInboxFilter] = useState('all'); // 'all' | 'unread' | 'deletion' | 'dispute' | 'message' | 'system'

  // Admin Inbox Notifications (from backend notificationsApi)
  const [inboxNotifications, setInboxNotifications] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);

  // Broadcasts & Templates (from adminStorage)
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Send Notification Form
  const [sendForm, setSendForm] = useState({
    title: '',
    message: '',
    target: 'All Users',
    channels: ['In-App'],
  });

  // Selected Notification Modal
  const [selectedNotif, setSelectedNotif] = useState(null);

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

  const loadInboxNotifications = async () => {
    setInboxLoading(true);
    try {
      const data = await notificationsApi.list();
      if (Array.isArray(data)) {
        const mapped = data.map((n) => ({
          id: n.id,
          type: n.type || 'system',
          title: n.title,
          body: n.message,
          time: formatTime(n.created_at),
          read: n.is_read,
          link: n.link,
          createdAt: n.created_at,
        }));
        setInboxNotifications(mapped);
      }
    } catch (err) {
      console.error('Failed to load admin inbox notifications', err);
    } finally {
      setInboxLoading(false);
    }
  };

  const loadData = () => {
    setNotifications(adminNotifications.getNotifications());
    setTemplates(adminNotifications.getTemplates());
  };

  useEffect(() => {
    loadData();
    loadInboxNotifications();

    const handleSync = () => {
      loadInboxNotifications();
      loadData();
    };

    window.addEventListener('pairup_notifications_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('pairup_notifications_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'inbox' ? {} : { tab });
  };

  // Inbox Notification Actions
  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
    } catch (_) {}
    setInboxNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)));
    toast.success('Notification marked as read');
    window.dispatchEvent(new CustomEvent('pairup_notifications_updated'));
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
    } catch (_) {}
    setInboxNotifications([]);
    toast.success('All notifications marked as read and removed from system');
    window.dispatchEvent(new CustomEvent('pairup_notifications_updated'));
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationsApi.delete(id);
    } catch (_) {}
    setInboxNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)));
    toast.success('Notification removed');
    window.dispatchEvent(new CustomEvent('pairup_notifications_updated'));
  };

  const handleClearAll = async () => {
    const isConfirmed = await confirm({
      title: 'Clear All Admin Notifications?',
      message: 'Are you sure you want to clear all admin notifications? This action cannot be undone.',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await notificationsApi.clearAll();
    } catch (_) {}
    setInboxNotifications([]);
    toast.success('All notifications cleared');
    window.dispatchEvent(new CustomEvent('pairup_notifications_updated'));
  };

  const handleViewDetail = async (item) => {
    try {
      await notificationsApi.markRead(item.id);
    } catch (_) {}
    setInboxNotifications((prev) => prev.filter((n) => String(n.id) !== String(item.id)));
    window.dispatchEvent(new CustomEvent('pairup_notifications_updated'));

    const targetLink = resolveNotificationLink(item, 'admin');
    if (targetLink) {
      navigate(targetLink);
    }
  };

  const getNotificationIcon = (item) => {
    const text = `${item.type || ''} ${item.title || ''} ${item.body || ''}`.toLowerCase();
    if (text.includes('deletion') || text.includes('account')) {
      return <UsersIcon size={18} />;
    }
    if (text.includes('dispute') || text.includes('refund')) {
      return <AlertTriangleIcon size={18} />;
    }
    if (text.includes('message') || text.includes('chat')) {
      return <MessageIcon size={18} />;
    }
    if (text.includes('contract')) {
      return <DocumentIcon size={18} />;
    }
    if (text.includes('payment') || text.includes('payout')) {
      return <ScaleIcon size={18} />;
    }
    return <BellIcon size={18} />;
  };

  const getNotificationColor = (item) => {
    const text = `${item.type || ''} ${item.title || ''} ${item.body || ''}`.toLowerCase();
    if (text.includes('deletion') || text.includes('account')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', label: 'Account Request' };
    }
    if (text.includes('dispute') || text.includes('refund')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', label: 'Dispute' };
    }
    if (text.includes('message') || text.includes('chat')) {
      return { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', label: 'Message' };
    }
    if (text.includes('contract')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', label: 'Contract' };
    }
    return { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', label: 'System Alert' };
  };

  const filteredInbox = inboxNotifications.filter((n) => {
    if (inboxFilter === 'all') return true;
    if (inboxFilter === 'unread') return !n.read;
    const text = `${n.type || ''} ${n.title || ''} ${n.body || ''}`.toLowerCase();
    if (inboxFilter === 'deletion') return text.includes('deletion') || text.includes('account');
    if (inboxFilter === 'dispute') return text.includes('dispute') || text.includes('refund');
    if (inboxFilter === 'message') return text.includes('message') || text.includes('chat');
    if (inboxFilter === 'system') return !text.includes('deletion') && !text.includes('dispute') && !text.includes('message');
    return true;
  });

  const inboxUnreadCount = inboxNotifications.filter((n) => !n.read).length;

  // Broadcast Send Handlers
  const handleChannelToggle = (channel) => {
    setSendForm((prev) => {
      const exists = prev.channels.includes(channel);
      if (exists && prev.channels.length === 1) return prev;
      return {
        ...prev,
        channels: exists ? prev.channels.filter((c) => c !== channel) : [...prev.channels, channel],
      };
    });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!sendForm.title || !sendForm.message) return;

    let recipientsCount = 636;
    if (sendForm.target === 'All Learners') recipientsCount = 512;
    if (sendForm.target === 'All Mentors') recipientsCount = 124;

    adminNotifications.sendNotification({
      title: sendForm.title,
      message: sendForm.message,
      target: sendForm.target,
      channels: sendForm.channels,
      recipients_count: recipientsCount,
    });

    const msg = `Broadcast successfully dispatched to ${recipientsCount} users!`;
    toast.success(msg);
    setSendForm({ title: '', message: '', target: 'All Users', channels: ['In-App'] });
    loadData();
    handleTabChange('history');
  };

  // System Alerts state
  const [systemAlerts, setSystemAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('pairup_admin_system_alerts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'al_1', title: 'High Database Load (> 85%)', severity: 'warning', time: '1 hour ago', desc: 'Read replicas auto-scaled to handle spike during peak evening hours.' },
      { id: 'al_2', title: 'Payment Gateway Webhook Delay', severity: 'info', time: '3 hours ago', desc: 'Webhook queue cleared after 12 retries; 0 payments lost.' },
      { id: 'al_3', title: 'SSL Certificate Auto-Renewed', severity: 'success', time: 'Yesterday', desc: "Let's Encrypt wildcard certificate renewed for pairup.dev." },
    ];
  });

  const handleMarkAlertRead = (alertId) => {
    setSystemAlerts((prev) => {
      const updated = prev.filter((a) => a.id !== alertId);
      try {
        localStorage.setItem('pairup_admin_system_alerts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    toast.success('Alert marked as read and removed from system');
  };

  const handleMarkAllAlertsRead = () => {
    setSystemAlerts([]);
    try {
      localStorage.setItem('pairup_admin_system_alerts', JSON.stringify([]));
    } catch {}
    toast.success('All system alerts marked as read and removed');
  };

  return (
    <PortalLayout
      title="Platform Notifications &amp; Broadcasts"
      portalType="admin"
      actions={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {activeTab === 'inbox' && inboxNotifications.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={handleMarkAllRead}
                title="Mark all notifications as read and remove"
              >
                <CheckIcon size={14} />
                <span>Mark All Read</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '12px', color: '#EF4444' }}
                onClick={handleClearAll}
                title="Clear all notifications"
              >
                Clear All
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={() => handleTabChange('send')}
          >
            <MegaphoneIcon size={16} />
            <span>Dispatch New Broadcast</span>
          </button>
        </div>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Review administrative notifications, deletion requests, and dispute alerts, or dispatch platform broadcasts to learners and mentors.
      </p>

      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => handleTabChange('inbox')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>Admin Notifications</span>
          <span
            style={{
              background: inboxUnreadCount > 0 ? '#DC2626' : 'rgba(255,255,255,0.15)',
              color: '#fff',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              padding: '1px 6px',
              minWidth: '18px',
              textAlign: 'center',
            }}
          >
            {inboxNotifications.length}
          </span>
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          Broadcast Ledger ({notifications.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => handleTabChange('send')}
        >
          Send Broadcast
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => handleTabChange('templates')}
        >
          System Templates ({templates.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => handleTabChange('alerts')}
        >
          System Alerts ({systemAlerts.length})
        </button>
      </div>

      <div style={{ maxWidth: '900px' }}>
        {/* TAB 0: ADMIN NOTIFICATIONS (INBOX) */}
        {activeTab === 'inbox' && (
          <div>
            {/* Filter Sub-Tabs */}
            <div className="admin-filter-tabs" style={{ marginBottom: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`admin-filter-tab ${inboxFilter === 'all' ? 'active' : ''}`}
                onClick={() => setInboxFilter('all')}
              >
                All ({inboxNotifications.length})
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${inboxFilter === 'unread' ? 'active' : ''}`}
                onClick={() => setInboxFilter('unread')}
              >
                Unread ({inboxUnreadCount})
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${inboxFilter === 'deletion' ? 'active' : ''}`}
                onClick={() => setInboxFilter('deletion')}
              >
                Account Requests
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${inboxFilter === 'dispute' ? 'active' : ''}`}
                onClick={() => setInboxFilter('dispute')}
              >
                Disputes
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${inboxFilter === 'message' ? 'active' : ''}`}
                onClick={() => setInboxFilter('message')}
              >
                Messages
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${inboxFilter === 'system' ? 'active' : ''}`}
                onClick={() => setInboxFilter('system')}
              >
                System
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={loadInboxNotifications}
                title="Refresh notifications"
                style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshIcon size={13} />
                <span>Refresh</span>
              </button>
            </div>

            {inboxLoading ? (
              <div className="empty" style={{ padding: '32px 0' }}>
                <p>Loading admin notifications...</p>
              </div>
            ) : filteredInbox.length === 0 ? (
              <div className="empty" style={{ padding: '36px 0', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '8px', color: '#10B981' }}>
                  <CheckCircleIcon size={36} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px' }}>All caught up!</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  No notifications found under this filter. All administrative tasks and user alerts are up to date.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredInbox.map((item) => {
                  const meta = getNotificationColor(item);
                  return (
                    <div
                      key={item.id}
                      className="card"
                      style={{
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start',
                        backgroundColor: item.read ? 'var(--surface)' : 'var(--accent-soft, rgba(99,102,241,0.06))',
                        borderColor: item.read ? 'var(--grid-strong, var(--border))' : 'var(--primary, #6366F1)',
                        transition: 'all .15s ease',
                        padding: '14px 16px',
                        borderRadius: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: meta.bg,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: 'none',
                        }}
                      >
                        {getNotificationIcon(item)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{ fontWeight: 700, fontSize: '14px', cursor: 'pointer', color: 'var(--ink)' }}
                              onClick={() => handleViewDetail(item)}
                              title="Click to view details and resolve"
                            >
                              {item.title}
                            </span>
                            <span
                              className="tag"
                              style={{
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                background: meta.bg,
                                color: meta.color,
                                border: `1px solid ${meta.color}40`,
                              }}
                            >
                              {meta.label}
                            </span>
                            {!item.read && (
                              <span
                                style={{
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  background: '#EF4444',
                                  display: 'inline-block',
                                }}
                                title="Unread"
                              />
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {item.time}
                            </span>
                            <button
                              type="button"
                              className="notification-remove-btn"
                              onClick={(e) => handleDeleteNotification(item.id, e)}
                              title="Remove notification"
                              aria-label="Remove notification"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                            >
                              <XIcon size={14} />
                            </button>
                          </div>
                        </div>

                        <p className="sub" style={{ margin: '4px 0 10px', fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {item.body}
                        </p>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: '11.5px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                            onClick={() => handleViewDetail(item)}
                          >
                            <span>Review &amp; Take Action &rarr;</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: '11.5px', padding: '4px 10px' }}
                            onClick={() => handleMarkRead(item.id)}
                            title="Mark as read and remove from system"
                          >
                            Mark as read
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: BROADCAST LEDGER */}
        {activeTab === 'history' && (
          <div className="admin-panel" style={{ margin: 0 }}>
            <div className="admin-panel-head">
              <h3>Broadcast History &amp; Delivery Ledger</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Target Audience</th>
                    <th>Channels</th>
                    <th>Recipients</th>
                    <th>Status</th>
                    <th>Sent At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td style={{ fontWeight: 600 }}>{n.title}</td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                          {n.target}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {n.channels?.map((c) => (
                            <span key={c} className="tag" style={{ fontSize: '10px' }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{n.recipients_count || 636}</td>
                      <td>
                        <span className="status-badge badge-accepted mono" style={{ fontSize: '10px' }}>
                          {n.status || 'Delivered'}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(n.sent_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => setSelectedNotif(n)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SEND BROADCAST */}
        {activeTab === 'send' && (
          <form onSubmit={handleSend} className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Dispatch New Broadcast</div>
            <p className="sub" style={{ fontSize: '12.5px', margin: '0 0 16px' }}>
              Compose and distribute announcements to users across chosen delivery channels.
            </p>

            <div className="field">
              <label>Target Audience</label>
              <select
                value={sendForm.target}
                onChange={(e) => setSendForm({ ...sendForm, target: e.target.value })}
              >
                <option value="All Users">All Users (636 recipients: learners + mentors)</option>
                <option value="All Learners">All Learners (512 recipients)</option>
                <option value="All Mentors">All Verified Mentors (124 recipients)</option>
              </select>
            </div>

            <div className="field">
              <label>Delivery Channels</label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                {['In-App', 'Email', 'Push'].map((ch) => (
                  <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={sendForm.channels.includes(ch)}
                      onChange={() => handleChannelToggle(ch)}
                    />
                    <span>{ch}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Notification Headline / Subject</label>
              <input
                type="text"
                value={sendForm.title}
                onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                placeholder="e.g. Scheduled Maintenance or New Feature Announcement"
                required
              />
            </div>

            <div className="field">
              <label>Message Content</label>
              <textarea
                rows={4}
                value={sendForm.message}
                onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                placeholder="Write the message text that will be received by users..."
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary">
                Send Broadcast Now
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => handleTabChange('history')}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>System Notification Templates</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'var(--card-bg, #1a1a24)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{tpl.name}</div>
                    <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                      Subject: "{tpl.subject}" • {tpl.channel}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12px' }}
                    onClick={() => {
                      setSendForm({
                        title: tpl.subject,
                        message: `Template preview for ${tpl.name}. Customize your message here.`,
                        target: 'All Users',
                        channels: ['In-App', 'Email'],
                      });
                      handleTabChange('send');
                    }}
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM ALERTS */}
        {activeTab === 'alerts' && (
          <div className="panel" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="section-label" style={{ margin: 0 }}>System Alerts &amp; Health Monitoring</div>
              {systemAlerts.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={handleMarkAllAlertsRead}
                >
                  Mark All Read
                </button>
              )}
            </div>
            {systemAlerts.length === 0 ? (
              <div className="empty" style={{ padding: '24px 0' }}>
                <p>All system alerts have been marked as read and removed.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {systemAlerts.map((al) => (
                  <div
                    key={al.id}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--card-bg, #1a1a24)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {al.severity === 'warning' ? <AlertTriangleIcon size={14} /> : al.severity === 'success' ? <CheckCircleIcon size={14} /> : null}
                        <span>{al.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="sub" style={{ fontSize: '11px' }}>{al.time}</span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                          onClick={() => handleMarkAlertRead(al.id)}
                          title="Mark alert as read and remove from system"
                        >
                          Mark read
                        </button>
                      </div>
                    </div>
                    <p className="sub" style={{ fontSize: '12px', margin: '4px 0 0' }}>{al.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Detail Modal */}
      <Modal
        isOpen={Boolean(selectedNotif)}
        onClose={() => setSelectedNotif(null)}
        title="Broadcast Delivery Details"
      >
        {selectedNotif && (
          <div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedNotif.title}</h3>
            <div className="sub" style={{ fontSize: '12px', margin: '4px 0 14px' }}>
              Sent {new Date(selectedNotif.sent_at).toLocaleString()} • Target: {selectedNotif.target}
            </div>

            <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '6px', marginBottom: '14px', fontSize: '13px', lineHeight: 1.5 }}>
              {selectedNotif.message}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Channels</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                  {selectedNotif.channels?.join(', ')}
                </div>
              </div>
              <div style={{ padding: '10px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Recipients Reached</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                  {selectedNotif.recipients_count || 636} users
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={() => setSelectedNotif(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
}
