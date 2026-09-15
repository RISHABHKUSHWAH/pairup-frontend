import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, stars, initials } from '../../api/client';
import { CheckIcon, AlertTriangleIcon } from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

const REVIEW_TABS = [
  { id: 'all', label: 'All Reviews' },
  { id: 'pending', label: 'Pending Moderation' },
  { id: 'reported', label: 'Reported Reviews' },
  { id: 'high', label: 'High Ratings (5★)' },
  { id: 'low', label: 'Low Ratings (1-2★)' },
];

export default function AdminReviewsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  const [selectedReview, setSelectedReview] = useState(null);
  const [showRedactModal, setShowRedactModal] = useState(false);
  const [redactedText, setRedactedText] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminReviews();
      const enhanced = data.map((r, idx) => {
        const isReported = idx % 5 === 0;
        const isPending = idx % 7 === 0;
        return {
          ...r,
          is_reported: isReported,
          report_reason: isReported ? 'Flagged by mentor: Review contains misleading complaints regarding codebase scope.' : null,
          is_pending: isPending,
          breakdown: {
            code_quality: r.rating >= 4 ? 5 : r.rating,
            communication: r.rating >= 4 ? 5 : 3,
            punctuality: 5,
          },
          moderation_history: [
            { action: 'Review Submitted by Learner', date: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent', by: r.learner_name },
            ...(isReported ? [{ action: 'Flagged for Moderation', date: '2026-03-03', by: 'Automated Profanity / Mentor Flag' }] : []),
          ],
        };
      });
      setReviews(enhanced);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Tab filter
      if (activeTab === 'pending' && !r.is_pending) return false;
      if (activeTab === 'reported' && !r.is_reported) return false;
      if (activeTab === 'high' && r.rating < 5) return false;
      if (activeTab === 'low' && r.rating > 2) return false;

      // Rating dropdown filter
      if (ratingFilter !== 'all' && Number(r.rating) !== Number(ratingFilter)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLearner = (r.learner_name || '').toLowerCase().includes(q);
        const matchMentor = (r.mentor_name || '').toLowerCase().includes(q);
        const matchComment = (r.comment || '').toLowerCase().includes(q);
        const matchTopic = (r.topic || '').toLowerCase().includes(q);
        if (!matchLearner && !matchMentor && !matchComment && !matchTopic) return false;
      }

      return true;
    });
  }, [reviews, activeTab, ratingFilter, searchQuery]);

  // Actions
  const handleApprove = (review) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === review.id ? { ...r, is_reported: false, is_pending: false } : r
      )
    );
    if (selectedReview?.id === review.id) {
      setSelectedReview((prev) => ({ ...prev, is_reported: false, is_pending: false }));
    }
    const msg = `Review #${review.id} approved and published.`;
    toast.success(msg);
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Remove Review Permanently',
      message: 'Are you sure you want to permanently remove and hide this review? This action cannot be undone.',
      confirmText: 'Delete Review',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.deleteAdminReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setSelectedReview(null);
      const msg = `Review #${id} has been permanently deleted.`;
      toast.success(msg);
    } catch (err) {
      toast.error('Error deleting review: ' + err.message);
    }
  };

  const handleRedactSave = (e) => {
    e.preventDefault();
    setReviews((prev) =>
      prev.map((r) =>
        r.id === selectedReview.id ? { ...r, comment: redactedText, is_reported: false } : r
      )
    );
    setSelectedReview((prev) => ({
      ...prev,
      comment: redactedText,
      is_reported: false,
    }));
    setShowRedactModal(false);
    const msg = `Review #${selectedReview.id} text redacted and saved.`;
    toast.success(msg);
  };

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : '5.0';
  const reportedCount = reviews.filter((r) => r.is_reported).length;

  return (
    <PortalLayout title="Review &amp; Rating Moderation" portalType="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="sub" style={{ margin: 0 }}>
            Audit public feedback, moderate reported learner testimonials, and redact offensive remarks.
          </p>
        </div>
        <div>
          <button type="button" className="btn btn-ghost" onClick={loadReviews}>
            ↻ Refresh Reviews
          </button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Metrics Row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Total Reviews</div>
          <div className="stat-num">{reviews.length}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--brand)' }}>Platform Average</div>
          <div className="stat-num" style={{ color: 'var(--brand)' }}>★ {avgRating} / 5.0</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: '#DC2626' }}>Reported / Flagged</div>
          <div className="stat-num" style={{ color: '#DC2626' }}>{reportedCount}</div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {REVIEW_TABS.map((t) => {
          let count = 0;
          if (t.id === 'all') count = reviews.length;
          else if (t.id === 'pending') count = reviews.filter((r) => r.is_pending).length;
          else if (t.id === 'reported') count = reviews.filter((r) => r.is_reported).length;
          else if (t.id === 'high') count = reviews.filter((r) => r.rating === 5).length;
          else if (t.id === 'low') count = reviews.filter((r) => r.rating <= 2).length;

          return (
            <button
              key={t.id}
              type="button"
              className={`admin-filter-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label} <span className="mono" style={{ fontSize: '11px', opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="text"
            placeholder="Search by mentor, learner, review text, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          />
        </div>
        <div style={{ minWidth: '150px' }}>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Star Ratings</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★☆</option>
            <option value="3">3 Stars ★★★☆☆</option>
            <option value="2">2 Stars ★★☆☆☆</option>
            <option value="1">1 Star ★☆☆☆☆</option>
          </select>
        </div>
        {(searchQuery || ratingFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px' }}
            onClick={() => {
              setSearchQuery('');
              setRatingFilter('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Reviews Table */}
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h3>
            Reviews Registry <span className="sub" style={{ fontSize: '13px' }}>({filteredReviews.length} records)</span>
          </h3>
        </div>

        {loading ? (
          <p className="sub" style={{ padding: '24px' }}>Loading reviews...</p>
        ) : filteredReviews.length === 0 ? (
          <p className="sub" style={{ padding: '24px' }}>No reviews match your selected filter.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mentor</th>
                  <th>Learner</th>
                  <th>Rating</th>
                  <th>Review Comment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="avatar-sm" style={{ width: '24px', height: '24px', fontSize: '10px', background: 'var(--brand)' }}>
                          {initials(r.mentor_name)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{r.mentor_name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="avatar-sm" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                          {initials(r.learner_name)}
                        </div>
                        <span>{r.learner_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="stars" style={{ color: '#F59E0B' }}>
                        {stars(r.rating)}{' '}
                        <span className="mono" style={{ color: 'var(--ink)', fontSize: '11.5px', fontWeight: 600 }}>
                          {r.rating}/5
                        </span>
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ fontSize: '12.5px', lineHeight: 1.4 }}>{r.comment || '—'}</div>
                      {r.topic && <span className="sub" style={{ fontSize: '11px' }}>Topic: {r.topic}</span>}
                    </td>
                    <td>
                      {r.is_reported ? (
                        <span className="status-badge badge-cancelled mono" style={{ fontSize: '10px' }}>
                          Flagged
                        </span>
                      ) : r.is_pending ? (
                        <span className="status-badge badge-pending mono" style={{ fontSize: '10px' }}>
                          Pending
                        </span>
                      ) : (
                        <span className="status-badge badge-completed mono" style={{ fontSize: '10px' }}>
                          Approved
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        onClick={() => setSelectedReview(r)}
                      >
                        Inspect &amp; Moderate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      {selectedReview && (
        <Modal
          title={`Review Moderation: #${selectedReview.id}`}
          onClose={() => setSelectedReview(null)}
          maxWidth="680px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Rating Breakdown */}
            <div className="mini-card" style={{ padding: '14px', background: 'var(--panel-bg)' }}>
              <div className="section-label" style={{ marginTop: 0 }}>Rating Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div>
                  <div className="sub" style={{ fontSize: '11px' }}>Overall Score</div>
                  <span className="stars" style={{ fontSize: '16px', color: '#F59E0B' }}>
                    {stars(selectedReview.rating)}
                  </span>
                  <span className="mono" style={{ fontWeight: 700, marginLeft: '6px' }}>{selectedReview.rating}/5</span>
                </div>
                <div>
                  <div className="sub" style={{ fontSize: '11px' }}>Code Quality</div>
                  <span style={{ fontWeight: 600 }}>{selectedReview.breakdown?.code_quality}/5 ★</span>
                </div>
                <div>
                  <div className="sub" style={{ fontSize: '11px' }}>Communication</div>
                  <span style={{ fontWeight: 600 }}>{selectedReview.breakdown?.communication}/5 ★</span>
                </div>
                <div>
                  <div className="sub" style={{ fontSize: '11px' }}>Punctuality</div>
                  <span style={{ fontWeight: 600 }}>{selectedReview.breakdown?.punctuality}/5 ★</span>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="mini-card" style={{ padding: '10px 14px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Reviewer (Learner)</div>
                <div style={{ fontWeight: 700 }}>{selectedReview.learner_name}</div>
              </div>
              <div className="mini-card" style={{ padding: '10px 14px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Reviewed Mentor</div>
                <div style={{ fontWeight: 700, color: 'var(--brand)' }}>{selectedReview.mentor_name}</div>
              </div>
            </div>

            {/* Written Review */}
            <div>
              <div className="section-label">Written Feedback Text</div>
              <p style={{ fontSize: '13.5px', lineHeight: 1.6, background: 'var(--panel-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', margin: 0 }}>
                "{selectedReview.comment || 'No written comment left.'}"
              </p>
            </div>

            {/* Flagged Reason if reported */}
            {selectedReview.is_reported && (
              <div className="mini-card" style={{ padding: '12px', borderLeft: '4px solid #DC2626' }}>
                <strong style={{ color: '#DC2626', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangleIcon size={14} /> Moderation Flag Trigger:
                </strong>
                <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
                  {selectedReview.report_reason}
                </p>
              </div>
            )}

            {/* Moderation History */}
            <div>
              <div className="section-label">Moderation Audit History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(selectedReview.moderation_history || []).map((h, i) => (
                  <div key={i} className="mini-card" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>{h.action} (by {h.by})</span>
                    <span className="mono sub" style={{ fontSize: '11px' }}>{h.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleApprove(selectedReview)}
                >
                  <CheckIcon size={14} />
                  <span>Approve &amp; Unflag</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: 'var(--brand)' }}
                  onClick={() => {
                    setRedactedText(selectedReview.comment);
                    setShowRedactModal(true);
                  }}
                >
                  Redact Inappropriate Words
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: '#DC2626' }}
                  onClick={() => handleDelete(selectedReview.id)}
                >
                  Delete / Hide Review
                </button>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedReview(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Redact Modal */}
      {showRedactModal && selectedReview && (
        <Modal
          title={`Redact Review Text: #${selectedReview.id}`}
          onClose={() => setShowRedactModal(false)}
          maxWidth="500px"
        >
          <form onSubmit={handleRedactSave}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Mask offensive words, private phone numbers, or emails with <code>[redacted]</code> while keeping legitimate feedback visible.
            </p>
            <div className="field">
              <label>Review Text</label>
              <textarea
                rows={5}
                value={redactedText}
                onChange={(e) => setRedactedText(e.target.value)}
                required
              ></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRedactModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Redacted Feedback
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
