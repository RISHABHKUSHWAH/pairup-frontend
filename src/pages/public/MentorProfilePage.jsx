import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BookSessionModal from '../../components/BookSessionModal';
import Pagination from '../../components/Pagination';
import { api, initials, stars } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  MessageIcon,
  ArrowLeftIcon,
  BriefcaseIcon,
  MapPinIcon,
  GlobeIcon,
  AwardIcon,
  GraduationCapIcon,
  StarIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ClockIcon,
  CodeIcon,
  GithubIcon,
  LinkedinIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  SparklesIcon,
  UserIcon
} from '../../components/Icons';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewsPerPage, setReviewsPerPage] = useState(3);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadMentor() {
      setLoading(true);
      setReviewPage(1);
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

  // Resume booking modal if returned from login
  useEffect(() => {
    if (!user || !mentor) return;
    const shouldBook = searchParams.get('book') === 'true' || location.state?.action === 'book_session';
    if (shouldBook) {
      try {
        sessionStorage.removeItem('pairup_pending_action');
      } catch (e) {}
      if (searchParams.has('book')) {
        const next = new URLSearchParams(searchParams);
        next.delete('book');
        setSearchParams(next, { replace: true });
      }
      setBookModalOpen(true);
      toast.success(`Resuming your session booking with ${mentor.name}!`);
    }
  }, [user, mentor]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      const mId = mentor?.user_id || mentor?.id || id;
      const returnUrl = `/mentor/${mId}?book=true`;
      try {
        sessionStorage.setItem('pairup_pending_action', JSON.stringify({
          action: 'book_session',
          mentorId: mId,
          mentor,
          returnUrl,
        }));
      } catch (err) {}
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`, {
        state: {
          from: { pathname: `/mentor/${mId}`, search: '?book=true' },
          action: 'book_session',
          mentorId: mId,
          mentor,
        },
      });
      return;
    }
    setBookingError('');
    setIsSubmitting(true);
    try {
      const rate = Number(mentor.hourly_rate || 0);
      const price = rate > 0 ? Math.max(1, Math.round((rate * 30) / 60)) : 0;
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
        <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <div className="spinner-sm" style={{ margin: '0 auto 16px' }}></div>
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
        <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <h2>Mentor Not Found</h2>
          <p className="sub">The requested mentor could not be found or is inactive.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Back to browse
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isOwnProfile = user && user.id === mentor.user_id;
  const ratingNum = mentor.rating_avg ? Number(mentor.rating_avg).toFixed(1) : '5.0';
  const sessionsCount = mentor.sessions_completed || 0;
  const completionPercent = mentor.completion_rate !== null && mentor.completion_rate !== undefined 
    ? `${mentor.completion_rate}%` 
    : '100%';
  const priceFor30Min = Math.max(1, Math.round(((Number(mentor.hourly_rate) || 0) * 30) / 60));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, padding: '16px 24px 60px', maxWidth: '1120px' }}>
        {/* Back Button */}
        <div style={{ marginBottom: '12px' }}>
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

        {/* Hero Card */}
        <div className="profile-banner"></div>
        <div className="profile-body">
          {/* Avatar with image or initials and online dot */}
          <div className="profile-avatar-lg">
            {mentor.photo_url ? (
              <img src={mentor.photo_url} alt={mentor.name} className="profile-avatar-img" />
            ) : (
              <span>{initials(mentor.name)}</span>
            )}
            {mentor.online && <span className="dot" title="Online now"></span>}
          </div>

          {/* Header row & details */}
          <div className="profile-header-wrap">
            <div className="profile-title-col">
              <div className="profile-name-row">
                <h1 className="profile-fullname">{mentor.name}</h1>
                {mentor.verified && (
                  <span className="profile-verified-badge" title="Identity & Skills Verified">
                    <CheckCircleIcon size={13} />
                    <span>Verified Mentor</span>
                  </span>
                )}
              </div>

              <div className="profile-headline">
                <BriefcaseIcon size={16} />
                <span>{mentor.title || 'Technical Mentor & Architect'}</span>
                {mentor.company && (
                  <span>
                    at <strong style={{ color: 'var(--ink)' }}>{mentor.company}</strong>
                  </span>
                )}
              </div>

              <div className="profile-chips-row">
                {mentor.years_experience && (
                  <span className="profile-chip">
                    <SparklesIcon size={14} />
                    <span>{mentor.years_experience}+ yrs experience</span>
                  </span>
                )}
                {mentor.location && (
                  <span className="profile-chip">
                    <MapPinIcon size={14} />
                    <span>{mentor.location}</span>
                  </span>
                )}
                {mentor.languages && mentor.languages.length > 0 && (
                  <span className="profile-chip">
                    <GlobeIcon size={14} />
                    <span>{mentor.languages.join(', ')}</span>
                  </span>
                )}
                <span className={`profile-chip status-chip ${mentor.online ? 'online' : ''}`}>
                  <span className="led"></span>
                  <span>{mentor.online ? 'Online now' : 'Away'}</span>
                </span>
                <span className="profile-chip highlight">
                  <span>⚡ ₹{Number(mentor.hourly_rate || 0).toLocaleString('en-IN')}/hr</span>
                </span>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="profile-actions-bar">
              {!isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const bookingEl = document.getElementById('booking-section');
                      if (bookingEl) {
                        bookingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const topicInput = document.getElementById('booking-topic-input');
                        if (topicInput) topicInput.focus();
                      }
                    }}
                    className="btn btn-primary"
                    style={{ padding: '9px 18px', fontSize: '13.5px' }}
                  >
                    <CalendarIcon size={15} />
                    <span>Book 1:1 Session</span>
                  </button>

                  <Link
                    to={`/chat?with=${mentor.user_id || mentor.id}&name=${encodeURIComponent(mentor.name || 'Mentor')}`}
                    className="btn btn-ghost"
                    style={{ padding: '9px 16px', fontSize: '13.5px' }}
                  >
                    <MessageIcon size={15} />
                    <span>Message</span>
                  </Link>
                </>
              ) : (
                <Link to="/mentor/settings" className="btn btn-ghost">
                  Edit your profile
                </Link>
              )}

              {/* Social Links */}
              {mentor.github_url && (
                <a className="profile-social-link" href={mentor.github_url} target="_blank" rel="noopener noreferrer">
                  <GithubIcon size={15} />
                  <span>GitHub ↗</span>
                </a>
              )}
              {mentor.linkedin_url && (
                <a className="profile-social-link" href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <LinkedinIcon size={15} />
                  <span>LinkedIn ↗</span>
                </a>
              )}
              {mentor.portfolio_url && (
                <a className="profile-social-link" href={mentor.portfolio_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon size={15} />
                  <span>Portfolio ↗</span>
                </a>
              )}
              {mentor.website_url && (
                <a className="profile-social-link" href={mentor.website_url} target="_blank" rel="noopener noreferrer">
                  <GlobeIcon size={15} />
                  <span>Website ↗</span>
                </a>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mentor-stats-grid">
            <div className="mentor-stat-card">
              <div className="mentor-stat-val">
                <StarIcon size={18} style={{ color: 'var(--gold)' }} />
                <span>{ratingNum}</span>
              </div>
              <div className="mentor-stat-lbl">Rating ({mentor.reviews?.length || 0} reviews)</div>
            </div>
            <div className="mentor-stat-card">
              <div className="mentor-stat-val">
                +{sessionsCount}
              </div>
              <div className="mentor-stat-lbl">Sessions Completed</div>
            </div>
            <div className="mentor-stat-card">
              <div className="mentor-stat-val">
                <ShieldCheckIcon size={18} style={{ color: 'var(--add)' }} />
                <span>{completionPercent}</span>
              </div>
              <div className="mentor-stat-lbl">Completion Rate</div>
            </div>
            <div className="mentor-stat-card">
              <div className="mentor-stat-val">
                <ClockIcon size={18} style={{ color: 'var(--accent)' }} />
                <span>&lt; 30m</span>
              </div>
              <div className="mentor-stat-lbl">Avg Response Time</div>
            </div>
          </div>
        </div>

        {/* 2-Column Main Content & Sticky Booking Sidebar */}
        <div className="mentor-profile-grid">
          {/* Main Column */}
          <div className="mentor-profile-main">
            {/* About Me */}
            <div className="mentor-section-card">
              <div className="mentor-card-header">
                <div className="mentor-card-icon">
                  <UserIcon size={18} />
                </div>
                <h3 className="mentor-card-title">About</h3>
              </div>
              <div className="mentor-bio-text">
                {mentor.bio || 'This mentor has not added an about section yet.'}
              </div>
            </div>

            {/* Skills */}
            <div className="mentor-section-card">
              <div className="mentor-card-header">
                <div className="mentor-card-icon">
                  <CodeIcon size={18} />
                </div>
                <h3 className="mentor-card-title">Skills &amp; Expertise</h3>
              </div>
              {mentor.skills && mentor.skills.length > 0 ? (
                <div className="mentor-skill-chips">
                  {mentor.skills.map((skill) => (
                    <span key={skill} className="mentor-skill-pill">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="sub" style={{ margin: 0 }}>No skills listed yet.</p>
              )}
            </div>

            {/* Experience Timeline */}
            <div className="mentor-section-card">
              <div className="mentor-card-header">
                <div className="mentor-card-icon">
                  <BriefcaseIcon size={18} />
                </div>
                <h3 className="mentor-card-title">Work Experience</h3>
              </div>
              {mentor.experience && mentor.experience.length > 0 ? (
                <div className="timeline">
                  {mentor.experience.map((e, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="timeline-title">{e.job_title}</div>
                        <div className="timeline-sub">
                          <strong style={{ color: 'var(--ink)' }}>{e.company}</strong> · {formatMonthYear(e.start_date)} – {formatMonthYear(e.end_date)}
                        </div>
                        {e.description && (
                          <div className="sub" style={{ marginTop: '6px', lineHeight: 1.55 }}>
                            {e.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="sub" style={{ margin: 0 }}>No work experience listed yet.</p>
              )}
            </div>

            {/* Featured Projects */}
            <div className="mentor-section-card">
              <div className="mentor-card-header">
                <div className="mentor-card-icon">
                  <SparklesIcon size={18} />
                </div>
                <h3 className="mentor-card-title">Featured Projects</h3>
              </div>
              {mentor.projects && mentor.projects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {mentor.projects.map((p, idx) => (
                    <div key={idx} className="mini-card" style={{ padding: '14px 16px' }}>
                      <div className="timeline-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>{p.name}</span>
                            <ExternalLinkIcon size={14} />
                          </a>
                        ) : (
                          <span>{p.name}</span>
                        )}
                      </div>
                      {p.description && (
                        <div className="sub" style={{ marginTop: '5px', lineHeight: 1.5 }}>
                          {p.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="sub" style={{ margin: 0 }}>No projects listed yet.</p>
              )}
            </div>

            {/* Education, Certifications & Awards */}
            {(mentor.education?.length > 0 || mentor.certifications?.length > 0 || mentor.awards?.length > 0) && (
              <div className="mentor-section-card">
                <div className="mentor-card-header">
                  <div className="mentor-card-icon">
                    <GraduationCapIcon size={18} />
                  </div>
                  <h3 className="mentor-card-title">Education &amp; Credentials</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {mentor.education?.map((ed, idx) => (
                    <div key={`ed-${idx}`} className="mini-card" style={{ padding: '12px 14px' }}>
                      <div className="timeline-title">{ed.degree}</div>
                      <div className="timeline-sub">
                        {ed.university}
                        {ed.year ? ` · ${ed.year}` : ''}
                      </div>
                    </div>
                  ))}
                  {mentor.certifications?.map((c, idx) => (
                    <div key={`c-${idx}`} className="mini-card" style={{ padding: '12px 14px' }}>
                      <div className="timeline-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AwardIcon size={14} style={{ color: 'var(--gold)' }} />
                        <span>{c.name}</span>
                      </div>
                      <div className="timeline-sub">{[c.issuer, c.year].filter(Boolean).join(' · ')}</div>
                    </div>
                  ))}
                  {mentor.awards?.map((a, idx) => (
                    <div key={`a-${idx}`} className="mini-card" style={{ padding: '12px 14px' }}>
                      <div className="timeline-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <StarIcon size={14} style={{ color: 'var(--accent)' }} />
                        <span>{a.title}</span>
                        {a.year && <span style={{ fontWeight: 'normal', color: 'var(--ink-muted)' }}>({a.year})</span>}
                      </div>
                      {a.description && <div className="sub" style={{ marginTop: '4px' }}>{a.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="mentor-section-card" id="mentor-reviews-section">
              <div className="mentor-card-header">
                <div className="mentor-card-icon">
                  <StarIcon size={18} style={{ color: 'var(--gold)' }} />
                </div>
                <h3 className="mentor-card-title">
                  Learner Reviews {mentor.reviews && mentor.reviews.length > 0 ? `(${mentor.reviews.length})` : ''}
                </h3>
              </div>
              {mentor.reviews && mentor.reviews.length > 0 ? (
                (() => {
                  const totalPages = Math.ceil(mentor.reviews.length / reviewsPerPage) || 1;
                  const currentReviews = mentor.reviews.slice((reviewPage - 1) * reviewsPerPage, reviewPage * reviewsPerPage);
                  return (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {currentReviews.map((r, idx) => (
                          <div key={r.id || idx} className="review" style={{ padding: '14px 16px', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div className="review-name" style={{ fontWeight: 700 }}>
                                {r.learner_name}
                              </div>
                              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '13px' }}>
                                ★ {r.rating}.0
                              </div>
                            </div>
                            <div className="review-body" style={{ marginTop: '6px', fontSize: '13.5px' }}>
                              {r.comment || 'No written feedback provided.'}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Pagination
                        currentPage={reviewPage}
                        totalPages={totalPages}
                        onPageChange={(page) => {
                          setReviewPage(page);
                          const el = document.getElementById('mentor-reviews-section');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }
                        }}
                        totalItems={mentor.reviews.length}
                        itemsPerPage={reviewsPerPage}
                        itemLabel="reviews"
                        pageSizeOptions={[3, 5, 10]}
                        onPageSizeChange={(newSize) => {
                          setReviewsPerPage(newSize);
                          setReviewPage(1);
                        }}
                        compact={true}
                      />
                    </>
                  );
                })()
              ) : (
                <p className="sub" style={{ margin: 0 }}>
                  No reviews yet. Book a session with {mentor.name} and be the first to leave feedback!
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Booking Card & Availability */}
          <div className="mentor-profile-sidebar">
            <div className="mentor-sidebar-sticky">
              {/* Booking Card */}
              <div className="mentor-booking-box" id="booking-section">
                <h3 style={{ margin: '0 0 14px', fontSize: '17px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  Book a Live Session
                </h3>

                <div className="mentor-pricing-banner">
                  <div>
                    <span className="mentor-price-main">₹{Number(mentor.hourly_rate || 0).toLocaleString('en-IN')}</span>
                    <span className="mentor-price-unit">/ hr</span>
                  </div>
                  <div className="mentor-price-estimate">
                    ~₹{Math.max(1, Math.round(((Number(mentor.hourly_rate) || 0) * selectedDuration) / 60)).toLocaleString('en-IN')} for {selectedDuration}m
                  </div>
                </div>

                {isOwnProfile ? (
                  <div className="info-box" style={{ margin: 0 }}>
                    <div className="alert-message">
                      This is how learners view your public profile.{' '}
                      <Link to="/mentor/settings" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        Edit your profile
                      </Link>{' '}
                      to update pricing, availability, or bio.
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', display: 'block', marginBottom: '6px' }}>
                        Session Duration:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                        {[30, 45, 60, 90, 120].map((d) => (
                          <button
                            key={d}
                            type="button"
                            className={`btn ${selectedDuration === d ? 'btn-primary' : 'btn-ghost'}`}
                            style={{
                              padding: '6px 2px',
                              fontSize: '11.5px',
                              fontWeight: selectedDuration === d ? 700 : 500,
                              borderRadius: '6px',
                            }}
                            onClick={() => setSelectedDuration(d)}
                          >
                            {d}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      onClick={() => {
                        if (!user) {
                          const mId = mentor?.user_id || mentor?.id || id;
                          const returnUrl = `/mentor/${mId}?book=true`;
                          try {
                            sessionStorage.setItem('pairup_pending_action', JSON.stringify({
                              action: 'book_session',
                              mentorId: mId,
                              mentor,
                              returnUrl,
                            }));
                          } catch (err) {}
                          navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`, {
                            state: {
                              from: { pathname: `/mentor/${mId}`, search: '?book=true' },
                              action: 'book_session',
                              mentorId: mId,
                              mentor,
                            },
                          });
                          return;
                        }
                        setBookModalOpen(true);
                      }}
                      style={{ padding: '12px 18px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <CalendarIcon size={16} />
                      <span>Book Session · ₹{Math.max(1, Math.round(((Number(mentor.hourly_rate) || 0) * selectedDuration) / 60)).toLocaleString('en-IN')} ({selectedDuration}m)</span>
                    </button>

                    {/* Escrow Guarantee Box */}
                    <div className="escrow-trust-box">
                      <ShieldCheckIcon size={22} className="escrow-trust-icon" />
                      <div>
                        <div className="escrow-trust-title">100% Escrow Protected</div>
                        <div className="escrow-trust-desc">
                          Payment is held securely in escrow and only released once your session finishes. 
                          Prompt refund guarantee if issues arise.
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Weekly Availability Card */}
              <div className="mentor-section-card" style={{ margin: 0 }}>
                <div className="mentor-card-header">
                  <div className="mentor-card-icon">
                    <CalendarIcon size={18} />
                  </div>
                  <h3 className="mentor-card-title">Weekly Availability</h3>
                </div>

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
                  <p className="sub" style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                    No fixed hours published — message {mentor.name} directly to arrange a custom time slot.
                  </p>
                )}
              </div>

              {/* Quick Message CTA */}
              {!isOwnProfile && (
                <div className="mentor-section-card" style={{ margin: 0, textAlign: 'center', background: 'var(--bg)' }}>
                  <p className="sub" style={{ margin: '0 0 12px', fontSize: '13px' }}>
                    Have questions before booking?
                  </p>
                  <Link
                    to={`/chat?with=${mentor.user_id || mentor.id}&name=${encodeURIComponent(mentor.name || 'Mentor')}`}
                    className="btn btn-secondary btn-block"
                  >
                    <MessageIcon size={15} />
                    <span>Chat with {mentor.name}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BookSessionModal
        isOpen={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        mentor={mentor}
        initialDuration={selectedDuration}
        initialTopic={topic}
      />

      <Footer />
    </div>
  );
}
