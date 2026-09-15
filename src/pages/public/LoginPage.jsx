import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Alert from '../../components/Alert';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [role, setRole] = useState(searchParams.get('role') === 'mentor' ? 'mentor' : 'learner');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getRedirectPath = (u) => {
    if (location.state?.from?.pathname) return location.state.from.pathname;
    if (u.role === 'mentor') return '/mentor/dashboard';
    if (u.role === 'admin' || u.role === 'superadmin') return '/admin';
    return '/learner/dashboard';
  };

  useEffect(() => {
    if (user) {
      navigate(getRedirectPath(user), { replace: true });
    }
  }, [user, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email.trim(), password);
      navigate(getRedirectPath(loggedUser), { replace: true });
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
      if (registeredUser.role === 'mentor') navigate('/mentor/dashboard');
      else navigate('/learner/dashboard');
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

      <main className="container" style={{ flex: 1 }}>
        <div className="narrow">
          <h1 style={{ textAlign: 'center', fontSize: '26px', marginBottom: '4px' }}>PairUp</h1>
          <p className="sub" style={{ textAlign: 'center', marginBottom: '24px' }}>
            Get unstuck. Pair with a developer, live.
          </p>

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

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit}>
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
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
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

              <div className="role-row">
                <div
                  className={`role-chip ${role === 'learner' ? 'active' : ''}`}
                  onClick={() => setRole('learner')}
                >
                  I want to learn
                </div>
                <div
                  className={`role-chip ${role === 'mentor' ? 'active' : ''}`}
                  onClick={() => setRole('mentor')}
                >
                  I'm a mentor
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
