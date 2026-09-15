import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { adminNotifications } from '../../api/client';
import { MegaphoneIcon, AlertTriangleIcon, CheckCircleIcon } from '../../components/Icons';
import { useToast } from '../../context';

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'send' | 'templates' | 'alerts'

  // Send Notification Form
  const [sendForm, setSendForm] = useState({
    title: '',
    message: '',
    target: 'All Users',
    channels: ['In-App'],
  });

  // Selected Notification Modal
  const [selectedNotif, setSelectedNotif] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setNotifications(adminNotifications.getNotifications());
    setTemplates(adminNotifications.getTemplates());
  };

  const handleChannelToggle = (channel) => {
    setSendForm((prev) => {
      const exists = prev.channels.includes(channel);
      if (exists && prev.channels.length === 1) return prev; // keep at least one
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
    setActiveTab('history');
  };

  const systemAlerts = [
    { id: 'al_1', title: 'High Database Load (> 85%)', severity: 'warning', time: '1 hour ago', desc: 'Read replicas auto-scaled to handle spike during peak evening hours.' },
    { id: 'al_2', title: 'Payment Gateway Webhook Delay', severity: 'info', time: '3 hours ago', desc: 'Webhook queue cleared after 12 retries; 0 payments lost.' },
    { id: 'al_3', title: 'SSL Certificate Auto-Renewed', severity: 'success', time: 'Yesterday', desc: 'Let\'s Encrypt wildcard certificate renewed for pairup.dev.' },
  ];

  return (
    <PortalLayout
      title="Platform Notifications &amp; Broadcasts"
      portalType="admin"
      actions={
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setActiveTab('send')}
        >
          <MegaphoneIcon size={16} />
          <span>Dispatch New Broadcast</span>
        </button>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Send platform-wide or targeted broadcasts to learners and mentors via In-App alerts, Email, and Push notifications.
      </p>

      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Notification History ({notifications.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          Send Broadcast
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          System Templates ({templates.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          System Alerts ({systemAlerts.length})
        </button>
      </div>

      <div style={{ maxWidth: '820px' }}>
        {/* TAB 1: NOTIFICATION HISTORY */}
        {activeTab === 'history' && (
          <div className="admin-panel" style={{ margin: 0 }}>
            <div className="admin-panel-head">
              <h3>Notification History &amp; Delivery Ledger</h3>
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
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab('history')}>
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
                      setActiveTab('send');
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
            <div className="section-label" style={{ marginTop: 0 }}>System Alerts &amp; Health Monitoring</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
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
                    <span className="sub" style={{ fontSize: '11px' }}>{al.time}</span>
                  </div>
                  <p className="sub" style={{ fontSize: '12px', margin: '4px 0 0' }}>{al.desc}</p>
                </div>
              ))}
            </div>
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
