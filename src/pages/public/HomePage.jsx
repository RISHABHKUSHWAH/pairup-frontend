import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BookSessionModal from '../../components/BookSessionModal';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons';
import { TechIcon } from '../../components/TechIcon';
import { api, initials, stars } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';

export default function HomePage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [allMentors, setAllMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bookModalMentor, setBookModalMentor] = useState(null);
  const [topic, setTopic] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Horizontal scroll tracking for skills/topics
  const scrollTrackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const updateScrollState = useCallback(() => {
    const el = scrollTrackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  const handleScrollLeft = () => {
    if (scrollTrackRef.current) {
      scrollTrackRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollTrackRef.current) {
      scrollTrackRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  // Load all mentors once on mount to dynamically derive skills and enable instant filtering
  useEffect(() => {
    loadAllMentors();
  }, []);

  const loadAllMentors = async () => {
    setLoading(true);
    try {
      const data = await api.getMentors({ sort: 'rating' });
      const list = data || [];
      setAllMentors(list);
      if (list.length > 0) {
        handleSelectMentor(list[0]);
      }
    } catch (err) {
      console.error('Failed to load mentors:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically derive unique skills from approved mentors, ranked by frequency (no numbers shown)
  const dynamicSkills = useMemo(() => {
    const counts = {};
    allMentors.forEach((m) => {
      const skillsArr = Array.isArray(m.skills) ? m.skills : (m.skills || '').split(',');
      skillsArr.forEach((s) => {
        const trimmed = (s || '').trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (!counts[key]) {
          const upperKeys = ['aws', 'sql', 'dsa', 'html', 'css', 'php', 'api', 'ci/cd', 'ui/ux'];
          const label = upperKeys.includes(key)
            ? key.toUpperCase()
            : trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

          counts[key] = {
            label,
            value: key,
            count: 0,
          };
        }
        counts[key].count += 1;
      });
    });

    return Object.values(counts).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
  }, [allMentors]);

  // Set up listeners and recalculate scroll overflow whenever dynamicSkills or layout changes
  useEffect(() => {
    const el = scrollTrackRef.current;
    if (!el) return;

    updateScrollState();
    const timer = setTimeout(updateScrollState, 100);

    const handleScroll = () => updateScrollState();
    el.addEventListener('scroll', handleScroll, { passive: true });

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateScrollState());
      ro.observe(el);
    }

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });

    window.addEventListener('resize', updateScrollState);

    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', handleScroll);
      el.removeEventListener('wheel', handleWheel);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, dynamicSkills]);

  // Toggle multi-select skill pill
  const handleToggleSkill = (val) => {
    if (!val) {
      setSelectedSkills([]);
      return;
    }
    const lower = val.toLowerCase();
    setSelectedSkills((prev) => {
      if (prev.includes(lower)) {
        return prev.filter((s) => s !== lower);
      } else {
        return [...prev, lower];
      }
    });
  };

  // Instant client-side filter and ranking matching Explore Mentors
  const filteredMentors = useMemo(() => {
    return allMentors.filter((m) => {
      // Search filter: multi-term or comma-separated
      if (search.trim()) {
        const isComma = search.includes(',');
        const terms = isComma
          ? search.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
          : search.toLowerCase().split(/\s+/).filter(Boolean);

        const mSkills = (Array.isArray(m.skills) ? m.skills : (m.skills || '').split(','))
          .map((s) => String(s).trim().toLowerCase());
        const fullText = [
          m.name,
          m.title,
          m.company,
          m.bio,
          ...mSkills,
        ].filter(Boolean).join(' ').toLowerCase();

        const match = isComma
          ? terms.some((t) => fullText.includes(t))
          : terms.every((t) => fullText.includes(t));

        if (!match) return false;
      }

      // Selected skills filter: multi-select
      if (selectedSkills.length > 0) {
        const mSkills = (Array.isArray(m.skills) ? m.skills : (m.skills || '').split(','))
          .map((s) => String(s).trim().toLowerCase());
        const matchesSkill = selectedSkills.some((s) =>
          mSkills.some((ms) => ms.includes(s) || s.includes(ms))
        );
        if (!matchesSkill) return false;
      }

      return true;
    }).sort((a, b) => {
      if (selectedSkills.length > 1) {
        const aSkills = (Array.isArray(a.skills) ? a.skills : (a.skills || '').split(','))
          .map((s) => String(s).trim().toLowerCase());
        const bSkills = (Array.isArray(b.skills) ? b.skills : (b.skills || '').split(','))
          .map((s) => String(s).trim().toLowerCase());
        const aMatches = selectedSkills.filter((st) => aSkills.some((ms) => ms.includes(st) || st.includes(ms))).length;
        const bMatches = selectedSkills.filter((st) => bSkills.some((ms) => ms.includes(st) || st.includes(ms))).length;
        if (bMatches !== aMatches) return bMatches - aMatches;
      }
      return (b.rating_avg || 0) - (a.rating_avg || 0);
    });
  }, [allMentors, search, selectedSkills]);

  // Keep preview in sync with filtered list (respecting any pending bookMentor parameter)
  useEffect(() => {
    if (filteredMentors.length > 0) {
      const bookMentorId = searchParams.get('bookMentor') || location.state?.mentorId;
      if (bookMentorId) {
        const target = filteredMentors.find((m) => String(m.user_id) === String(bookMentorId) || String(m.id) === String(bookMentorId));
        if (target && selectedMentor?.user_id !== target.user_id) {
          handleSelectMentor(target);
          return;
        }
      }
      if (!selectedMentor || !filteredMentors.some((m) => m.user_id === selectedMentor.user_id)) {
        handleSelectMentor(filteredMentors[0]);
      }
    } else {
      setSelectedMentor(null);
    }
  }, [filteredMentors]);

  // Automatically resume pending action after login (e.g. book session)
  useEffect(() => {
    if (!user) return;

    let targetMentorId = searchParams.get('bookMentor');
    let pendingData = null;

    try {
      const stored = sessionStorage.getItem('pairup_pending_action');
      if (stored) {
        pendingData = JSON.parse(stored);
        if (pendingData?.action === 'book_session') {
          targetMentorId = targetMentorId || pendingData.mentorId;
        }
      }
    } catch (e) {}

    if (!targetMentorId && location.state?.action === 'book_session') {
      targetMentorId = location.state.mentorId;
    }

    if (!targetMentorId) return;

    // Clear pending action from storage so it does not re-open later
    try {
      sessionStorage.removeItem('pairup_pending_action');
    } catch (e) {}

    // Clean up query param from URL
    if (searchParams.has('bookMentor')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('bookMentor');
      setSearchParams(nextParams, { replace: true });
    }

    const restoreBooking = async () => {
      let target = pendingData?.mentor || location.state?.mentor;
      if (!target || (String(target.user_id) !== String(targetMentorId) && String(target.id) !== String(targetMentorId))) {
        target = allMentors.find((m) => String(m.user_id) === String(targetMentorId) || String(m.id) === String(targetMentorId));
        if (!target) {
          try {
            target = await api.getMentor(targetMentorId);
          } catch (err) {
            console.error('Failed to load pending mentor:', err);
          }
        }
      }

      if (target) {
        setSelectedMentor(target);
        setBookModalMentor(target);
        toast.success(`Resuming your session booking with ${target.name}!`);
      }
    };

    restoreBooking();
  }, [user, allMentors]);

  const handleSelectMentor = async (mentor) => {
    if (!mentor) return;
    const mentorId = mentor.user_id || mentor.id;
    if (selectedMentor?.user_id === mentorId && !detailLoading) return;

    // Immediately show the selected mentor's card information to prevent layout shifts or wait time
    setSelectedMentor((prev) => ({
      ...mentor,
      bio: prev?.user_id === mentorId ? prev.bio : mentor.bio,
      experience_years: prev?.user_id === mentorId ? prev.experience_years : mentor.experience_years,
      skills: prev?.user_id === mentorId ? prev.skills : mentor.skills,
      reviews: prev?.user_id === mentorId ? prev.reviews : [],
    }));

    setDetailLoading(true);
    try {
      const fullMentor = await api.getMentor(mentorId);
      setSelectedMentor(fullMentor);
      // On mobile devices, automatically scroll to the preview panel when a mentor is clicked
      if (window.innerWidth <= 960) {
        setTimeout(() => {
          document.querySelector('.mentor-preview-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to load mentor details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      const mId = selectedMentor?.user_id || selectedMentor?.id;
      const returnUrl = `/?bookMentor=${mId}`;
      try {
        sessionStorage.setItem('pairup_pending_action', JSON.stringify({
          action: 'book_session',
          mentorId: mId,
          mentor: selectedMentor,
          returnUrl,
        }));
      } catch (err) {}
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`, {
        state: {
          from: { pathname: '/', search: `?bookMentor=${mId}` },
          action: 'book_session',
          mentorId: mId,
          mentor: selectedMentor,
        },
      });
      return;
    }
    setBookingError('');
    try {
      const rate = Number(selectedMentor?.hourly_rate || 0);
      const price = rate > 0 ? Math.max(1, Math.round((rate * 30) / 60)) : 0;
      await api.createBooking({
        mentor_id: selectedMentor.user_id,
        topic,
        duration_minutes: 30,
        price,
      });
      toast.success('Session requested! Redirecting to sessions...');
      navigate('/learner/sessions');
    } catch (err) {
      setBookingError(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, paddingTop: '28px' }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '12.5px', color: 'var(--accent)', marginBottom: '8px' }}>
          ₹ live · 1-to-1 · pay per session
        </div>
        <h1>
          Stuck on a bug?<br />
          Pair with a <span className="accent">real developer</span>, right now.
        </h1>
        <p className="sub" style={{ maxWidth: '520px' }}>
          Browse verified IT mentors, message them before you pay, then confirm a live 1-to-1 pairing session.
        </p>

        <div
          className="filters"
          style={{
            margin: '16px 0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {/* Dynamic Mentor Technology Pills - Strict Single Line with Horizontal Scroll & Indicator Icons */}
          <div className="skills-scroll-wrapper">
            {canScrollLeft && (
              <div className="skills-scroll-edge-left">
                <button
                  type="button"
                  className="skills-scroll-btn"
                  onClick={handleScrollLeft}
                  title="Scroll skills left"
                  aria-label="Scroll skills left"
                >
                  <ChevronLeftIcon size={16} />
                </button>
              </div>
            )}

            <div
              ref={scrollTrackRef}
              className="skills-scroll-track"
            >
              {/* All Option */}
              <button
                type="button"
                className={`chip ${selectedSkills.length === 0 ? 'active' : ''}`}
                onClick={() => setSelectedSkills([])}
                title="Show all mentors"
                style={{
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <TechIcon name="all" size={13} />
                <span>All</span>
              </button>

              {/* Explore Mentors Option in the line */}
              <Link
                to="/learner/explore"
                className="chip chip-explore"
                title="Open full Explore Mentors portal"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid var(--accent)',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-ink)',
                  fontWeight: 700,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <span>Explore Mentors</span>
                <span style={{ fontSize: '13px', lineHeight: 1 }}>↗</span>
              </Link>

              {/* Dynamic Skills Derived from Mentors with Tech Icons */}
              {dynamicSkills.map((tech) => {
                const active = selectedSkills.includes(tech.value);
                return (
                  <button
                    key={tech.value}
                    type="button"
                    className={`chip ${active ? 'active' : ''}`}
                    onClick={() => handleToggleSkill(tech.value)}
                    title={`Filter by ${tech.label}`}
                    style={{
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <TechIcon name={tech.value} size={14} />
                    <span>{tech.label}</span>
                  </button>
                );
              })}

              {selectedSkills.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSkills([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    textDecoration: 'underline',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  Clear ({selectedSkills.length})
                </button>
              )}
            </div>

            {canScrollRight && (
              <div className="skills-scroll-edge-right">
                <button
                  type="button"
                  className="skills-scroll-btn"
                  onClick={handleScrollRight}
                  title="Scroll skills right"
                  aria-label="Scroll skills right"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Search Input in the same line */}
          <input
            type="text"
            className="search"
            placeholder="Search a skill, name, or problem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              minWidth: '220px',
              flex: '1 1 220px',
            }}
          />
        </div>

        <div className="mentor-explorer-grid">
          {/* Left Column: Mentors list */}
          <div className="mentor-list-col">
            {loading ? (
              <div className="empty">Loading mentors...</div>
            ) : filteredMentors.length === 0 ? (
              <div className="empty">
                No mentors found matching your filters.{' '}
                <Link to="/become-a-mentor" style={{ color: 'var(--accent)' }}>
                  Become a mentor
                </Link>
              </div>
            ) : (
              filteredMentors.map((m) => (
                <div
                  key={m.user_id}
                  className={`card ${selectedMentor?.user_id === m.user_id ? 'selected' : ''}`}
                  onClick={() => handleSelectMentor(m)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-top">
                    <div className="avatar">{initials(m.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="card-name">
                        {m.name}{' '}
                        {m.verified && <span style={{ color: 'var(--accent)' }}>✓</span>}
                      </div>
                      <div className="card-title">{m.title || 'IT Mentor'}</div>
                    </div>
                    <div className={`status ${m.online ? 'online' : 'away'}`}>
                      <span className="led"></span>
                      {m.online ? 'online' : 'away'}
                    </div>
                  </div>

                  <div className="card-skills">
                    {m.skills?.slice(0, 4).map((s) => (
                      <span key={s} className="tag">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="card-foot">
                    <span className="stars">
                      {m.rating_avg && Number(m.rating_avg) > 0 ? (
                        <>
                          {stars(m.rating_avg)}{' '}
                          <span className="mono" style={{ color: 'var(--ink)' }}>
                            {Number(m.rating_avg).toFixed(1)}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>★ New</span>
                      )}
                    </span>
                    <span className="mono" style={{ fontSize: '11px' }}>
                      <span style={{ color: 'var(--add)', fontWeight: 600 }}>+{m.sessions_completed}</span> /{' '}
                      <span style={{ color: 'var(--warn)', fontWeight: 600 }}>-{m.disputes_count}</span>
                    </span>
                    <span className="rate">₹{Number(m.hourly_rate || 0).toLocaleString('en-IN')}/hr</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Selected mentor profile panel with rock-solid fixed dimensions */}
          <div className="mentor-preview-panel">
            {/* Terminal Header Bar */}
            <div className="mentor-preview-terminal-bar">
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#E5534B' }}></span>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#E0A426' }}></span>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3FB56D' }}></span>
              <span className="mono" style={{ marginLeft: '10px', fontSize: '11.5px', color: '#8892A6' }}>
                ~/mentors/{selectedMentor?.name ? selectedMentor.name.toLowerCase().replace(/\s+/g, '-') : 'profile'}
              </span>
              {detailLoading && (
                <span className="mono" style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="spinner-sm" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></span>
                  syncing...
                </span>
              )}
            </div>

            {/* Panel Body Content */}
            {selectedMentor ? (
              <div className="mentor-preview-content">
                <div className="panel-head">
                  <div className="avatar-lg">{initials(selectedMentor.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="panel-name">
                      {selectedMentor.name}{' '}
                      {selectedMentor.verified && <span style={{ color: 'var(--accent)' }}>✓</span>}
                    </div>
                    <div className="panel-title">{selectedMentor.title || 'IT Mentor'}</div>
                    <div className="panel-meta">
                      <span className="stars">
                        {selectedMentor.rating_avg && Number(selectedMentor.rating_avg) > 0 ? (
                          <>
                            {stars(selectedMentor.rating_avg)}{' '}
                            <b className="mono">{Number(selectedMentor.rating_avg).toFixed(1)}</b>{' '}
                            <span className="sub">({selectedMentor.reviews?.length || 0})</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--ink-muted)' }}>
                            ★ New <span className="sub">({selectedMentor.reviews?.length || 0} reviews)</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: selectedMentor.online ? 'var(--add-bg)' : 'var(--grid)',
                      color: selectedMentor.online ? 'var(--add)' : 'var(--ink-muted)',
                      fontFamily: 'IBM Plex Mono',
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                    }}
                  >
                    {selectedMentor.online ? 'Online now' : 'Away'}
                  </span>
                </div>

                <p className="bio">{selectedMentor.bio || 'No bio provided.'}</p>

                <div className="section-label">Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedMentor.skills?.map((s) => (
                    <span key={s} className="tag">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="stat-row">
                  <div className="stat-cell">
                    <div className="stat-num" style={{ color: 'var(--add)' }}>
                      +{selectedMentor.sessions_completed || 0}
                    </div>
                    <div className="stat-label">sessions completed</div>
                  </div>
                  <div className="stat-cell">
                    <div
                      className="stat-num"
                      style={{ color: selectedMentor.disputes_count > 0 ? 'var(--warn)' : 'var(--ink)' }}
                    >
                      {selectedMentor.disputes_count || 0}
                    </div>
                    <div className="stat-label">disputes filed</div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-num">
                      {selectedMentor.completion_rate !== null ? `${selectedMentor.completion_rate}%` : '—'}
                    </div>
                    <div className="stat-label">completion rate</div>
                  </div>
                </div>

                <div className="rate-card">
                  <div>
                    <div className="rate-num">₹{Number(selectedMentor.hourly_rate || 0).toLocaleString('en-IN')}/hr</div>
                    <div className="sub" style={{ margin: 0 }}>
                      ~₹{Math.max(1, Math.round(((Number(selectedMentor.hourly_rate) || 0) * 30) / 60)).toLocaleString('en-IN')} for a 30-min session
                    </div>
                  </div>
                  <div className="rate-actions">
                    <Link
                      to={
                        user
                          ? `/chat?with=${selectedMentor.user_id || selectedMentor.id}&name=${encodeURIComponent(selectedMentor.name || 'Mentor')}`
                          : `/login?redirect=${encodeURIComponent(`/chat?with=${selectedMentor.user_id || selectedMentor.id}&name=${encodeURIComponent(selectedMentor.name || 'Mentor')}`)}`
                      }
                      className="btn btn-ghost"
                      onClick={() => {
                        if (!user) {
                          const chatUrl = `/chat?with=${selectedMentor.user_id || selectedMentor.id}&name=${encodeURIComponent(selectedMentor.name || 'Mentor')}`;
                          try {
                            sessionStorage.setItem('pairup_pending_action', JSON.stringify({
                              action: 'chat',
                              mentorId: selectedMentor.user_id || selectedMentor.id,
                              mentor: selectedMentor,
                              returnUrl: chatUrl,
                            }));
                          } catch (err) {}
                        }
                      }}
                    >
                      Message
                    </Link>
                    <Link to={`/mentor/${selectedMentor.user_id}`} className="btn btn-ghost">
                      Full Profile
                    </Link>
                  </div>
                </div>

                <div className="section-label">Book a Live Session</div>
                <p className="sub" style={{ fontSize: '12.5px', margin: '0 0 10px' }}>
                  Select your desired session duration and pick an open slot that fits your schedule.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '14px', fontWeight: 700 }}
                  onClick={() => {
                    if (!user) {
                      const mId = selectedMentor?.user_id || selectedMentor?.id;
                      const returnUrl = `/?bookMentor=${mId}`;
                      try {
                        sessionStorage.setItem('pairup_pending_action', JSON.stringify({
                          action: 'book_session',
                          mentorId: mId,
                          mentor: selectedMentor,
                          returnUrl,
                        }));
                      } catch (err) {}
                      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`, {
                        state: {
                          from: { pathname: '/', search: `?bookMentor=${mId}` },
                          action: 'book_session',
                          mentorId: mId,
                          mentor: selectedMentor,
                        },
                      });
                      return;
                    }
                    setBookModalMentor(selectedMentor);
                  }}
                >
                  <CalendarIcon size={16} />
                  <span>Choose Duration &amp; Book Slot</span>
                </button>

                <div className="section-label">Recent reviews</div>
                {selectedMentor.reviews && selectedMentor.reviews.length > 0 ? (
                  selectedMentor.reviews.slice(0, 3).map((r, i) => (
                    <div key={i} className="review">
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
            ) : detailLoading ? (
              <div className="mentor-preview-loading">
                <div className="spinner-sm" style={{ marginBottom: '12px' }}></div>
                <div className="mono" style={{ fontSize: '12px' }}>Loading mentor details...</div>
              </div>
            ) : (
              <div className="mentor-preview-empty">
                Select a mentor to view their profile.
              </div>
            )}
          </div>
        </div>
      </main>

      <BookSessionModal
        isOpen={!!bookModalMentor}
        onClose={() => setBookModalMentor(null)}
        mentor={bookModalMentor}
      />

      <Footer />
    </div>
  );
}
