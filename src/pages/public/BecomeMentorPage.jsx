import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { api, TokenStorage } from '../../api/client';

export default function BecomeMentorPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    bio: '',
    skills: '',
    hourly_rate: 25,
    github_url: '',
    linkedin_url: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.applyMentor({
        title: formData.title.trim(),
        bio: formData.bio.trim(),
        skills: formData.skills.trim(),
        hourly_rate: Number(formData.hourly_rate || 0),
        github_url: formData.github_url.trim(),
        linkedin_url: formData.linkedin_url.trim(),
      });

      if (res.token && res.user) {
        TokenStorage.setSession(res.token, res.user);
        updateUser(res.user);
      }
      navigate('/mentor/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, paddingTop: '40px', paddingBottom: '60px' }}>
        {!user ? (
          <div style={{ maxWidth: '540px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', color: 'var(--accent)', fontSize: '12.5px', marginBottom: '8px' }}>
              $ for developers
            </div>
            <h1>
              Become a <span className="accent">mentor</span>
            </h1>
            <p className="sub">
              Set up your profile once. Learners find you by skill and pay per session — you set your own rate, and money is held in escrow until the session is confirmed complete.
            </p>
            <Link to="/login?mode=register&role=mentor" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Create your mentor profile
            </Link>
          </div>
        ) : user.role === 'mentor' || user.role === 'admin' || user.role === 'superadmin' ? (
          <div style={{ maxWidth: '540px' }}>
            <h1 style={{ fontSize: '24px' }}>You're already set up as a mentor</h1>
            <p className="sub">Manage your profile, availability, and rate from your mentor dashboard.</p>
            <Link to="/mentor/dashboard" className="btn btn-primary" style={{ marginTop: '12px' }}>
              Go to your dashboard
            </Link>
          </div>
        ) : (
          <div style={{ maxWidth: '540px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', color: 'var(--accent)', fontSize: '12.5px', marginBottom: '8px' }}>
              $ for developers
            </div>
            <h1>
              Become a <span className="accent">mentor</span>
            </h1>
            <p className="sub" style={{ marginBottom: '20px' }}>
              You're already signed in — just fill in your mentor details below. No need to create a new account.
            </p>

            {error && <div className="error-box">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Professional Headline</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Senior Backend Engineer"
                  required
                />
              </div>

              <div className="field">
                <label>Bio / About</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="What kind of tech stacks and problems are you best at helping with?"
                  required
                ></textarea>
              </div>

              <div className="field">
                <label>Skills (comma separated)</label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="Python, Django, React, PostgreSQL, Docker"
                  required
                />
              </div>

              <div className="field">
                <label>Rate per minute (₹)</label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleChange}
                  min="1"
                  step="0.5"
                  required
                />
              </div>

              <div className="field">
                <label>GitHub URL (optional)</label>
                <input
                  type="url"
                  name="github_url"
                  value={formData.github_url}
                  onChange={handleChange}
                  placeholder="https://github.com/yourusername"
                />
              </div>

              <div className="field">
                <label>LinkedIn URL (optional)</label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/yourusername"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Submitting application...' : 'Submit mentor application'}
              </button>
            </form>
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', marginTop: '48px' }}>
          <div className="card">
            <div className="section-label" style={{ marginTop: 0 }}>Set your rate</div>
            <p className="sub" style={{ margin: 0 }}>
              Charge per minute or per session — it's entirely up to you and you keep your earned cut.
            </p>
          </div>
          <div className="card">
            <div className="section-label" style={{ marginTop: 0 }}>Chat before you commit</div>
            <p className="sub" style={{ margin: 0 }}>
              Learners message you first, so you understand the problem before accepting a session.
            </p>
          </div>
          <div className="card">
            <div className="section-label" style={{ marginTop: 0 }}>Get paid safely</div>
            <p className="sub" style={{ margin: 0 }}>
              Learner payments are deposited into escrow upfront and released to you upon session completion.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
