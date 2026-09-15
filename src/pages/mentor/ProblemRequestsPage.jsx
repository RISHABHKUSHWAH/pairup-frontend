import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials, mentorSavedProblems, mentorProfileSettings } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import { DocumentIcon, SearchIcon, EyeIcon, MessageIcon, HeartIcon, CheckIcon } from '../../components/Icons';

export default function ProblemRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [problems, setProblems] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'new' | 'matching' | 'recommended' | 'saved'

  // Modals
  const [detailProblem, setDetailProblem] = useState(null);
  const [proposalProblem, setProposalProblem] = useState(null);

  // Proposal form
  const [coverLetter, setCoverLetter] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mentor profile for matching skills
  const [mentorSkills, setMentorSkills] = useState([]);

  useEffect(() => {
    const prof = mentorProfileSettings.getProfile(user);
    setMentorSkills(prof.skills || []);
    setSavedIds(mentorSavedProblems.getSaved());
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [probData, propData] = await Promise.all([
        api.getProblems().catch((err) => {
          console.error('api.getProblems failed:', err);
          return [];
        }),
        api.getMyProposals().catch(() => []),
      ]);
      const list = Array.isArray(probData) ? probData : (probData?.problems || []);
      setProblems(list);
      setMyProposals(Array.isArray(propData) ? propData : []);
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const myProposalProblemIds = new Set(myProposals.map((p) => p.problem_id || p.problem));

  const handleToggleSave = (e, id) => {
    e.stopPropagation();
    const updated = mentorSavedProblems.toggleSave(id);
    setSavedIds([...updated]);
  };

  // Filter logic
  const filteredProblems = problems.filter((p) => {
    // Search match
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      p.title?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.learner_name?.toLowerCase().includes(term) ||
      p.skills?.some((s) => s.toLowerCase().includes(term));

    if (!matchSearch) return false;

    if (filterTab === 'saved') {
      return savedIds.includes(p.id);
    }

    if (filterTab === 'new') {
      // Created within last 3 days
      const created = new Date(p.created_at || Date.now());
      const diffDays = (Date.now() - created.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 3;
    }

    if (filterTab === 'matching') {
      if (mentorSkills.length === 0) return true;
      const lowerMentorSkills = mentorSkills.map((s) => s.toLowerCase());
      return p.skills?.some((s) => lowerMentorSkills.includes(s.toLowerCase()));
    }

    if (filterTab === 'recommended') {
      const lowerMentorSkills = mentorSkills.map((s) => s.toLowerCase());
      const hasSkill = p.skills?.some((s) => lowerMentorSkills.includes(s.toLowerCase()));
      const goodBudget = (p.budget || p.budget_max || 0) >= 800;
      return hasSkill || goodBudget;
    }

    return true;
  });

  const openProposalModal = (prob) => {
    setProposalProblem(prob);
    setCoverLetter('');
    const defaultPrice = prob.budget || prob.budget_max || 800;
    setPrice(defaultPrice);
    setDuration('60');
    setError('');
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.submitProposal(proposalProblem.id, {
        cover_letter: coverLetter.trim(),
        price: Number(price),
        estimated_duration_minutes: Number(duration),
      });
      toast.success('Proposal sent successfully! The learner will be notified.');
      setProposalProblem(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit proposal');
      setError(err.message || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout
      title="Explore Problems"
      portalType="mentor"
      actions={
        <Link to="/mentor/my-proposals" className="btn btn-ghost" style={{ fontSize: '13px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <DocumentIcon size={14} /> My Proposals ({myProposals.length})
          </span>
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Explore all technical bottlenecks, bug reports, and challenges posted by learners. Review context, filter by your expertise, and submit proposals with your pricing and schedule.
      </p>

      {/* Filter Tabs */}
      <div className="filter-bar" style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'all' ? 'active' : ''}`}
          onClick={() => setFilterTab('all')}
        >
          All Problems ({problems.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'new' ? 'active' : ''}`}
          onClick={() => setFilterTab('new')}
        >
          New Problems
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'matching' ? 'active' : ''}`}
          onClick={() => setFilterTab('matching')}
        >
          Matching Skills
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'recommended' ? 'active' : ''}`}
          onClick={() => setFilterTab('recommended')}
        >
          Recommended
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'saved' ? 'active' : ''}`}
          onClick={() => setFilterTab('saved')}
        >
          Saved Problems ({savedIds.length})
        </button>
      </div>

      {/* Search Input */}
      <div className="filters" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          className="search"
          placeholder="Search problems by title, description, category, skills, or learner name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Problem Cards List */}
      {loading ? (
        <p className="sub">Loading available problem requests...</p>
      ) : filteredProblems.length === 0 ? (
        <div className="empty" style={{ padding: '36px', textAlign: 'center', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--muted)' }}>
            <SearchIcon size={32} />
          </div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>No problem requests found</div>
          <p className="sub" style={{ fontSize: '13px', margin: '4px 0 12px' }}>
            {filterTab === 'saved'
              ? 'You have not saved any problem requests yet. Click the bookmark icon on any request to save it for later.'
              : 'Try selecting a different filter tab or clearing your search keywords.'}
          </p>
          {filterTab !== 'all' && (
            <button type="button" className="btn btn-secondary" onClick={() => setFilterTab('all')}>
              View All Requests
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredProblems.map((p) => {
            const isSaved = savedIds.includes(p.id);
            const hasProposal = myProposalProblemIds.has(p.id);

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: isSaved ? '1px solid var(--brand)' : '1px solid var(--border)',
                  transition: 'transform 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--ink)' }}>{p.title}</span>
                      {p.category && (
                        <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                          {p.category}
                        </span>
                      )}
                    </div>
                    <p className="sub" style={{ margin: '8px 0 12px', fontSize: '13.5px', lineHeight: 1.5 }}>
                      {p.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '6px 8px', display: 'inline-flex', alignItems: 'center', color: isSaved ? 'var(--brand)' : 'var(--muted)' }}
                      title={isSaved ? 'Remove from saved' : 'Save request'}
                      onClick={(e) => handleToggleSave(e, p.id)}
                    >
                      <HeartIcon size={16} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                    {(p.budget || p.budget_max) && (
                      <div className="mono" style={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--brand)', fontSize: '15px' }}>
                        ₹{p.budget || `${p.budget_min || 500} - ${p.budget_max || 1500}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {p.skills?.map((s) => (
                    <span key={s} className="tag" style={{ fontSize: '12px' }}>
                      {s}
                    </span>
                  ))}
                </div>

                {/* Footer Info & Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px dashed var(--border)',
                    paddingTop: '12px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div className="sub" style={{ margin: 0, fontSize: '12px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <div className="avatar-sm" style={{ width: '22px', height: '22px', fontSize: '10px' }}>
                        {initials(p.learner_name || 'Learner')}
                      </div>
                      <strong style={{ color: 'var(--ink)' }}>{p.learner_name || 'Learner'}</strong>
                    </span>
                    <span>{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent'}</span>
                    {p.preferred_time && <span>Prefers: {p.preferred_time}</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12.5px', padding: '5px 12px' }}
                      onClick={() => setDetailProblem(p)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <EyeIcon size={13} /> Full Details
                      </span>
                    </button>

                    <Link
                      to={`/chat?with=${p.learner_id}&name=${encodeURIComponent(p.learner_name || 'Learner')}`}
                      className="btn btn-ghost"
                      style={{ fontSize: '12.5px', padding: '5px 12px' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <MessageIcon size={13} /> Message
                      </span>
                    </Link>

                    {hasProposal ? (
                      <span className="status-badge badge-accepted mono" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckIcon size={13} /> Proposal Sent
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '12.5px', padding: '5px 14px' }}
                        onClick={() => openProposalModal(p)}
                      >
                        Submit Proposal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Problem Request Detail Modal */}
      <Modal
        isOpen={Boolean(detailProblem)}
        onClose={() => setDetailProblem(null)}
        title="Problem Request Details"
      >
        {detailProblem && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{detailProblem.title}</h3>
                <div className="sub" style={{ fontSize: '12px', marginTop: '3px' }}>
                  Posted by {detailProblem.learner_name || 'Learner'} • {new Date(detailProblem.created_at || Date.now()).toLocaleString()}
                </div>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '14px', fontWeight: 600 }}>
                Budget: ₹{detailProblem.budget || `${detailProblem.budget_min || 500} - ${detailProblem.budget_max || 1500}`}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Description & Context:</div>
              <p style={{ fontSize: '13.5px', lineHeight: 1.6, background: 'var(--panel-bg)', padding: '12px', borderRadius: '6px', margin: 0 }}>
                {detailProblem.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Technology Category</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                  {detailProblem.category || 'Software Engineering'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Estimated / Preferred Duration</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                  {detailProblem.duration ? `${detailProblem.duration} Minutes` : '45 - 60 Minutes'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>Skills & Stack Required:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {detailProblem.skills?.map((s) => (
                  <span key={s} className="tag" style={{ fontSize: '12px' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Error logs / Attachments section */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Error Logs &amp; Snippet Attachments:
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--card-bg, #0f0f17)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: 'var(--code-ink, #a5b4fc)',
                  overflowX: 'auto',
                }}
              >
                {detailProblem.attachments ||
                  detailProblem.error_log ||
                  `// Stack trace provided with problem request:
Traceback (most recent call last):
  File "server.py", line 42, in handle_request
    connection = pool.get_connection(timeout=3.0)
TimeoutError: Resource pool exhausted under concurrent load.`}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleToggleSave({ stopPropagation: () => {} }, detailProblem.id)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <HeartIcon size={14} fill={savedIds.includes(detailProblem.id) ? 'currentColor' : 'none'} />
                  {savedIds.includes(detailProblem.id) ? 'Saved' : 'Save for Later'}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const prob = detailProblem;
                  setDetailProblem(null);
                  openProposalModal(prob);
                }}
              >
                Submit Proposal
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Submit Proposal Modal */}
      <Modal
        isOpen={Boolean(proposalProblem)}
        onClose={() => setProposalProblem(null)}
        title="Submit a Proposal"
      >
        {proposalProblem && (
          <form onSubmit={handleSubmitProposal}>
            <div style={{ marginBottom: '14px', fontSize: '13.5px', fontWeight: 600 }}>
              Applying for: "{proposalProblem.title}"
            </div>

            {error && <div className="error-box" style={{ marginBottom: '12px' }}>{error}</div>}

            <div className="field">
              <label>Cover Letter / Proposed Approach</label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Detail your diagnosis steps, prior experience fixing similar issues, and how you will structure the pairing session..."
                required
                rows={4}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="field">
                <label>Proposed Price (₹)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="100"
                  required
                />
                <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                  Learner budget: ₹{proposalProblem.budget || `${proposalProblem.budget_min || 500} - ${proposalProblem.budget_max || 1500}`}
                </div>
              </div>

              <div className="field">
                <label>Estimated Duration</label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option value="30">30 Minutes (Quick fix)</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes (Standard 1 hr)</option>
                  <option value="90">90 Minutes (Deep dive)</option>
                  <option value="120">120 Minutes (2 hours)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setProposalProblem(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Send Proposal'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PortalLayout>
  );
}
