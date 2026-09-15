import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { SearchIcon, DocumentIcon, EyeIcon, MessageIcon, XIcon, CheckIcon } from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function MyProposalsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'pending' | 'negotiating' | 'accepted' | 'rejected'
  const [activeProposal, setActiveProposal] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);

  // Counter Modal State
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [counterTargetProposal, setCounterTargetProposal] = useState(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const data = await api.getMyProposals();
      setProposals(data);
    } catch (err) {
      setError(err.message || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredProposals.map((p) => {
            const isPending = p.status === 'pending';
            const isNegotiating = p.status === 'negotiating';
            const isAccepted = p.status === 'accepted';
            const isDeclined = p.status === 'rejected' || p.status === 'declined';

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: isAccepted
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : isNegotiating
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>
                        {p.problem_title || `Problem #${p.problem || p.problem_id}`}
                      </span>
                    </div>
                    <p className="sub" style={{ margin: '8px 0 12px', fontSize: '13.5px', lineHeight: 1.5 }}>
                      {p.cover_letter || p.message || 'No description provided'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
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
                      style={{ fontSize: '12px' }}
                    >
                      {p.status}
                    </span>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '15px', color: 'var(--brand)' }}>
                      ₹{p.price || p.proposed_price}
                    </div>
                  </div>
                </div>

                {/* Negotiation Callout Banner if active */}
                {isNegotiating && (
                  <div
                    style={{
                      background: 'var(--panel-bg)',
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '13px' }}>
                        {p.last_action_by === 'learner' ? '⚡ Learner Submitted Counter-Offer' : '💬 Your Counter-Offer Sent'}
                      </span>
                      <span className="mono" style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--ink)' }}>
                        ₹{p.counter_price}
                      </span>
                    </div>
                    {p.counter_message && (
                      <p style={{ margin: '4px 0 8px', fontStyle: 'italic', fontSize: '13px', color: 'var(--ink-muted)' }}>
                        "{p.counter_message}"
                      </p>
                    )}
                    {p.last_action_by === 'learner' ? (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleAcceptCounterOffer(p)}
                        >
                          <CheckIcon size={13} /> Accept ₹{p.counter_price}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '5px 12px' }}
                          onClick={() => openCounterModal(p)}
                        >
                          Counter Propose
                        </button>
                      </div>
                    ) : (
                      <div className="sub" style={{ fontSize: '11.5px', marginTop: '4px' }}>
                        Awaiting learner's response or checkout. You can update your quote or message anytime.
                      </div>
                    )}
                  </div>
                )}

                {/* Footer details & actions */}
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
                  <div className="sub" style={{ margin: 0, fontSize: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span>Submitted: {new Date(p.created_at || Date.now()).toLocaleDateString()}</span>
                    <span>Duration: {p.estimated_duration_minutes || 60} mins</span>
                    {p.learner_name && <span>Learner: {p.learner_name}</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12.5px', padding: '5px 12px' }}
                      onClick={() => setActiveProposal(p)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <EyeIcon size={13} /> Proposal Details
                      </span>
                    </button>

                    {p.learner_id && (
                      <Link
                        to={`/chat?with=${p.learner_id}&name=${encodeURIComponent(p.learner_name || 'Learner')}`}
                        className="btn btn-ghost"
                        style={{ fontSize: '12.5px', padding: '5px 12px' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <MessageIcon size={13} /> Chat
                        </span>
                      </Link>
                    )}

                    {isNegotiating && p.last_action_by === 'mentor' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '12.5px', padding: '5px 12px' }}
                        onClick={() => openCounterModal(p)}
                      >
                        Update Quote
                      </button>
                    )}

                    {(isPending || isNegotiating) && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '12.5px', padding: '5px 12px', color: 'var(--danger, #ef4444)' }}
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
                        style={{ fontSize: '12.5px', padding: '5px 14px' }}
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
                <h3 style={{ margin: 0, fontSize: '17px' }}>
                  {activeProposal.problem_title || `Problem Request #${activeProposal.problem || activeProposal.problem_id}`}
                </h3>
                <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
                  Learner: {activeProposal.learner_name || 'Learner'}
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

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              {activeProposal.status === 'pending' && (
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
                  to={`/chat?with=${activeProposal.learner_id}&name=${encodeURIComponent(activeProposal.learner_name || 'Learner')}`}
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
                step="50"
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
    </PortalLayout>
  );
}
