import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context';
import { DownloadIcon, MailIcon, BugIcon, RefreshIcon, ShieldIcon } from '../../components/Icons';
import { adminSupport } from '../../api/storage/adminStorage';

export default function LearnerSettingsPage() {
  const { user, switchRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('account');

  // Account settings
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState({
    google: true,
    github: false,
  });

  // Preferences
  const [prefLanguage, setPrefLanguage] = useState('English');
  const [prefTimezone, setPrefTimezone] = useState('Asia/Kolkata (IST, UTC+5:30)');
  const [currency, setCurrency] = useState('INR');

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
    emailReminders: true,
    emailProposals: true,
    emailMessages: false,
    inAppNotifs: true,
    pushNotifs: true,
  });

  // Privacy & Security
  const [visibility, setVisibility] = useState('public');
  const [blockedMentors] = useState([]);

  // Support & Bug report
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');

  // Delete account modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const showSaveSuccess = (msg = 'Settings updated successfully!') => {
    toast.success(msg);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setPasswordModalOpen(false);
    setOldPassword('');
    setNewPassword('');
    showSaveSuccess('Password updated successfully!');
  };

  const handleDownloadData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        role: user?.role,
      },
      preferences: {
        theme,
        language: prefLanguage,
        timezone: prefTimezone,
        currency,
      },
      notificationPreferences: notifSettings,
      security: {
        twoFactorEnabled,
        visibility,
      },
    };

    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `pairup_learner_data_${user?.id || 'export'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReportBug = (e) => {
    e.preventDefault();
    if (!bugDescription.trim()) return;

    const ticketId = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket = {
      id: ticketId,
      user_id: user?.id || 'learner_user',
      user_name: user?.name || user?.username || 'Learner User',
      user_email: user?.email || 'learner@example.com',
      user_role: 'learner',
      subject: `Bug Report: ${bugDescription.trim().slice(0, 45)}...`,
      category: 'Bug Report',
      priority: 'Normal',
      status: 'Open',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      description: bugDescription.trim(),
      response: '',
      history: [
        {
          by: `${user?.name || user?.username || 'Learner User'} (learner)`,
          text: 'Bug report ticket opened.',
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

    setBugModalOpen(false);
    setBugDescription('');
    toast.success(`Bug report ticket #${ticketId} submitted! Our engineering team will review it.`);
  };

  return (
    <PortalLayout title="Account Settings &amp; Preferences" portalType="learner">
      <p className="sub" style={{ marginBottom: '20px', maxWidth: '640px' }}>
        Configure your security credentials, notification preferences, privacy, display theme, and account type.
      </p>

      {/* Tabs */}
      <div className="admin-filter-tabs">
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy &amp; Data
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => setActiveTab('support')}
        >
          Support &amp; FAQ
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'management' ? 'active' : ''}`}
          onClick={() => setActiveTab('management')}
        >
          Role &amp; Danger
        </button>
      </div>

      <div style={{ maxWidth: '640px' }}>
        {/* 1. Account Settings */}
        {activeTab === 'account' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Account Credentials</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--grid)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Password</div>
                <div className="sub" style={{ margin: 0, fontSize: '12px' }}>Last changed 3 months ago</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPasswordModalOpen(true)}
              >
                Change Password
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--grid)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Two-Factor Authentication (2FA)</div>
                <div className="sub" style={{ margin: 0, fontSize: '12px' }}>
                  {twoFactorEnabled ? 'Enabled with Authenticator App' : 'Not configured yet'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setTwoFactorModalOpen(true)}
              >
                {twoFactorEnabled ? 'Configure 2FA' : 'Enable 2FA'}
              </button>
            </div>

            <div className="section-label">Connected Accounts</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--grid)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Google Account</div>
                <div className="sub" style={{ margin: 0, fontSize: '11.5px' }}>{user?.email || 'learner@example.com'}</div>
              </div>
              <span className="tag" style={{ background: 'var(--add-bg)', color: 'var(--add)', fontSize: '11px' }}>
                Connected
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>GitHub Account</div>
                <div className="sub" style={{ margin: 0, fontSize: '11.5px' }}>
                  {connectedAccounts.github ? 'github.com/learner' : 'Not connected'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '11.5px', padding: '4px 10px' }}
                onClick={() => {
                  setConnectedAccounts((prev) => ({ ...prev, github: !prev.github }));
                  showSaveSuccess('GitHub account link toggled!');
                }}
              >
                {connectedAccounts.github ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* 2. Preferences */}
        {activeTab === 'preferences' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Visual &amp; Regional Preferences</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--grid)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Theme</div>
                <div className="sub" style={{ margin: 0, fontSize: '12px' }}>
                  Currently active: <strong>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong>
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={toggleTheme}>
                {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>

            <div className="field" style={{ marginTop: '16px' }}>
              <label>Interface Language</label>
              <select value={prefLanguage} onChange={(e) => { setPrefLanguage(e.target.value); showSaveSuccess(); }}>
                <option value="English">English (US / UK)</option>
                <option value="Hindi">Hindi (हिन्दी)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="German">German (Deutsch)</option>
              </select>
            </div>

            <div className="field">
              <label>Timezone</label>
              <select value={prefTimezone} onChange={(e) => { setPrefTimezone(e.target.value); showSaveSuccess(); }}>
                <option value="Asia/Kolkata (IST, UTC+5:30)">Asia/Kolkata (IST, UTC+5:30)</option>
                <option value="America/New_York (EST, UTC-5:00)">America/New_York (EST, UTC-5:00)</option>
                <option value="America/Los_Angeles (PST, UTC-8:00)">America/Los_Angeles (PST, UTC-8:00)</option>
                <option value="Europe/London (GMT, UTC+0:00)">Europe/London (GMT, UTC+0:00)</option>
                <option value="Europe/Berlin (CET, UTC+1:00)">Europe/Berlin (CET, UTC+1:00)</option>
              </select>
            </div>

            <div className="field">
              <label>Currency Display</label>
              <select value={currency} onChange={(e) => { setCurrency(e.target.value); showSaveSuccess(); }}>
                <option value="INR">INR (₹ Indian Rupee)</option>
                <option value="USD">USD ($ United States Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
                <option value="GBP">GBP (£ British Pound)</option>
              </select>
            </div>
          </div>
        )}

        {/* 3. Notifications */}
        {activeTab === 'notifications' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Email Notifications</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--grid)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Session Reminders</div>
                <div className="sub" style={{ margin: 0, fontSize: '12px' }}>Remind me 1 hour and 15 minutes before calls</div>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.emailReminders}
                onChange={(e) => { setNotifSettings({ ...notifSettings, emailReminders: e.target.checked }); showSaveSuccess(); }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--grid)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Proposal Alerts</div>
                <div className="sub" style={{ margin: 0, fontSize: '12px' }}>Email when a mentor bids on my problem request</div>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.emailProposals}
                onChange={(e) => { setNotifSettings({ ...notifSettings, emailProposals: e.target.checked }); showSaveSuccess(); }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--grid)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Direct Messages</div>
                <div className="sub" style={{ margin: 0, fontSize: '12px' }}>Email notifications for missed chat messages</div>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.emailMessages}
                onChange={(e) => { setNotifSettings({ ...notifSettings, emailMessages: e.target.checked }); showSaveSuccess(); }}
              />
            </div>

            <div className="section-label">Real-time &amp; Browser Notifications</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--grid)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>In-App Sound &amp; Badges</div>
                <div className="sub" style={{ margin: 0, fontSize: '12px' }}>Show bell count badge in portal topbar</div>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.inAppNotifs}
                onChange={(e) => { setNotifSettings({ ...notifSettings, inAppNotifs: e.target.checked }); showSaveSuccess(); }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Browser Push Notifications</div>
                <div className="sub" style={{ margin: 0, fontSize: '12px' }}>Native desktop notifications for incoming sessions</div>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.pushNotifs}
                onChange={(e) => { setNotifSettings({ ...notifSettings, pushNotifs: e.target.checked }); showSaveSuccess(); }}
              />
            </div>
          </div>
        )}

        {/* 4. Privacy & Security */}
        {activeTab === 'privacy' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Profile Visibility</div>

            <div className="field">
              <label>Who can see my learner profile &amp; learning goals?</label>
              <select value={visibility} onChange={(e) => { setVisibility(e.target.value); showSaveSuccess(); }}>
                <option value="public">Public (All verified mentors &amp; community members)</option>
                <option value="mentors_only">Mentors Only (Only mentors I message or book)</option>
                <option value="hidden">Hidden / Private (Incognito mode)</option>
              </select>
            </div>

            <div className="section-label">Manage Blocked Mentors</div>
            <div className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Blocked mentors cannot message you or submit proposals on your problem posts.
            </div>
            {blockedMentors.length === 0 ? (
              <p className="sub" style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>
                You have not blocked any mentors.
              </p>
            ) : null}

            <div className="section-label">Download My Data (GDPR / DPDP)</div>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '12px' }}>
              Export a complete archive of your profile, session history, notes, and billing records in JSON format.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleDownloadData}
            >
              <DownloadIcon size={14} /> Download My Personal Data Archive
            </button>
          </div>
        )}

        {/* 5. Support & FAQ */}
        {activeTab === 'support' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Help Center &amp; Frequently Asked Questions</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <details className="mini-card" style={{ cursor: 'pointer' }}>
                <summary style={{ fontWeight: 600, fontSize: '13.5px' }}>
                  How does the escrow payment system protect me?
                </summary>
                <p className="sub" style={{ margin: '8px 0 0', fontSize: '12.5px', lineHeight: 1.5 }}>
                  When you book a session or accept a proposal, your payment is held safely in escrow. Funds are ONLY released to the mentor after you confirm the session is completed or after 48 hours without dispute.
                </p>
              </details>

              <details className="mini-card" style={{ cursor: 'pointer' }}>
                <summary style={{ fontWeight: 600, fontSize: '13.5px' }}>
                  Can I reschedule a session if something comes up?
                </summary>
                <p className="sub" style={{ margin: '8px 0 0', fontSize: '12.5px', lineHeight: 1.5 }}>
                  Yes! Head to <strong>My Sessions</strong> and click "Reschedule". Your mentor will be notified with your requested date and time.
                </p>
              </details>

              <details className="mini-card" style={{ cursor: 'pointer' }}>
                <summary style={{ fontWeight: 600, fontSize: '13.5px' }}>
                  What happens if the mentor doesn't show up?
                </summary>
                <p className="sub" style={{ margin: '8px 0 0', fontSize: '12.5px', lineHeight: 1.5 }}>
                  You can click "Report Issue / Dispute" from your session card. Once submitted, escrow is frozen and an administrator will review the session and issue a 100% refund.
                </p>
              </details>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => window.dispatchEvent(new CustomEvent('pairup_open_support_ticket'))}
              >
                <MailIcon size={14} /> My Support Requests &amp; Inquiries
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1, fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setBugModalOpen(true)}
              >
                <BugIcon size={14} /> Report a Bug
              </button>
            </div>
          </div>
        )}

        {/* 6. Role Switch & Danger Zone */}
        {activeTab === 'management' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {user?.allow_role_switching !== false && user?.allow_role_switching !== 'false' ? (
              <div className="panel" style={{ margin: 0 }}>
                <div className="section-label" style={{ marginTop: 0 }}>Role Switching</div>
                <p className="sub" style={{ fontSize: '13px', marginBottom: '14px' }}>
                  Want to mentor other developers and earn by solving technical bugs? Switch your active mode to Mentor anytime.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={async () => {
                    try {
                      await switchRole('mentor');
                      navigate('/mentor/dashboard');
                    } catch (err) {
                      toast.error('Could not switch to mentor: ' + err.message);
                    }
                  }}
                >
                  Switch to Mentor Portal <RefreshIcon size={14} />
                </button>
              </div>
            ) : (
              <div className="panel" style={{ margin: 0, opacity: 0.85, background: 'rgba(255, 255, 255, 0.02)' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Role Switching (Disabled)</div>
                <p className="sub" style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted, #888)' }}>
                  Role switching between mentor and learner has been disabled by the platform administrator.
                </p>
              </div>
            )}

            <div className="panel" style={{ margin: 0, borderColor: 'var(--warn)' }}>
              <div className="section-label" style={{ marginTop: 0, color: 'var(--warn)' }}>Danger Zone</div>
              <p className="sub" style={{ fontSize: '13px', marginBottom: '14px' }}>
                Permanently delete your account, session logs, and personal profile from PairUp. This action is irreversible.
              </p>
              <button
                type="button"
                className="btn btn-danger"
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
        <form onSubmit={handlePasswordChange}>
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
              minLength={8}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPasswordModalOpen(false)}
              style={{ flex: 1 }}
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
        title="Two-Factor Authentication (2FA)"
      >
        <div>
          <p className="sub" style={{ fontSize: '13px' }}>
            Protect your account by requiring an authenticator code (Google Authenticator, Authy, or 1Password) on sign-in.
          </p>

          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--grid)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <ShieldIcon size={40} />
            </div>
            <div className="mono" style={{ fontSize: '13px', fontWeight: 700 }}>
              {twoFactorEnabled ? '2FA IS ACTIVE' : 'KEY: PAIRUP-AUTH-789X-ABCD'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setTwoFactorModalOpen(false)}
              style={{ flex: 1 }}
            >
              Close
            </button>
            <button
              type="button"
              className={`btn ${twoFactorEnabled ? 'btn-danger' : 'btn-primary'}`}
              style={{ flex: 1 }}
              onClick={() => {
                setTwoFactorEnabled(!twoFactorEnabled);
                setTwoFactorModalOpen(false);
                showSaveSuccess(twoFactorEnabled ? '2FA Disabled.' : '2FA Enabled!');
              }}
            >
              {twoFactorEnabled ? 'Disable 2FA' : 'Activate 2FA'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Report Bug Modal */}
      <Modal
        isOpen={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
        title="Report a Bug or Feedback"
      >
        <form onSubmit={handleReportBug}>
          <div className="field">
            <label>What happened?</label>
            <textarea
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder="Describe the issue, what browser you're using, or what unexpected behavior occurred..."
              rows={4}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setBugModalOpen(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Submit Report
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
          <p className="sub" style={{ fontSize: '13px', color: 'var(--warn)' }}>
            This will permanently close your PairUp account, wipe all active session requests, and clear your learning history.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDeleteModalOpen(false)}
              style={{ flex: 1 }}
            >
              Keep Account
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={() => {
                toast.info('Account scheduled for deletion. Logging out.');
                logout();
                navigate('/');
              }}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </PortalLayout>
  );
}
