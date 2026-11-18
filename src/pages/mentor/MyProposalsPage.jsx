import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import LearnerProfileModal from '../../components/LearnerProfileModal';
import CounterHistoryTimeline from '../../components/CounterHistoryTimeline';
import Pagination from '../../components/Pagination';
import { api, initials } from '../../api/client';
import { SearchIcon, DocumentIcon, EyeIcon, MessageIcon, XIcon, CheckIcon, ClockIcon } from '../../components/Icons';
import { useConfirm, useToast } from '../../context';
import { useRealtimeSync, broadcastDataChange, checkProblemTimeOut } from '../../utils';

export default function MyProposalsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'pending' | 'negotiating' | 'accepted' | 'rejected'
  const [activeProposal, setActiveProposal] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [selectedLearner, setSelectedLearner] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab]);

  // Counter Modal State
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [counterTargetProposal, setCounterTargetProposal] = useState(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  const activeProposalRef = useRef(activeProposal);
  activeProposalRef.current = activeProposal;

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getMyProposals();
      const list = Array.isArray(data) ? data : [];
      setProposals(list);

      // If active proposal modal is open, keep it in sync with updated status/counter
      if (activeProposalRef.current) {
        const found = list.find((item) => item.id === activeProposalRef.current.id);
        if (found) {
          setActiveProposal(found);
        }
      }
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load proposals');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Real-time synchronization: automatically updates on focus, cross-tab events, or 3.5s interval
  useRealtimeSync({
    onSync: () => loadProposals(true),
    entities: ['proposals', 'problems'],
    intervalMs: 3500,
  });

  const handleWithdraw = async (proposalId) => {
    const confirmed = await confirm({
      title: 'Withdraw Proposal',
      message: 'Are you sure you want to withdraw this proposal? The learner will no longer be able to accept it.',
      confirmText: 'Withdraw Proposal',
      type: 'warning',
    });
    if (!confirmed) return;

    setWithdrawingId(proposalId);
    try {
      await api.withdrawProposal(proposalId);
      const msg = 'Proposal withdrawn successfully.';
      toast.success(msg);
      broadcastDataChange('proposals');
      if (activeProposal?.id === proposalId) {
        setActiveProposal(null);
      }
      loadProposals();
    } catch (err) {
      toast.error(err.message || 'Failed to withdraw proposal');
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleAcceptCounterOffer = async (p) => {
    try {
      const problemId = p.problem_id || p.problem;
      await api.acceptCounterOffer(problemId, p.id);
      const msg = `Counter-offer accepted at ₹${p.counter_price}! Learner can now proceed to checkout.`;
      toast.success(msg);
      broadcastDataChange('proposals');
      loadProposals();
    } catch (err) {
      toast.error('Failed to accept counter-offer: ' + err.message);
    }
  };

  const openCounterModal = (p) => {
    setCounterTargetProposal(p);
    setCounterPrice(p.counter_price || p.proposed_price || '');
    setCounterMessage('');
    setCounterModalOpen(true);
  };

  const handleSubmitCounter = async (e) => {
    e.preventDefault();
    if (!counterPrice || parseFloat(counterPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    setSubmittingCounter(true);
    try {
      const problemId = counterTargetProposal.problem_id || counterTargetProposal.problem;
      await api.counterProposal(problemId, counterTargetProposal.id, {
        counter_price: parseFloat(counterPrice),
        counter_message: counterMessage.trim(),
      });
      setCounterModalOpen(false);
      setCounterTargetProposal(null);
      const msg = 'Revised quote submitted to learner.';
      toast.success(msg);
      broadcastDataChange('proposals');
      loadProposals();
    } catch (err) {
      toast.error('Failed to submit quote: ' + err.message);
    } finally {
      setSubmittingCounter(false);
    }
  };

  // Filter proposals by tab
  const filteredProposals = proposals.filter((p) => {
    if (statusTab === 'all') return true;
    if (statusTab === 'pending') return p.status === 'pending';
    if (statusTab === 'negotiating') return p.status === 'negotiating';
    if (statusTab === 'accepted') return p.status === 'accepted';
    if (statusTab === 'rejected') return p.status === 'rejected' || p.status === 'declined';
    return true;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredProposals.length / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedProposals = filteredProposals.slice(
    (validCurrentPage - 1) * pageSize,
    validCurrentPage * pageSize
  );

  const pendingCount = proposals.filter((p) => p.status === 'pending').length;
  const negotiatingCount = proposals.filter((p) => p.status === 'negotiating').length;
  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length;
  const rejectedCount = proposals.filter((p) => p.status === 'rejected' || p.status === 'declined').length;

  return (
    <PortalLayout
      title="My Proposals"
      portalType="mentor"
      actions={
        <Link to="/mentor/explore-problems" className="btn btn-primary" style={{ fontSize: '13px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <SearchIcon size={14} /> Explore Problems
          </span>
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Track, review, and manage all proposals you have submitted to open learner problem requests.
      </p>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Status Filter Tabs */}
      <div className="filter-bar" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'all' ? 'active' : ''}`}
          onClick={() => setStatusTab('all')}
        >
          All Proposals ({proposals.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusTab('pending')}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'negotiating' ? 'active' : ''}`}
          onClick={() => setStatusTab('negotiating')}
        >
          Negotiating ({negotiatingCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setStatusTab('accepted')}
        >
          Accepted ({acceptedCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatusTab('rejected')}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {loading ? (
        <p className="sub">Loading your proposals...</p>
      ) : filteredProposals.length === 0 ? (
        <div className="empty" style={{ padding: '36px', textAlign: 'center', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--muted)' }}>
            <DocumentIcon size={32} />
          </div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>
            No {statusTab !== 'all' ? statusTab : ''} proposals found
          </div>
          <p className="sub" style={{ fontSize: '13px', margin: '4px 0 14px' }}>
            {statusTab === 'pending'
              ? 'You have no proposals currently pending learner review.'
              : 'Submit proposals on open problem requests to start booking sessions.'}
          </p>
          <Link to="/mentor/explore-problems" className="btn btn-secondary" style={{ fontSize: '13px' }}>
            Explore Problems
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>
            {paginatedProposals.map((p) => {
            const isPending = p.status === 'pending';
            const isNegotiating = p.status === 'negotiating';
            const isAccepted = p.status === 'accepted';
            const isDeclined = p.status === 'rejected' || p.status === 'declined';

            const isTimedOut = checkProblemTimeOut(p);

            return (
              <div
                key={p.id}
                className={`card ${isTimedOut ? 'card-timed-out' : ''}`}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  height: '100%',
                  border: isTimedOut
                    ? '1px solid rgba(239, 68, 68, 0.45)'
                    : isAccepted
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : isNegotiating
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border)',
                }}
              >
                <div>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '15.5px', color: 'var(--ink)', wordBreak: 'break-word', display: 'block' }}>
                          {p.problem_title || `Problem #${p.problem || p.problem_id}`}
                        </span>
                        {isTimedOut && (
                          <span className="stamp-timeout" title="This problem's scheduled preferred time or urgency has expired">
                            <ClockIcon size={11} /> TIME OUT
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span
                        className={`status-badge ${
                          isAccepted
                            ? 'badge-accepted'
                            : isDeclined
                            ? 'badge-declined'
                            : isNegotiating
                            ? 'badge-pending'
                            : 'badge-completed'
                        } mono`}
                        style={{ fontSize: '11px' }}
                      >
                        {p.status}
                      </span>
                      <div className="mono" style={{ fontWeight: 700, fontSize: '15px', color: 'var(--brand)' }}>
                        ₹{p.price || p.proposed_price}
                      </div>
                    </div>
                  </div>

                  {/* Message/Description with 3-line clamp */}
                  <p className="sub" style={{ margin: '6px 0 12px', fontSize: '13px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.cover_letter || p.message || 'No description provided'}
                  </p>

                  {/* Negotiation Callout Banner if active */}
                  {isNegotiating && (
                    <div
                      style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '12.5px' }}>
                          {p.last_action_by === 'learner' ? '⚡ Learner Counter-Offer' : '💬 Counter-Offer Sent'}
                        </span>
                        <span className="mono" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>
                          ₹{p.counter_price}
                        </span>
                      </div>
                      {p.counter_message && (
                        <p style={{ margin: '4px 0 6px', fontStyle: 'italic', fontSize: '12px', color: 'var(--ink-muted)' }}>
                          "{p.counter_message}"
                        </p>
                      )}
                      {p.last_action_by === 'learner' ? (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: '11.5px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleAcceptCounterOffer(p)}
                          >
                            <CheckIcon size={12} /> Accept ₹{p.counter_price}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '11.5px', padding: '4px 10px' }}
                            onClick={() => openCounterModal(p)}
                          >
                            Counter
                          </button>
                        </div>
                      ) : (
                        <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                          Awaiting learner's response or checkout.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="sub" style={{ margin: '0 0 10px', fontSize: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>Submitted: {new Date(p.created_at || Date.now()).toLocaleDateString()}</span>
                    <span>Duration: {p.estimated_duration_minutes || 60}m</span>
                    {p.learner_name && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Learner:</span>
                        <button
                          type="button"
                          className="user-profile-trigger"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: 'var(--ink)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                          }}
                          onClick={() => setSelectedLearner({ id: p.learner_id, name: p.learner_name })}
                          title="Click to view learner profile"
                        >
                          <div className="avatar-sm" style={{ width: '18px', height: '18px', fontSize: '9px' }}>
                            {initials(p.learner_name || 'Learner')}
                          </div>
                          <strong className="user-profile-name" style={{ color: 'var(--brand, #2563eb)', textDecoration: 'underline' }}>
                            {p.learner_name}
                          </strong>
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer details & actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--grid)',
                    paddingTop: '12px',
                    marginTop: 'auto',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '12px', padding: '5px 10px' }}
                    onClick={() => setActiveProposal(p)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <EyeIcon size={13} /> Proposal Details
                      {Array.isArray(p.counter_history) && p.counter_history.filter((e) => e.action === 'counter').length > 0 && (
                        <span
                          className="mono"
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '999px',
                            background: 'rgba(99, 102, 241, 0.16)',
                            color: 'var(--accent)',
                            marginLeft: '2px',
                          }}
                        >
                          {p.counter_history.filter((e) => e.action === 'counter').length}
                        </span>
                      )}
                    </span>
                  </button>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {p.learner_id && (
                      <Link
                        to={`/chat?with=${p.learner_id}&name=${encodeURIComponent(p.learner_name || 'Learner')}${(p.problem || p.problem_id) ? `&problem=${p.problem || p.problem_id}&problem_title=${encodeURIComponent(p.problem_title || '')}` : ''}`}
                        className="btn btn-ghost"
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MessageIcon size={13} /> Chat
                        </span>
                      </Link>
                    )}

                    {isNegotiating && p.last_action_by === 'mentor' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                        onClick={() => openCounterModal(p)}
                      >
                        Update Quote
                      </button>
                    )}

                    {(isPending || isNegotiating) && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '5px 10px', color: 'var(--danger, #ef4444)' }}
                        disabled={withdrawingId === p.id}
                        onClick={() => handleWithdraw(p.id)}
                      >
                        {withdrawingId === p.id ? 'Withdrawing...' : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XIcon size={12} /> Withdraw
                          </span>
                        )}
                      </button>
                    )}

                    {isAccepted && (
                      <Link
                        to="/mentor/sessions"
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                      >
                        Go to Session
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Pagination
          currentPage={validCurrentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          totalItems={filteredProposals.length}
          itemsPerPage={pageSize}
          itemLabel="proposals"
          pageSizeOptions={[6, 9, 15, 30]}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          style={{
            marginTop: '24px',
            borderRadius: '12px',
            border: '1px solid var(--grid-strong)',
          }}
        />
      </>
    )}

      {/* Proposal Detail Modal */}
      <Modal
        isOpen={Boolean(activeProposal)}
        onClose={() => setActiveProposal(null)}
        title="Proposal Details"
      >
        {activeProposal && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px' }}>
                    {activeProposal.problem_title || `Problem Request #${activeProposal.problem || activeProposal.problem_id}`}
                  </h3>
                  {checkProblemTimeOut(activeProposal) && (
                    <span className="stamp-timeout stamp-lg" title="This problem's scheduled preferred time or urgency has expired">
                      <ClockIcon size={12} /> TIME OUT
                    </span>
                  )}
                </div>
                <div className="sub" style={{ fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Learner:</span>
                  <button
                    type="button"
                    className="user-profile-trigger"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                    }}
                    onClick={() => setSelectedLearner({ id: activeProposal.learner_id, name: activeProposal.learner_name })}
                    title="Click to view learner profile"
                  >
                    <div className="avatar-sm" style={{ width: '18px', height: '18px', fontSize: '9px' }}>
                      {initials(activeProposal.learner_name || 'Learner')}
                    </div>
                    <strong className="user-profile-name" style={{ color: 'var(--brand, #2563eb)', textDecoration: 'underline' }}>
                      {activeProposal.learner_name || 'Learner'}
                    </strong>
                  </button>
                </div>
              </div>
              <span
                className={`status-badge ${
                  activeProposal.status === 'accepted'
                    ? 'badge-accepted'
                    : activeProposal.status === 'rejected' || activeProposal.status === 'declined'
                    ? 'badge-declined'
                    : 'badge-pending'
                } mono`}
              >
                {activeProposal.status}
              </span>
            </div>

            {/* Problem Details */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Problem Description:</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, background: 'var(--panel-bg)', padding: '10px 12px', borderRadius: '6px', margin: 0 }}>
                {activeProposal.problem_description || 'Technical problem posted by learner.'}
              </p>
            </div>

            {/* My Proposal */}
            <div style={{ padding: '14px', background: 'var(--card-bg, #1a1a24)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13.5px', marginBottom: '8px', color: 'var(--brand)' }}>
                Your Proposed Strategy & Offer:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={{ padding: '8px 10px', background: 'var(--panel-bg)', borderRadius: '4px' }}>
                  <div className="sub" style={{ fontSize: '11px' }}>Proposed Price</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)', marginTop: '2px' }}>
                    ₹{activeProposal.price || activeProposal.proposed_price}
                  </div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--panel-bg)', borderRadius: '4px' }}>
                  <div className="sub" style={{ fontSize: '11px' }}>Estimated Duration</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)', marginTop: '2px' }}>
                    {activeProposal.estimated_duration_minutes || 60} Minutes
                  </div>
                </div>
              </div>

              <div className="sub" style={{ fontSize: '11px', marginBottom: '4px' }}>Cover Letter / Approach:</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                {activeProposal.cover_letter || activeProposal.message || 'No message provided.'}
              </p>
            </div>

            {/* Full Saved Negotiation & Counter-Offer History */}
            <div style={{ marginBottom: '16px' }}>
              <CounterHistoryTimeline
                history={activeProposal.counter_history}
                viewerRole="mentor"
              />
            </div>

            {/* Quick Negotiation Actions inside Details Modal */}
            {activeProposal.status === 'negotiating' && activeProposal.last_action_by === 'learner' && activeProposal.counter_price && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '14px',
                  padding: '10px 12px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '8px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
                  Respond to Learner Counter-Offer (₹{activeProposal.counter_price})
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => handleAcceptCounterOffer(activeProposal)}
                  >
                    <CheckIcon size={13} /> Accept ₹{activeProposal.counter_price}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '5px 12px' }}
                    onClick={() => openCounterModal(activeProposal)}
                  >
                    Counter
                  </button>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
              {(activeProposal.status === 'pending' || activeProposal.status === 'negotiating') && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ color: 'var(--danger, #ef4444)' }}
                  onClick={() => handleWithdraw(activeProposal.id)}
                >
                  Withdraw Proposal
                </button>
              )}
              {activeProposal.learner_id && (
                <Link
                  to={`/chat?with=${activeProposal.learner_id}&name=${encodeURIComponent(activeProposal.learner_name || 'Learner')}${(activeProposal.problem || activeProposal.problem_id) ? `&problem=${activeProposal.problem || activeProposal.problem_id}&problem_title=${encodeURIComponent(activeProposal.problem_title || '')}` : ''}`}
                  className="btn btn-ghost"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <MessageIcon size={14} /> Message Learner
                  </span>
                </Link>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setActiveProposal(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Counter-Offer / Revised Quote Modal */}
      <Modal
        isOpen={counterModalOpen}
        onClose={() => setCounterModalOpen(false)}
        title={counterTargetProposal ? `Propose Revised Rate for ${counterTargetProposal.learner_name || 'Learner'}` : 'Counter Propose'}
      >
        {counterTargetProposal && (
          <form onSubmit={handleSubmitCounter}>
            <p className="sub" style={{ fontSize: '13px', marginBottom: '14px' }}>
              Submit a revised price and note to the learner to reach an agreement.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--panel-bg)', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px' }}>
              <span className="sub" style={{ fontSize: '12.5px' }}>Offered / Counter Price:</span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--brand)' }}>
                ₹{counterTargetProposal.counter_price || counterTargetProposal.proposed_price || counterTargetProposal.price}
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Your Proposed Price (₹ INR) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                className="form-control"
                placeholder="e.g. 1200"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Note to Learner (Optional)
              </label>
              <textarea
                rows={3}
                className="form-control"
                placeholder="e.g. I can do ₹1200 and include follow-up debugging notes."
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={submittingCounter}
                onClick={() => setCounterModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingCounter}
              >
                {submittingCounter ? 'Submitting...' : 'Send Revised Quote'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Learner Profile Modal */}
      <LearnerProfileModal
        isOpen={Boolean(selectedLearner)}
        onClose={() => setSelectedLearner(null)}
        learner={selectedLearner}
      />
    </PortalLayout>
  );
}
