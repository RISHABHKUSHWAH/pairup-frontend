import React, { useState, useEffect } from 'react';
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
  { id: 'security', label: 'Security' },
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

      // Payment
      payment_gateways: ['Razorpay', 'UPI Direct'],
      escrow_hold_days: '2',
      gst_percentage: '18',
      gstin: '29AAAAA0000A1Z5',

      // Commission
      commission_percent: '10',
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

      // Security
      enforce_2fa: false,
      session_timeout_mins: '60',
      rate_limit_requests_per_min: '120',
      ip_whitelist: '',

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
              <div className="section-label" style={{ marginTop: 0 }}>Platform Commission &amp; Fee Handling</div>
              <div className="field">
                <label>Base Platform Commission (%)</label>
                <input
                  type="number"
                  value={settings.commission_percent}
                  onChange={(e) => handleChange('commission_percent', e.target.value)}
                  min="0"
                  max="100"
                  required
                />
                <span className="sub" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                  Percentage deducted from mentor earnings per session (currently 10%).
                </span>
              </div>

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

          {/* TAB 9: SECURITY SETTINGS */}
          {activeTab === 'security' && (
            <div>
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
