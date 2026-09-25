import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import BookSessionModal from '../../components/BookSessionModal';
import { api, initials, stars } from '../../api/client';
import {
  SearchIcon,
  VideoIcon,
  CheckIcon,
  XIcon,
  CreditCardIcon,
  CalendarIcon,
  StarIcon,
  DocumentIcon,
  RefreshIcon,
  MessageIcon,
  ShieldIcon,
} from '../../components/Icons';
import { useConfirm, useToast, useAuth } from '../../context';

export default function LearnerSessionsPage() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  // Modals state
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewCriteria, setReviewCriteria] = useState({
    tech: 5,
    problemSolving: 5,
    explanation: 5,
    communication: 5,
    value: 5,
  });

  const [disputeModalBooking, setDisputeModalBooking] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');

  const [rescheduleModalBooking, setRescheduleModalBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');

  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const [bookAgainMentor, setBookAgainMentor] = useState(null);
  const [bookAgainTopic, setBookAgainTopic] = useState('');
  const [bookAgainDate, setBookAgainDate] = useState('');

  const [notesModalBooking, setNotesModalBooking] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [submittingAction, setSubmittingAction] = useState(false);
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [paidSuccessBooking, setPaidSuccessBooking] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (booking) => {
    setPayingBookingId(booking.id);
    try {
      await api.payBooking(booking.id);
      toast.success('Escrow secured! Session is confirmed.');
      const data = await api.getBookings();
      setBookings(data);
      const updated = data.find((b) => b.id === booking.id);
      setPaidSuccessBooking(updated || { ...booking, status: 'paid' });
    } catch (err) {
      toast.error('Payment failed: ' + err.message);
    } finally {
      setPayingBookingId(null);
    }
  };

  const handleComplete = async (bookingId) => {
    const confirmed = await confirm({
      title: 'Confirm Session Completion',
      message: 'Confirm that this session has completed? Escrow payment will be released to the mentor.',
      confirmText: 'Confirm & Release Escrow',
      type: 'info',
    });
    if (!confirmed) return;
    try {
      await api.completeBooking(bookingId);
      toast.success('Session marked completed and escrow released.');
      loadBookings();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      await api.createReview({
        booking_id: reviewModalBooking.id,
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      });
      toast.success('Thank you! Review submitted.');
      setReviewModalBooking(null);
      setReviewComment('');
      loadBookings();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      await api.disputeBooking(disputeModalBooking.id, disputeReason.trim());
      toast.info('Dispute submitted. An administrator will review the session.');
      setDisputeModalBooking(null);
      setDisputeReason('');
      loadBookings();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleModalBooking || !rescheduleDate) return;
    setSubmittingAction(true);
    try {
      const res = await api.rescheduleBooking(rescheduleModalBooking.id, rescheduleDate, rescheduleNote.trim());
      toast.success(res?.message || `Session rescheduled to ${new Date(rescheduleDate).toLocaleString()}`);
      setRescheduleModalBooking(null);
      setRescheduleNote('');
      loadBookings();
    } catch (err) {
      toast.error('Could not reschedule: ' + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!cancelModalBooking) return;
    setSubmittingAction(true);
    try {
      const res = await api.cancelBooking(cancelModalBooking.id, cancelReason.trim());
      toast.success(res?.message || 'Session cancelled. If paid, your escrow payment will be refunded.');
      setCancelModalBooking(null);
      setCancelReason('');
      loadBookings();
    } catch (err) {
      toast.error('Could not cancel session: ' + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleBookAgain = async (e) => {
    e.preventDefault();
    try {
      const calculatedPrice = Math.max(1, Math.round(Number(bookAgainMentor.price || bookAgainMentor.hourly_rate || 50)));
      await api.createBooking({
        mentor_id: Number(bookAgainMentor.mentor_id || bookAgainMentor.user_id),
        topic: bookAgainTopic.trim() || 'Follow-up Session',
        duration_minutes: 60,
        price: calculatedPrice,
        scheduled_at: bookAgainDate,
      });
      toast.success('Session requested! Check Upcoming Sessions.');
      setBookAgainMentor(null);
      loadBookings();
    } catch (err) {
      toast.error('Could not book session: ' + err.message);
    }
  };

  const openNotes = async (booking) => {
    setNotesModalBooking(booking);
    setLoadingNotes(true);
    try {
      const data = await api.getNotes(booking.id);
      setSessionNotes(data.notes || 'No private notes recorded yet.');
    } catch {
      setSessionNotes('Session discussion notes and takeaways will appear here.');
    } finally {
      setLoadingNotes(false);
    }
  };

  // Check session timing relative to right now
  const isSessionLiveNow = (b) => {
    if (b.status !== 'paid') return false;
    const raw = b.scheduled_at || b.scheduled_time;
    if (!raw) return true; // flexible unscheduled sessions are accessible anytime
    const date = new Date(raw);
    if (isNaN(date.getTime())) return true;
    const durationMs = (b.duration_minutes || 60) * 60 * 1000;
    const startMs = date.getTime();
    const endMs = startMs + durationMs;
    const now = Date.now();
    return now >= (startMs - 15 * 60 * 1000) && now <= (endMs + 30 * 60 * 1000);
  };

  const isSessionUpcoming = (b) => {
    if (['pending', 'accepted'].includes(b.status)) return true;
    if (b.status === 'paid') {
      const raw = b.scheduled_at || b.scheduled_time;
      if (!raw) return true; // keep available in upcoming as well
      const date = new Date(raw);
      if (isNaN(date.getTime())) return true;
      const now = Date.now();
      return now < (date.getTime() - 15 * 60 * 1000);
    }
    return false;
  };

  // Filter sessions by tabs
  const upcomingList = bookings.filter(isSessionUpcoming);
  const liveList = bookings.filter(isSessionLiveNow);
  const pastList = bookings.filter((b) => ['completed', 'cancelled', 'disputed'].includes(b.status));

  let currentList = upcomingList;
  if (activeTab === 'live') currentList = liveList;
  if (activeTab === 'past') currentList = pastList;

  return (
    <PortalLayout
      title="My Sessions"
      portalType="learner"
      actions={
        <Link to="/learner/explore" className="btn btn-primary" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <SearchIcon size={15} /> Book New Session
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        Track your live pairing sessions, manage scheduled calls, reschedule, review, or join live video rooms.
      </p>

      {error && <div className="error-box">{error}</div>}

      {/* Session Tabs */}
      <div className="admin-filter-tabs">
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcomingList.length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          In Progress (Live) ({liveList.length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past Sessions ({pastList.length})
        </button>
      </div>

      {loading ? (
        <p className="sub">Loading your sessions...</p>
      ) : currentList.length === 0 ? (
        <div className="empty">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <CalendarIcon size={36} />
          </div>
          <p>No {activeTab} sessions found.</p>
          <Link to="/learner/explore" className="btn btn-primary" style={{ marginTop: '12px' }}>
            Browse Mentors
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentList.map((b) => (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="avatar">{initials(b.mentor_name)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15.5px' }}>{b.mentor_name}</div>
                    <div className="sub" style={{ margin: '2px 0 0', fontSize: '13px' }}>
                      Topic: <strong>{b.topic || 'Pairing Session'}</strong>
                    </div>
                    <div className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Date: {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : new Date(b.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Duration: {b.duration_minutes || 60} mins</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    className={`status-badge ${
                      b.status === 'paid'
                        ? (isSessionLiveNow(b) ? 'badge-completed' : 'badge-accepted')
                        : b.status === 'accepted'
                        ? 'badge-accepted'
                        : b.status === 'completed'
                        ? 'badge-completed'
                        : 'badge-pending'
                    } mono`}
                  >
                    {b.status === 'paid'
                      ? (isSessionLiveNow(b) ? '🔴 Paid & Live Now' : 'Confirmed & Paid')
                      : b.status}
                  </span>
                  <div className="mono" style={{ fontWeight: 700, fontSize: '14px', marginTop: '6px' }}>
                    ₹{b.price}
                  </div>
                  <div className="sub" style={{ fontSize: '11px', margin: 0 }}>
                    {b.duration_minutes || 60} mins
                  </div>
                </div>
              </div>

              {/* Status Information Banners */}
              {b.status === 'accepted' && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CreditCardIcon size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div>
                    <strong>Mentor Accepted:</strong> Deposit ₹{b.price} into platform escrow to confirm your booking. The live room unlocks for both you and your mentor once paid.
                  </div>
                </div>
              )}
              {b.status === 'paid' && (
                <div
                  style={{
                    background: isSessionLiveNow(b) ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.08)',
                    border: `1px solid ${isSessionLiveNow(b) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.25)'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <ShieldIcon size={14} style={{ color: isSessionLiveNow(b) ? '#10b981' : '#3b82f6', flexShrink: 0 }} />
                  <div>
                    <strong>{isSessionLiveNow(b) ? '🔴 Active Call Room:' : '🛡️ Escrow Protected & Confirmed:'}</strong> ₹{b.price} is secured in PairUp escrow.
                    {isSessionLiveNow(b)
                      ? ' The session time is now active! Click below to enter the live room and pair.'
                      : ` Scheduled for ${b.scheduled_at ? new Date(b.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'your scheduled time'}. The live video room activates 15 minutes before your session begins.`}
                  </div>
                </div>
              )}

              {/* Reschedule status alerts */}
              {b.reschedule_status === 'pending' && (
                <div
                  style={{
                    background: 'rgba(234, 88, 12, 0.08)',
                    border: '1.5px solid rgba(234, 88, 12, 0.35)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '12.5px',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <CalendarIcon size={16} style={{ color: '#ea580c', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <strong style={{ color: '#c2410c' }}>Reschedule Request Pending:</strong>
                      <span className="badge badge-warning" style={{ fontSize: '10.5px' }}>Awaiting Mentor</span>
                    </div>
                    <div>
                      You requested to change this session to{' '}
                      <strong>{b.reschedule_requested_at ? new Date(b.reschedule_requested_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'a new time'}</strong>.
                    </div>
                    {b.reschedule_note && (
                      <div style={{ marginTop: '2px', fontSize: '12px', color: 'var(--ink-muted)' }}>
                        Note: <em>"{b.reschedule_note}"</em>
                      </div>
                    )}
                    <div style={{ marginTop: '3px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                      Awaiting response from {b.mentor_name}. The session remains at its current scheduled time until approved.
                    </div>
                  </div>
                </div>
              )}

              {b.reschedule_status === 'declined' && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    padding: '9px 13px',
                    fontSize: '12px',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <XIcon size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#dc2626' }}>Reschedule Request Declined:</strong> Your mentor was unable to accommodate the requested time. The session remains scheduled for{' '}
                    <strong>{b.scheduled_at ? new Date(b.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'its scheduled time'}</strong>.
                  </div>
                </div>
              )}

              {b.reschedule_status === 'accepted' && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckIcon size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#16a34a' }}>Reschedule Confirmed:</strong> Session successfully updated to{' '}
                    <strong>{b.scheduled_at ? new Date(b.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'new date'}</strong>.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  borderTop: '1px solid var(--grid)',
                  paddingTop: '12px',
                }}
              >
                {/* When Live/Paid */}
                {b.status === 'paid' && (
                  <>
                    {isSessionLiveNow(b) ? (
                      <Link
                        to={`/session?booking_id=${b.id}`}
                        className="btn btn-primary"
                        style={{ fontSize: '12.5px', padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <VideoIcon size={14} /> Join Live Session Room
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="btn btn-secondary"
                        title="The live video room activates 15 minutes before your scheduled session time."
                        style={{
                          fontSize: '12.5px',
                          padding: '7px 16px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: 0.65,
                          cursor: 'not-allowed',
                        }}
                      >
                        <VideoIcon size={14} /> Join Live (Opens 15m before)
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => {
                        setRescheduleModalBooking(b);
                        const existing = b.scheduled_at || b.scheduled_time;
                        if (existing && !isNaN(new Date(existing).getTime())) {
                          setRescheduleDate(new Date(existing).toISOString().slice(0, 16));
                        } else {
                          setRescheduleDate(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
                        }
                        setRescheduleNote('');
                      }}
                    >
                      <CalendarIcon size={13} /> Reschedule
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => setPaidSuccessBooking(b)}
                    >
                      <DocumentIcon size={13} /> Receipt
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', color: 'var(--warn)' }}
                      onClick={() => setDisputeModalBooking(b)}
                    >
                      Report Issue / Dispute
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', color: 'var(--danger, #ef4444)' }}
                      onClick={() => setCancelModalBooking(b)}
                    >
                      Cancel Session
                    </button>
                  </>
                )}

                {/* When Accepted (Awaiting payment) */}
                {b.status === 'accepted' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={payingBookingId === b.id}
                      style={{ fontSize: '12.5px', padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => handlePay(b)}
                    >
                      <CreditCardIcon size={14} />
                      {payingBookingId === b.id ? 'Securing Escrow...' : `Deposit Escrow (₹${b.price})`}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => {
                        setRescheduleModalBooking(b);
                        setRescheduleDate(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
                      }}
                    >
                      <CalendarIcon size={13} /> Reschedule
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', color: 'var(--warn)' }}
                      onClick={() => setCancelModalBooking(b)}
                    >
                      Cancel Session
                    </button>
                  </>
                )}

                {/* When Pending */}
                {b.status === 'pending' && (
                  <>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      Awaiting mentor confirmation...
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', marginLeft: 'auto' }}
                      onClick={() => setCancelModalBooking(b)}
                    >
                      Cancel Request
                    </button>
                  </>
                )}

                {/* When Completed */}
                {b.status === 'completed' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => setReviewModalBooking(b)}
                    >
                      <StarIcon size={13} /> Leave Review
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => openNotes(b)}
                    >
                      <DocumentIcon size={13} /> Notes &amp; Resources
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => {
                        setBookAgainMentor({
                          id: b.mentor_id,
                          user_id: b.mentor_id,
                          name: b.mentor_name,
                          hourly_rate: b.price ? Math.round((b.price * 60) / (b.duration_minutes || 60)) : 50,
                        });
                        setBookAgainTopic(`Follow up on: ${b.topic || 'pairing'}`);
                      }}
                    >
                      <RefreshIcon size={13} /> Book Again
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', color: 'var(--warn)', marginLeft: 'auto' }}
                      onClick={() => setDisputeModalBooking(b)}
                    >
                      Dispute Session
                    </button>
                  </>
                )}

                {/* Common chat shortcut */}
                <Link
                  to={`/chat?with=${b.mentor_id}&name=${encodeURIComponent(b.mentor_name)}`}
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '6px 12px', marginLeft: b.status === 'pending' ? '0' : 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <MessageIcon size={13} /> Chat
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multi-Criteria Review Modal */}
      <Modal
        isOpen={!!reviewModalBooking}
        onClose={() => setReviewModalBooking(null)}
        title={`Review Session with ${reviewModalBooking?.mentor_name || ''}`}
      >
        {reviewModalBooking && (
          <form onSubmit={handleSubmitReview}>
            <div className="field">
              <label>Overall Star Rating</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    style={{
                      fontSize: '24px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: star <= reviewRating ? 'var(--gold)' : 'var(--grid-strong)',
                    }}
                    onClick={() => setReviewRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="section-label" style={{ marginTop: '14px' }}>Detailed Evaluation Criteria</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '16px' }}>
              <div>
                <label>Technical Knowledge</label>
                <select
                  value={reviewCriteria.tech}
                  onChange={(e) => setReviewCriteria({ ...reviewCriteria, tech: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px' }}
                >
                  <option value={5}>5 - Exceptional</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Average</option>
                </select>
              </div>

              <div>
                <label>Problem Solving</label>
                <select
                  value={reviewCriteria.problemSolving}
                  onChange={(e) => setReviewCriteria({ ...reviewCriteria, problemSolving: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px' }}
                >
                  <option value={5}>5 - Solved quickly</option>
                  <option value={4}>4 - Good methodology</option>
                  <option value={3}>3 - Partial solution</option>
                </select>
              </div>

              <div>
                <label>Explanation &amp; Teaching</label>
                <select
                  value={reviewCriteria.explanation}
                  onChange={(e) => setReviewCriteria({ ...reviewCriteria, explanation: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px' }}
                >
                  <option value={5}>5 - Crystal clear</option>
                  <option value={4}>4 - Understandable</option>
                  <option value={3}>3 - A bit rushed</option>
                </select>
              </div>

              <div>
                <label>Value for Money</label>
                <select
                  value={reviewCriteria.value}
                  onChange={(e) => setReviewCriteria({ ...reviewCriteria, value: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px' }}
                >
                  <option value={5}>5 - Worth every rupee</option>
                  <option value={4}>4 - Fair price</option>
                  <option value={3}>3 - Moderate</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Written Feedback &amp; Review</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share details about what you learned and how the mentor helped you..."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setReviewModalBooking(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingAction}
                style={{ flex: 1 }}
              >
                {submittingAction ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleModalBooking}
        onClose={() => setRescheduleModalBooking(null)}
        title={`Reschedule Session with ${rescheduleModalBooking?.mentor_name || ''}`}
      >
        {rescheduleModalBooking && (
          <form onSubmit={handleReschedule}>
            <div className="field">
              <label>New Preferred Date &amp; Time</label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Reason / Note to Mentor</label>
              <textarea
                value={rescheduleNote}
                onChange={(e) => setRescheduleNote(e.target.value)}
                placeholder="Let the mentor know why you need to reschedule..."
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRescheduleModalBooking(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Send Reschedule Request
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={!!cancelModalBooking}
        onClose={() => setCancelModalBooking(null)}
        title="Cancel Session"
      >
        {cancelModalBooking && (
          <form onSubmit={handleCancel}>
            <p className="sub" style={{ fontSize: '13px' }}>
              Are you sure you want to cancel your session with <strong>{cancelModalBooking.mentor_name}</strong>?
              If you have already paid, funds will be refunded into your wallet.
            </p>
            <div className="field">
              <label>Reason for Cancellation</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Optional: let the mentor know why you are cancelling..."
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCancelModalBooking(null)}
                style={{ flex: 1 }}
              >
                Keep Session
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={submittingAction}
                style={{ flex: 1 }}
              >
                {submittingAction ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Book Again Modal */}
      <BookSessionModal
        isOpen={!!bookAgainMentor}
        onClose={() => setBookAgainMentor(null)}
        mentor={bookAgainMentor}
        initialTopic={bookAgainTopic}
        onSuccess={() => {
          setBookAgainMentor(null);
          loadBookings();
        }}
      />

      {/* Dispute Modal */}
      <Modal
        isOpen={!!disputeModalBooking}
        onClose={() => setDisputeModalBooking(null)}
        title="Raise Dispute / Report Issue"
      >
        {disputeModalBooking && (
          <form onSubmit={handleSubmitDispute}>
            <p className="sub" style={{ fontSize: '13px' }}>
              Raising a dispute will pause escrow payment release and trigger an administrative review of the session logs and notes.
            </p>
            <div className="field">
              <label>Describe the Issue</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="e.g. Mentor did not attend, technical issues prevented pairing, or scope was unfulfilled..."
                rows={4}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDisputeModalBooking(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={submittingAction}
                style={{ flex: 1 }}
              >
                {submittingAction ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Session Notes Modal */}
      <Modal
        isOpen={!!notesModalBooking}
        onClose={() => setNotesModalBooking(null)}
        title={`Notes: ${notesModalBooking?.topic || ''}`}
      >
        {loadingNotes ? (
          <p className="sub">Loading notes...</p>
        ) : (
          <div>
            <div className="section-label" style={{ marginTop: 0 }}>Shared Code &amp; Key Takeaways</div>
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--grid)',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '13px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                marginBottom: '16px',
              }}
            >
              {sessionNotes}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setNotesModalBooking(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Session Payment Receipt & Confirmation Modal */}
      <Modal
        isOpen={!!paidSuccessBooking}
        onClose={() => setPaidSuccessBooking(null)}
        title="Session Payment Receipt 🧾"
      >
        {paidSuccessBooking && (
          <div className="printable-receipt-wrap" style={{ padding: '6px 2px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '2px solid #10b981',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <CheckIcon size={28} />
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
                Payment Secured &amp; Confirmed!
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--ink-muted)', margin: 0 }}>
                ₹{paidSuccessBooking.price} deposited into PairUp platform escrow • Session confirmed
              </p>
            </div>

            {/* Official Receipt Card */}
            <div
              style={{
                background: 'var(--bg, #f8fafc)',
                border: '1px solid var(--grid)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '10px', marginBottom: '12px' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>PairUp Mentorship Receipt</strong>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Official Escrow Confirmation</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)' }}>
                    REC-{String(paidSuccessBooking.id).padStart(6, '0')}
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                    {new Date().toLocaleDateString([], { dateStyle: 'medium' })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Learner:</span>
                  <strong style={{ color: 'var(--ink)' }}>{user?.name || paidSuccessBooking.learner_name || 'Learner'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Mentor:</span>
                  <strong style={{ color: 'var(--ink)' }}>{paidSuccessBooking.mentor_name}</strong>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Topic:</span>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{paidSuccessBooking.topic || 'Pair Programming & Mentorship'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Scheduled Session Time:</span>
                  <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
                    {paidSuccessBooking.scheduled_at || paidSuccessBooking.scheduled_time
                      ? new Date(paidSuccessBooking.scheduled_at || paidSuccessBooking.scheduled_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Flexible / As agreed'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Live Video Room:</span>
                  <span style={{ fontWeight: 600, color: '#f59e0b', fontSize: '12px' }}>
                    Opens 15m before session
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '10px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Session Fee:</span>
                  <span className="mono" style={{ fontWeight: 600 }}>₹{paidSuccessBooking.price}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Platform Escrow Protection:</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>100% Protected</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Payment Status:</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>● Paid &amp; Held in Escrow</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  <span>Total Paid:</span>
                  <span className="mono" style={{ color: 'var(--brand)' }}>₹{paidSuccessBooking.price}</span>
                </div>
              </div>
            </div>

            {/* Timing Guidance notice */}
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--ink)',
                marginBottom: '18px',
                textAlign: 'left',
                lineHeight: 1.5,
              }}
            >
              💡 <strong>When will the live room open?</strong> The live video room activates automatically <strong>15 minutes before</strong> your scheduled start time ({paidSuccessBooking.scheduled_at || paidSuccessBooking.scheduled_time ? new Date(paidSuccessBooking.scheduled_at || paidSuccessBooking.scheduled_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'scheduled time'}). You can join directly from your Upcoming Sessions tab when the call window opens.
            </div>

            {/* Action Buttons: Print Receipt & Back to Sessions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => window.print()}
              >
                <DocumentIcon size={14} /> Print / Save Receipt
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setPaidSuccessBooking(null)}
                style={{ flex: 1 }}
              >
                Back to Sessions
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
}
