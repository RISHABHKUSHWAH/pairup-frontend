import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import AdminCategoryNav from '../../components/AdminCategoryNav';
import { api } from '../../api/client';
import { useToast, useConfirm } from '../../context';

const THEME_PRESETS = {
  dark: {
    name: 'Dark Modern',
    bg_color: '#0B0D12',
    card_bg: '#171922',
    border_color: '#262A38',
    text_color: '#F4F5F7',
    muted_color: '#9098A8',
    primary_color: '#2563EB',
    accent_color: '#5B7CFF',
  },
  light: {
    name: 'Light Minimal',
    bg_color: '#F6F7FA',
    card_bg: '#FFFFFF',
    border_color: '#E2E8F0',
    text_color: '#0F172A',
    muted_color: '#64748B',
    primary_color: '#2563EB',
    accent_color: '#1D4ED8',
  },
  purple: {
    name: 'Royal Purple',
    bg_color: '#0A071B',
    card_bg: '#130F2E',
    border_color: '#272052',
    text_color: '#F5F3FF',
    muted_color: '#A78BFA',
    primary_color: '#7C3AED',
    accent_color: '#8B5CF6',
  },
  emerald: {
    name: 'Emerald Tech',
    bg_color: '#06140E',
    card_bg: '#0C2419',
    border_color: '#194530',
    text_color: '#F0FDF4',
    muted_color: '#6EE7B7',
    primary_color: '#059669',
    accent_color: '#10B981',
  },
  sunset: {
    name: 'Amber Sunset',
    bg_color: '#120A05',
    card_bg: '#23140A',
    border_color: '#422614',
    text_color: '#FFF7ED',
    muted_color: '#FDBA74',
    primary_color: '#EA580C',
    accent_color: '#F97316',
  },
};

