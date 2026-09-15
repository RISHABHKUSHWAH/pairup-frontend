import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api, initials, stars } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { MessageIcon, ArrowLeftIcon } from '../../components/Icons';
import { useToast } from '../../context';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatMonthYear(dateStr) {
  if (!dateStr) return 'Present';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime12h(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function MentorProfilePage() {
  const { toast } = useToast();
  const { id } = useParams();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadMentor() {
      setLoading(true);
      try {
        const data = await api.getMentor(id);
        setMentor(data);
      } catch (err) {
        console.error('Failed to load mentor:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMentor();
  }, [id]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setBookingError('');
    setIsSubmitting(true);
    try {
      const price = Math.round(((mentor.hourly_rate || 500) * 30) / 60);
      await api.createBooking({
        mentor_id: mentor.user_id,
        topic,
        duration_minutes: 30,
        price,
      });
      toast.success('Session requested successfully! Redirecting to sessions...');
      navigate('/learner/sessions');
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
          <p className="sub">Loading mentor profile...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div>
        <Navbar />
        <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
          <h2>Mentor Not Found</h2>
          <p className="sub">The requested mentor could not be found.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Back to browse
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isOwnProfile = user && user.id === mentor.user_id;
  const metaLine = [mentor.location, mentor.languages?.length ? mentor.languages.join(', ') : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, padding: '20px 20px 60px', maxWidth: '720px' }}>
        <div style={{ marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate(user?.role === 'mentor' ? '/mentor/dashboard' : '/learner/explore');
              }
            }}
            className="portal-back-btn"
            title="Go back"
            aria-label="Go back to previous page"
          >
            <ArrowLeftIcon size={15} />
            <span>Back</span>
          </button>
        </div>
        <div className="profile-banner"></div>
        <div className="profile-body">
          <div className="profile-avatar-lg">
            {initials(mentor.name)}
            {mentor.online && <span className="dot"></span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <span className="panel-name">{mentor.name}</span>
            {mentor.verified && <span title="Verified" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>✓</span>}
          </div>

          <div className="panel-title">
            {mentor.title || 'IT Mentor'}
            {mentor.company ? ` at ${mentor.company}` : ''}
          </div>

          {mentor.years_experience && (
            <div className="sub" style={{ marginTop: '4px', fontSize: '13px' }}>
              {mentor.years_experience} years of industry experience
            </div>
          )}
          {metaLine && (
            <div className="sub" style={{ marginTop: '2px', fontSize: '13px' }}>
              {metaLine}
            </div>
          )}
          <div className="sub" style={{ marginTop: '4px', fontSize: '13px' }}>
            <span className={`status ${mentor.online ? 'online' : 'away'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span className="led"></span>
              {mentor.online ? 'Online now' : 'Away'}
            </span> · ₹{Number(mentor.hourly_rate || 0).toLocaleString('en-IN')}/hr
          </div>

          {/* Action Links */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            {isOwnProfile ? (
              <Link to="/mentor/settings" className="btn btn-ghost">
                Edit your profile
              </Link>
            ) : (
              <Link
                to={`/chat?with=${mentor.user_id || mentor.id}&name=${encodeURIComponent(mentor.name || 'Mentor')}`}
                className="btn btn-ghost"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <MessageIcon size={14} /> Message
                </span>
              </Link>
            )}

            {mentor.github_url && (
              <a className="btn btn-ghost" href={mentor.github_url} target="_blank" rel="noopener noreferrer">
                GitHub ↗
              </a>
            )}
            {mentor.linkedin_url && (
              <a className="btn btn-ghost" href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer">
                LinkedIn ↗
              </a>
            )}
            {mentor.portfolio_url && (
              <a className="btn btn-ghost" href={mentor.portfolio_url} target="_blank" rel="noopener noreferrer">
                Portfolio ↗
              </a>
            )}
            {mentor.website_url && (
              <a className="btn btn-ghost" href={mentor.website_url} target="_blank" rel="noopener noreferrer">
                Website ↗
              </a>
            )}
          </div>

          {/* Profile Stats */}
          <div className="profile-stats">
            <div className="pstat">
              <div className="n">{mentor.rating_avg || '—'}</div>
              <div className="l">rating</div>
            </div>
            <div className="pstat">
              <div className="n">+{mentor.sessions_completed || 0}</div>
              <div className="l">sessions</div>
            </div>
            <div className="pstat">
              <div className="n">{mentor.disputes_count || 0}</div>
              <div className="l">disputes</div>
            </div>
          </div>

          {/* About */}
          <div className="section-label">About</div>
          <p className="bio">{mentor.bio || 'This mentor has not written an about section yet.'}</p>

          {/* Skills */}
          <div className="section-label">Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {mentor.skills && mentor.skills.length > 0 ? (
              mentor.skills.map((s) => (
                <span key={s} className="tag">
                  {s}
                </span>
              ))
            ) : (
              <span className="sub">No skills listed yet.</span>
            )}
          </div>

          {/* Experience Timeline */}
          <div className="section-label">Experience</div>
          {mentor.experience && mentor.experience.length > 0 ? (
            <div className="timeline">
              {mentor.experience.map((e, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <div className="timeline-title">{e.job_title}</div>
                    <div className="timeline-sub">
                      {e.company} · {formatMonthYear(e.start_date)} – {formatMonthYear(e.end_date)}
                    </div>
                    {e.description && <div className="sub" style={{ marginTop: '4px' }}>{e.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="sub">No work experience listed yet.</p>
          )}

          {/* Projects */}
          <div className="section-label">Projects</div>
          {mentor.projects && mentor.projects.length > 0 ? (
            mentor.projects.map((p, idx) => (
              <div key={idx} className="mini-card">
                <div className="timeline-title">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)' }}>
                      {p.name} ↗
                    </a>
                  ) : (
                    p.name
                  )}
                </div>
                {p.description && <div className="sub" style={{ marginTop: '3px' }}>{p.description}</div>}
              </div>
            ))
          ) : (
            <p className="sub">No projects listed yet.</p>
          )}

          {/* Education & Certifications */}
          {(mentor.education?.length > 0 || mentor.certifications?.length > 0 || mentor.awards?.length > 0) && (
            <>
              <div className="section-label">Education &amp; Certifications</div>
              {mentor.education?.map((ed, idx) => (
                <div key={`ed-${idx}`} className="mini-card">
                  <div className="timeline-title">{ed.degree}</div>
                  <div className="timeline-sub">
                    {ed.university}
                    {ed.year ? ` · ${ed.year}` : ''}
                  </div>
                </div>
              ))}
              {mentor.certifications?.map((c, idx) => (
                <div key={`c-${idx}`} className="mini-card">
                  <div className="timeline-title">{c.name}</div>
                  <div className="timeline-sub">{[c.issuer, c.year].filter(Boolean).join(' · ')}</div>
                </div>
              ))}
              {mentor.awards?.map((a, idx) => (
                <div key={`a-${idx}`} className="mini-card">
                  <div className="timeline-title">
                    {a.title}
                    {a.year ? ` · ${a.year}` : ''}
                  </div>
                  {a.description && <div className="sub" style={{ marginTop: '3px' }}>{a.description}</div>}
                </div>
              ))}
            </>
          )}

          {/* Weekly Availability */}
          <div className="section-label">Availability this week</div>
          {mentor.availability && mentor.availability.length > 0 ? (
            <div className="availability-grid">
              {DAY_NAMES.map((day, idx) => {
                const slots = mentor.availability.filter((s) => s.day_of_week === idx);
                if (slots.length === 0) return null;
                return (
                  <div key={day} className="avail-row">
                    <span className="avail-day">{day}</span>
                    <span className="avail-times">
                      {slots
                        .map((s) => `${formatTime12h(s.start_time)} – ${formatTime12h(s.end_time)}`)
                        .join(', ')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="sub">No fixed weekly schedule — message mentor directly to schedule.</p>
          )}

          {/* Rate card */}
          <div className="rate-card">
            <div>
              <div className="rate-num">₹{Number(mentor.hourly_rate || 0).toLocaleString('en-IN')}/hr</div>
              <div className="sub">~₹{Math.round(((mentor.hourly_rate || 500) * 30) / 60).toLocaleString('en-IN')} for a 30-min pairing session</div>
            </div>
          </div>

          {/* Request Booking Form or Own Profile Banner */}
          {isOwnProfile ? (
            <div className="rate-card" style={{ marginTop: '14px', background: 'var(--accent-soft)' }}>
              <div className="sub" style={{ margin: 0 }}>
                This is how learners see your public profile.{' '}
                <Link to="/mentor/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  Edit your profile
                </Link>{' '}
                to update information.
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              <div className="section-label">Request a session</div>
              {bookingError && <div className="error-box">{bookingError}</div>}

              <form onSubmit={handleBooking}>
                <div className="field">
                  <label>What do you need help with?</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. My Django migration keeps failing with an IntegrityError"
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                  {isSubmitting ? 'Requesting...' : `Request 30-min session (₹${Math.round(((mentor.hourly_rate || 500) * 30) / 60).toLocaleString('en-IN')})`}
                </button>
              </form>
            </div>
          )}

          {/* Reviews Section */}
          <div className="section-label">Recent reviews</div>
          {mentor.reviews && mentor.reviews.length > 0 ? (
            mentor.reviews.map((r, idx) => (
              <div key={idx} className="review">
                <div className="review-name">
                  {r.learner_name} · ★{r.rating}
                </div>
                <div className="review-body">{r.comment || ''}</div>
              </div>
            ))
          ) : (
            <p className="sub">No reviews yet.</p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
