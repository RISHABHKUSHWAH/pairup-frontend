import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials, stars } from '../../api/client';
import {
  SearchIcon,
  BugIcon,
  UsersIcon,
  CalendarIcon,
  DocumentIcon,
  MessageIcon,
  CheckIcon,
  XIcon,
  VideoIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function MentorSessionsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'live' | 'past'

  // Modals state
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const [notesBooking, setNotesBooking] = useState(null);
  const [sessionNotes, setSessionNotes] = useState({});
  const [currentNoteText, setCurrentNoteText] = useState('');

  useEffect(() => {
    loadBookings();
    try {
      const stored = localStorage.getItem('pairup_mentor_session_notes');
      if (stored) setSessionNotes(JSON.parse(stored));
    } catch {}
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await api.acceptBooking(id);
      const msg = 'Booking accepted! Learner has been notified.';
      toast.success(msg);
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(''), 3500);
      loadBookings();
    } catch (err) {
      toast.error('Could not accept booking: ' + err.message);
    }
  };

  const handleComplete = async (id) => {
    const confirmed = await confirm({
      title: 'Complete Session',
      message: 'Mark this session as completed? Escrow payment will be released to your earnings.',
      confirmText: 'Complete Session',
      type: 'info',
    });
    if (!confirmed) return;
    try {
      await api.completeBooking(id);
      const msg = 'Session completed! Earnings updated.';
      toast.success(msg);
      loadBookings();
    } catch (err) {
      toast.error('Could not mark completed: ' + err.message);
    }
  };

  const handleConfirmReschedule = (e) => {
    e.preventDefault();
    if (!rescheduleDate) return;
    // In our prototype, we update booking state & announce success
    setBookings((prev) =>
      prev.map((b) =>
        b.id === rescheduleBooking.id ? { ...b, scheduled_time: rescheduleDate } : b
      )
    );
    toast.success(`Session rescheduled to ${new Date(rescheduleDate).toLocaleString()}`);
    setRescheduleBooking(null);
    setRescheduleDate('');
    setRescheduleReason('');
  };

  const handleConfirmCancel = (e) => {
    e.preventDefault();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === cancelBooking.id ? { ...b, status: 'cancelled', cancel_reason: cancelReason } : b
      )
    );
    toast.info('Session cancelled and learner notified.');
    setCancelBooking(null);
    setCancelReason('');
  };

  const openNotesModal = (booking) => {
    setNotesBooking(booking);
    setCurrentNoteText(sessionNotes[booking.id] || '');
  };

  const handleSaveNotes = (e) => {
    e.preventDefault();
    const updated = { ...sessionNotes, [notesBooking.id]: currentNoteText };
    setSessionNotes(updated);
    localStorage.setItem('pairup_mentor_session_notes', JSON.stringify(updated));
    toast.success('Session notes and takeaways saved!');
    setNotesBooking(null);
  };

  // Classify sessions
  const upcomingSessions = bookings.filter((b) => ['pending', 'accepted'].includes(b.status));
  const liveSessions = bookings.filter((b) => b.status === 'paid');
  const pastSessions = bookings.filter((b) => ['completed', 'cancelled', 'declined'].includes(b.status));

  let currentList = [];
  if (activeTab === 'upcoming') currentList = upcomingSessions;
  else if (activeTab === 'live') currentList = liveSessions;
  else if (activeTab === 'past') currentList = pastSessions;

  const getSessionTypeBadge = (topic) => {
    const t = (topic || '').toLowerCase();
    if (t.includes('code review') || t.includes('pr')) {
      return (
        <span className="badge badge-secondary" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <SearchIcon size={12} /> Code Review
        </span>
      );
    }
    if (t.includes('bug') || t.includes('fix') || t.includes('error')) {
      return (
        <span className="badge badge-warning" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <BugIcon size={12} /> Bug Solving
        </span>
      );
    }
    return (
      <span className="badge badge-primary" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <UsersIcon size={12} /> 1-on-1 Mentorship
      </span>
    );
  };

  return (
    <PortalLayout
      title="My Sessions"
      portalType="mentor"
      actions={
        <Link to="/mentor/calendar" className="btn btn-secondary" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <CalendarIcon size={14} /> View in Calendar
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Manage your live pairings, incoming session requests, schedule adjustments, and review session notes.
      </p>

      {error && <div className="error-box" style={{ marginBottom: '14px' }}>{error}</div>}

      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcomingSessions.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
          style={{ position: 'relative' }}
        >
          In Progress (Live) ({liveSessions.length})
          {liveSessions.length > 0 && (
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginLeft: '6px' }} />
          )}
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past Sessions ({pastSessions.length})
        </button>
      </div>

      {loading ? (
        <p className="sub">Loading sessions...</p>
      ) : currentList.length === 0 ? (
        <div className="empty" style={{ padding: '36px', textAlign: 'center', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <CalendarIcon size={36} />
          </div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>
            No {activeTab === 'live' ? 'live in-progress' : activeTab} sessions found
          </div>
          <p className="sub" style={{ fontSize: '13px', margin: '4px 0 14px' }}>
            {activeTab === 'upcoming'
              ? 'When learners book a session or accept your proposal, they appear here.'
              : activeTab === 'live'
              ? 'Sessions that have been confirmed & paid for live pairing will appear here.'
              : 'Your completed or resolved sessions will be archived here with notes and reviews.'}
          </p>
          <Link to="/mentor/explore-problems" className="btn btn-primary" style={{ fontSize: '13px' }}>
            Explore Problems
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentList.map((b) => {
            const hasNotes = Boolean(sessionNotes[b.id]);

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: b.status === 'paid' ? '1px solid var(--brand)' : '1px solid var(--border)',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--brand), #8b5cf6)',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {initials(b.learner_name)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>{b.learner_name}</span>
                        <span className={`status-badge badge-${b.status} mono`} style={{ fontSize: '11px' }}>
                          {b.status}
                        </span>
                        {getSessionTypeBadge(b.topic)}
                      </div>
                      <div className="sub" style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 500 }}>
                        {b.topic || 'Pair Programming & Debugging Session'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '16px', color: 'var(--brand)' }}>
                      ₹{b.price}
                    </div>
                    <div className="sub" style={{ fontSize: '11px' }}>
                      {b.duration_minutes || 60} Minutes Session
                    </div>
                  </div>
                </div>

                {/* Middle details */}
                <div
                  style={{
                    display: 'flex',
                    gap: '20px',
                    margin: '12px 0',
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong>Scheduled:</strong>{' '}
                    {b.scheduled_time
                      ? new Date(b.scheduled_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Pending learner time selection'}
                  </div>
                  <div>
                    <strong>Tools:</strong> Live Video, Collaborative Screen Share &amp; Code IDE
                  </div>
                  {hasNotes && (
                    <div style={{ color: 'var(--brand)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <DocumentIcon size={13} /> Has saved session notes
                    </div>
                  )}
                </div>

                {/* Review received if past session */}
                {activeTab === 'past' && b.status === 'completed' && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'var(--panel-bg)',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Learner Feedback:</span>
                      <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 'bold' }}>
                        {stars(5)} 5.0 / 5.0
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12.5px', fontStyle: 'italic', color: 'var(--ink)' }}>
                      "Alex pinpointed the memory leak in under 30 minutes and explained how event emitters were retaining references. Truly top-tier guidance!"
                    </p>
                  </div>
                )}

                {/* Bottom actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px dashed var(--border)',
                    paddingTop: '12px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      to={`/chat?with=${b.learner_id}&name=${encodeURIComponent(b.learner_name)}`}
                      className="btn btn-ghost"
                      style={{ fontSize: '12.5px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <MessageIcon size={13} /> Chat
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12.5px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => openNotesModal(b)}
                    >
                      <DocumentIcon size={13} /> Session Notes
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Upcoming actions */}
                    {activeTab === 'upcoming' && (
                      <>
                        {b.status === 'pending' && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: '12.5px', padding: '5px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => handleAccept(b.id)}
                          >
                            <CheckIcon size={13} /> Accept Booking
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '12.5px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          onClick={() => {
                            setRescheduleBooking(b);
                            setRescheduleDate(b.scheduled_time || '');
                          }}
                        >
                          <CalendarIcon size={13} /> Reschedule
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '12.5px', padding: '5px 12px', color: 'var(--danger, #ef4444)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          onClick={() => {
                            setCancelBooking(b);
                          }}
                        >
                          <XIcon size={13} /> Cancel
                        </button>
                      </>
                    )}

                    {/* Live in-progress actions */}
                    {activeTab === 'live' && (
                      <>
                        <Link
                          to={`/session?booking_id=${b.id}`}
                          className="btn btn-primary"
                          style={{ fontSize: '12.5px', padding: '5px 16px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <VideoIcon size={13} /> Enter Live Room
                        </Link>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '12.5px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          onClick={() => handleComplete(b.id)}
                        >
                          <CheckIcon size={13} /> Mark Completed
                        </button>
                      </>
                    )}

                    {/* Past actions */}
                    {activeTab === 'past' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '12.5px', padding: '5px 12px' }}
                        onClick={() => openNotesModal(b)}
                      >
                        View Summary & Notes
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      <Modal
        isOpen={Boolean(rescheduleBooking)}
        onClose={() => setRescheduleBooking(null)}
        title="Reschedule Session"
      >
        {rescheduleBooking && (
          <form onSubmit={handleConfirmReschedule}>
            <p className="sub" style={{ marginBottom: '14px', fontSize: '13px' }}>
              Select a new date and time for your session with <strong>{rescheduleBooking.learner_name}</strong>.
            </p>

            <div className="field">
              <label>New Date and Time</label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Reason / Note for Learner (optional)</label>
              <textarea
                rows={3}
                placeholder="Let the learner know why this adjustment is requested..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setRescheduleBooking(null)}
              >
                Dismiss
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Confirm Reschedule
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={Boolean(cancelBooking)}
        onClose={() => setCancelBooking(null)}
        title="Cancel Session"
      >
        {cancelBooking && (
          <form onSubmit={handleConfirmCancel}>
            <p style={{ color: 'var(--danger, #ef4444)', fontSize: '13px', marginBottom: '12px' }}>
              Are you sure you need to cancel this session with <strong>{cancelBooking.learner_name}</strong>? If paid, learner funds will be returned to their wallet.
            </p>

            <div className="field">
              <label>Reason for Cancellation</label>
              <textarea
                rows={3}
                placeholder="Provide context for the cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setCancelBooking(null)}
              >
                Keep Session
              </button>
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ flex: 1, color: 'var(--danger, #ef4444)' }}
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Notes & Summary Modal */}
      <Modal
        isOpen={Boolean(notesBooking)}
        onClose={() => setNotesBooking(null)}
        title="Session Notes & Key Takeaways"
      >
        {notesBooking && (
          <form onSubmit={handleSaveNotes}>
            <div style={{ marginBottom: '12px', fontSize: '13px' }}>
              <strong>Learner:</strong> {notesBooking.learner_name} • <strong>Topic:</strong>{' '}
              {notesBooking.topic || 'General Pairing'}
            </div>

            <div className="field">
              <label>Notes, Code References & Follow-up Items</label>
              <textarea
                rows={6}
                value={currentNoteText}
                onChange={(e) => setCurrentNoteText(e.target.value)}
                placeholder="Write bullet points of what was diagnosed, repository links, recommended resources, or next steps for the learner..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setNotesBooking(null)}>
                Close
              </button>
              <button type="submit" className="btn btn-primary">
                Save Notes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PortalLayout>
  );
}
