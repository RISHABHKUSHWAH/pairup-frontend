import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activateAccount, resendVerification } = useAuth();
  const { toast } = useToast();

  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'verifying' : 'no_token');
  const [errorMessage, setErrorMessage] = useState('');
  const [activatedUser, setActivatedUser] = useState(null);

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('no_token');
      return;
    }

    let isMounted = true;
    async function doActivate() {
      try {
        setStatus('verifying');
        const res = await activateAccount(token);
        if (!isMounted) return;
        setActivatedUser(res.user);
        setStatus('success');
        toast.success('Account activated successfully! Welcome to PairUp 🎉');
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(err.message || 'The activation link is invalid or has expired.');
      }
    }

    doActivate();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setResending(true);
    try {
      await resendVerification(resendEmail.trim());
      setResendSuccess(true);
      toast.success('A new activation link has been sent! Check your inbox.');
    } catch (err) {
      toast.error(err.message || 'Failed to resend activation link');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div className="narrow auth-container" style={{ textAlign: 'center' }}>
          
          {/* State: Verifying */}
          {status === 'verifying' && (
            <div style={{ padding: '24px 8px' }}>
              <div className="spinner" style={{ margin: '0 auto 24px', width: '48px', height: '48px' }} />
              <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>
                Verifying your account...
              </h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: '14.5px' }}>
                Please wait a moment while we verify your email address.
              </p>
            </div>
          )}

          {/* State: Success */}
          {status === 'success' && (
            <div style={{ padding: '16px 8px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  margin: '0 auto 20px',
                }}
              >
                🎉
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>
                Account Activated!
              </h2>

              <p style={{ color: 'var(--ink-muted)', fontSize: '15px', lineHeight: '1.6', marginBottom: '28px' }}>
                Welcome {activatedUser?.name ? <strong>{activatedUser.name}</strong> : 'to PairUp'}! Your email has been verified and your account is ready to use.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: 700 }}
                onClick={() => navigate('/login')}
              >
                Continue to Login →
              </button>
            </div>
          )}

          {/* State: Error or Expired */}
          {status === 'error' && (
            <div style={{ padding: '16px 8px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  margin: '0 auto 20px',
                }}
              >
                ⚠️
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>
                Activation Link Invalid or Expired
              </h2>

              <p style={{ color: 'var(--ink-muted)', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '24px' }}>
                {errorMessage || 'This activation link is either invalid or has expired (links are valid for 48 hours).'}
              </p>

              <div
                style={{
                  background: 'var(--surface-raised, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-subtle, #262A38)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                  textAlign: 'left',
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0' }}>
                  Need a new activation link?
                </h4>
                {resendSuccess ? (
                  <p style={{ color: 'var(--success, #10B981)', fontSize: '13.5px', margin: 0 }}>
                    ✓ A new link has been sent to your email. Please check your inbox or spam folder!
                  </p>
                ) : (
                  <form onSubmit={handleResend}>
                    <input
                      type="email"
                      placeholder="Enter your registered email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        marginBottom: '10px',
                        boxSizing: 'border-box',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={resending}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '10px' }}
                    >
                      {resending ? 'Sending...' : 'Send New Activation Link'}
                    </button>
                  </form>
                )}
              </div>

              <Link to="/login" className="btn btn-ghost" style={{ width: '100%' }}>
                ← Back to Login
              </Link>
            </div>
          )}

          {/* State: No Token */}
          {status === 'no_token' && (
            <div style={{ padding: '16px 8px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(91, 124, 255, 0.12)',
                  border: '1px solid rgba(91, 124, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  margin: '0 auto 20px',
                }}
              >
                ✉️
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>
                Account Activation
              </h2>

              <p style={{ color: 'var(--ink-muted)', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '24px' }}>
                Please click the activation link sent to your registered email address.
              </p>

              <div
                style={{
                  background: 'var(--surface-raised, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-subtle, #262A38)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                  textAlign: 'left',
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0' }}>
                  Resend activation link
                </h4>
                {resendSuccess ? (
                  <p style={{ color: 'var(--success, #10B981)', fontSize: '13.5px', margin: 0 }}>
                    ✓ Activation link sent! Check your inbox or spam folder.
                  </p>
                ) : (
                  <form onSubmit={handleResend}>
                    <input
                      type="email"
                      placeholder="Enter your registered email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        marginBottom: '10px',
                        boxSizing: 'border-box',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={resending}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '10px' }}
                    >
                      {resending ? 'Sending...' : 'Send Activation Link'}
                    </button>
                  </form>
                )}
              </div>

              <Link to="/login" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                Go to Login
              </Link>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
