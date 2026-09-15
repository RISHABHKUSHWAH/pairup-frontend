import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context';
import { UserIcon, RefreshIcon, CodeIcon, MailIcon, UsersIcon } from '../../components/Icons';
import { mentorPayoutSettings } from '../../api/client';
import { adminSupport } from '../../api/storage/adminStorage';

export default function MentorSettingsPage() {
  const { user, switchRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('account');

  // 1. Account Settings
  const [accountInfo, setAccountInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState({
    github: false,
    google: false,
    linkedin: false,
  });

  // 2. Preferences
  const [preferences, setPreferences] = useState({
    language: 'English',
    timezone: 'Asia/Kolkata (IST, UTC+05:30)',
    defaultEditor: 'VS Code Web / Monaco',
    autoVideo: true,
    communicationStyle: 'Collaborative & Code-First',
  });

  // 3. Notifications
  const [notifications, setNotifications] = useState({
    newProblems: true,
    proposalAccepted: true,
    directMessages: true,
    sessionReminders: true,
    paymentAlerts: true,
    reviewReceived: true,
  });

  // 4. Privacy & Security
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [sessionsList, setSessionsList] = useState([
    { id: 's1', device: 'Current Browser Session', ip: '127.0.0.1', location: 'Current Location', active: true },
  ]);

  // 5. Payouts & Billing
  const [payoutData, setPayoutData] = useState(() => {
    try {
      return (mentorPayoutSettings && mentorPayoutSettings.getPayoutMethod(user)) || {
        bankName: '',
        holderName: '',
        accountNumber: '',
        ifsc: '',
        upiId: '',
        payoutSchedule: 'weekly',
        pan: '',
        gstin: '',
      };
    } catch {
      return {
        bankName: '',
        holderName: '',
        accountNumber: '',
        ifsc: '',
        upiId: '',
        payoutSchedule: 'weekly',
        pan: '',
        gstin: '',
      };
    }
  });

  // 6. Support & FAQ
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportCategory, setSupportCategory] = useState('Mentor Partner Support');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeReason, setDisputeReason] = useState('');

  // 7. Delete Account Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setAccountInfo((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
      try {
        if (mentorPayoutSettings) {
          const storedPayout = mentorPayoutSettings.getPayoutMethod(user);
          if (storedPayout) {
            setPayoutData((prev) => ({ ...prev, ...storedPayout }));
          }
        }
      } catch {}
    }
  }, [user]);

  const showSaveSuccess = (msg = 'Settings saved successfully!') => {
    toast.success(msg);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPasswordModalOpen(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showSaveSuccess('Password updated successfully!');
  };

  const handleSavePayout = (e) => {
    e.preventDefault();
    mentorPayoutSettings.savePayoutMethod(payoutData, user?.id);
    showSaveSuccess('Payout method and tax information saved!');
  };

  const handleTerminateSession = (id) => {
    setSessionsList((prev) => prev.filter((s) => s.id !== id));
    showSaveSuccess('Session terminated successfully.');
  };

  return (
    <PortalLayout
      title="Mentor Settings"
      portalType="mentor"
      actions={
        <Link to="/mentor/profile" className="btn btn-secondary" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <UserIcon size={14} /> Edit Mentor Resume
        </Link>
      }
    >
      <p className="sub" style={{ maxWidth: '820px', marginBottom: '20px' }}>
        Configure your account credentials, preferences, notifications, security, linked bank payouts, and support.
      </p>

      {/* Tab bar */}
      <div className="filter-bar" style={{ maxWidth: '820px', marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Privacy &amp; Security
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          Payouts &amp; Billing
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => setActiveTab('support')}
        >
          Support &amp; Help
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'role' ? 'active' : ''}`}
          onClick={() => setActiveTab('role')}
        >
          Switch Mode
        </button>
      </div>

      <div style={{ maxWidth: '820px' }}>
        {/* TAB 1: ACCOUNT */}
        {activeTab === 'account' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Personal &amp; Contact Info</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={accountInfo.name}
                  onChange={(e) => setAccountInfo({ ...accountInfo, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input
                  type="email"
                  value={accountInfo.email}
                  onChange={(e) => setAccountInfo({ ...accountInfo, email: e.target.value })}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: '20px' }}>
              <label>Phone Number (for SMS Session Reminders)</label>
              <input
                type="tel"
                value={accountInfo.phone}
                onChange={(e) => setAccountInfo({ ...accountInfo, phone: e.target.value })}
              />
            </div>

            {/* Password section */}
            <div style={{ padding: '16px', background: 'var(--card-bg, #1a1a24)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Account Password</div>
                <div className="sub" style={{ fontSize: '12px' }}>Last updated 3 months ago</div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px' }}
                onClick={() => setPasswordModalOpen(true)}
              >
                Change Password
              </button>
            </div>

            {/* Connected Accounts */}
            <div className="section-label">Connected Accounts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--panel-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--muted)' }}><CodeIcon size={18} /></span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>GitHub</div>
                    <div className="sub" style={{ fontSize: '11px' }}>Linked to @alexrivera-dev</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '12px' }}
                  onClick={() => setConnectedAccounts((c) => ({ ...c, github: !c.github }))}
                >
                  {connectedAccounts.github ? 'Connected' : 'Connect'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--panel-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--muted)' }}><MailIcon size={18} /></span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Google Account</div>
                    <div className="sub" style={{ fontSize: '11px' }}>alex.mentor@gmail.com</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '12px' }}
                  onClick={() => setConnectedAccounts((c) => ({ ...c, google: !c.google }))}
                >
                  {connectedAccounts.google ? 'Connected' : 'Connect'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--panel-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--muted)' }}><UsersIcon size={18} /></span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>LinkedIn</div>
                    <div className="sub" style={{ fontSize: '11px' }}>Verify engineering work history</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                  onClick={() => setConnectedAccounts((c) => ({ ...c, linkedin: !c.linkedin }))}
                >
                  {connectedAccounts.linkedin ? 'Connected' : 'Connect LinkedIn'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-primary" onClick={() => showSaveSuccess('Account information updated!')}>
                Save Account Info
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Platform &amp; Session Preferences</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="field">
                <label>Interface Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="French">French (Français)</option>
                </select>
              </div>

              <div className="field">
                <label>Default Timezone</label>
                <select
                  value={preferences.timezone}
                  onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                >
                  <option value="Asia/Kolkata (IST, UTC+05:30)">Asia/Kolkata (IST, UTC+05:30)</option>
                  <option value="UTC (UTC+00:00)">UTC (UTC+00:00)</option>
                  <option value="America/New_York (EST, UTC-05:00)">America/New_York (EST, UTC-05:00)</option>
                  <option value="America/Los_Angeles (PST, UTC-08:00)">America/Los_Angeles (PST, UTC-08:00)</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Default Collaborative Editor in Session Room</label>
              <select
                value={preferences.defaultEditor}
                onChange={(e) => setPreferences({ ...preferences, defaultEditor: e.target.value })}
              >
                <option value="VS Code Web / Monaco">VS Code Web / Monaco (Syntax highlighting, autocomplete)</option>
                <option value="Minimal Markdown & Terminal">Minimal Markdown & Terminal View</option>
                <option value="Live Screen Sharing Only">Live Screen Sharing Only</option>
              </select>
            </div>

            <div className="field">
              <label>Communication & Pairing Style</label>
              <select
                value={preferences.communicationStyle}
                onChange={(e) => setPreferences({ ...preferences, communicationStyle: e.target.value })}
              >
                <option value="Collaborative & Code-First">Collaborative & Code-First (Driver & Navigator)</option>
                <option value="Deep Conceptual & Whiteboard">Deep Conceptual & Whiteboard / Architecture</option>
                <option value="Rapid Bug Solving">Rapid Bug Solving & Root Cause Diagnosis</option>
              </select>
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  checked={preferences.autoVideo}
                  onChange={(e) => setPreferences({ ...preferences, autoVideo: e.target.checked })}
                />
                <span style={{ fontSize: '13px' }}>Automatically enable video and audio when joining session room</span>
              </label>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-primary" onClick={() => showSaveSuccess('Preferences updated!')}>
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Alerts &amp; Notification Preferences</div>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '16px' }}>
              Control what alerts you receive via email, in-app notifications, and browser push.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'newProblems', title: 'New Problem Requests', desc: 'Alert when a learner posts a problem matching your skills' },
                { key: 'proposalAccepted', title: 'Proposal Status Updates', desc: 'Alert when a learner accepts or declines your proposal' },
                { key: 'directMessages', title: 'Direct Messages & Chat', desc: 'Notify immediately when a learner sends a new chat message' },
                { key: 'sessionReminders', title: 'Session Reminders', desc: 'Send reminders 1 hour and 15 minutes before scheduled pairing' },
                { key: 'paymentAlerts', title: 'Payment & Payout Alerts', desc: 'Notify when escrow is released and payouts are processed' },
                { key: 'reviewReceived', title: 'New Review & Rating Received', desc: 'Alert when a learner leaves feedback on a completed session' },
              ].map((item) => (
                <div
                  key={item.key}
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
                    <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{item.title}</div>
                    <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-primary" onClick={() => showSaveSuccess('Notification preferences saved!')}>
                Save Notification Settings
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: PRIVACY & SECURITY */}
        {activeTab === 'security' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Security, 2FA &amp; Active Logins</div>

            {/* 2FA */}
            <div style={{ padding: '16px', background: 'var(--card-bg, #1a1a24)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Two-Factor Authentication (2FA)
                  {twoFactorEnabled && <span className="badge badge-success" style={{ fontSize: '10px' }}>Enabled</span>}
                </div>
                <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                  Secure your mentor account with Authenticator app TOTP verification.
                </div>
              </div>
              <button
                type="button"
                className={`btn ${twoFactorEnabled ? 'btn-ghost' : 'btn-secondary'}`}
                style={{ fontSize: '12px' }}
                onClick={() => {
                  if (twoFactorEnabled) {
                    setTwoFactorEnabled(false);
                    showSaveSuccess('Two-factor authentication disabled.');
                  } else {
                    setTwoFactorModalOpen(true);
                  }
                }}
              >
                {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            </div>

            {/* Profile Visibility */}
            <div className="field" style={{ marginBottom: '20px' }}>
              <label>Profile Visibility on Explore Mentors</label>
              <select
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value)}
              >
                <option value="public">Public (Visible in search & recommend to learners)</option>
                <option value="unlisted">Unlisted (Accessible only via direct profile link)</option>
                <option value="pause">Pause Requests (Temporarily hide from search while busy)</option>
              </select>
            </div>

            {/* Active Sessions */}
            <div className="section-label">Active Login Sessions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {sessionsList.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--panel-bg)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>
                      {s.device} {s.active && <span className="badge badge-primary" style={{ fontSize: '10px', marginLeft: '6px' }}>Current</span>}
                    </div>
                    <div className="sub" style={{ fontSize: '11px', margin: '2px 0 0' }}>
                      IP: {s.ip} • Location: {s.location}
                    </div>
                  </div>
                  {!s.active && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: 'var(--danger, #ef4444)', fontSize: '12px' }}
                      onClick={() => handleTerminateSession(s.id)}
                    >
                      Log Out
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <button type="button" className="btn btn-primary" onClick={() => showSaveSuccess('Security settings updated!')}>
                Save Security Settings
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: PAYOUTS & BILLING */}
        {activeTab === 'payouts' && (
          <form onSubmit={handleSavePayout} className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Bank Account &amp; Tax Information</div>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '16px' }}>
              All mentorship session payouts are deposited directly to your bank account or UPI ID.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div className="field">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={payoutData?.bankName || ''}
                  onChange={(e) => setPayoutData({ ...payoutData, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                  required
                />
              </div>

              <div className="field">
                <label>Account Holder Name</label>
                <input
                  type="text"
                  value={payoutData?.holderName || ''}
                  onChange={(e) => setPayoutData({ ...payoutData, holderName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div className="field">
                <label>Bank Account Number</label>
                <input
                  type="text"
                  value={payoutData?.accountNumber || ''}
                  onChange={(e) => setPayoutData({ ...payoutData, accountNumber: e.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label>IFSC Code</label>
                <input
                  type="text"
                  value={payoutData?.ifsc || ''}
                  onChange={(e) => setPayoutData({ ...payoutData, ifsc: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div className="field">
                <label>UPI ID (for instant micro-payouts)</label>
                <input
                  type="text"
                  value={payoutData?.upiId || ''}
                  onChange={(e) => setPayoutData({ ...payoutData, upiId: e.target.value })}
                  placeholder="e.g. username@upi"
                />
              </div>

              <div className="field">
                <label>Auto-Payout Frequency Schedule</label>
                <select
                  value={payoutData?.payoutSchedule || 'weekly'}
                  onChange={(e) => setPayoutData({ ...payoutData, payoutSchedule: e.target.value })}
                >
                  <option value="weekly">Weekly (Every Friday)</option>
                  <option value="biweekly">Bi-weekly (1st and 15th)</option>
                  <option value="monthly">Monthly (End of month)</option>
                  <option value="manual">Manual Payout Requests Only</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="field">
                <label>PAN Card Number (for TDS & 1099 Tax compliance)</label>
                <input
                  type="text"
                  value={payoutData?.pan || ''}
                  onChange={(e) => setPayoutData({ ...payoutData, pan: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="field">
                <label>GSTIN (Optional, for registered businesses)</label>
                <input
                  type="text"
                  value={payoutData?.gstin || ''}
                  onChange={(e) => setPayoutData({ ...payoutData, gstin: e.target.value.toUpperCase() })}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
            </div>

            <div>
              <button type="submit" className="btn btn-primary">
                Save Payout Method
              </button>
            </div>
          </form>
        )}

        {/* TAB 6: SUPPORT & HELP */}
        {activeTab === 'support' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Mentor Help Center &amp; Support</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: 'var(--card-bg, #1a1a24)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Contact Mentor Partner Team</div>
                <p className="sub" style={{ fontSize: '12px', margin: '0 0 12px' }}>
                  Have questions about payouts, dispute resolutions, or onboarding? Talk to our mentor community lead.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '12px' }}
                    onClick={() => setSupportModalOpen(true)}
                  >
                    Contact Support
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '12px' }}
                    onClick={() => window.dispatchEvent(new CustomEvent('pairup_open_support_ticket'))}
                  >
                    View All Tickets &amp; Replies
                  </button>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'var(--card-bg, #1a1a24)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Dispute or Session Issue</div>
                <p className="sub" style={{ fontSize: '12px', margin: '0 0 12px' }}>
                  Did a learner fail to show up or report an improper request? Raise a formal dispute for investigation.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                  onClick={() => setDisputeModalOpen(true)}
                >
                  Report an Issue
                </button>
              </div>
            </div>

            {/* FAQ Accordion */}
            <div className="section-label">Frequently Asked Questions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <details style={{ padding: '10px 14px', background: 'var(--panel-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <summary style={{ fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  How and when are escrow payments released?
                </summary>
                <p className="sub" style={{ fontSize: '12.5px', marginTop: '8px', lineHeight: 1.5 }}>
                  When a session concludes, the funds held in escrow are released automatically after 2 hours, or immediately when the learner provides feedback or completes the session.
                </p>
              </details>

              <details style={{ padding: '10px 14px', background: 'var(--panel-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <summary style={{ fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  What happens if a learner doesn't attend a scheduled session?
                </summary>
                <p className="sub" style={{ fontSize: '12.5px', marginTop: '8px', lineHeight: 1.5 }}>
                  If a learner is a no-show for more than 15 minutes, you can click "Mark Completed (No-Show)" and the booking fee is released according to our 100% mentor attendance guarantee policy.
                </p>
              </details>

              <details style={{ padding: '10px 14px', background: 'var(--panel-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <summary style={{ fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  What is the PairUp platform fee?
                </summary>
                <p className="sub" style={{ fontSize: '12.5px', marginTop: '8px', lineHeight: 1.5 }}>
                  PairUp charges a flat 10% platform commission on completed mentorship sessions. This covers high-definition WebRTC video infrastructure, automated escrow protection, and payment processing fees.
                </p>
              </details>
            </div>
          </div>
        )}

        {/* TAB 7: ROLE SWITCH */}
        {activeTab === 'role' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Account Mode &amp; Switching</div>

            <div
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(139, 92, 246, 0.08))',
                borderRadius: '8px',
                border: '1px solid var(--brand)',
              }}
            >
            {user?.allow_role_switching !== false && user?.allow_role_switching !== 'false' ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>Current Mode: Mentor</div>
                  <p className="sub" style={{ fontSize: '13px', margin: '4px 0 0', maxWidth: '480px' }}>
                    Want to learn new skills, ask questions, or book other expert engineers? You can switch seamlessly to Learner mode at any time without losing your mentor profile or proposals.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '13.5px', padding: '8px 18px' }}
                  onClick={async () => {
                    try {
                      await switchRole('learner');
                      navigate('/learner/dashboard');
                    } catch (err) {
                      toast.error('Could not switch to learner mode: ' + err.message);
                    }
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshIcon size={14} /> Switch to Learner Mode
                  </span>
                </button>
              </div>
            ) : (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border, rgba(255,255,255,0.08))',
                  opacity: 0.85,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-muted, #888)' }}>Role Switching Disabled</div>
                <p className="sub" style={{ fontSize: '13px', margin: '4px 0 0' }}>
                  Role switching between mentor and learner has been disabled by the platform administrator.
                </p>
              </div>
            )}
            </div>

            {/* Danger Zone: Delete Account */}
            <div style={{ padding: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.04)' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--danger, #ef4444)' }}>
                Danger Zone: Delete Account
              </div>
              <p className="sub" style={{ fontSize: '12px', margin: '4px 0 12px' }}>
                Permanently close your account, remove your public profile, and forfeit unwithdrawn balances.
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: 'var(--danger, #ef4444)', borderColor: 'var(--danger, #ef4444)', fontSize: '12px' }}
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Change Password"
      >
        <form onSubmit={handlePasswordSubmit}>
          <div className="field">
            <label>Current Password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setPasswordModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Update Password
            </button>
          </div>
        </form>
      </Modal>

      {/* 2FA Modal */}
      <Modal
        isOpen={twoFactorModalOpen}
        onClose={() => setTwoFactorModalOpen(false)}
        title="Set Up Two-Factor Authentication"
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <p className="sub" style={{ fontSize: '13px' }}>
            Scan this QR code with Google Authenticator or 1Password, then enter the 6-digit code.
          </p>
          <div
            style={{
              width: '140px',
              height: '140px',
              margin: '16px auto',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            [ QR Code Simulation ]
          </div>
          <div className="field" style={{ maxWidth: '200px', margin: '0 auto 16px' }}>
            <input type="text" placeholder="6-digit code" maxLength={6} style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '16px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setTwoFactorModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                setTwoFactorEnabled(true);
                setTwoFactorModalOpen(false);
                showSaveSuccess('Two-factor authentication successfully enabled!');
              }}
            >
              Verify &amp; Enable
            </button>
          </div>
        </div>
      </Modal>

      {/* Support Modal */}
      <Modal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        title="Contact Mentor Support"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!supportSubject.trim() || !supportMessage.trim()) return;

            const ticketId = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
            const newTicket = {
              id: ticketId,
              user_id: user?.id || 'mentor_user',
              user_name: user?.name || user?.username || 'Mentor User',
              user_email: user?.email || 'mentor@example.com',
              user_role: 'mentor',
              subject: supportSubject.trim(),
              category: supportCategory || 'Mentor Partner Support',
              priority: 'Normal',
              status: 'Open',
              date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              description: supportMessage.trim(),
              response: '',
              history: [
                {
                  by: `${user?.name || user?.username || 'Mentor User'} (mentor)`,
                  text: 'Ticket opened from Mentor Portal Settings.',
                  time: new Date().toISOString().replace('T', ' ').slice(0, 16),
                },
              ],
            };

            try {
              adminSupport.createTicket(newTicket);
              const storageKey = `pairup_support_tickets_${user?.id || 'guest'}`;
              const raw = localStorage.getItem(storageKey);
              const list = JSON.parse(raw || '[]');
              localStorage.setItem(storageKey, JSON.stringify([newTicket, ...list]));
            } catch {}

            setSupportModalOpen(false);
            setSupportSubject('');
            setSupportMessage('');
            showSaveSuccess(`Support ticket #${ticketId} created! Our engineering team will review it shortly.`);
          }}
        >
          <div className="field">
            <label>Category</label>
            <select
              value={supportCategory}
              onChange={(e) => setSupportCategory(e.target.value)}
              className="input-select"
            >
              <option value="Mentor Partner Support">Mentor Partner Support</option>
              <option value="Billing & Escrow">Billing &amp; Escrow</option>
              <option value="Live Sessions">Live Sessions</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </div>
          <div className="field">
            <label>Subject</label>
            <input
              type="text"
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              placeholder="e.g. Question about payout schedule"
              required
            />
          </div>
          <div className="field">
            <label>Message</label>
            <textarea
              rows={4}
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Describe what you need assistance with..."
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSupportModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Submit Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        title="Report a Session Dispute"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!disputeReason.trim()) return;

            const ticketId = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
            const newTicket = {
              id: ticketId,
              user_id: user?.id || 'mentor_user',
              user_name: user?.name || user?.username || 'Mentor User',
              user_email: user?.email || 'mentor@example.com',
              user_role: 'mentor',
              subject: `Dispute: ${disputeDetails.trim() || 'Session Issue'}`,
              category: 'Dispute / Escrow',
              priority: 'High',
              status: 'Open',
              date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              description: `Session/Learner Details: ${disputeDetails.trim()}\n\nReason for Dispute:\n${disputeReason.trim()}`,
              response: '',
              history: [
                {
                  by: `${user?.name || user?.username || 'Mentor User'} (mentor)`,
                  text: 'Dispute ticket opened.',
                  time: new Date().toISOString().replace('T', ' ').slice(0, 16),
                },
              ],
            };

            try {
              adminSupport.createTicket(newTicket);
              const storageKey = `pairup_support_tickets_${user?.id || 'guest'}`;
              const raw = localStorage.getItem(storageKey);
              const list = JSON.parse(raw || '[]');
              localStorage.setItem(storageKey, JSON.stringify([newTicket, ...list]));
            } catch {}

            setDisputeModalOpen(false);
            setDisputeDetails('');
            setDisputeReason('');
            showSaveSuccess(`Dispute #${ticketId} submitted for admin review. Escrow funds will remain protected.`);
          }}
        >
          <div className="field">
            <label>Session or Learner Details</label>
            <input
              type="text"
              placeholder="Learner name or session topic"
              value={disputeDetails}
              onChange={(e) => setDisputeDetails(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Nature of Dispute</label>
            <textarea
              rows={4}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain the issue (e.g. learner no-show, improper conduct, scope dispute)..."
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDisputeModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-secondary" style={{ flex: 1, color: 'var(--danger, #ef4444)' }}>
              Submit Dispute
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Account Deletion"
      >
        <div>
          <p style={{ color: 'var(--danger, #ef4444)', fontSize: '13px', lineHeight: 1.5 }}>
            This action cannot be undone. All active proposals will be withdrawn, and your public profile will be permanently deleted.
          </p>
          <div className="field" style={{ marginTop: '12px' }}>
            <label>Type "DELETE" to confirm:</label>
            <input type="text" placeholder="DELETE" />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, color: 'var(--danger, #ef4444)' }}
              onClick={() => {
                toast.info('Account deletion request registered.');
                setDeleteModalOpen(false);
              }}
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </Modal>
    </PortalLayout>
  );
}
