import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Alert from '../../components/Alert';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { CheckIcon, XIcon, EyeIcon, EyeOffIcon } from '../../components/Icons';

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

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, logout, googleLogin, resendVerification, forgotPassword, resetPassword, user } = useAuth();
  const { toast } = useToast();

  const initialMode = (() => {
    if (location.pathname === '/forgot-password' || searchParams.get('mode') === 'forgot-password' || searchParams.get('mode') === 'forgot') {
      return 'forgot-password';
    }
    if (location.pathname === '/reset-password' || searchParams.get('mode') === 'reset-password' || searchParams.get('token')) {
      return 'reset-password';
    }
    if (searchParams.get('mode') === 'register') {
      return 'register';
    }
    return 'login';
  })();

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(searchParams.get('role') === 'mentor' ? 'mentor' : 'learner');

  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const googleBtnRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [resetToken, setResetToken] = useState(searchParams.get('token') || '');
  const [resetEmail, setResetEmail] = useState(searchParams.get('email') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [verificationSent, setVerificationSent] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  const [socialLoading, setSocialLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [googleConfig, setGoogleConfig] = useState({ enabled: false, clientId: '' });

  const renderGoogleButton = () => {
    if (!window.google?.accounts?.id || !googleBtnRef.current) return;
    try {
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: mode === 'register' ? 'signup_with' : 'continue_with',
        shape: 'rectangular',
        width: 360,
        logo_alignment: 'left',
      });
    } catch (e) {
      console.warn('Google renderButton error:', e);
    }
  };

  useEffect(() => {
    let mounted = true;
    api.getPlatformConfig().then((cfg) => {
      if (!mounted || !cfg) return;
      const enabled = cfg.google_auth_enabled === true || cfg.google_auth_enabled === 'true';
      const clientId = cfg.google_client_id || '';
      setGoogleConfig({ enabled, clientId });

      if (clientId) {
        const initGoogle = () => {
          if (!window.google?.accounts?.id) return;
          try {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: async (response) => {
                if (!response?.credential) return;
                setSocialLoading(true);
                try {
                  const targetRole = roleRef.current || 'learner';
                  const loggedUser = await googleLogin(response.credential, targetRole);
                  toast.success(`Welcome to PairUp, ${loggedUser.name || 'User'}! 🎉`);
                  const target = getRedirectTarget(loggedUser);
                  navigate(target.path, { replace: true, state: target.state });
                } catch (err) {
                  toast.error(err.message || 'Google sign-in failed');
                } finally {
                  setSocialLoading(false);
                }
              },
            });
            renderGoogleButton();
          } catch (e) {
            console.warn('GIS init error:', e);
          }
        };

        if (!document.getElementById('google-gsi-client')) {
          const script = document.createElement('script');
          script.id = 'google-gsi-client';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = initGoogle;
          document.body.appendChild(script);
        } else {
          initGoogle();
        }
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [mode]);

  useEffect(() => {
    if (googleConfig.clientId && window.google?.accounts?.id) {
      renderGoogleButton();
    }
  }, [googleConfig.clientId, mode]);

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

  useEffect(() => {
    const token = searchParams.get('token');
    const paramEmail = searchParams.get('email');
    const notice = searchParams.get('notice');
    if (token) setResetToken(token);
    if (paramEmail) {
      setResetEmail(paramEmail);
      if (!email) setEmail(paramEmail);
    }
    if (notice) {
      setError(notice);
    }

    if (
      location.pathname === '/forgot-password' ||
      searchParams.get('mode') === 'forgot-password' ||
      searchParams.get('mode') === 'forgot'
    ) {
      setMode('forgot-password');
      setError('');
    } else if (
      location.pathname === '/reset-password' ||
      searchParams.get('mode') === 'reset-password' ||
      token
    ) {
      setMode('reset-password');
      setError('');
    }
  }, [location.pathname, searchParams]);

  const getRedirectTarget = (u) => {
    const isPathAllowed = (path) => {
      if (!path || typeof path !== 'string') return false;
      if (path.startsWith('/login') || path.startsWith('/register')) return false;
      if (path.startsWith('/learner') && u?.role !== 'learner') return false;
      if (path.startsWith('/mentor') && u?.role !== 'mentor') return false;
      if (path.startsWith('/admin') && u?.role !== 'admin' && u?.role !== 'superadmin') return false;
      return true;
    };

    // 1. Check location.state?.from
    if (location.state?.from) {
      const from = location.state.from;
      if (typeof from === 'string' && isPathAllowed(from)) {
        return { path: from, state: location.state };
      }
      if (from?.pathname && isPathAllowed(from.pathname)) {
        return {
          path: `${from.pathname}${from.search || ''}${from.hash || ''}`,
          state: location.state,
        };
      }
    }

    // 2. Check query params: ?redirect=... or ?next=...
    const redirectParam = searchParams.get('redirect') || searchParams.get('next');
    if (redirectParam && isPathAllowed(redirectParam)) {
      return { path: redirectParam, state: location.state || pendingAction };
    }

    // 3. Check pending action returnUrl
    if (pendingAction?.returnUrl && isPathAllowed(pendingAction.returnUrl)) {
      return { path: pendingAction.returnUrl, state: pendingAction };
    }
    try {
      const stored = sessionStorage.getItem('pairup_pending_action');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.returnUrl && isPathAllowed(parsed.returnUrl)) {
          return { path: parsed.returnUrl, state: parsed };
        }
      }
    } catch (e) {}

    // 4. Default role dashboard
    if (u?.role === 'mentor') return { path: '/mentor/dashboard', state: null };
    if (u?.role === 'admin' || u?.role === 'superadmin') return { path: '/admin', state: null };
    return { path: '/learner/dashboard', state: null };
  };

  useEffect(() => {
    const isReset =
      location.pathname === '/reset-password' ||
      searchParams.get('mode') === 'reset-password' ||
      Boolean(searchParams.get('token')) ||
      mode === 'reset-password';

    const isForgot =
      location.pathname === '/forgot-password' ||
      searchParams.get('mode') === 'forgot-password' ||
      mode === 'forgot-password';

    if (user && !isReset && !isForgot) {
      const target = getRedirectTarget(user);
      navigate(target.path, { replace: true, state: target.state });
    }
  }, [user, navigate, location.pathname, searchParams, mode]);

  const handleResendVerification = async (targetEmail) => {
    const emailToUse = (targetEmail || email || '').trim();
    if (!emailToUse) {
      toast.error('Please enter your email to resend the activation link');
      return;
    }
    setResendingEmail(true);
    try {
      const res = await resendVerification(emailToUse);
      toast.success(res.message || 'Activation email resent! Check your inbox.');
      setVerificationSent(prev => ({
        ...(prev || {}),
        email: emailToUse,
        activation_url: res.web_activation_url || res.activation_url || prev?.activation_url,
      }));
    } catch (err) {
      toast.error(err.message || 'Failed to resend activation link');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email.trim(), password);
      const target = getRedirectTarget(loggedUser);
      navigate(target.path, { replace: true, state: target.state });
    } catch (err) {
      const isUnverified = err.data?.requires_verification || err.message?.toLowerCase().includes('verify your email');
      setError(err.message);
      if (isUnverified) {
        setVerificationSent({
          email: email.trim(),
        });
      }
      toast.error(err.message, {
        duration: 6000,
        action: isUnverified ? (
          <button
            type="button"
            className="alert-action-btn"
            onClick={() => handleResendVerification(email.trim())}
          >
            Resend link →
          </button>
        ) : mode === 'login' && err.message.toLowerCase().includes('not registered') ? (
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
      const res = await register(name.trim(), email.trim(), password, role);
      if (res?.requires_verification) {
        setVerificationSent({
          email: res.email || email.trim(),
          activation_url: res.web_activation_url || res.activation_url,
        });
        toast.success('Registration successful! Please check your email to activate.');
        return;
      }
      const target = getRedirectTarget(res);
      navigate(target.path, { replace: true, state: target.state });
    } catch (err) {
      setError(err.message);
      toast.error(err.message, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    const targetEmail = (email || resetEmail).trim();
    if (!targetEmail) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setForgotLoading(true);
    try {
      const res = await (forgotPassword ? forgotPassword(targetEmail) : api.forgotPassword(targetEmail));
      setForgotSent({
        email: targetEmail,
        reset_url: res?.reset_url || '',
        token: res?.token || '',
      });
      toast.success(res?.message || 'Password reset link sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to send password reset email.');
      toast.error(err.message || 'Failed to send password reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const tokenToUse = (resetToken || searchParams.get('token') || '').trim();
    if (!tokenToUse) {
      setError('Reset token is missing. Please check your reset link or request a new one.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    setError('');
    setResetLoading(true);
    try {
      const res = await (resetPassword
        ? resetPassword(tokenToUse, newPassword, resetEmail || email)
        : api.resetPassword(tokenToUse, newPassword, resetEmail || email));
      toast.success(res?.message || 'Password reset successfully! Please log in.');
      if (logout) {
        try {
          await logout();
        } catch (e) {}
      }
      if (resetEmail) setEmail(resetEmail);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      setForgotSent(null);
      setMode('login');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
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
            {verificationSent ? (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(91, 124, 255, 0.12)',
                    border: '1px solid rgba(91, 124, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    margin: '0 auto 18px',
                  }}
                >
                  ✉️
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: 'var(--ink)' }}>
                  Verify Your Email
                </h3>
                <p style={{ color: 'var(--ink-muted)', fontSize: '14.5px', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                  We sent an activation link to <strong style={{ color: 'var(--ink)' }}>{verificationSent.email}</strong>.<br />
                  Please click the link in your email to activate your account before logging in.
                </p>

                {verificationSent.activation_url && (
                  <div
                    style={{
                      background: 'var(--surface-raised, rgba(255,255,255,0.03))',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '20px',
                      fontSize: '12px',
                      textAlign: 'left',
                      wordBreak: 'break-all',
                    }}
                  >
                    <span style={{ color: 'var(--ink-muted)', display: 'block', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Direct Activation Link:
                    </span>
                    <a
                      href={verificationSent.activation_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      {verificationSent.activation_url}
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleResendVerification(verificationSent.email)}
                    disabled={resendingEmail}
                    style={{ width: '100%', padding: '11px' }}
                  >
                    {resendingEmail ? 'Resending...' : 'Resend Activation Email'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setVerificationSent(null);
                      setMode('login');
                      setError('');
                    }}
                    style={{ width: '100%', padding: '11px' }}
                  >
                    I've Activated, Log In Now →
                  </button>
                </div>
              </div>
            ) : mode === 'forgot-password' ? (
              <div className="auth-forgot-section">
                {forgotSent ? (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'var(--brand-soft, rgba(99, 102, 241, 0.12))',
                        color: 'var(--brand)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '30px',
                        margin: '0 auto 16px',
                      }}
                    >
                      ✉️
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink)' }}>
                      Check your email
                    </h2>
                    <p style={{ color: 'var(--ink-muted)', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
                      We sent a password reset link to <strong>{forgotSent.email}</strong>. Follow the instructions in the email to reset your password.
                    </p>

                    {forgotSent.reset_url && (
                      <div
                        style={{
                          background: 'var(--surface-sunken)',
                          border: '1px dashed var(--brand)',
                          borderRadius: '10px',
                          padding: '12px',
                          marginBottom: '20px',
                          textAlign: 'left',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--brand)', marginBottom: '4px' }}>
                          ⚡ Direct Reset Link (Ready to use)
                        </div>
                        <div style={{ color: 'var(--ink-muted)', wordBreak: 'break-all', marginBottom: '8px' }}>
                          {forgotSent.reset_url}
                        </div>
                        <a
                          href={forgotSent.reset_url}
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-block' }}
                        >
                          Open Reset Link Directly →
                        </a>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleForgotPasswordSubmit}
                        disabled={forgotLoading}
                        style={{ width: '100%', padding: '11px' }}
                      >
                        {forgotLoading ? 'Resending...' : 'Resend Reset Email'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setForgotSent(null);
                          setMode('login');
                          setError('');
                          navigate('/login');
                        }}
                        style={{ width: '100%', padding: '11px' }}
                      >
                        ← Back to Log in
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '20px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError('');
                          navigate('/login');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--brand)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '12px',
                        }}
                      >
                        ← Back to Log in
                      </button>
                      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                        Forgot your password?
                      </h2>
                      <p style={{ color: 'var(--ink-muted)', fontSize: '13.5px', margin: 0, lineHeight: 1.45 }}>
                        Enter the email associated with your PairUp account and we'll send you a password reset link.
                      </p>
                    </div>

                    {error && (
                      <Alert
                        type="error"
                        autoDismiss={6000}
                        dismissible
                        onDismiss={() => setError('')}
                      >
                        {error}
                      </Alert>
                    )}

                    <form onSubmit={handleForgotPasswordSubmit} className="auth-form" style={{ marginTop: '16px' }}>
                      <div className="field">
                        <label>Email address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          autoComplete="email"
                          autoFocus
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary btn-block btn-auth-submit"
                        disabled={forgotLoading}
                        style={{ marginTop: '14px' }}
                      >
                        {forgotLoading ? 'Sending reset link...' : 'Send reset link'}
                      </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--ink-muted)' }}>
                      Remember your password?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError('');
                          navigate('/login');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--brand)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Log in
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : mode === 'reset-password' ? (
              <div className="auth-reset-section">
                <div style={{ marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      navigate('/login');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--brand)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    ← Back to Log in
                  </button>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Reset your password
                  </h2>
                  <p style={{ color: 'var(--ink-muted)', fontSize: '13.5px', margin: 0, lineHeight: 1.45 }}>
                    {resetEmail
                      ? `Create a new password for ${resetEmail}.`
                      : 'Choose a strong new password with at least 6 characters.'}
                  </p>
                </div>

                {error && (
                  <Alert
                    type="error"
                    autoDismiss={6000}
                    dismissible
                    onDismiss={() => setError('')}
                  >
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleResetPasswordSubmit} className="auth-form" style={{ marginTop: '16px' }}>
                  {!searchParams.get('token') && !resetToken && (
                    <div className="field">
                      <label>Reset Token</label>
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Paste reset token here"
                        required
                      />
                    </div>
                  )}

                  <div className="field">
                    <label>New Password</label>
                    <div className="password-input-wrap">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label>Confirm New Password</label>
                    <div className="password-input-wrap">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block btn-auth-submit"
                    disabled={resetLoading}
                    style={{ marginTop: '14px' }}
                  >
                    {resetLoading ? 'Resetting password...' : 'Update Password'}
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--ink-muted)' }}>
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      navigate('/login');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--brand)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Log in
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="tabs">
                  <button
                    type="button"
                    className={mode === 'login' ? 'active' : ''}
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setShowPassword(false);
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
                      setShowPassword(false);
                    }}
                  >
                    Sign up
                  </button>
                </div>

                {mode === 'register' && (
                  <div className="signup-role-section" style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <div className="role-selector-label" style={{ marginBottom: '8px', fontWeight: 600 }}>
                      I want to join as:
                    </div>
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
                  </div>
                )}

                {error && (
                  <Alert
                    type="error"
                    autoDismiss={6000}
                    dismissible
                    onDismiss={() => setError('')}
                    action={
                      error.toLowerCase().includes('verify your email') ? (
                        <button
                          type="button"
                          className="alert-action-btn"
                          onClick={() => handleResendVerification(email.trim())}
                        >
                          Resend link →
                        </button>
                      ) : mode === 'login' && error.toLowerCase().includes('not registered') ? (
                        <button
                          type="button"
                          className="alert-action-btn"
                          onClick={() => {
                            setMode('register');
                            setError('');
                            setShowPassword(false);
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
              {googleConfig.clientId ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px' }}>
                  <div
                    ref={googleBtnRef}
                    style={{ minHeight: '44px', width: '100%', display: 'flex', justifyContent: 'center' }}
                  />
                  {mode === 'register' && (
                    <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      Signing up with Google as <strong>{role === 'mentor' ? '👨‍💻 Mentor' : '🎓 Learner'}</strong>
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="social-btn social-btn-google"
                  onClick={() => {
                    toast.error('Google Sign-In is not configured yet. Admin can set it up in Settings > Security & Auth.');
                  }}
                  disabled={loading || socialLoading}
                >
                  <GoogleLogo />
                  <span>{mode === 'register' ? `Sign up with Google as ${role === 'mentor' ? 'Mentor' : 'Learner'}` : 'Continue with Google'}</span>
                </button>
              )}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Password</label>
                    <button
                      type="button"
                      className="forgot-password-link"
                      onClick={() => {
                        setMode('forgot-password');
                        setError('');
                        setForgotSent(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--brand)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'none',
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
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
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-auth-submit"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : `Create ${role === 'mentor' ? 'mentor' : 'learner'} account`}
                </button>
              </form>
            )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
