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
  CreditCardIcon,
  CalendarIcon,
  StarIcon,
  DocumentIcon,
  RefreshIcon,
  MessageIcon,
  ShieldIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function LearnerSessionsPage() {
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
      await loadBookings();
      setPaidSuccessBooking(booking);
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

  const handleReschedule = (e) => {
    e.preventDefault();
    toast.info(`Reschedule request sent to ${rescheduleModalBooking.mentor_name} for ${rescheduleDate}. You will be notified upon confirmation.`);
    setRescheduleModalBooking(null);
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

  // Filter sessions by tabs
  const upcomingList = bookings.filter((b) => ['pending', 'accepted'].includes(b.status));
  const liveList = bookings.filter((b) => b.status === 'paid');
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
                        ? 'badge-completed'
                        : b.status === 'accepted'
                        ? 'badge-accepted'
                        : b.status === 'completed'
                        ? 'badge-completed'
                        : 'badge-pending'
                    } mono`}
                  >
                    {b.status === 'paid' ? 'Paid & Live' : b.status}
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
                  <ShieldIcon size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div>
                    <strong>Escrow Protected:</strong> ₹{b.price} is secured in PairUp escrow. You can join the live room now or at your scheduled session time. Funds are only released after session completion.
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
                    <Link
                      to={`/session?booking_id=${b.id}`}
                      className="btn btn-primary"
                      style={{ fontSize: '12.5px', padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <VideoIcon size={14} /> Join Live Session Room
                    </Link>
                    <button
                      type="button"
                      className="btn btn-success"
                      style={{ fontSize: '12.5px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => handleComplete(b.id)}
                    >
                      <CheckIcon size={14} /> Mark Completed
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

      {/* Escrow Payment Secured Confirmation Modal */}
      <Modal
        isOpen={!!paidSuccessBooking}
        onClose={() => setPaidSuccessBooking(null)}
        title="Escrow Payment Secured 🛡️"
      >
        {paidSuccessBooking && (
          <div style={{ textAlign: 'center', padding: '10px 4px 6px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '2px solid #10b981',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <ShieldIcon size={30} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>
              Payment Secured in Escrow!
            </h3>

            <p style={{ fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.6, margin: '0 0 16px' }}>
              <strong>₹{paidSuccessBooking.price}</strong> has been safely deposited into PairUp platform escrow.
              Funds are protected and will only release to <strong>{paidSuccessBooking.mentor_name}</strong> after the session is completed.
            </p>

            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--grid)',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'left',
                marginBottom: '18px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Mentor:</span>
                <span style={{ fontWeight: 600 }}>{paidSuccessBooking.mentor_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Topic:</span>
                <span style={{ fontWeight: 600 }}>{paidSuccessBooking.topic || 'Pair Programming'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Scheduled Time:</span>
                <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
                  {paidSuccessBooking.scheduled_at || paidSuccessBooking.scheduled_time
                    ? new Date(paidSuccessBooking.scheduled_at || paidSuccessBooking.scheduled_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Flexible / As agreed'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Live Call Room:</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>● Unlocked &amp; Ready</span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                color: 'var(--ink)',
                marginBottom: '18px',
                textAlign: 'left',
                lineHeight: 1.5,
              }}
            >
              💡 <strong>When will the call start?</strong> Both you and your mentor can enter the room at the scheduled time. The session timer will only start ticking once you and your mentor are connected on video!
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPaidSuccessBooking(null)}
                style={{ flex: 1 }}
              >
                Back to Sessions
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const bId = paidSuccessBooking.id;
                  setPaidSuccessBooking(null);
                  navigate(`/session?booking_id=${bId}`);
                }}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <VideoIcon size={15} /> Enter Live Room Now
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
}
