import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import BookSessionModal from '../../components/BookSessionModal';
import { api, initials, stars, learnerFavorites } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { HeartIcon, MessageIcon, CalendarIcon, UserIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons';
import { TechIcon } from '../../components/TechIcon';
import { useToast } from '../../context';
import PairUpLoader from '../../components/PairUpLoader';

export default function LearnerExplorePage() {
  const { toast } = useToast();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [filters, setFilters] = useState({
    experience: '',
    rating: '',
    price: '',
    availability: '',
    language: '',
    sessionType: '',
  });

  const [favorites, setFavorites] = useState([]);
  const [previewMentor, setPreviewMentor] = useState(null);
  const [bookingMentor, setBookingMentor] = useState(null);
  const [bookingTopic, setBookingTopic] = useState('');
  const [bookingType, setBookingType] = useState('1-on-1 Mentoring');
  const [bookingDuration, setBookingDuration] = useState(60);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  // Horizontal scroll tracking for skills/topics
  const scrollTrackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  // Dynamically derive technologies added by mentors in their profiles, sorted by frequency (most used first)
  const techCategories = useMemo(() => {
    const counts = {};
    mentors.forEach((m) => {
      const skills = Array.isArray(m.skills)
        ? m.skills
        : typeof m.skills === 'string'
        ? m.skills.split(',')
        : [];
      skills.forEach((s) => {
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

    // Sort descending by frequency (count), then alphabetically
    const sorted = Object.values(counts).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });

    return [
      { label: 'All Technologies', value: '', count: mentors.length },
      ...sorted,
    ];
  }, [mentors]);

  // Set up listeners and recalculate scroll overflow whenever techCategories or layout changes
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
  }, [updateScrollState, techCategories]);

  useEffect(() => {
    setFavorites(learnerFavorites.getFavorites());
    loadMentors();
  }, []);

  const loadMentors = async () => {
    setLoading(true);
    try {
      const data = await api.getMentors({ sort: 'rating' });
      setMentors(data || []);
    } catch (err) {
      console.error('Failed to load mentors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = (m, e) => {
    e?.stopPropagation();
    const updated = learnerFavorites.toggleFavorite(m);
    setFavorites([...updated]);
  };

  const isFav = (id) => {
    return favorites.some((f) => f.id === id || f.user_id === id);
  };

  // Toggle skill pill (multi-select)
  const handleToggleTech = (val) => {
    if (!val) {
      setSelectedTechs([]);
      return;
    }
    const lower = val.toLowerCase();
    setSelectedTechs((prev) => {
      if (prev.includes(lower)) {
        return prev.filter((t) => t !== lower);
      } else {
        return [...prev, lower];
      }
    });
  };

  // Filter & ranking logic
  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      // 1. Search filter: support multi-word ("Alex Python") and comma-separated ("Python, AWS")
      if (search.trim()) {
        const isComma = search.includes(',');
        const terms = isComma
          ? search.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
          : search.toLowerCase().split(/\s+/).filter(Boolean);

        const mSkills = (m.skills || []).map((s) => String(s).toLowerCase());
        const fullText = [
          m.name,
          m.title,
          m.company,
          m.bio,
          ...mSkills,
        ].filter(Boolean).join(' ').toLowerCase();

        if (isComma) {
          const matchesAny = terms.some((t) => fullText.includes(t) || mSkills.some((s) => s.includes(t)));
          if (!matchesAny) return false;
        } else {
          const matchesAll = terms.every((t) => fullText.includes(t) || mSkills.some((s) => s.includes(t)));
          if (!matchesAll) return false;
        }
      }

      // 2. Selected Tech Pills filter (multi-select)
      if (selectedTechs.length > 0) {
        const mSkills = (m.skills || []).map((s) => String(s).toLowerCase());
        const hasMatch = selectedTechs.some((st) =>
          mSkills.some((ms) => ms.includes(st) || st.includes(ms))
        );
        if (!hasMatch) return false;
      }

      // 3. Experience filter
      if (filters.experience) {
        const exp = Number(m.years_experience || 0);
        if (filters.experience === '1-3' && (exp < 1 || exp > 3)) return false;
        if (filters.experience === '3-5' && (exp < 3 || exp > 5)) return false;
        if (filters.experience === '5+' && exp < 5) return false;
      }

      // 4. Minimum Rating filter
      if (filters.rating) {
        const minRating = Number(filters.rating);
        if ((m.rating_avg || 0) < minRating) return false;
      }

      // 5. Hourly Rate filter
      if (filters.price) {
        const rate = Number(m.hourly_rate || 0);
        if (filters.price === 'under1000' && rate > 1000) return false;
        if (filters.price === '1000-2500' && (rate < 1000 || rate > 2500)) return false;
        if (filters.price === 'above2500' && rate < 2500) return false;
      }

      // 6. Availability filter
      if (filters.availability === 'online' && !m.online && !m.online_status) {
        return false;
      }

      // 7. Language filter
      if (filters.language) {
        const targetLang = filters.language.toLowerCase();
        const langs = Array.isArray(m.languages)
          ? m.languages.join(' ').toLowerCase()
          : String(m.languages || '').toLowerCase();
        if (!langs.includes(targetLang)) return false;
      }

      return true;
    }).sort((a, b) => {
      // If user selected multiple skills, rank mentors matching MORE of them higher
      if (selectedTechs.length > 1) {
        const aSkills = (a.skills || []).map((s) => String(s).toLowerCase());
        const bSkills = (b.skills || []).map((s) => String(s).toLowerCase());
        const aMatches = selectedTechs.filter((st) => aSkills.some((ms) => ms.includes(st) || st.includes(ms))).length;
        const bMatches = selectedTechs.filter((st) => bSkills.some((ms) => ms.includes(st) || st.includes(ms))).length;
        if (bMatches !== aMatches) return bMatches - aMatches;
      }
      return (b.rating_avg || 0) - (a.rating_avg || 0);
    });
  }, [mentors, search, selectedTechs, filters]);

  const recommendedMentors = useMemo(() => {
    return mentors.filter((m) => (m.rating_avg || 0) >= 4.5).slice(0, 3);
  }, [mentors]);

  const handleOpenPreview = async (mentor) => {
    if (!mentor) return;
    setPreviewMentor(mentor);
    try {
      const targetId = mentor.user_id || mentor.id;
      if (targetId) {
        const full = await api.getMentor(targetId);
        if (full) {
          setPreviewMentor((prev) => ({ ...prev, ...full }));
        }
      }
    } catch {
      // Keep basic mentor data already displayed
    }
  };

  const openPreview = handleOpenPreview;

  const openBooking = (mentor, e) => {
    e?.stopPropagation();
    setBookingMentor(mentor);
  };


  return (
    <PortalLayout
      title="Explore Mentors"
      portalType="learner"
      actions={
        <Link to="/learner/favorites" className="btn btn-ghost" style={{ fontSize: '13px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <HeartIcon size={14} fill="currentColor" /> My Favorites ({favorites.length})
          </span>
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        Find and connect with top verified software engineers, architects, and technical leaders for live 1-on-1 mentoring.
      </p>

      {/* Search & Advanced Filters Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="search"
            placeholder="Search mentors by name, skills (e.g. Python, AWS), or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 2, minWidth: '240px' }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearch('');
              setSelectedTechs([]);
              setFilters({
                experience: '',
                rating: '',
                price: '',
                availability: '',
                language: '',
                sessionType: '',
              });
            }}
          >
            Reset Filters
          </button>
        </div>

        {/* Dynamic Mentor Technology Pills - Strict Single Line with Horizontal Scroll & Indicator Icons */}
        <div className="skills-scroll-wrapper" style={{ margin: '4px 0 8px' }}>
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
            {techCategories.map((tech) => {
              const isAll = !tech.value;
              const active = isAll
                ? selectedTechs.length === 0
                : selectedTechs.includes(tech.value);

              return (
                <button
                  key={tech.value || 'all'}
                  type="button"
                  className={`chip ${active ? 'active' : ''}`}
                  onClick={() => handleToggleTech(tech.value)}
                  title={
                    isAll
                      ? 'Show all mentors'
                      : `${tech.label} (${tech.count} mentor${tech.count === 1 ? '' : 's'}) - Click to toggle filter`
                  }
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: active ? '1.5px solid var(--ink)' : '1px solid var(--grid-strong)',
                    background: active ? 'var(--ink)' : 'var(--surface)',
                    color: active ? 'var(--bg)' : 'var(--ink)',
                    fontSize: '12.5px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: active ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <TechIcon name={tech.value || 'all'} size={14} />
                  <span>{tech.label}</span>
                  {tech.count && !isAll ? (
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: active ? 'rgba(var(--bg-rgb), 0.22)' : 'var(--grid-strong)',
                        color: active ? 'var(--bg)' : 'var(--ink-muted)',
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {tech.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {selectedTechs.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTechs([])}
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
                }}
              >
                Clear filters ({selectedTechs.length} active)
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

        {/* Filter Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>Experience</label>
            <select
              value={filters.experience}
              onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '12.5px' }}
            >
              <option value="">Any Experience</option>
              <option value="1-3">1 - 3 Years</option>
              <option value="3-5">3 - 5 Years</option>
              <option value="5+">5+ Years</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>Minimum Rating</label>
            <select
              value={filters.rating}
              onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '12.5px' }}
            >
              <option value="">Any Rating</option>
              <option value="4.0">⭐ 4.0+</option>
              <option value="4.5">⭐ 4.5+</option>
              <option value="4.8">⭐ 4.8+</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>Hourly Rate</label>
            <select
              value={filters.price}
              onChange={(e) => setFilters({ ...filters, price: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '12.5px' }}
            >
              <option value="">Any Rate</option>
              <option value="under1000">Under ₹1,000/hr</option>
              <option value="1000-2500">₹1,000 - ₹2,500/hr</option>
              <option value="above2500">₹2,500+/hr</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>Availability</label>
            <select
              value={filters.availability}
              onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '12.5px' }}
            >
              <option value="">All Mentors</option>
              <option value="online">🟢 Available Now (Online)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>Language</label>
            <select
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '12.5px' }}
            >
              <option value="">All Languages</option>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="spanish">Spanish</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>Session Type</label>
            <select
              value={filters.sessionType}
              onChange={(e) => setFilters({ ...filters, sessionType: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '12.5px' }}
            >
              <option value="">All Formats</option>
              <option value="1on1">1-on-1 Mentoring</option>
              <option value="review">Code Review</option>
              <option value="debug">Live Debugging</option>
              <option value="interview">Mock Interview</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommended Mentors Banner */}
      {!search && selectedTechs.length === 0 && recommendedMentors.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div className="section-label" style={{ color: 'var(--accent)', marginTop: 0 }}>
            Recommended Mentors for You
          </div>
          <div className="grid" style={{ margin: '12px 0 0', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {recommendedMentors.map((m) => {
              const id = m.user_id || m.id;
              const favorited = isFav(id);
              return (
                <div key={'rec-' + id} className="card" style={{ border: '2px solid var(--accent)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="tag" style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px' }}>
                      RECOMMENDED
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(m, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', color: favorited ? 'var(--brand, #ef4444)' : 'var(--muted)' }}
                      title={favorited ? 'Remove from favorites' : 'Save to favorites'}
                    >
                      <HeartIcon size={18} fill={favorited ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="card-top">
                    <div className="avatar">{initials(m.name)}</div>
                    <div>
                      <div className="card-name">{m.name}</div>
                      <div className="card-title">{m.title || 'Technical Specialist'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {m.company ? `@${m.company} • ` : ''} {m.years_experience || 3}+ yrs exp
                      </div>
                    </div>
                  </div>

                  <div className="card-skills">
                    {(m.skills || []).slice(0, 4).map((s) => (
                      <span key={s} className="tag">{s}</span>
                    ))}
                  </div>

                  <div className="card-foot" style={{ marginTop: '12px' }}>
                    <div>
                      <span className="rate">₹{Number(m.hourly_rate || 0).toLocaleString('en-IN')}/hr</span>
                      <div className="stars">
                        {m.rating_avg && Number(m.rating_avg) > 0 ? (
                          <>
                            {stars(m.rating_avg)}{' '}
                            <span className="mono" style={{ color: 'var(--ink)', fontSize: '11px' }}>
                              {Number(m.rating_avg).toFixed(1)}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ color: 'var(--gold)' }}>★</span> New
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => openPreview(m)}>
                        Preview
                      </button>
                      <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={(e) => openBooking(m, e)}>
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Mentors Grid */}
      <div className="section-label" style={{ marginTop: 0 }}>
        All Mentors ({filteredMentors.length} available)
      </div>

      {loading ? (
        <div style={{ padding: '30px 0' }}>
          <PairUpLoader text="LOADING MENTOR COMMUNITY" size={440} />
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="empty">
          <p>No mentors found matching your filters.</p>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: '12px' }}
            onClick={() => {
              setSearch('');
              setSelectedTechs([]);
              setFilters({ experience: '', rating: '', price: '', availability: '', language: '', sessionType: '' });
            }}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid" style={{ margin: '14px 0 40px' }}>
          {filteredMentors.map((m) => {
            const id = m.user_id || m.id;
            const favorited = isFav(id);
            return (
              <div key={id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="card-top" style={{ flex: 1 }}>
                    <div className="avatar">{initials(m.name)}</div>
                    <div>
                      <Link
                        to={`/mentor/${id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        title="View full profile"
                      >
                        <div className="card-name" style={{ cursor: 'pointer' }}>{m.name}</div>
                      </Link>
                      <div className="card-title">{m.title || 'Software Engineer'}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {m.company && <span>{m.company} • </span>}
                        <span>{m.years_experience || 2}+ years</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status ${m.online_status ? 'online' : 'away'}`}>
                      <span className="led"></span>
                      {m.online_status ? 'Online' : 'Offline'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(m, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', color: favorited ? 'var(--brand, #ef4444)' : 'var(--muted)' }}
                      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <HeartIcon size={18} fill={favorited ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                <div className="card-skills" style={{ flex: 1 }}>
                  {(m.skills || []).map((s) => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                </div>

                <div className="card-foot" style={{ marginTop: 'auto', paddingTop: '12px' }}>
                  <div>
                    <span className="rate">₹{Number(m.hourly_rate || 0).toLocaleString('en-IN')}/hr</span>
                    <div className="stars">
                      {m.rating_avg && Number(m.rating_avg) > 0 ? (
                        <>
                          {stars(m.rating_avg)}{' '}
                          <span className="mono" style={{ color: 'var(--ink)', fontSize: '11px' }}>
                            {Number(m.rating_avg).toFixed(1)}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ color: 'var(--gold)' }}>★</span> New
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link
                      to={`/chat?with=${id}&name=${encodeURIComponent(m.name)}`}
                      className="btn btn-ghost"
                      style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Direct Message"
                    >
                      <MessageIcon size={15} />
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => openPreview(m)}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                      onClick={(e) => openBooking(m, e)}
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mentor Profile Preview Modal */}
      <Modal
        isOpen={!!previewMentor}
        onClose={() => setPreviewMentor(null)}
        title={previewMentor?.name || 'Mentor Profile'}
      >
        {previewMentor && (
          <div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
              <div className="avatar-lg">{initials(previewMentor.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '18px' }}>{previewMentor.name}</h4>
                  <Link
                    to={`/mentor/${previewMentor.user_id || previewMentor.id}`}
                    className="sub"
                    style={{ fontSize: '12.5px', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                    onClick={() => setPreviewMentor(null)}
                  >
                    View Full Profile &rarr;
                  </Link>
                </div>
                <div className="sub" style={{ margin: '2px 0 6px', fontSize: '13.5px' }}>
                  {previewMentor.title || 'Senior Engineer'} {previewMentor.company ? `@ ${previewMentor.company}` : ''}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12.5px' }}>
                  <span className="stars">
                    {previewMentor.rating_avg && Number(previewMentor.rating_avg) > 0 ? (
                      <>{stars(previewMentor.rating_avg)} {Number(previewMentor.rating_avg).toFixed(1)}/5</>
                    ) : (
                      <span style={{ color: 'var(--ink-muted)' }}>★ New (No reviews yet)</span>
                    )}
                  </span>
                  <span className="mono">₹{Number(previewMentor.hourly_rate || 0).toLocaleString('en-IN')}/hr</span>
                  <span className="mono" style={{ color: 'var(--add)' }}>{previewMentor.sessions_completed || 12} sessions</span>
                </div>
              </div>
            </div>

            <div className="section-label">Bio &amp; Expertise</div>
            <p className="sub" style={{ fontSize: '13.5px', lineHeight: 1.6 }}>
              {previewMentor.bio || 'Dedicated software engineer excited to help developers write clean code, solve difficult bugs, and level up their engineering capabilities.'}
            </p>

            <div className="section-label">Skills &amp; Technologies</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {(previewMentor.skills || []).map((s) => (
                <span key={s} className="tag">{s}</span>
              ))}
            </div>

            {previewMentor.languages && (
              <>
                <div className="section-label">Spoken Languages</div>
                <p className="sub" style={{ fontSize: '13px' }}>
                  {Array.isArray(previewMentor.languages) ? previewMentor.languages.join(', ') : previewMentor.languages}
                </p>
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', borderTop: '1px solid var(--grid)', paddingTop: '16px' }}>
              <Link
                to={`/mentor/${previewMentor.user_id || previewMentor.id}`}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setPreviewMentor(null)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <UserIcon size={14} /> Full Profile
                </span>
              </Link>
              <Link
                to={`/chat?with=${previewMentor.user_id || previewMentor.id}&name=${encodeURIComponent(previewMentor.name)}`}
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <MessageIcon size={14} /> Send Message
                </span>
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  const m = previewMentor;
                  setPreviewMentor(null);
                  openBooking(m);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarIcon size={14} /> Book Session
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Book Session Modal */}
      <BookSessionModal
        isOpen={!!bookingMentor}
        onClose={() => setBookingMentor(null)}
        mentor={bookingMentor}
      />
    </PortalLayout>
  );
}
