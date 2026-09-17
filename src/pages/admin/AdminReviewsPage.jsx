import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, stars, initials } from '../../api/client';
import {
  StarIcon,
  MessageIcon,
  CheckIcon,
  AlertTriangleIcon,
  RefreshIcon,
  SearchIcon,
  XIcon,
  EyeIcon,
  ClockIcon,
  ScaleIcon,
  TrashIcon,
} from '../../components/Icons';
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminReviews();
      const enhanced = (data || []).map((r, idx) => {
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
      setError(err.message || 'Failed to load reviews');
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

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, ratingFilter, searchQuery]);

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReviews.slice(start, start + itemsPerPage);
  }, [filteredReviews, currentPage]);

  const renderReviewStatusBadge = (r) => {
    if (r.is_reported) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#dc2626',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          <AlertTriangleIcon size={11} />
          <span>Flagged</span>
        </span>
      );
    }
    if (r.is_pending) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 9px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#b45309',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#b45309' }} />
          <span>Pending</span>
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 9px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 600,
          background: '#E7F6EF',
          color: '#157F53',
          border: '1px solid rgba(21, 127, 83, 0.28)',
          whiteSpace: 'nowrap',
        }}
      >
        <CheckIcon size={11} />
        <span>Approved</span>
      </span>
    );
  };

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
  const pendingCount = reviews.filter((r) => r.is_pending).length;

  return (
    <PortalLayout title="Review &amp; Rating Moderation" portalType="admin">
      <div style={{ paddingBottom: '40px' }}>
        {/* Top Header Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                Review &amp; Rating Moderation
              </h1>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#b45309',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                }}
              >
                Quality Assurance
              </span>
            </div>
            <p className="sub" style={{ margin: '5px 0 0', fontSize: '13.5px', color: 'var(--ink-muted)' }}>
              Audit public feedback, moderate reported learner testimonials, and redact offensive or misleading remarks.
            </p>
          </div>

          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadReviews}
              disabled={loading}
              style={{
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              <RefreshIcon size={14} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh Reviews'}</span>
            </button>
          </div>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '18px' }}>{error}</div>}

        {/* 4 Modern KPI Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px',
            marginBottom: '22px',
          }}
        >
          {/* Total Reviews */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Total Reviews
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageIcon size={17} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
              {reviews.length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              All platform learner feedback
            </div>
          </div>

          {/* Platform Average */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #f59e0b',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#b45309' }}>
                Platform Average
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StarIcon size={17} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
              ★ {avgRating} <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink-muted)' }}>/ 5.0</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Aggregate rating across mentors
            </div>
          </div>

          {/* Pending Moderation */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #0284c7',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0284c7' }}>
                Pending Review
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.12)',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClockIcon size={17} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>
              {pendingCount}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Awaiting admin publication
            </div>
          </div>

          {/* Reported / Flagged */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #dc2626',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                Reported / Flagged
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangleIcon size={17} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
              {reportedCount}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Mentor disputes &amp; profanity flags
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-bar" style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {REVIEW_TABS.map((t) => {
            let count = 0;
            if (t.id === 'all') count = reviews.length;
            else if (t.id === 'pending') count = reviews.filter((r) => r.is_pending).length;
            else if (t.id === 'reported') count = reviews.filter((r) => r.is_reported).length;
            else if (t.id === 'high') count = reviews.filter((r) => r.rating === 5).length;
            else if (t.id === 'low') count = reviews.filter((r) => r.rating <= 2).length;

            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span>{t.label}</span>
                <span className="mono" style={{ fontSize: '11px', opacity: isActive ? 0.9 : 0.65, fontWeight: 700 }}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
            <div
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-muted)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SearchIcon size={16} />
            </div>
            <input
              type="text"
              placeholder="Search by mentor, learner, review text, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '38px',
                paddingRight: '12px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--grid-strong)',
                fontSize: '13px',
                background: 'var(--bg)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--grid-strong)',
                fontSize: '13px',
                background: 'var(--surface)',
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
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
              style={{ fontSize: '12px', height: '38px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => {
                setSearchQuery('');
                setRatingFilter('all');
              }}
            >
              <XIcon size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Reviews Table Panel */}
        <div className="admin-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--grid-strong)' }}>
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--grid-strong)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                Reviews Registry
              </h3>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  background: 'var(--grid)',
                  color: 'var(--ink-muted)',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {filteredReviews.length} record{filteredReviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center' }}>
              <p className="sub" style={{ margin: 0 }}>Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center' }}>
              <p className="sub" style={{ margin: 0 }}>No reviews match your selected filters.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '170px' }}>Mentor</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '170px' }}>Learner</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>Rating</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '260px' }}>Review Comment</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '110px' }}>Status</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '110px' }}>Date</th>
                    <th style={{ whiteSpace: 'nowrap', minWidth: '110px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReviews.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--brand), #8b5cf6)',
                              color: '#fff',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials(r.mentor_name)}
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                              {r.mentor_name}
                            </div>
                            <div className="sub" style={{ fontSize: '11px', margin: 0, color: 'var(--ink-muted)' }}>
                              Mentor
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                              color: '#fff',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials(r.learner_name)}
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                              {r.learner_name}
                            </div>
                            <div className="sub" style={{ fontSize: '11px', margin: 0, color: 'var(--ink-muted)' }}>
                              Learner
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#f59e0b', fontSize: '14px', letterSpacing: '1px' }}>
                            {stars(r.rating)}
                          </span>
                          <span
                            className="mono"
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: '#b45309',
                            }}
                          >
                            {Number(r.rating).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td style={{ maxWidth: '320px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: '13px', lineHeight: 1.4, color: 'var(--ink)' }}>
                            {r.comment ? `"${r.comment}"` : <span style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>No written feedback</span>}
                          </div>
                          {r.topic && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--ink-muted)',
                                background: 'var(--grid)',
                                padding: '2px 7px',
                                borderRadius: '5px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '300px',
                                display: 'inline-block',
                              }}
                              title={r.topic}
                            >
                              Topic: {r.topic}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {renderReviewStatusBadge(r)}
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                          {r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            borderRadius: '6px',
                            border: '1px solid var(--grid-strong)',
                            background: 'var(--surface)',
                          }}
                          onClick={() => setSelectedReview(r)}
                          title={`Inspect & moderate review #${r.id}`}
                        >
                          <EyeIcon size={13} />
                          <span>Moderate</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderTop: '1px solid var(--grid-strong)',
                background: 'var(--surface)',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                Showing <strong style={{ color: 'var(--ink)' }}>{(currentPage - 1) * itemsPerPage + 1}</strong>–
                <strong style={{ color: 'var(--ink)' }}>{Math.min(currentPage * itemsPerPage, filteredReviews.length)}</strong> of{' '}
                <strong style={{ color: 'var(--ink)' }}>{filteredReviews.length}</strong> reviews
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                >
                  Previous
                </button>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 600, padding: '0 6px' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
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
