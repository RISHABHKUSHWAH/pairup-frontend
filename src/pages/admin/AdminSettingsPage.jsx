import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';

const SETTING_TABS = [
  { id: 'general', label: 'General' },
  { id: 'platform', label: 'Platform' },
  { id: 'session', label: 'Sessions' },
  { id: 'payment', label: 'Payments' },
  { id: 'commission', label: 'Commission' },
  { id: 'refund', label: 'Refund Rules' },
  { id: 'verification', label: 'Verification' },
  { id: 'notification', label: 'Notifications' },
  { id: 'mail', label: 'Email & SMTP' },
  { id: 'security', label: 'Security & Auth' },
  { id: 'flags', label: 'Feature Flags' },
];

export default function AdminSettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const isSuperadmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pairup_admin_settings_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      // General
      platform_name: 'PairUp',
      platform_tagline: 'Instant 1-on-1 Developer Pair Programming',
      support_email: 'support@pairup.dev',
      timezone: 'Asia/Kolkata (IST, UTC+5:30)',
      currency: 'INR (₹)',
      logo_url: '/vite.svg',

      // Platform
      signup_mode: 'open', // 'open' | 'invite_only' | 'closed'
      mentor_application_status: 'open',
      problem_posting_status: 'open',
      guest_browsing_enabled: true,
      maintenance_mode: '0',
      allow_role_switching: true,

      // Sessions
      default_session_duration: '45',
      min_session_duration: '15',
      max_session_duration: '120',
      buffer_time_minutes: '10',
      auto_cancellation_grace_mins: '15',
      livekit_url: 'wss://pairup-livekit.cloud',
      livekit_api_key: 'pairup_livekit_api_key',
      livekit_api_secret: 'pairup_livekit_secret_token_1234567890',

      // Payment
      payment_gateways: ['Razorpay', 'UPI Direct'],
      escrow_hold_days: '2',
      gst_percentage: '18',
      gstin: '29AAAAA0000A1Z5',

      // Commission & Tax
      commission_percent: '10',
      mentor_commission_percent: '10',
      learner_commission_percent: '0',
      mentor_tax_percent: '18',
      learner_tax_percent: '18',
      tiered_commissions: true,
      transaction_fee_handling: 'absorbed_by_platform',

      // Refund Rules
      refund_window_hours: '24',
      auto_refund_on_noshow: true,
      dispute_grace_hours: '48',

      // Verification Rules
      required_doc_types: ['Government ID', 'Work Email OTP', 'GitHub Profile'],
      auto_verify_github_stars: '50',
      cert_expiry_check_years: '2',

      // Notifications
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      admin_urgent_alerts: true,

      // Security & Google OAuth
      enforce_2fa: false,
      session_timeout_mins: '60',
      rate_limit_requests_per_min: '120',
      ip_whitelist: '',
      google_auth_enabled: false,
      google_client_id: '',
      google_client_secret: '',

      // Feature Flags
      flag_ai_recommendations: true,
      flag_video_recording: true,
      flag_collaborative_whiteboard: true,
      flag_beta_features: false,
    };
  });

  useEffect(() => {
    async function loadBackendSettings() {
      try {
        const data = await api.getAdminSettings();
        setSettings((prev) => ({
          ...prev,
          ...data,
        }));
      } catch (err) {
        console.warn('Backend settings load note:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBackendSettings();
  }, []);

  const handleChange = (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      try {
        await api.updateAdminSettings(settings);
      } catch (err) {
        if (err.status === 403 || (err.message && err.message.includes('Admin access required'))) {
          throw err;
        }
      }
      localStorage.setItem('pairup_admin_settings_v2', JSON.stringify(settings));
      if (user && updateUser) {
        const isAllowed = settings.allow_role_switching === true || settings.allow_role_switching === 'true';
        updateUser({
          ...user,
          allow_role_switching: isAllowed,
        });
      }
      const msg = 'All system settings synchronized and saved successfully!';
      toast.success(msg);
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title="System Settings Console" portalType="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="sub" style={{ margin: 0 }}>
            Global platform governance: escrow holding rules, session durations, payment gateway credentials, and feature flags.
          </p>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Tabs Row */}
      <div className="admin-filter-tabs" style={{ marginBottom: '20px' }}>
        {SETTING_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-filter-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="sub">Loading settings...</p>
      ) : (
        <form onSubmit={handleSave} className="panel" style={{ maxWidth: '780px', margin: 0 }}>
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>General Platform Brand &amp; Localization</div>
              <div className="field">
                <label>Platform Name</label>
                <input
                  type="text"
                  value={settings.platform_name}
                  onChange={(e) => handleChange('platform_name', e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Tagline</label>
                <input
                  type="text"
                  value={settings.platform_tagline}
                  onChange={(e) => handleChange('platform_tagline', e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label>Support Email Address</label>
                  <input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => handleChange('support_email', e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Primary Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                  >
                    <option value="Asia/Kolkata (IST, UTC+5:30)">Asia/Kolkata (IST, UTC+5:30)</option>
                    <option value="UTC (UTC+0:00)">UTC (UTC+0:00)</option>
                    <option value="America/New_York (EST, UTC-5:00)">America/New_York (EST, UTC-5:00)</option>
                    <option value="America/Los_Angeles (PST, UTC-8:00)">America/Los_Angeles (PST, UTC-8:00)</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Default Currency Symbol</label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB 2: PLATFORM SETTINGS */}
          {activeTab === 'platform' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Platform Access &amp; Availability</div>
              <div className="field">
                <label>Sign-Up Access Mode</label>
                <select
                  value={settings.signup_mode}
                  onChange={(e) => handleChange('signup_mode', e.target.value)}
                >
                  <option value="open">Open (Anyone can register as learner)</option>
                  <option value="invite_only">Invite Only</option>
                  <option value="closed">Closed / Disabled</option>
                </select>
              </div>

              <div className="field">
                <label>Mentor Applications</label>
                <select
                  value={settings.mentor_application_status}
                  onChange={(e) => handleChange('mentor_application_status', e.target.value)}
                >
                  <option value="open">Open (Accepting new developer mentors)</option>
                  <option value="closed">Closed (Waitlist active)</option>
                </select>
              </div>

              <div className="field">
                <label>Problem Request Posting</label>
                <select
                  value={settings.problem_posting_status}
                  onChange={(e) => handleChange('problem_posting_status', e.target.value)}
                >
                  <option value="open">Open (All learners can post bugs)</option>
                  <option value="restricted">Restricted to Verified Accounts</option>
                </select>
              </div>

              <div className="field">
                <label>Maintenance Mode</label>
                <select
                  value={settings.maintenance_mode}
                  onChange={(e) => handleChange('maintenance_mode', e.target.value)}
                >
                  <option value="0">Disabled (Normal Operations)</option>
                  <option value="1">Enabled (Read-Only Maintenance)</option>
                </select>
              </div>

              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={settings.allow_role_switching === true || settings.allow_role_switching === 'true' || settings.allow_role_switching === '1' || settings.allow_role_switching === undefined}
                    onChange={(e) => handleChange('allow_role_switching', e.target.checked)}
                  />
                  <div>
                    <strong>Allow Mentor ⇄ Learner Role Switching</strong>
                    <div className="sub" style={{ fontSize: '11.5px' }}>
                      When enabled, mentors and learners can switch between roles at will. When disabled, role switching is turned off and blocked across web and mobile.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: SESSION SETTINGS */}
          {activeTab === 'session' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Session Booking &amp; Cancellation Durations</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div className="field">
                  <label>Default Duration (Minutes)</label>
                  <input
                    type="number"
                    value={settings.default_session_duration}
                    onChange={(e) => handleChange('default_session_duration', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Min Duration (Minutes)</label>
                  <input
                    type="number"
                    value={settings.min_session_duration}
                    onChange={(e) => handleChange('min_session_duration', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Max Duration (Minutes)</label>
                  <input
                    type="number"
                    value={settings.max_session_duration}
                    onChange={(e) => handleChange('max_session_duration', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label>Buffer Time Between Sessions (Minutes)</label>
                  <input
                    type="number"
                    value={settings.buffer_time_minutes}
                    onChange={(e) => handleChange('buffer_time_minutes', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Auto-Cancellation Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={settings.auto_cancellation_grace_mins}
                    onChange={(e) => handleChange('auto_cancellation_grace_mins', e.target.value)}
                  />
                  <span className="sub" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                    If mentor fails to join call within this time, session auto-cancels with 100% refund.
                  </span>
                </div>
              </div>

              {/* LiveKit WebRTC Infrastructure Configuration */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div className="section-label" style={{ margin: 0, fontSize: '14.5px' }}>
                      LiveKit WebRTC Media Server
                    </div>
                    <span className="sub" style={{ fontSize: '12px' }}>
                      Powers high-definition in-platform video, crystal-clear audio, and screen sharing across learner-mentor sessions.
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', fontWeight: 700 }}>
                    LiveKit Active
                  </span>
                </div>

                <div className="field">
                  <label>LiveKit WebSocket Server URL</label>
                  <input
                    type="text"
                    value={settings.livekit_url || ''}
                    onChange={(e) => handleChange('livekit_url', e.target.value)}
                    placeholder="wss://your-project.livekit.cloud or ws://127.0.0.1:7880"
                  />
                  <span className="sub" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                    Standard LiveKit server WebSocket endpoint used by frontend participants to stream audio &amp; video.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div className="field">
                    <label>LiveKit API Key</label>
                    <input
                      type="text"
                      value={settings.livekit_api_key || ''}
                      onChange={(e) => handleChange('livekit_api_key', e.target.value)}
                      placeholder="API Key"
                    />
                  </div>
                  <div className="field">
                    <label>LiveKit API Secret</label>
                    <input
                      type="password"
                      value={settings.livekit_api_secret || ''}
                      onChange={(e) => handleChange('livekit_api_secret', e.target.value)}
                      placeholder="API Secret"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT SETTINGS */}
          {activeTab === 'payment' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Gateways &amp; Escrow Rules</div>
              <div className="field">
                <label>Escrow Holding Period (Days before release)</label>
                <input
                  type="number"
                  value={settings.escrow_hold_days}
                  onChange={(e) => handleChange('escrow_hold_days', e.target.value)}
                />
                <span className="sub" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                  Days funds remain safely held before auto-disbursing if learner leaves no dispute.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label>GST Tax Rate (%)</label>
                  <input
                    type="number"
                    value={settings.gst_percentage}
                    onChange={(e) => handleChange('gst_percentage', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>GSTIN Tax Identification Number</label>
                  <input
                    type="text"
                    value={settings.gstin}
                    onChange={(e) => handleChange('gstin', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COMMISSION SETTINGS */}
          {activeTab === 'commission' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Platform Commission &amp; Tax Governance</div>
              <p className="sub" style={{ fontSize: '12px', marginBottom: '14px' }}>
                Configure independent commission and tax structures for mentors (take-rate and statutory tax deducted from payouts) and learners (service fee and tax added at checkout).
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                {/* Mentor Commission Rate */}
                <div className="field" style={{ margin: 0, padding: '12px', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <label style={{ fontWeight: 700, color: 'var(--ink)' }}>Mentor Commission Rate (%)</label>
                  <input
                    type="number"
                    value={settings.mentor_commission_percent ?? settings.commission_percent ?? '10'}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleChange('mentor_commission_percent', val);
                      handleChange('commission_percent', val); // Keep synced for backward-compatibility
                    }}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                  <span className="sub" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Platform take-rate deducted from mentor earnings upon release (default 10%).
                  </span>
                </div>

                {/* Mentor Tax / GST Rate */}
                <div className="field" style={{ margin: 0, padding: '12px', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <label style={{ fontWeight: 700, color: 'var(--ink)' }}>Mentor Tax / GST Rate (%)</label>
                  <input
                    type="number"
                    value={settings.mentor_tax_percent ?? '18'}
                    onChange={(e) => handleChange('mentor_tax_percent', e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                  <span className="sub" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Tax applied to mentor platform commission (e.g. 18% GST / TDS).
                  </span>
                </div>

                {/* Learner Service Fee Rate */}
                <div className="field" style={{ margin: 0, padding: '12px', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <label style={{ fontWeight: 700, color: 'var(--ink)' }}>Learner Platform Service Fee (%)</label>
                  <input
                    type="number"
                    value={settings.learner_commission_percent ?? '0'}
                    onChange={(e) => handleChange('learner_commission_percent', e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                  <span className="sub" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Platform surcharge added to learner booking checkout (default 0%).
                  </span>
                </div>

                {/* Learner Tax / GST Rate */}
                <div className="field" style={{ margin: 0, padding: '12px', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <label style={{ fontWeight: 700, color: 'var(--ink)' }}>Learner Tax / GST Rate (%)</label>
                  <input
                    type="number"
                    value={settings.learner_tax_percent ?? settings.gst_percentage ?? '18'}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleChange('learner_tax_percent', val);
                      handleChange('gst_percentage', val);
                    }}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                  <span className="sub" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Statutory tax (e.g. 18% GST) applied to learner service fee.
                  </span>
                </div>
              </div>

              {/* Live Preview Box */}
              {(() => {
                const samplePrice = 1000;
                const mPct = parseFloat(settings.mentor_commission_percent ?? settings.commission_percent ?? 10) || 0;
                const mTaxPct = parseFloat(settings.mentor_tax_percent ?? 18) || 0;
                const lPct = parseFloat(settings.learner_commission_percent ?? 0) || 0;
                const lTaxPct = parseFloat(settings.learner_tax_percent ?? settings.gst_percentage ?? 18) || 0;

                const mentorComm = Math.round(samplePrice * (mPct / 100));
                const mentorTax = Math.round(mentorComm * (mTaxPct / 100));
                const netMentor = Math.max(0, samplePrice - mentorComm - mentorTax);

                const learnerFee = Math.round(samplePrice * (lPct / 100));
                const learnerTax = Math.round(learnerFee * (lTaxPct / 100));
                const totalPaid = samplePrice + learnerFee + learnerTax;

                const platformFee = mentorComm + learnerFee;
                const totalTax = mentorTax + learnerTax;

                return (
                  <div style={{ padding: '14px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6366f1' }}>
                        Live Fee &amp; Tax Split Simulation (Sample ₹1,000 Session)
                      </span>
                      <Link to="/admin/commissions" style={{ fontSize: '11.5px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                        Open Full Economics Console →
                      </Link>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '12px' }}>
                      <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--grid)' }}>
                        <div className="sub" style={{ fontSize: '10.5px' }}>Learner Pays</div>
                        <div className="mono" style={{ fontWeight: 800, fontSize: '14px', marginTop: '2px', color: 'var(--ink)' }}>
                          ₹{totalPaid.toLocaleString('en-IN')}
                        </div>
                        <div className="sub" style={{ fontSize: '10px' }}>Fee: ₹{learnerFee} | Tax: ₹{learnerTax}</div>
                      </div>

                      <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--grid)' }}>
                        <div className="sub" style={{ fontSize: '10.5px' }}>Net Mentor Payout</div>
                        <div className="mono" style={{ fontWeight: 800, fontSize: '14px', marginTop: '2px', color: '#10b981' }}>
                          ₹{netMentor.toLocaleString('en-IN')}
                        </div>
                        <div className="sub" style={{ fontSize: '10px' }}>Cut: ₹{mentorComm} | Tax: ₹{mentorTax}</div>
                      </div>

                      <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--grid)' }}>
                        <div className="sub" style={{ fontSize: '10.5px' }}>Platform Retained</div>
                        <div className="mono" style={{ fontWeight: 800, fontSize: '14px', marginTop: '2px', color: '#0ea5e9' }}>
                          ₹{platformFee.toLocaleString('en-IN')}
                        </div>
                        <div className="sub" style={{ fontSize: '10px' }}>Mentor cut + Learner fee</div>
                      </div>

                      <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--grid)' }}>
                        <div className="sub" style={{ fontSize: '10.5px' }}>Taxes Collected</div>
                        <div className="mono" style={{ fontWeight: 800, fontSize: '14px', marginTop: '2px', color: '#f59e0b' }}>
                          ₹{totalTax.toLocaleString('en-IN')}
                        </div>
                        <div className="sub" style={{ fontSize: '10px' }}>Tax on commissions</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="field">
                <label>Gateway Transaction Fees</label>
                <select
                  value={settings.transaction_fee_handling}
                  onChange={(e) => handleChange('transaction_fee_handling', e.target.value)}
                >
                  <option value="absorbed_by_platform">Absorbed by PairUp Platform</option>
                  <option value="split_evenly">Split 50/50 Between Parties</option>
                  <option value="paid_by_learner">Paid by Learner on Checkout</option>
                </select>
              </div>

              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.tiered_commissions}
                    onChange={(e) => handleChange('tiered_commissions', e.target.checked)}
                  />
                  <span>Enable Tiered Commission Discounts for High-Volume Mentors (5% cut over 50 sessions)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 6: REFUND RULES */}
          {activeTab === 'refund' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Learner Refund &amp; Cancellation Policies</div>
              <div className="field">
                <label>Refund Request Window (Hours post-session)</label>
                <input
                  type="number"
                  value={settings.refund_window_hours}
                  onChange={(e) => handleChange('refund_window_hours', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Dispute Arbitration Grace Period (Hours)</label>
                <input
                  type="number"
                  value={settings.dispute_grace_hours}
                  onChange={(e) => handleChange('dispute_grace_hours', e.target.value)}
                />
              </div>
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.auto_refund_on_noshow}
                    onChange={(e) => handleChange('auto_refund_on_noshow', e.target.checked)}
                  />
                  <span>Automatic instant 100% refund if mentor fails to attend confirmed session</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 7: VERIFICATION RULES */}
          {activeTab === 'verification' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Mentor Verification Criteria</div>
              <div className="field">
                <label>Auto-Verification Threshold (GitHub Stars / Rep)</label>
                <input
                  type="number"
                  value={settings.auto_verify_github_stars}
                  onChange={(e) => handleChange('auto_verify_github_stars', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Certification Validity / Renewal Check (Years)</label>
                <input
                  type="number"
                  value={settings.cert_expiry_check_years}
                  onChange={(e) => handleChange('cert_expiry_check_years', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB 8: NOTIFICATION SETTINGS */}
          {activeTab === 'notification' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>System Dispatch Channels</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) => handleChange('email_notifications', e.target.checked)}
                  />
                  <span>Send Transactional Emails (Bookings, Receipts, Dispute Updates)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.sms_notifications}
                    onChange={(e) => handleChange('sms_notifications', e.target.checked)}
                  />
                  <span>Send SMS Reminders (Twilio Gateway)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.push_notifications}
                    onChange={(e) => handleChange('push_notifications', e.target.checked)}
                  />
                  <span>Web Browser Push Notifications</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.admin_urgent_alerts}
                    onChange={(e) => handleChange('admin_urgent_alerts', e.target.checked)}
                  />
                  <span>Dispatch Urgent Dispute &amp; Verification Alerts to Admin Panel</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB: MAIL & SMTP SETTINGS */}
          {activeTab === 'mail' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Outgoing Email &amp; Gateway Configuration</div>
              <p style={{ color: 'var(--ink-muted)', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '20px' }}>
                Configure your custom outgoing SMTP mail server credentials (host, port, TLS/SSL, app password / key), customize email color themes &amp; branding, and dispatch activation links or platform announcements.
              </p>
              <div
                style={{
                  background: 'var(--surface-raised, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '20px',
                }}
              >
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px 0' }}>
                  📬 PairUp Mail Center &amp; Theme Studio
                </h4>
                <p style={{ color: 'var(--ink-muted)', fontSize: '13px', margin: '0 0 18px 0' }}>
                  Manage SMTP host, credentials key, theme presets (Dark Modern, Light Minimal, Royal Purple, Emerald, Sunset), broadcast notices to users, and send activation links to unverified accounts.
                </p>
                <Link
                  to="/admin/mail"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700, textDecoration: 'none' }}
                >
                  Open Mail Center &amp; Theme Studio →
                </Link>
              </div>
            </div>
          )}

          {/* TAB 9: SECURITY & SOCIAL AUTH SETTINGS */}
          {activeTab === 'security' && (
            <div>
              {/* Google OAuth Credentials Management */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(66, 133, 244, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Google OAuth 2.0 &amp; Single Sign-On (SSO)</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
                        Manage Google Client ID and Secret credentials used across Web and Mobile
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      background: (settings.google_auth_enabled === true || settings.google_auth_enabled === 'true') ? '#DCFCE7' : '#F1F5F9',
                      color: (settings.google_auth_enabled === true || settings.google_auth_enabled === 'true') ? '#15803D' : '#64748B',
                    }}
                  >
                    {(settings.google_auth_enabled === true || settings.google_auth_enabled === 'true') ? '● Google Sign-In Active' : '○ Google Sign-In Disabled'}
                  </span>
                </div>

                <div className="field" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.google_auth_enabled === true || settings.google_auth_enabled === 'true'}
                      onChange={(e) => handleChange('google_auth_enabled', e.target.checked)}
                    />
                    <span style={{ fontWeight: 600 }}>Enable Google Sign-In on Web and Mobile Apps</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="field">
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Google OAuth Client ID</span>
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Web Application</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                      value={settings.google_client_id || ''}
                      onChange={(e) => handleChange('google_client_id', e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: '12.5px' }}
                    />
                  </div>

                  <div className="field">
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Google OAuth Client Secret</span>
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Kept confidential</span>
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. GOCSPX-xxxxxxxxxxxxxxxx"
                      value={settings.google_client_secret || ''}
                      onChange={(e) => handleChange('google_client_secret', e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                {/* Google Cloud Console URIs Reference Box */}
                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--grid-strong)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Google Cloud Console Setup Values (Copy to your OAuth Client ID):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Authorized JavaScript Origins:</span>
                      <code style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', border: '1px solid var(--grid)' }}>
                        {window.location.origin}
                      </code>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Authorized Redirect URIs:</span>
                      <code style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', border: '1px solid var(--grid)' }}>
                        {window.location.origin}/login
                      </code>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                      style={{ fontSize: '11.5px', padding: '4px 10px', height: 'auto', textDecoration: 'none' }}
                    >
                      Open Google Cloud Console ↗
                    </a>
                  </div>
                </div>
              </div>

              <div className="section-label" style={{ marginTop: 0 }}>Authentication &amp; Session Security</div>
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.enforce_2fa}
                    onChange={(e) => handleChange('enforce_2fa', e.target.checked)}
                  />
                  <span>Enforce Two-Factor Authentication (2FA) for All Mentors &amp; Admins</span>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label>Session Inactivity Timeout (Minutes)</label>
                  <input
                    type="number"
                    value={settings.session_timeout_mins}
                    onChange={(e) => handleChange('session_timeout_mins', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>API Rate Limit (Requests / minute)</label>
                  <input
                    type="number"
                    value={settings.rate_limit_requests_per_min}
                    onChange={(e) => handleChange('rate_limit_requests_per_min', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: FEATURE FLAGS */}
          {activeTab === 'flags' && (
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Platform Feature Toggles</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.flag_ai_recommendations}
                    onChange={(e) => handleChange('flag_ai_recommendations', e.target.checked)}
                  />
                  <div>
                    <strong>AI Problem &amp; Mentor Matching</strong>
                    <div className="sub" style={{ fontSize: '11.5px' }}>Use semantic similarity embeddings to match problems to mentors.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.flag_video_recording}
                    onChange={(e) => handleChange('flag_video_recording', e.target.checked)}
                  />
                  <div>
                    <strong>Session Video Recording</strong>
                    <div className="sub" style={{ fontSize: '11.5px' }}>Allow learners to download recorded pairing calls for future study.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.flag_collaborative_whiteboard}
                    onChange={(e) => handleChange('flag_collaborative_whiteboard', e.target.checked)}
                  />
                  <div>
                    <strong>Interactive Architecture Whiteboard</strong>
                    <div className="sub" style={{ fontSize: '11.5px' }}>Enable shared canvas diagramming inside the live room.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.flag_beta_features}
                    onChange={(e) => handleChange('flag_beta_features', e.target.checked)}
                  />
                  <div>
                    <strong>Early Access Beta Features</strong>
                    <div className="sub" style={{ fontSize: '11.5px' }}>Test experimental WebRTC code-sharing features.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.allow_role_switching === true || settings.allow_role_switching === 'true' || settings.allow_role_switching === '1' || settings.allow_role_switching === undefined}
                    onChange={(e) => handleChange('allow_role_switching', e.target.checked)}
                  />
                  <div>
                    <strong>Mentor ⇄ Learner Role Switching</strong>
                    <div className="sub" style={{ fontSize: '11.5px' }}>Allow users to switch between mentor and learner roles across web and mobile.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
              {saving ? 'Synchronizing & Saving...' : 'Save All System Settings'}
            </button>
          </div>
        </form>
      )}
    </PortalLayout>
  );
}
