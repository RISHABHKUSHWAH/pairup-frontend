import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials, stars, learnerFavorites } from '../../api/client';
import { SearchIcon, HeartIcon, XIcon, MessageIcon, CalendarIcon } from '../../components/Icons';
import { useToast } from '../../context';

export default function LearnerFavoritesPage() {
  const { toast } = useToast();
  const [favorites, setFavorites] = useState([]);
  const [bookingMentor, setBookingMentor] = useState(null);
  const [bookingTopic, setBookingTopic] = useState('');
  const [bookingDuration, setBookingDuration] = useState(60);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    setFavorites(learnerFavorites.getFavorites());
  };

  const handleRemove = (mentor) => {
    const updated = learnerFavorites.toggleFavorite(mentor);
    setFavorites(updated);
  };

  const openBooking = (mentor) => {
    setBookingMentor(mentor);
    setBookingTopic('');
    setBookingDuration(60);
    setBookingDate(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    setBookingError('');
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingTopic.trim()) {
      setBookingError('Please enter a session topic.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    try {
      await api.createBooking({
        mentor_id: bookingMentor.user_id || bookingMentor.id,
        topic: `${bookingTopic.trim()} (${bookingDuration}m)`,
        scheduled_at: bookingDate,
      });

      toast.success('Session requested! Check My Sessions to track confirmation.');
      setBookingMentor(null);
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <PortalLayout
      title="Saved Mentors &amp; Favorites"
      portalType="learner"
      actions={
        <Link to="/learner/explore" className="btn btn-primary" style={{ fontSize: '13px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <SearchIcon size={14} /> Find More Mentors
          </span>
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '24px' }}>
        Quickly access your bookmarked mentors, check their live availability, and request pairing sessions.
      </p>

      {favorites.length === 0 ? (
        <div className="empty">
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--muted)' }}>
            <HeartIcon size={36} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No favorite mentors saved yet</h3>
          <p className="sub" style={{ maxWidth: '400px', margin: '0 auto 18px' }}>
            Explore verified mentors and click the heart icon on any profile to save them here for fast 1-click booking.
          </p>
          <Link to="/learner/explore" className="btn btn-primary">
            Explore Mentors Now
          </Link>
        </div>
      ) : (
        <div className="grid">
          {favorites.map((m) => {
            const id = m.user_id || m.id;
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
                      <div className="card-title">{m.title || 'Technical Specialist'}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {m.company ? `${m.company} • ` : ''} {m.years_experience || 3}+ yrs exp
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(m)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      color: 'var(--warn)',
                    }}
                    title="Remove from favorites"
                  >
                    <XIcon size={15} />
                  </button>
                </div>

                <div style={{ margin: '12px 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`status ${m.online_status ? 'online' : 'away'}`}>
                    <span className="led"></span>
                    {m.online_status ? 'Available Now (Online)' : 'Next Available Tomorrow'}
                  </span>
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
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <MessageIcon size={13} /> Message
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => openBooking(m)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <CalendarIcon size={13} /> Book
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      <Modal
        isOpen={!!bookingMentor}
        onClose={() => setBookingMentor(null)}
        title={`Book Session with ${bookingMentor?.name || ''}`}
      >
        {bookingMentor && (
          <form onSubmit={handleConfirmBooking}>
            {bookingError && <div className="error-box">{bookingError}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{bookingMentor.name}</div>
                <div className="sub" style={{ margin: 0, fontSize: '12px' }}>₹{Number(bookingMentor.hourly_rate || 0).toLocaleString('en-IN')}/hr</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="rate" style={{ fontSize: '15px' }}>
                  ₹{Math.round((Number(bookingMentor.hourly_rate || 0) * bookingDuration) / 60).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Estimated total</div>
              </div>
            </div>

            <div className="field">
              <label>Duration</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[30, 45, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`btn ${bookingDuration === d ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                    onClick={() => setBookingDuration(d)}
                  >
                    {d} mins
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Preferred Date &amp; Time</label>
              <input
                type="datetime-local"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Session Topic &amp; Problem</label>
              <textarea
                value={bookingTopic}
                onChange={(e) => setBookingTopic(e.target.value)}
                placeholder="What would you like help with during this session?"
                rows={3}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setBookingMentor(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={bookingLoading}
                style={{ flex: 1 }}
              >
                {bookingLoading ? 'Requesting...' : 'Request Session'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PortalLayout>
  );
}
