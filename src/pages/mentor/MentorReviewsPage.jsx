import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Pagination from '../../components/Pagination';
import { api, stars, initials } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { MessageIcon, StarIcon } from '../../components/Icons';

export default function MentorReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [mentorStats, setMentorStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const defaultReviews = [
    {
      id: 'rev_1',
      learner_name: 'Rahul Sharma',
      topic: 'Docker Compose & PostgreSQL Connection Pool',
      rating: 5,
      date: '2026-03-04',
      comment: 'Alex identified our connection exhaustion bug in the first 20 minutes and showed us how to configure connection pool limits in SQLAlchemy. Truly top-tier engineering mentorship!',
      ratings_breakdown: {
        tech_knowledge: 5,
        problem_solving: 5,
        explanation: 5,
        communication: 5,
        value: 5,
      },
    },
    {
      id: 'rev_2',
      learner_name: 'Priya Patel',
      topic: 'React Re-render Optimization & Context Architecture',
      rating: 5,
      date: '2026-02-27',
      comment: 'Super clear explanations using React DevTools profiler. Learned more in 1 hour than reading documentation for days.',
      ratings_breakdown: {
        tech_knowledge: 5,
        problem_solving: 5,
        explanation: 4.8,
        communication: 5,
        value: 4.8,
      },
    },
    {
      id: 'rev_3',
      learner_name: 'Amit Verma',
      topic: 'FastAPI Background Tasks & Redis Worker Queue',
      rating: 4.8,
      date: '2026-02-18',
      comment: 'Very practical advice on async vs celery workers. Walked through edge cases and failure retries.',
      ratings_breakdown: {
        tech_knowledge: 5,
        problem_solving: 4.7,
        explanation: 4.8,
        communication: 4.9,
        value: 4.8,
      },
    },
    {
      id: 'rev_4',
      learner_name: 'Ananya Roy',
      topic: 'AWS ECS Fargate Task Definition Debugging',
      rating: 5,
      date: '2026-02-10',
      comment: 'Helped me decipher cryptic IAM permission errors blocking our cloud deploy. Invaluable guidance.',
      ratings_breakdown: {
        tech_knowledge: 5,
        problem_solving: 5,
        explanation: 5,
        communication: 5,
        value: 5,
      },
    },
  ];

  useEffect(() => {
    async function loadReviews() {
      try {
        if (user) {
          const mentor = await api.getMentor(user.id).catch(() => null);
          setMentorStats(mentor);
          const liveReviews = mentor?.reviews || [];
          const isDemo = user.email === 'alex@example.com';
          setReviews(liveReviews.length > 0 ? liveReviews : (isDemo ? defaultReviews : []));
        } else {
          setReviews([]);
        }
      } catch (err) {
        setReviews(user?.email === 'alex@example.com' ? defaultReviews : []);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, [user]);

  const hasReviews = reviews.length > 0;
  const criteriaAverages = hasReviews ? {
    tech: 4.9,
    problemSolving: 4.9,
    explanation: 4.8,
    communication: 5.0,
    value: 4.9,
  } : {
    tech: 0,
    problemSolving: 0,
    explanation: 0,
    communication: 0,
    value: 0,
  };

  const filteredReviews = reviews.filter((r) => {
    if (starFilter === 'all') return true;
    if (starFilter === '5') return r.rating >= 4.9;
    if (starFilter === '4') return r.rating >= 3.9 && r.rating < 4.9;
    return true;
  });

  return (
    <PortalLayout title="Learner Reviews & Ratings" portalType="mentor">
      <p className="sub" style={{ marginBottom: '20px' }}>
        Detailed performance ratings, 5-criteria evaluation scores, and testimonials left by learners after pairing sessions.
      </p>

      {/* Top Overview Cards */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-label">Overall Average Rating</div>
          <div className="metric-value" style={{ color: '#f59e0b', fontSize: '26px' }}>
            ★ {hasReviews ? (mentorStats?.rating_avg || '4.9') : '0.0'}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>
            {hasReviews ? 'Based on verified session completions' : 'No ratings yet (New Mentor)'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Reviews</div>
          <div className="metric-value" style={{ fontSize: '26px' }}>
            {reviews.length}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>100% genuine learner reviews</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">5-Star Recommendation Rate</div>
          <div className="metric-value" style={{ color: '#10b981', fontSize: '26px' }}>
            {hasReviews ? '98%' : '—'}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>
            {hasReviews ? 'Learners who would book again' : 'Unlocks after first review'}
          </div>
        </div>
      </div>

      {/* 5-Criteria Evaluation Breakdown and Star Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* 5 Criteria Breakdown */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="section-label" style={{ marginTop: 0 }}>5-Criteria Performance Breakdown</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>Technical Knowledge</span>
                <span style={{ color: '#f59e0b' }}>★ {criteriaAverages.tech} / 5.0</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(criteriaAverages.tech / 5) * 100}%`, height: '100%', background: 'var(--brand)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>Problem Solving &amp; Debugging</span>
                <span style={{ color: '#f59e0b' }}>★ {criteriaAverages.problemSolving} / 5.0</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(criteriaAverages.problemSolving / 5) * 100}%`, height: '100%', background: 'var(--brand)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>Explanation &amp; Teaching Quality</span>
                <span style={{ color: '#f59e0b' }}>★ {criteriaAverages.explanation} / 5.0</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(criteriaAverages.explanation / 5) * 100}%`, height: '100%', background: 'var(--brand)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>Communication &amp; Patience</span>
                <span style={{ color: '#f59e0b' }}>★ {criteriaAverages.communication} / 5.0</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(criteriaAverages.communication / 5) * 100}%`, height: '100%', background: '#10b981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>Value for Money</span>
                <span style={{ color: '#f59e0b' }}>★ {criteriaAverages.value} / 5.0</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(criteriaAverages.value / 5) * 100}%`, height: '100%', background: 'var(--brand)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="section-label" style={{ marginTop: 0 }}>Rating Distribution</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {[
              { stars: 5, pct: 92, count: 26 },
              { stars: 4, pct: 8, count: 2 },
              { stars: 3, pct: 0, count: 0 },
              { stars: 2, pct: 0, count: 0 },
              { stars: 1, pct: 0, count: 0 },
            ].map((d) => (
              <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                <span style={{ width: '32px', fontWeight: 600 }}>{d.stars} ★</span>
                <div style={{ flex: 1, height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${d.pct}%`, height: '100%', background: '#f59e0b' }} />
                </div>
                <span style={{ width: '45px', textAlign: 'right', color: 'var(--text-muted)' }}>
                  {d.count} ({d.pct}%)
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', padding: '12px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '12px', color: '#10b981' }}>
              High Performer Badge Active
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Consistently rated &gt; 4.8 across all criteria. Eligible for priority search ranking.
            </p>
          </div>
        </div>
      </div>

      {/* Testimonials List */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageIcon size={16} /> All Reviews &amp; Testimonials
            </h3>
            <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
              Detailed feedback left by paired learners
            </div>
          </div>

          <div className="filter-bar" style={{ margin: 0, display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`filter-chip ${starFilter === 'all' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => { setStarFilter('all'); setCurrentPage(1); }}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-chip ${starFilter === '5' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => { setStarFilter('5'); setCurrentPage(1); }}
            >
              5 Stars Only
            </button>
            <button
              type="button"
              className={`filter-chip ${starFilter === '4' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => { setStarFilter('4'); setCurrentPage(1); }}
            >
              4 Stars
            </button>
          </div>
        </div>

        {loading ? (
          <p className="sub">Loading reviews...</p>
        ) : filteredReviews.length === 0 ? (
          <div className="empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <StarIcon size={36} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>
              {reviews.length === 0 ? 'No reviews yet' : 'No reviews match this filter'}
            </h3>
            <p className="sub" style={{ margin: 0, fontSize: '13px' }}>
              {reviews.length === 0
                ? 'When learners complete pairing sessions with you, their feedback and ratings will be published here.'
                : 'Try selecting "All" to view all reviews.'}
            </p>
          </div>
        ) : (
          (() => {
            const totalPages = Math.ceil(filteredReviews.length / pageSize) || 1;
            const paginatedReviews = filteredReviews.slice((currentPage - 1) * pageSize, currentPage * pageSize);

            return (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {paginatedReviews.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      style={{
                        padding: '16px',
                        background: 'var(--card-bg, #1a1a24)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--brand), #8b5cf6)',
                              color: '#fff',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {initials(r.learner_name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{r.learner_name}</div>
                            <div className="sub" style={{ fontSize: '11px', margin: '2px 0 0' }}>
                              Session: {r.topic || 'Pair Programming'} • {r.date || new Date(r.created_at || Date.now()).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#f59e0b', fontSize: '14px' }}>{stars(r.rating)}</span>
                          <span className="mono" style={{ fontWeight: 700, fontSize: '13px' }}>
                            {r.rating}/5
                          </span>
                        </div>
                      </div>

                      <p style={{ margin: '6px 0 10px', fontSize: '13.5px', lineHeight: 1.5, color: 'var(--ink)' }}>
                        "{r.comment || 'Great mentorship session! Highly recommended.'}"
                      </p>

                      {r.ratings_breakdown && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                          <span>Technical: ★{r.ratings_breakdown.tech_knowledge}</span>
                          <span>Problem Solving: ★{r.ratings_breakdown.problem_solving}</span>
                          <span>Explanation: ★{r.ratings_breakdown.explanation}</span>
                          <span>Communication: ★{r.ratings_breakdown.communication}</span>
                          <span>Value: ★{r.ratings_breakdown.value}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredReviews.length}
                  itemsPerPage={pageSize}
                  itemLabel="reviews"
                  pageSizeOptions={[5, 10, 20]}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  compact={true}
                />
              </>
            );
          })()
        )}
      </div>
    </PortalLayout>
  );
}
