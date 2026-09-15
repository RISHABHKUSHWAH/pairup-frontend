import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, stars } from '../../api/client';
import { CalendarIcon, FileEditIcon, StarIcon, CheckCircleIcon } from '../../components/Icons';
import { useToast } from '../../context';

export default function LearnerReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [pendingSessions, setPendingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('given');

  // Review modal state
  const [reviewModalSession, setReviewModalSession] = useState(null);
  const [editReviewItem, setEditReviewItem] = useState(null);
  const [overallRating, setOverallRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [criteriaRatings, setCriteriaRatings] = useState({
    techKnowledge: 5,
    problemSolving: 5,
    explanation: 5,
    communication: 5,
    valueForMoney: 5,
  });
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [revData, bookData] = await Promise.all([
        api.getMyReviews().catch(() => []),
        api.getBookings().catch(() => []),
      ]);

      setReviews(revData);

      // Find completed sessions that haven't been reviewed yet
      const reviewedBookingIds = new Set(revData.map((r) => r.booking_id));
      const pending = bookData.filter((b) => b.status === 'completed' && !reviewedBookingIds.has(b.id));
      setPendingSessions(pending);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNewReview = (session) => {
    setReviewModalSession(session);
    setEditReviewItem(null);
    setOverallRating(5);
    setReviewComment('');
    setCriteriaRatings({
      techKnowledge: 5,
      problemSolving: 5,
      explanation: 5,
      communication: 5,
      valueForMoney: 5,
    });
    setWouldRecommend(true);
  };

  const openEditReview = (rev) => {
    setEditReviewItem(rev);
    setReviewModalSession({
      id: rev.booking_id,
      mentor_name: rev.mentor_name,
      topic: rev.topic || 'Pairing Session',
    });
    setOverallRating(rev.rating || 5);
    setReviewComment(rev.comment || '');
    setCriteriaRatings({
      techKnowledge: 5,
      problemSolving: 5,
      explanation: 5,
      communication: 5,
      valueForMoney: 5,
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const bookingId = reviewModalSession?.id;
      await api.createReview({
        booking_id: bookingId,
        rating: Number(overallRating),
        comment: reviewComment.trim(),
      });

      toast.success('Thank you! Review recorded.');
      setReviewModalSession(null);
      setEditReviewItem(null);
      loadData();
    } catch (err) {
      toast.error('Error submitting review: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout
      title="Reviews &amp; Feedback"
      portalType="learner"
      actions={
        <Link to="/learner/sessions" className="btn btn-ghost" style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <CalendarIcon size={14} /> View All Sessions
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        View ratings and feedback you have left for mentors, and complete any pending reviews from past sessions.
      </p>

      {error && <div className="error-box">{error}</div>}

      {/* Tabs */}
      <div className="admin-filter-tabs">
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'given' ? 'active' : ''}`}
          onClick={() => setActiveTab('given')}
        >
          Reviews Given ({reviews.length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Reviews ({pendingSessions.length})
        </button>
      </div>

      {/* TAB 1: Reviews Given */}
      {activeTab === 'given' && (
        <div>
          {loading ? (
            <p className="sub">Loading your reviews...</p>
          ) : reviews.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
              <p>You haven't submitted any mentor reviews yet.</p>
              <p className="sub" style={{ fontSize: '13px' }}>
                Complete a session and review your mentor to build trust in the developer community.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reviews.map((r) => (
                <div key={r.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{r.mentor_name}</div>
                      <div className="sub" style={{ margin: '2px 0 0', fontSize: '12.5px' }}>
                        Session: <strong>{r.topic || 'Technical Pairing Session'}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="stars" style={{ fontSize: '15px' }}>
                        {stars(r.rating)}{' '}
                        <span className="mono" style={{ color: 'var(--ink)', fontSize: '13px', fontWeight: 700 }}>
                          {r.rating}/5
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: '11.5px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => openEditReview(r)}
                      >
                        <FileEditIcon size={13} /> Edit Review
                      </button>
                    </div>
                  </div>

                  <p className="sub" style={{ margin: '8px 0 10px', fontSize: '13.5px', lineHeight: 1.5 }}>
                    "{r.comment || 'No written comment left.'}"
                  </p>

                  <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>
                    Submitted on {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Pending Reviews Queue */}
      {activeTab === 'pending' && (
        <div>
          {loading ? (
            <p className="sub">Checking completed sessions...</p>
          ) : pendingSessions.length === 0 ? (
            <div className="empty">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <CheckCircleIcon size={36} style={{ color: 'var(--add)' }} />
              </div>
              <p>All caught up! No pending sessions awaiting review.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingSessions.map((b) => (
                <div
                  key={b.id}
                  className="card"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{b.mentor_name}</div>
                    <div className="sub" style={{ margin: '3px 0 0', fontSize: '12.5px' }}>
                      Topic: <strong>{b.topic || 'Pairing Session'}</strong> • Completed on {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '12.5px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => openNewReview(b)}
                  >
                    <StarIcon size={14} /> Leave Review Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multi-Criteria Review Modal */}
      <Modal
        isOpen={!!reviewModalSession}
        onClose={() => setReviewModalSession(null)}
        title={editReviewItem ? 'Edit Review' : `Review Session with ${reviewModalSession?.mentor_name || ''}`}
      >
        {reviewModalSession && (
          <form onSubmit={handleSubmitReview}>
            <div className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Session: <strong>{reviewModalSession.topic}</strong>
            </div>

            {/* Overall Star Rating */}
            <div className="field">
              <label>Overall Star Rating</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    style={{
                      fontSize: '28px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: star <= overallRating ? 'var(--gold)' : 'var(--grid-strong)',
                      padding: 0,
                    }}
                    onClick={() => setOverallRating(star)}
                  >
                    ★
                  </button>
                ))}
                <span className="mono" style={{ marginLeft: '8px', fontWeight: 700, fontSize: '16px' }}>
                  {overallRating} / 5
                </span>
              </div>
            </div>

            {/* Evaluation Dimensions */}
            <div className="section-label" style={{ marginTop: '16px' }}>Multi-Criteria Evaluation</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontWeight: 600, color: 'var(--ink-muted)' }}>Technical Knowledge</label>
                <select
                  value={criteriaRatings.techKnowledge}
                  onChange={(e) => setCriteriaRatings({ ...criteriaRatings, techKnowledge: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--grid-strong)' }}
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 5 - Mastery</option>
                  <option value={4}>⭐⭐⭐⭐ 4 - Strong</option>
                  <option value={3}>⭐⭐⭐ 3 - Competent</option>
                  <option value={2}>⭐⭐ 2 - Basic</option>
                  <option value={1}>⭐ 1 - Needs work</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 600, color: 'var(--ink-muted)' }}>Problem Solving</label>
                <select
                  value={criteriaRatings.problemSolving}
                  onChange={(e) => setCriteriaRatings({ ...criteriaRatings, problemSolving: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--grid-strong)' }}
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 5 - Solved fast</option>
                  <option value={4}>⭐⭐⭐⭐ 4 - Good approach</option>
                  <option value={3}>⭐⭐⭐ 3 - Average</option>
                  <option value={2}>⭐⭐ 2 - Slow progress</option>
                  <option value={1}>⭐ 1 - Unsolved</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 600, color: 'var(--ink-muted)' }}>Explanation &amp; Teaching</label>
                <select
                  value={criteriaRatings.explanation}
                  onChange={(e) => setCriteriaRatings({ ...criteriaRatings, explanation: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--grid-strong)' }}
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 5 - Crystal clear</option>
                  <option value={4}>⭐⭐⭐⭐ 4 - Good clarity</option>
                  <option value={3}>⭐⭐⭐ 3 - Decent</option>
                  <option value={2}>⭐⭐ 2 - Confusing</option>
                  <option value={1}>⭐ 1 - Poor</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 600, color: 'var(--ink-muted)' }}>Communication</label>
                <select
                  value={criteriaRatings.communication}
                  onChange={(e) => setCriteriaRatings({ ...criteriaRatings, communication: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--grid-strong)' }}
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 5 - Courteous &amp; responsive</option>
                  <option value={4}>⭐⭐⭐⭐ 4 - Friendly</option>
                  <option value={3}>⭐⭐⭐ 3 - Acceptable</option>
                  <option value={2}>⭐⭐ 2 - Rushed</option>
                  <option value={1}>⭐ 1 - Poor communication</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontWeight: 600, color: 'var(--ink-muted)' }}>Value for Money</label>
                <select
                  value={criteriaRatings.valueForMoney}
                  onChange={(e) => setCriteriaRatings({ ...criteriaRatings, valueForMoney: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--grid-strong)' }}
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 5 - Exceeded expectations</option>
                  <option value={4}>⭐⭐⭐⭐ 4 - Fair value</option>
                  <option value={3}>⭐⭐⭐ 3 - Satisfactory</option>
                  <option value={2}>⭐⭐ 2 - Overpriced</option>
                  <option value={1}>⭐ 1 - Not worth it</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Written Feedback &amp; Highlights</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="What did you learn? Would you recommend this mentor to other learners?"
                rows={4}
                required
              />
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={wouldRecommend}
                  onChange={(e) => setWouldRecommend(e.target.checked)}
                />
                <span>I would recommend this mentor to fellow software developers</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setReviewModalSession(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ flex: 1 }}
              >
                {submitting ? 'Submitting...' : editReviewItem ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PortalLayout>
  );
}