export default function AdminMailPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState('broadcast'); // 'broadcast' | 'smtp' | 'theme' | 'activation'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [smtpUseSsl, setSmtpUseSsl] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [fromEmail, setFromEmail] = useState('');
  const [senderName, setSenderName] = useState('PairUp Platform');

  // Test Email
  const [testRecipient, setTestRecipient] = useState('');

  // Theme Config
  const [themeConfig, setThemeConfig] = useState({
    theme: 'dark',
    brand_name: 'PairUp',
    tagline: 'Get unstuck. Pair with a developer, live.',
    bg_color: '#0B0D12',
    card_bg: '#171922',
    border_color: '#262A38',
    text_color: '#F4F5F7',
    muted_color: '#9098A8',
    primary_color: '#2563EB',
    accent_color: '#5B7CFF',
    footer_text: 'PairUp Platform. All rights reserved.',
    support_email: 'support@pairup.dev',
  });

  // Information Email Broadcast
  const [broadcastAudience, setBroadcastAudience] = useState('all'); // 'all' | 'learners' | 'mentors' | 'specific'
  const [specificEmail, setSpecificEmail] = useState('');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastCtaText, setBroadcastCtaText] = useState('');
  const [broadcastCtaUrl, setBroadcastCtaUrl] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Unverified Users / Activation Center
  const [unverifiedUsers, setUnverifiedUsers] = useState([]);
  const [loadingUnverified, setLoadingUnverified] = useState(false);
  const [sendingActivationId, setSendingActivationId] = useState(null);

  // Live preview mode
  const [previewMode, setPreviewMode] = useState('info'); // 'info' | 'activation'

  useEffect(() => {
    loadMailData();
  }, []);

  const loadMailData = async () => {
    setLoading(true);
    try {
      const [configRes, unverifiedRes] = await Promise.all([
        api.getMailConfig().catch(() => null),
        api.getUnverifiedUsers().catch(() => []),
      ]);

      if (configRes) {
        setSmtpHost(configRes.host || '');
        setSmtpPort(String(configRes.port || '587'));
        setSmtpUseTls(Boolean(configRes.use_tls));
        setSmtpUseSsl(Boolean(configRes.use_ssl));
        setSmtpUser(configRes.user || '');
        setHasPassword(Boolean(configRes.has_password));
        setFromEmail(configRes.from_email || '');
        setSenderName(configRes.sender_name || 'PairUp Platform');
        if (configRes.theme_config) {
          setThemeConfig((prev) => ({ ...prev, ...configRes.theme_config }));
        }
      }

      setUnverifiedUsers(Array.isArray(unverifiedRes) ? unverifiedRes : []);
    } catch (err) {
      toast.error('Failed to load mail configuration: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveMailConfig({
        host: smtpHost.trim(),
        port: smtpPort.trim(),
        use_tls: smtpUseTls,
        use_ssl: smtpUseSsl,
        user: smtpUser.trim(),
        password: smtpPassword ? smtpPassword.trim() : undefined,
        from_email: fromEmail.trim(),
        sender_name: senderName.trim(),
      });
      if (smtpPassword) setHasPassword(true);
      setSmtpPassword('');
      toast.success('SMTP configuration saved successfully! 🎉');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testRecipient.trim()) {
      toast.error('Please enter a recipient email address for testing');
      return;
    }
    setTesting(true);
    try {
      const res = await api.testMailConnection(testRecipient.trim(), {
        host: smtpHost.trim(),
        port: smtpPort.trim(),
        use_tls: smtpUseTls,
        use_ssl: smtpUseSsl,
        user: smtpUser.trim(),
        password: smtpPassword ? smtpPassword.trim() : undefined,
        from_email: fromEmail.trim(),
        sender_name: senderName.trim(),
      });
      toast.success(res.message || 'Test email dispatched successfully!');
    } catch (err) {
      toast.error(err.message || 'SMTP Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSelectPreset = (key) => {
    const preset = THEME_PRESETS[key];
    if (preset) {
      setThemeConfig((prev) => ({
        ...prev,
        theme: key,
        bg_color: preset.bg_color,
        card_bg: preset.card_bg,
        border_color: preset.border_color,
        text_color: preset.text_color,
        muted_color: preset.muted_color,
        primary_color: preset.primary_color,
        accent_color: preset.accent_color,
      }));
    }
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      await api.saveMailConfig({
        theme_config: themeConfig,
      });
      toast.success('Mail theme and branding settings saved successfully! 🎨');
    } catch (err) {
      toast.error('Failed to save theme: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error('Subject, heading title, and message body are required.');
      return;
    }
    if (broadcastAudience === 'specific' && !specificEmail.trim()) {
      toast.error('Please specify the recipient email address.');
      return;
    }

    const confirmed = await confirm({
      title: 'Send Informational Email',
      message: `Are you sure you want to broadcast this email to ${
        broadcastAudience === 'all'
          ? 'ALL active users'
          : broadcastAudience === 'learners'
          ? 'all learners'
          : broadcastAudience === 'mentors'
          ? 'all mentors'
          : specificEmail
      }?`,
      confirmLabel: 'Send Email Now',
      type: 'warning',
    });

    if (!confirmed) return;

    setSendingBroadcast(true);
    try {
      const res = await api.sendInfoEmail({
        recipient_type: broadcastAudience,
        recipient_email: specificEmail.trim(),
        subject: broadcastSubject.trim(),
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        cta_text: broadcastCtaText.trim() || undefined,
        cta_url: broadcastCtaUrl.trim() || undefined,
      });

      toast.success(res.message || `Email sent successfully to ${res.sent_count} users!`);
      setBroadcastSubject('');
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastCtaText('');
      setBroadcastCtaUrl('');
    } catch (err) {
      toast.error('Broadcast failed: ' + err.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleSendSingleActivation = async (user) => {
    setSendingActivationId(user.id);
    try {
      const res = await api.sendActivationEmail({ user_id: user.id });
      toast.success(res.message || `Activation email sent to ${user.email}!`);
      // Update local state
      setUnverifiedUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, verification_token: res.token || u.verification_token } : u))
      );
    } catch (err) {
      toast.error('Activation dispatch failed: ' + err.message);
    } finally {
      setSendingActivationId(null);
    }
  };

  const handleSendAllActivation = async () => {
    const confirmed = await confirm({
      title: 'Bulk Account Activation Dispatch',
      message: `Send activation emails to all ${unverifiedUsers.length} unverified users?`,
      confirmLabel: 'Send to All',
      type: 'warning',
    });
    if (!confirmed) return;

    setLoadingUnverified(true);
    try {
      const res = await api.sendActivationEmail({ all_unverified: true });
      toast.success(res.message || 'Activation emails sent to all unverified accounts!');
    } catch (err) {
      toast.error(err.message || 'Bulk dispatch failed');
    } finally {
      setLoadingUnverified(false);
    }
  };

  return (
    <PortalLayout portalType="admin" title="Mail & Communication Center">
      <AdminCategoryNav category="communications" />
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '24px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
        >
          <button
            type="button"
            className={`btn ${activeTab === 'broadcast' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '8px', padding: '10px 18px', fontSize: '13.5px', fontWeight: 600 }}
            onClick={() => setActiveTab('broadcast')}
          >
            📬 Send User Information
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'activation' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '8px', padding: '10px 18px', fontSize: '13.5px', fontWeight: 600 }}
            onClick={() => setActiveTab('activation')}
          >
            ✉️ Activation Center ({unverifiedUsers.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'theme' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '8px', padding: '10px 18px', fontSize: '13.5px', fontWeight: 600 }}
            onClick={() => setActiveTab('theme')}
          >
            🎨 Mail Theme & Branding
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'smtp' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '8px', padding: '10px 18px', fontSize: '13.5px', fontWeight: 600 }}
            onClick={() => setActiveTab('smtp')}
          >
            ⚙️ SMTP Mail Settings
          </button>
        </div>

        {/* TAB 1: INFORMATION BROADCAST */}
        {activeTab === 'broadcast' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)', gap: '24px' }}>
            {/* Form */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0' }}>
                  Compose Informational Email
                </h3>
                <p style={{ color: 'var(--ink-muted)', fontSize: '13px', margin: 0 }}>
                  Send announcements, feature updates, or notices directly to users' inboxes.
                </p>
              </div>

              <form onSubmit={handleSendBroadcast}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                    Target Audience
                  </label>
                  <select
                    value={broadcastAudience}
                    onChange={(e) => setBroadcastAudience(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="all">👥 All Active Users (Learners & Mentors)</option>
                    <option value="learners">🎓 Learners Only</option>
                    <option value="mentors">👨‍💻 Mentors Only</option>
                    <option value="specific">✉️ Specific User Email</option>
                  </select>
                </div>

                {broadcastAudience === 'specific' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      value={specificEmail}
                      onChange={(e) => setSpecificEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    placeholder="e.g. Important Platform Update: New Mentorship Features 🚀"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                    Banner Title / Headline
                  </label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Welcome to the New PairUp Experience!"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                    Message Content (Information)
                  </label>
                  <textarea
                    rows={6}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Write the message text here. Paragraphs separated by blank lines will be formatted cleanly in the email template..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '22px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Button Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={broadcastCtaText}
                      onChange={(e) => setBroadcastCtaText(e.target.value)}
                      placeholder="e.g. Explore Mentors Now"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Button Link (Optional URL)
                    </label>
                    <input
                      type="text"
                      value={broadcastCtaUrl}
                      onChange={(e) => setBroadcastCtaUrl(e.target.value)}
                      placeholder="e.g. https://pairup.com/learner/explore"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '14.5px', fontWeight: 700 }}
                >
                  {sendingBroadcast ? 'Sending Broadcast...' : '📤 Send Informational Email to Users'}
                </button>
              </form>
            </div>

            {/* Live Preview Box */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-muted)' }}>
                  Live Email Theme Preview
                </span>
                <span style={{ fontSize: '11px', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  Theme: {themeConfig.theme.toUpperCase()}
                </span>
              </div>

              {/* Mock Email Frame */}
              <div
                style={{
                  backgroundColor: themeConfig.bg_color,
                  padding: '24px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${themeConfig.border_color}`,
                }}
              >
                <div
                  style={{
                    backgroundColor: themeConfig.card_bg,
                    border: `1px solid ${themeConfig.border_color}`,
                    borderRadius: '12px',
                    padding: '24px 20px',
                    color: themeConfig.text_color,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  }}
                >
                  {/* Brand Header */}
                  <div style={{ textAlign: 'center', borderBottom: `1px solid ${themeConfig.border_color}`, paddingBottom: '16px', marginBottom: '18px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 900 }}>
                      <span style={{ color: themeConfig.text_color }}>{themeConfig.brand_name.slice(0, -2) || themeConfig.brand_name}</span>
                      <span style={{ color: themeConfig.accent_color }}>{themeConfig.brand_name.slice(-2)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: themeConfig.muted_color, marginTop: '4px' }}>
                      {themeConfig.tagline}
                    </div>
                  </div>

                  {/* Body */}
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 10px 0', color: themeConfig.text_color }}>
                    {broadcastTitle || 'Welcome to PairUp Information Update'}
                  </h4>

                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: themeConfig.muted_color, margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}>
                    {broadcastMessage || 'This is a live preview of how your informational email will appear in users’ inboxes, styled with your selected color theme and typography.'}
                  </p>

                  {broadcastCtaText && (
                    <div style={{ margin: '18px 0', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '10px 24px',
                          borderRadius: '8px',
                          backgroundColor: themeConfig.primary_color,
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '13px',
                        }}
                      >
                        {broadcastCtaText}
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ borderTop: `1px solid ${themeConfig.border_color}`, paddingTop: '12px', marginTop: '16px', textAlign: 'center', fontSize: '11px', color: themeConfig.muted_color }}>
                    © {new Date().getFullYear()} {themeConfig.footer_text}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVATION CENTER */}
        {activeTab === 'activation' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="card" style={{ padding: '20px', borderRadius: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  Unverified Accounts
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, marginTop: '6px', color: 'var(--warn, #F0975A)' }}>
                  {unverifiedUsers.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                  Accounts awaiting email activation
                </div>
              </div>

              <div className="card" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendAllActivation}
                  disabled={loadingUnverified || unverifiedUsers.length === 0}
                  style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                >
                  {loadingUnverified ? 'Dispatching...' : '⚡ Send Activation to All Unverified Users'}
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 14px 0' }}>
                Unverified Users Directory
              </h3>

              {unverifiedUsers.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                  ✓ All registered users are verified and active!
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '12px', color: 'var(--ink-muted)' }}>
                        <th style={{ padding: '12px 10px' }}>User</th>
                        <th style={{ padding: '12px 10px' }}>Email</th>
                        <th style={{ padding: '12px 10px' }}>Role</th>
                        <th style={{ padding: '12px 10px' }}>Registered On</th>
                        <th style={{ padding: '12px 10px' }}>Status</th>
                        <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unverifiedUsers.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>{u.name}</td>
                          <td style={{ padding: '12px 10px' }}>{u.email}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                background: u.role === 'mentor' ? 'var(--add-bg)' : 'var(--accent-soft)',
                                color: u.role === 'mentor' ? 'var(--add)' : 'var(--accent)',
                              }}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', color: 'var(--ink-muted)' }}>
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ color: '#F0975A', fontWeight: 600, fontSize: '12px' }}>
                              ⚠️ Pending Activation
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSendSingleActivation(u)}
                              disabled={sendingActivationId === u.id}
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              {sendingActivationId === u.id ? 'Sending...' : '📨 Send Activation Email'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MAIL THEME & BRANDING */}
        {activeTab === 'theme' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)', gap: '24px' }}>
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0' }}>
                  Email Template & Theme Customizer
                </h3>
                <p style={{ color: 'var(--ink-muted)', fontSize: '13px', margin: 0 }}>
                  Customize the look, colors, and branding applied to both activation emails and announcements.
                </p>
              </div>

              {/* Theme Presets */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '8px' }}>
                  Theme Presets
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                  {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectPreset(key)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: themeConfig.theme === key ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: preset.bg_color,
                        color: preset.text_color,
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '11.5px',
                        fontWeight: 600,
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: preset.accent_color,
                          margin: '0 auto 6px',
                        }}
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={themeConfig.brand_name}
                    onChange={(e) => setThemeConfig({ ...themeConfig, brand_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    Support Email Address
                  </label>
                  <input
                    type="email"
                    value={themeConfig.support_email}
                    onChange={(e) => setThemeConfig({ ...themeConfig, support_email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Header Subtitle / Tagline
                </label>
                <input
                  type="text"
                  value={themeConfig.tagline}
                  onChange={(e) => setThemeConfig({ ...themeConfig, tagline: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              {/* Color Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                    Primary CTA Color
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={themeConfig.primary_color}
                      onChange={(e) => setThemeConfig({ ...themeConfig, primary_color: e.target.value })}
                      style={{ width: '36px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={themeConfig.primary_color}
                      onChange={(e) => setThemeConfig({ ...themeConfig, primary_color: e.target.value })}
                      style={{ width: '80px', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                    Accent Highlight
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={themeConfig.accent_color}
                      onChange={(e) => setThemeConfig({ ...themeConfig, accent_color: e.target.value })}
                      style={{ width: '36px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={themeConfig.accent_color}
                      onChange={(e) => setThemeConfig({ ...themeConfig, accent_color: e.target.value })}
                      style={{ width: '80px', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                    Background Color
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={themeConfig.bg_color}
                      onChange={(e) => setThemeConfig({ ...themeConfig, bg_color: e.target.value })}
                      style={{ width: '36px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={themeConfig.bg_color}
                      onChange={(e) => setThemeConfig({ ...themeConfig, bg_color: e.target.value })}
                      style={{ width: '80px', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Footer Text / Disclaimer
                </label>
                <input
                  type="text"
                  value={themeConfig.footer_text}
                  onChange={(e) => setThemeConfig({ ...themeConfig, footer_text: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveTheme}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontWeight: 700 }}
              >
                {saving ? 'Saving...' : '💾 Save Mail Theme & Branding'}
              </button>
            </div>

            {/* Live Preview Box */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-muted)' }}>
                  Interactive Email Preview
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('activation')}
                    className={`btn btn-sm ${previewMode === 'activation' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    Activation Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('info')}
                    className={`btn btn-sm ${previewMode === 'info' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    Announcement Email
                  </button>
                </div>
              </div>

              {/* Styled Preview Frame */}
              <div
                style={{
                  backgroundColor: themeConfig.bg_color,
                  padding: '24px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${themeConfig.border_color}`,
                }}
              >
                <div
                  style={{
                    backgroundColor: themeConfig.card_bg,
                    border: `1px solid ${themeConfig.border_color}`,
                    borderRadius: '12px',
                    padding: '24px 20px',
                    color: themeConfig.text_color,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  }}
                >
                  <div style={{ textAlign: 'center', borderBottom: `1px solid ${themeConfig.border_color}`, paddingBottom: '16px', marginBottom: '18px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 900 }}>
                      <span style={{ color: themeConfig.text_color }}>{themeConfig.brand_name.slice(0, -2) || themeConfig.brand_name}</span>
                      <span style={{ color: themeConfig.accent_color }}>{themeConfig.brand_name.slice(-2)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: themeConfig.muted_color, marginTop: '4px' }}>
                      {themeConfig.tagline}
                    </div>
                  </div>

                  {previewMode === 'activation' ? (
                    <>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 10px 0', color: themeConfig.text_color }}>
                        Welcome to {themeConfig.brand_name}, Alex! 👋
                      </h4>
                      <p style={{ fontSize: '13px', lineHeight: '1.6', color: themeConfig.muted_color, margin: '0 0 16px 0' }}>
                        Thank you for creating your account as a <strong style={{ color: themeConfig.accent_color }}>learner</strong>.<br />
                        Please click the button below to verify your email address and activate your account.
                      </p>
                      <div style={{ margin: '20px 0', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '11px 26px',
                            borderRadius: '8px',
                            backgroundColor: themeConfig.primary_color,
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          Activate My Account →
                        </span>
                      </div>
                      <div style={{ borderTop: `1px solid ${themeConfig.border_color}`, paddingTop: '10px', fontSize: '11.5px', color: themeConfig.muted_color }}>
                        ⏱️ <em>This activation link is valid for 48 hours.</em>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 10px 0', color: themeConfig.text_color }}>
                        New Expert Mentors Now Available 🚀
                      </h4>
                      <p style={{ fontSize: '13px', lineHeight: '1.6', color: themeConfig.muted_color, margin: '0 0 16px 0' }}>
                        We have just onboarded verified Senior Engineers in React, Flutter, and Distributed Systems ready for 1-on-1 live pairing sessions.
                      </p>
                      <div style={{ margin: '18px 0', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '10px 22px',
                            borderRadius: '8px',
                            backgroundColor: themeConfig.primary_color,
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          Explore Verified Mentors →
                        </span>
                      </div>
                    </>
                  )}

                  <div style={{ borderTop: `1px solid ${themeConfig.border_color}`, paddingTop: '12px', marginTop: '16px', textAlign: 'center', fontSize: '11px', color: themeConfig.muted_color }}>
                    © {new Date().getFullYear()} {themeConfig.footer_text}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SMTP SETTINGS */}
        {activeTab === 'smtp' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(300px, 1fr)', gap: '24px' }}>
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0' }}>
                  SMTP Mail Server Configuration
                </h3>
                <p style={{ color: 'var(--ink-muted)', fontSize: '13px', margin: 0 }}>
                  Configure your production mail gateway (Gmail, SendGrid, Mailgun, AWS SES, or custom SMTP server).
                </p>
              </div>

              <form onSubmit={handleSaveSmtp}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="e.g. smtp.gmail.com or smtp.sendgrid.net"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      Port
                    </label>
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', marginBottom: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={smtpUseTls}
                      onChange={(e) => setSmtpUseTls(e.target.checked)}
                    />
                    <span>Use TLS (Recommended for Port 587)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={smtpUseSsl}
                      onChange={(e) => setSmtpUseSsl(e.target.checked)}
                    />
                    <span>Use SSL (Port 465)</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      SMTP Username / Account
                    </label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="e.g. apikey or user@gmail.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      App Password / API Key (`key`)
                    </label>
                    <input
                      type="password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder={hasPassword ? '•••••••• (Stored securely)' : 'Enter SMTP password or API key'}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      Sender Email (`mail_from`)
                    </label>
                    <input
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="noreply@pairup.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      Sender Display Name
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="PairUp Platform"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                >
                  {saving ? 'Saving...' : '💾 Save SMTP Mail Settings'}
                </button>
              </form>
            </div>

            {/* Test Connection Card */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 8px 0' }}>
                🧪 Test Mail Connection
              </h3>
              <p style={{ color: 'var(--ink-muted)', fontSize: '13px', lineHeight: '1.5', margin: '0 0 18px 0' }}>
                Verify that your SMTP credentials and mail server can successfully deliver messages without bouncing.
              </p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Send Test Email To
                </label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="your-email@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <button
                type="button"
                disabled={testing}
                onClick={handleTestSmtp}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '11px', fontWeight: 600, marginBottom: '18px' }}
              >
                {testing ? 'Testing connection...' : '🚀 Dispatch Test Email'}
              </button>

              <div
                style={{
                  background: 'var(--surface-raised, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '12px',
                  color: 'var(--ink-muted)',
                  lineHeight: '1.6',
                }}
              >
                <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  💡 Configuration Tip:
                </strong>
                • For <strong>Gmail</strong>, generate an App Password in your Google Account security settings.<br />
                • For <strong>SendGrid</strong>, set username to <code>apikey</code> and password to your API key.<br />
                • In development mode, if SMTP is not configured, emails print to Django console.
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}
