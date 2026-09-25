import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Alert from '../../components/Alert';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CheckIcon, XIcon } from '../../components/Icons';

function GoogleLogo({ size = 18 }) {
  return (
    <svg className="social-icon" width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function GitHubLogo({ size = 18 }) {
  return (
    <svg className="social-icon" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedInLogo({ size = 18 }) {
  return (
    <svg className="social-icon" width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v7.6h2.8v-7.6h-2.8M7.86 6.4a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z" />
    </svg>
  );
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, socialLogin, user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [role, setRole] = useState(searchParams.get('role') === 'mentor' ? 'mentor' : 'learner');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [socialModalProvider, setSocialModalProvider] = useState(null);
  const [customSocialName, setCustomSocialName] = useState('');
  const [customSocialEmail, setCustomSocialEmail] = useState('');
  const [socialLoading, setSocialLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    // Read pending action from location.state or sessionStorage
    if (location.state?.action || location.state?.mentorId) {
      setPendingAction(location.state);
    } else {
      try {
        const stored = sessionStorage.getItem('pairup_pending_action');
        if (stored) {
          setPendingAction(JSON.parse(stored));
        }
      } catch (e) {}
    }
  }, [location.state]);

  const getSocialAccounts = (provider) => {
    if (provider === 'GitHub') {
      return [
        { name: 'Alex Rivera', email: 'alex.rivera@github.com', role: 'mentor', avatarColor: '#24292F' },
        { name: 'Sarah Connor', email: 'sarah.connor@github.com', role: 'learner', avatarColor: '#6e40c9' },
        { name: 'David Chen', email: 'david.chen@github.com', role: 'mentor', avatarColor: '#0969da' },
      ];
    }
    if (provider === 'LinkedIn') {
      return [
        { name: 'Alex Rivera', email: 'alex.rivera@linkedin.com', role: 'mentor', avatarColor: '#0A66C2' },
        { name: 'Sarah Connor', email: 'sarah.connor@linkedin.com', role: 'learner', avatarColor: '#0077B5' },
        { name: 'David Chen', email: 'david.chen@linkedin.com', role: 'mentor', avatarColor: '#004182' },
      ];
    }
    return [
      { name: 'Sarah Connor', email: 'sarah.connor@gmail.com', role: 'learner', avatarColor: '#4285F4' },
      { name: 'Alex Rivera', email: 'alex.rivera@gmail.com', role: 'mentor', avatarColor: '#34A853' },
      { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', role: 'mentor', avatarColor: '#EA4335' },
    ];
  };

  const getRedirectTarget = (u) => {
    // 1. Check location.state?.from
    if (location.state?.from) {
      const from = location.state.from;
      if (typeof from === 'string' && from && !from.startsWith('/login')) {
        return { path: from, state: location.state };
      }
      if (from.pathname && !from.pathname.startsWith('/login')) {
        return {
          path: `${from.pathname}${from.search || ''}${from.hash || ''}`,
          state: location.state,
        };
      }
    }

    // 2. Check query params: ?redirect=... or ?next=...
    const redirectParam = searchParams.get('redirect') || searchParams.get('next');
    if (redirectParam && !redirectParam.startsWith('/login')) {
      return { path: redirectParam, state: location.state || pendingAction };
    }

    // 3. Check pending action returnUrl
    if (pendingAction?.returnUrl) {
      return { path: pendingAction.returnUrl, state: pendingAction };
    }
    try {
      const stored = sessionStorage.getItem('pairup_pending_action');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.returnUrl) {
          return { path: parsed.returnUrl, state: parsed };
        }
      }
    } catch (e) {}

    // 4. Default role dashboard
    if (u?.role === 'mentor') return { path: '/mentor/dashboard', state: null };
    if (u?.role === 'admin' || u?.role === 'superadmin') return { path: '/admin', state: null };
    return { path: '/learner/dashboard', state: null };
  };

  const handleSelectSocialAccount = async (acc) => {
    setSocialLoading(true);
    setError('');
    const chosenRole = mode === 'register' ? role : (acc.role || role);
    try {
      const loggedUser = await socialLogin({
        name: acc.name,
        email: acc.email,
        role: chosenRole,
        provider: socialModalProvider,
      });
      toast.success(`Welcome to PairUp, ${loggedUser.name}! 🎉`);
      setSocialModalProvider(null);
      const target = getRedirectTarget(loggedUser);
      navigate(target.path, { replace: true, state: target.state });
    } catch (err) {
      setError(err.message || 'Social authentication failed');
      toast.error(err.message || 'Social authentication failed');
    } finally {
      setSocialLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const target = getRedirectTarget(user);
      navigate(target.path, { replace: true, state: target.state });
    }
  }, [user, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email.trim(), password);
      const target = getRedirectTarget(loggedUser);
      navigate(target.path, { replace: true, state: target.state });
    } catch (err) {
      setError(err.message);
      toast.error(err.message, {
        duration: 5000,
        action: mode === 'login' && err.message.toLowerCase().includes('not registered') ? (
          <button
            type="button"
            className="alert-action-btn"
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Create account →
          </button>
        ) : null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const registeredUser = await register(name.trim(), email.trim(), password, role);
      const target = getRedirectTarget(registeredUser);
      navigate(target.path, { replace: true, state: target.state });
    } catch (err) {
      setError(err.message);
      toast.error(err.message, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px 16px' }}>
        <div className="narrow auth-container">
          <div className="auth-header">
            <h1 className="auth-title">PairUp</h1>
            <p className="sub auth-subtitle">
              Get unstuck. Pair with a developer, live.
            </p>
          </div>

          {/* Pending Action Intent Notice */}
          {pendingAction && (pendingAction.action === 'book_session' || searchParams.get('redirect')?.includes('bookMentor')) && (
            <div
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--ink)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ fontSize: '20px', flexShrink: 0 }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--accent-ink)' }}>
                  Log in to book your session
                </div>
                <div style={{ color: 'var(--ink-muted)', fontSize: '12px', marginTop: '2px' }}>
                  {pendingAction.mentor?.name
                    ? `With ${pendingAction.mentor.name}. The booking modal will open automatically once you sign in.`
                    : 'The booking modal will open automatically as soon as you sign in.'}
                </div>
              </div>
            </div>
          )}

          {pendingAction && pendingAction.action === 'chat' && (
            <div
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--ink)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ fontSize: '20px', flexShrink: 0 }}>💬</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--accent-ink)' }}>
                  Log in to message your mentor
                </div>
                <div style={{ color: 'var(--ink-muted)', fontSize: '12px', marginTop: '2px' }}>
                  You will be directed straight to your chat room after signing in.
                </div>
              </div>
            </div>
          )}

          <div className="auth-card">
            <div className="tabs">
              <button
                type="button"
                className={mode === 'login' ? 'active' : ''}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Log in
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'active' : ''}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                Sign up
              </button>
            </div>

            {error && (
              <Alert
                type="error"
                autoDismiss={6000}
                dismissible
                onDismiss={() => setError('')}
                action={
                  mode === 'login' && error.toLowerCase().includes('not registered') ? (
                    <button
                      type="button"
                      className="alert-action-btn"
                      onClick={() => {
                        setMode('register');
                        setError('');
                      }}
                    >
                      Create account →
                    </button>
                  ) : null
                }
              >
                {error}
              </Alert>
            )}

            {/* Social Logins */}
            <div className="social-auth-section">
              <button
                type="button"
                className="social-btn social-btn-google"
                onClick={() => setSocialModalProvider('Google')}
                disabled={loading || socialLoading}
              >
                <GoogleLogo />
                <span>{mode === 'register' ? 'Sign up with Google' : 'Continue with Google'}</span>
              </button>

              <div className="social-sub-row">
                <button
                  type="button"
                  className="social-btn social-btn-secondary"
                  onClick={() => setSocialModalProvider('GitHub')}
                  disabled={loading || socialLoading}
                >
                  <GitHubLogo />
                  <span>GitHub</span>
                </button>
                <button
                  type="button"
                  className="social-btn social-btn-secondary"
                  onClick={() => setSocialModalProvider('LinkedIn')}
                  disabled={loading || socialLoading}
                >
                  <LinkedInLogo />
                  <span>LinkedIn</span>
                </button>
              </div>
            </div>

            <div className="auth-divider">
              <span>or continue with email</span>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="auth-form">
                <div className="field">
                  <label>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-auth-submit" disabled={loading}>
                  {loading ? 'Logging in...' : 'Log in'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="auth-form">
                <div className="field">
                  <label>Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    required
                  />
                </div>
                <div className="field">
                  <label>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <label>Password (min 6 characters)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="role-selector-label">I want to join as</div>
                <div className="role-selector-grid" role="radiogroup" aria-label="Select account type">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'learner'}
                    className={`role-card role-card-learner ${role === 'learner' ? 'active' : ''}`}
                    onClick={() => setRole('learner')}
                  >
                    <div className="role-card-header">
                      <div className="role-icon-box learner">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                          <path d="M6 12v5c3 3 9 3 12 0v-5" />
                        </svg>
                      </div>
                      <span className={`role-check-indicator ${role === 'learner' ? 'active' : ''}`}>
                        {role === 'learner' && <CheckIcon size={11} />}
                      </span>
                    </div>
                    <div className="role-card-text">
                      <div className="role-card-title">I want to learn</div>
                      <div className="role-card-subtitle">Pair with experts live</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'mentor'}
                    className={`role-card role-card-mentor ${role === 'mentor' ? 'active' : ''}`}
                    onClick={() => setRole('mentor')}
                  >
                    <div className="role-card-header">
                      <div className="role-icon-box mentor">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      </div>
                      <span className={`role-check-indicator ${role === 'mentor' ? 'active' : ''}`}>
                        {role === 'mentor' && <CheckIcon size={11} />}
                      </span>
                    </div>
                    <div className="role-card-text">
                      <div className="role-card-title">I'm a mentor</div>
                      <div className="role-card-subtitle">Offer sessions & earn</div>
                    </div>
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-auth-submit"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {socialModalProvider && (
        <div className="oauth-modal-backdrop" onClick={() => !socialLoading && setSocialModalProvider(null)}>
          <div className="oauth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="oauth-modal-close"
              onClick={() => setSocialModalProvider(null)}
              disabled={socialLoading}
              title="Close modal"
            >
              <XIcon size={16} />
            </button>

            <div className="oauth-header">
              <div className="oauth-provider-logo">
                {socialModalProvider === 'Google' && <GoogleLogo size={24} />}
                {socialModalProvider === 'GitHub' && <GitHubLogo size={24} />}
                {socialModalProvider === 'LinkedIn' && <LinkedInLogo size={24} />}
              </div>
              <h3 className="oauth-title">
                {mode === 'register' ? `Sign up with ${socialModalProvider}` : `Sign in with ${socialModalProvider}`}
              </h3>
              <p className="oauth-subtitle">Select an account to proceed to PairUp</p>
              {mode === 'register' && (
                <div className={`oauth-role-pill ${role === 'mentor' ? 'mentor' : 'learner'}`}>
                  Role: {role === 'mentor' ? '👨‍💻 Mentor' : '🎓 Learner'}
                </div>
              )}
            </div>

            <div className="oauth-accounts-list">
              {getSocialAccounts(socialModalProvider).map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="oauth-account-item"
                  onClick={() => handleSelectSocialAccount(acc)}
                  disabled={socialLoading}
                >
                  <div className="oauth-avatar" style={{ background: acc.avatarColor }}>
                    {acc.name.charAt(0)}
                  </div>
                  <div className="oauth-account-details">
                    <div className="oauth-account-name">{acc.name}</div>
                    <div className="oauth-account-email">{acc.email}</div>
                  </div>
                  <span
                    className="oauth-account-badge"
                    style={{
                      background: acc.role === 'mentor' ? 'var(--add-bg)' : 'var(--accent-soft)',
                      color: acc.role === 'mentor' ? 'var(--add)' : 'var(--accent)',
                    }}
                  >
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>

            <form
              className="oauth-custom-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (customSocialEmail.trim()) {
                  handleSelectSocialAccount({
                    name: customSocialName.trim() || `${socialModalProvider} User`,
                    email: customSocialEmail.trim(),
                    role: mode === 'register' ? role : 'learner',
                  });
                }
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '8px' }}>
                Or use your custom {socialModalProvider} account:
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={customSocialName}
                  onChange={(e) => setCustomSocialName(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', fontSize: '13px', background: 'var(--surface)' }}
                />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={customSocialEmail}
                  onChange={(e) => setCustomSocialEmail(e.target.value)}
                  required
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', fontSize: '13px', background: 'var(--surface)' }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ padding: '9px', fontSize: '13px', borderRadius: '8px' }}
                disabled={socialLoading || !customSocialEmail.trim()}
              >
                {socialLoading ? 'Connecting...' : `Sign in with this ${socialModalProvider} account`}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
