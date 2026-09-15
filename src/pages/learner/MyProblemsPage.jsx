import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials, stars } from '../../api/client';
import {
  PlusIcon,
  DocumentIcon,
  TrashIcon,
  ScaleIcon,
  MessageIcon,
  CheckIcon,
  XIcon,
  ShieldCheckIcon,
  CreditCardIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function MyProblemsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Proposal & details modals
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Negotiation & Checkout modals state
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [counterProposal, setCounterProposal] = useState(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutProposal, setCheckoutProposal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  // Proposal counts map
  const [proposalCounts, setProposalCounts] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = await api.getMyProblems();
      setProblems(data);

      // Load proposal counts for problems
      const counts = {};
      await Promise.all(
        data.map(async (p) => {
          try {
            const props = await api.getProposals(p.id);
            counts[p.id] = props.length;
          } catch {
            counts[p.id] = 0;
          }
        })
      );
      setProposalCounts(counts);
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id) => {
    const confirmed = await confirm({
      title: 'Close Problem Post',
      message: 'Are you sure you want to close this problem post? Mentors will no longer be able to submit proposals.',
      confirmText: 'Close Post',
      type: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.closeProblem(id);
      toast.success('Problem post closed.');
      loadProblems();
    } catch (err) {
      toast.error(err.message || 'Failed to close problem');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Problem Permanently',
      message: 'Are you sure you want to delete this problem post permanently? This action cannot be undone.',
      confirmText: 'Delete Problem',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.deleteProblem(id);
      toast.success('Problem post deleted.');
      loadProblems();
    } catch (err) {
      toast.error(err.message || 'Failed to delete problem');
    }
  };

  const openProposals = async (problem) => {
    setSelectedProblem(problem);
    setLoadingProposals(true);
    try {
      const data = await api.getProposals(problem.id);
      setProposals(data);
    } catch (err) {
      toast.error('Failed to load proposals: ' + err.message);
    } finally {
      setLoadingProposals(false);
    }
  };

  const openDetails = (problem) => {
    setSelectedProblem(problem);
    setDetailsModalOpen(true);
  };

  const handleRejectProposal = async (problemId, proposalId) => {
    const confirmed = await confirm({
      title: 'Decline Proposal',
      message: 'Are you sure you want to decline this proposal? The mentor will be notified.',
      confirmText: 'Decline Proposal',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.rejectProposal(problemId, proposalId);
      toast.success('Proposal declined.');
      const updated = await api.getProposals(problemId);
      setProposals(updated);
    } catch (err) {
      toast.error('Failed to decline proposal: ' + err.message);
    }
  };

  const openCounterModal = (prop) => {
    setCounterProposal(prop);
    setCounterPrice(prop.counter_price || prop.proposed_price || '');
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
      await api.counterProposal(selectedProblem.id, counterProposal.id, {
        counter_price: parseFloat(counterPrice),
        counter_message: counterMessage.trim(),
      });
      toast.success('Counter-offer submitted to mentor!');
      setCounterModalOpen(false);
      setCounterProposal(null);
      const updated = await api.getProposals(selectedProblem.id);
      setProposals(updated);
    } catch (err) {
      toast.error('Failed to submit counter-offer: ' + err.message);
    } finally {
      setSubmittingCounter(false);
    }
  };

  const openCheckoutModal = (prop) => {
    setCheckoutProposal(prop);
    setPaymentMethod('upi');
    setCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutProposal || !selectedProblem) return;
    setSubmittingCheckout(true);
    try {
      const res = await api.acceptProposal(selectedProblem.id, checkoutProposal.id, {
        payment_method: paymentMethod,
        is_paid: true,
      });
      setCheckoutModalOpen(false);
      setCheckoutProposal(null);
      setSelectedProblem(null);
      toast.success('Payment held securely in Escrow! Session confirmed.');
      if (res && res.room_url) {
        navigate(res.room_url);
      } else {
        navigate('/learner/sessions');
      }
    } catch (err) {
      toast.error('Checkout failed: ' + err.message);
    } finally {
      setSubmittingCheckout(false);
    }
  };

  // Filter problems by tab
  const filteredProblems = problems.filter((p) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return p.status === 'open';
    if (activeTab === 'in_progress') return p.status === 'in_progress' || (proposalCounts[p.id] > 0 && p.status === 'open');
    if (activeTab === 'completed') return p.status === 'completed';
    if (activeTab === 'closed') return p.status === 'closed';
    return true;
  });

  return (
    <PortalLayout
      title="My Problems"
      portalType="learner"
      actions={
        <Link to="/learner/post-problem" className="btn btn-primary" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <PlusIcon size={14} /> Post New Problem
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        Track your posted bugs, review mentor proposals, compare quotes, and assign mentors.
      </p>

      {/* Problem Status Tabs */}
      <div className="admin-filter-tabs">
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Problems ({problems.length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'open' ? 'active' : ''}`}
          onClick={() => setActiveTab('open')}
        >
          Open ({problems.filter((p) => p.status === 'open').length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'in_progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('in_progress')}
        >
          Proposals Received
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({problems.filter((p) => p.status === 'completed').length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'closed' ? 'active' : ''}`}
          onClick={() => setActiveTab('closed')}
        >
          Closed / Cancelled ({problems.filter((p) => p.status === 'closed').length})
        </button>
      </div>

      {loading ? (
        <p className="sub">Loading your problem requests...</p>
      ) : filteredProblems.length === 0 ? (
        <div className="empty">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <DocumentIcon size={36} />
          </div>
          <p>No problem requests found under this category.</p>
          <Link to="/learner/post-problem" className="btn btn-primary" style={{ marginTop: '12px' }}>
            Post a Problem Now
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredProblems.map((p) => {
            const count = proposalCounts[p.id] || 0;
            return (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '16px' }}>{p.title}</span>
                      <span
                        className={`status-badge ${
                          p.status === 'open' ? 'badge-accepted' : 'badge-completed'
                        } mono`}
                      >
                        {p.status}
                      </span>
                      {count > 0 && (
                        <span
                          className="tag"
                          style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          onClick={() => openProposals(p)}
                        >
                          {count} Proposal{count > 1 ? 's' : ''} Received
                        </span>
                      )}
                    </div>
                    <div className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                      Budget: <strong>{p.budget ? `₹${p.budget}` : 'Flexible'}</strong> • Posted on {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => openDetails(p)}
                    >
                      View Details
                    </button>
                    {p.status === 'open' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => openProposals(p)}
                        >
                          Proposals ({count})
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '12px', padding: '6px 10px', color: 'var(--warn)' }}
                          onClick={() => handleClose(p.id)}
                        >
                          Close
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', padding: '6px 8px', display: 'inline-flex', alignItems: 'center' }}
                      onClick={() => handleDelete(p.id)}
                      title="Delete Problem"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>

                <p className="sub" style={{ margin: '4px 0 6px', fontSize: '13px', lineHeight: 1.5 }}>
                  {p.description.length > 200 ? `${p.description.slice(0, 200)}...` : p.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(p.skills || []).map((s) => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Problem Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedProblem?.title || 'Problem Details'}
      >
        {selectedProblem && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className={`status-badge ${selectedProblem.status === 'open' ? 'badge-accepted' : 'badge-completed'} mono`}>
                {selectedProblem.status}
              </span>
              <span className="mono" style={{ fontSize: '12px' }}>
                Budget: <strong>{selectedProblem.budget ? `₹${selectedProblem.budget}` : 'Flexible'}</strong>
              </span>
            </div>

            <div className="section-label" style={{ marginTop: 0 }}>Description &amp; Context</div>
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
              {selectedProblem.description}
            </div>

            <div className="section-label">Required Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {(selectedProblem.skills || []).map((s) => (
                <span key={s} className="tag">{s}</span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setDetailsModalOpen(false)}
              >
                Close
              </button>
              {selectedProblem.status === 'open' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setDetailsModalOpen(false);
                    openProposals(selectedProblem);
                  }}
                >
                  View Proposals
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Proposals List Modal */}
      <Modal
        isOpen={!!selectedProblem && !detailsModalOpen && !compareModalOpen && !counterModalOpen && !checkoutModalOpen}
        onClose={() => setSelectedProblem(null)}
        title={`Proposals for: ${selectedProblem?.title?.slice(0, 30) || ''}...`}
      >
        {loadingProposals ? (
          <p className="sub">Loading mentor proposals...</p>
        ) : proposals.length === 0 ? (
          <div className="empty">
            <p>No proposals received from mentors yet.</p>
            <p className="sub" style={{ fontSize: '12px', marginTop: '4px' }}>
              Mentors browsing the problem feed will see your request and submit their approach and rate.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                Received <strong>{proposals.length}</strong> proposal{proposals.length > 1 ? 's' : ''}
              </div>
              {proposals.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => setCompareModalOpen(true)}
                >
                  <ScaleIcon size={13} /> Compare Side-by-Side
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proposals.map((prop) => {
                const isNegotiating = prop.status === 'negotiating';
                const isPending = prop.status === 'pending';
                const isAccepted = prop.status === 'accepted';
                const isDeclined = prop.status === 'rejected' || prop.status === 'declined';
                const mentorCountered = isNegotiating && prop.last_action_by === 'mentor';
                const learnerCountered = isNegotiating && prop.last_action_by === 'learner';
                const activePrice = isNegotiating && prop.counter_price ? prop.counter_price : prop.proposed_price;

                return (
                  <div
                    key={prop.id}
                    className="card"
                    style={{
                      background: 'var(--bg)',
                      border: isNegotiating ? '1px solid var(--accent)' : isAccepted ? '1px solid var(--success, #10b981)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14.5px' }}>{prop.mentor_name}</div>
                        {prop.mentor_title && (
                          <div className="sub" style={{ fontSize: '12px' }}>{prop.mentor_title}</div>
                        )}
                        {prop.mentor_rating_avg > 0 && (
                          <div style={{ fontSize: '11.5px', color: '#f59e0b', marginTop: '2px' }}>
                            ★ {prop.mentor_rating_avg.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="mono" style={{ fontWeight: 700, fontSize: '15px', color: 'var(--accent)' }}>
                          ₹{prop.proposed_price}
                        </span>
                        <div style={{ marginTop: '2px' }}>
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
                            {prop.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="sub" style={{ fontSize: '13px', margin: '4px 0 10px', lineHeight: 1.5 }}>
                      {prop.message}
                    </p>

                    {/* Negotiation Box if active */}
                    {isNegotiating && (
                      <div
                        style={{
                          background: 'var(--panel-bg)',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          marginBottom: '10px',
                          fontSize: '12.5px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                            {mentorCountered ? '⚡ Mentor Revised Quote' : '💬 Your Counter-Offer Sent'}
                          </span>
                          <span className="mono" style={{ fontWeight: 700, fontSize: '13.5px' }}>
                            ₹{prop.counter_price}
                          </span>
                        </div>
                        {prop.counter_message && (
                          <p style={{ margin: '4px 0 0', fontStyle: 'italic', color: 'var(--ink-muted)' }}>
                            "{prop.counter_message}"
                          </p>
                        )}
                        {learnerCountered && (
                          <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>
                            Awaiting mentor review. You can still message the mentor or update your offer.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        to={`/chat?with=${prop.mentor_id}&name=${encodeURIComponent(prop.mentor_name)}`}
                        className="btn btn-ghost"
                        style={{ flex: 1, fontSize: '12px', minWidth: '100px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <MessageIcon size={13} /> Chat First
                      </Link>

                      {isPending && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            onClick={() => openCounterModal(prop)}
                          >
                            Negotiate / Counter
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: '12px', padding: '6px 10px', color: 'var(--warn)' }}
                            onClick={() => handleRejectProposal(selectedProblem.id, prop.id)}
                          >
                            <XIcon size={13} /> Decline
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ flex: 1.2, fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                            onClick={() => openCheckoutModal(prop)}
                          >
                            <CheckIcon size={13} /> Accept &amp; Pay (Escrow)
                          </button>
                        </>
                      )}

                      {isNegotiating && mentorCountered && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            onClick={() => openCounterModal(prop)}
                          >
                            Counter Again
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: '12px', padding: '6px 10px', color: 'var(--warn)' }}
                            onClick={() => handleRejectProposal(selectedProblem.id, prop.id)}
                          >
                            <XIcon size={13} /> Decline
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ flex: 1.2, fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                            onClick={() => openCheckoutModal(prop)}
                          >
                            <CheckIcon size={13} /> Accept ₹{prop.counter_price} &amp; Pay
                          </button>
                        </>
                      )}

                      {isNegotiating && learnerCountered && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 10px' }}
                          onClick={() => openCounterModal(prop)}
                        >
                          Modify Offer
                        </button>
                      )}

                      {isAccepted && (
                        <Link
                          to="/learner/sessions"
                          className="btn btn-primary"
                          style={{ flex: 1, fontSize: '12px', textAlign: 'center' }}
                        >
                          Join Session Room
                        </Link>
                      )}

                      {isDeclined && (
                        <span className="status-badge badge-declined mono" style={{ alignSelf: 'center', fontSize: '12px' }}>
                          Declined
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Compare Proposals Side-by-Side Modal */}
      <Modal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title="Compare Mentor Proposals"
      >
        <div>
          <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
            Compare mentor bids side-by-side to choose the best fit for your budget and timeline.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mentor</th>
                  <th>Price</th>
                  <th>Proposal Pitch</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((prop) => (
                  <tr key={prop.id}>
                    <td style={{ fontWeight: 700 }}>{prop.mentor_name}</td>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      ₹{prop.status === 'negotiating' && prop.counter_price ? prop.counter_price : prop.proposed_price}
                    </td>
                    <td style={{ maxWidth: '240px', fontSize: '12px' }}>
                      {prop.message.slice(0, 100)}...
                    </td>
                    <td>
                      {prop.status === 'pending' || (prop.status === 'negotiating' && prop.last_action_by === 'mentor') ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => {
                            setCompareModalOpen(false);
                            openCheckoutModal(prop);
                          }}
                        >
                          Checkout
                        </button>
                      ) : (
                        <span className="mono" style={{ fontSize: '11px' }}>{prop.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCompareModalOpen(false)}
            >
              Back to Proposals
            </button>
          </div>
        </div>
      </Modal>

      {/* Counter-Offer / Negotiate Modal */}
      <Modal
        isOpen={counterModalOpen}
        onClose={() => setCounterModalOpen(false)}
        title={counterProposal ? `Counter-Offer to ${counterProposal.mentor_name}` : 'Submit Counter-Offer'}
      >
        {counterProposal && (
          <form onSubmit={handleSubmitCounter}>
            <p className="sub" style={{ fontSize: '13px', marginBottom: '14px' }}>
              Negotiate price or clarify project scope with the mentor. Both of you will be notified instantly.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--panel-bg)', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px' }}>
              <span className="sub" style={{ fontSize: '12.5px' }}>Current Mentor Quote:</span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                ₹{counterProposal.proposed_price}
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Your Proposed Counter Price (₹ INR) *
              </label>
              <input
                type="number"
                min="1"
                step="50"
                required
                className="form-control"
                placeholder="e.g. 1000"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Note / Scope Adjustment (Optional)
              </label>
              <textarea
                rows={3}
                className="form-control"
                placeholder="e.g. Can we do ₹1000 for a 45-minute pairing session?"
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
                {submittingCounter ? 'Submitting...' : 'Send Counter-Offer'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Checkout & Escrow Payment Modal */}
      <Modal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title="Secure Escrow Checkout"
      >
        {checkoutProposal && selectedProblem && (
          <div>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08))',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ color: 'var(--success, #10b981)', marginTop: '2px' }}>
                <ShieldCheckIcon size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)' }}>
                  100% PairUp Escrow Protection Guarantee
                </div>
                <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0', lineHeight: 1.4 }}>
                  Your funds are held safely in Escrow during your session. The mentor is only paid after the pairing session finishes. If any issue arises, our admin dispute resolution protects you.
                </div>
              </div>
            </div>

            {/* Session Summary */}
            <div style={{ background: 'var(--panel-bg)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="sub" style={{ fontSize: '13px' }}>Problem Topic:</span>
                <span style={{ fontWeight: 600, fontSize: '13px', maxWidth: '65%', textAlign: 'right' }}>
                  {selectedProblem.title}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="sub" style={{ fontSize: '13px' }}>Assigned Mentor:</span>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>
                  {checkoutProposal.mentor_name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="sub" style={{ fontSize: '13px' }}>Duration &amp; Workspace:</span>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>
                  LiveKit Video + Screen Share (60 Mins)
                </span>
              </div>
              <div style={{ borderTop: '1px dashed var(--border)', margin: '8px 0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>Total Escrow Deposit:</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: '18px', color: 'var(--accent)' }}>
                  ₹{checkoutProposal.status === 'negotiating' && checkoutProposal.counter_price ? checkoutProposal.counter_price : checkoutProposal.proposed_price}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Select Payment Method:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '8px 6px', justifyContent: 'center' }}
                  onClick={() => setPaymentMethod('upi')}
                >
                  ⚡ UPI / QR
                </button>
                <button
                  type="button"
                  className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '8px 6px', justifyContent: 'center' }}
                  onClick={() => setPaymentMethod('card')}
                >
                  💳 Card
                </button>
                <button
                  type="button"
                  className={`btn ${paymentMethod === 'netbanking' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '8px 6px', justifyContent: 'center' }}
                  onClick={() => setPaymentMethod('netbanking')}
                >
                  🏦 Net Banking
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                disabled={submittingCheckout}
                onClick={() => setCheckoutModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                disabled={submittingCheckout}
                onClick={handleConfirmCheckout}
              >
                {submittingCheckout ? 'Authorizing Escrow...' : (
                  <>
                    <CreditCardIcon size={14} /> Pay ₹{checkoutProposal.status === 'negotiating' && checkoutProposal.counter_price ? checkoutProposal.counter_price : checkoutProposal.proposed_price} (Escrow Hold)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
}
