import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import CounterHistoryTimeline from '../../components/CounterHistoryTimeline';
import Pagination from '../../components/Pagination';
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
  ClockIcon,
  FileEditIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';
import { useRealtimeSync, broadcastDataChange, checkProblemTimeOut } from '../../utils';

export default function MyProblemsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('open');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

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

  // Edit problem state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    skills: '',
    budget: '',
    urgency: 'Today',
    preferredTime: '',
    duration: '60',
    budgetType: 'fixed',
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Proposal counts map
  const [proposalCounts, setProposalCounts] = useState({});

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedProblemRef = useRef(selectedProblem);
  selectedProblemRef.current = selectedProblem;

  useEffect(() => {
    loadProblems();
  }, []);

  useEffect(() => {
    const targetProblemId = searchParams.get('problem');
    if (!targetProblemId || problems.length === 0) return;
    const match = problems.find((p) => String(p.id) === String(targetProblemId));
    if (match) {
      openDetails(match);
      const next = new URLSearchParams(searchParams);
      next.delete('problem');
      setSearchParams(next, { replace: true });
    }
  }, [problems, searchParams]);

  const loadProblems = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getMyProblems();
      const problemList = Array.isArray(data) ? data : [];
      setProblems(problemList);

      // Load proposal counts for problems
      const counts = {};
      await Promise.all(
        problemList.map(async (p) => {
          try {
            const props = await api.getProposals(p.id);
            counts[p.id] = Array.isArray(props) ? props.length : 0;
          } catch {
            counts[p.id] = 0;
          }
        })
      );
      setProposalCounts(counts);

      // If proposals modal is currently open for a problem, refresh its proposals silently
      if (selectedProblemRef.current) {
        try {
          const updatedProps = await api.getProposals(selectedProblemRef.current.id);
          setProposals(Array.isArray(updatedProps) ? updatedProps : []);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Real-time synchronization: automatically updates on focus, cross-tab events, or 3.5s interval
  useRealtimeSync({
    onSync: () => loadProblems(true),
    entities: ['problems', 'proposals'],
    intervalMs: 3500,
  });

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
      broadcastDataChange('problems');
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
      broadcastDataChange('problems');
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

  const openDetails = async (problem) => {
    setSelectedProblem(problem);
    setDetailsModalOpen(true);
    setProposals([]);
    setLoadingProposals(true);
    try {
      const data = await api.getProposals(problem.id);
      setProposals(Array.isArray(data) ? data : []);
    } catch {
      setProposals([]);
    } finally {
      setLoadingProposals(false);
    }
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
      broadcastDataChange('proposals');
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
      broadcastDataChange('proposals');
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
      broadcastDataChange('proposals');
      broadcastDataChange('contracts');
      broadcastDataChange('sessions');
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

  const openEditModal = (prob) => {
    setEditingProblem(prob);
    const rawDesc = prob.description || '';
    let urg = prob.urgency || 'Today';
    let prefTime = prob.preferred_time || '';
    let dur = '60';
    let bType = 'fixed';

    const urgMatch = rawDesc.match(/Urgency:\s*([^|*\n]+)/i);
    if (urgMatch) urg = urgMatch[1].trim();

    const prefMatch = rawDesc.match(/Preferred Date & Time:\s*([^|*\n]+)/i);
    if (prefMatch) prefTime = prefMatch[1].trim();

    const durMatch = rawDesc.match(/Preferred Duration:\s*(\d+)/i);
    if (durMatch) dur = durMatch[1].trim();

    const formatMatch = rawDesc.match(/Format:\s*([^|*\n]+)/i);
    if (formatMatch) bType = formatMatch[1].trim();

    // Clean up description if it ends with the *Urgency:...* block
    const cleanDesc = rawDesc.replace(/\n*\*Urgency:[^*]+\*\s*$/i, '').trim();

    // Default preferredTime to future time if empty or expired
    if (!prefTime || new Date(prefTime).getTime() <= Date.now()) {
      const future = new Date(Date.now() + 2 * 3600 * 1000);
      prefTime = future.toISOString().slice(0, 16);
    }

    setEditFormData({
      title: prob.title || '',
      description: cleanDesc,
      skills: Array.isArray(prob.skills) ? prob.skills.join(', ') : (prob.skills || ''),
      budget: prob.budget != null ? String(prob.budget) : '',
      urgency: urg,
      preferredTime: prefTime,
      duration: dur,
      budgetType: bType,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingProblem) return;
    if (!editFormData.title.trim() || !editFormData.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }
    setSubmittingEdit(true);
    try {
      const urgencyLineParts = [`Urgency: ${editFormData.urgency}`];
      if (editFormData.preferredTime) {
        urgencyLineParts.push(`Preferred Date & Time: ${editFormData.preferredTime}`);
      }
      urgencyLineParts.push(`Preferred Duration: ${editFormData.duration} mins`);
      urgencyLineParts.push(`Format: ${editFormData.budgetType}`);

      const fullDesc = `${editFormData.description.trim()}\n\n*${urgencyLineParts.join(' | ')}*`;

      await api.updateProblem(editingProblem.id, {
        title: editFormData.title.trim(),
        description: fullDesc,
        skills: editFormData.skills,
        budget: editFormData.budget ? parseFloat(editFormData.budget) : null,
        urgency: editFormData.urgency,
        preferred_time: editFormData.preferredTime || null,
        duration: editFormData.duration,
        budgetType: editFormData.budgetType,
        renew: true,
      });

      toast.success('Problem updated and reactivated! Mentors can now view and propose.');
      broadcastDataChange('problems');
      setEditModalOpen(false);
      setEditingProblem(null);
      await loadProblems(true);
    } catch (err) {
      toast.error('Failed to update problem: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Filter problems by tab
  const filteredProblems = problems
    .filter((p) => {
      if (activeTab === 'open') return p.status === 'open';
      if (activeTab === 'all') return true;
      if (activeTab === 'in_progress') return p.status === 'in_progress' || (proposalCounts[p.id] > 0 && p.status === 'open');
      if (activeTab === 'completed') return p.status === 'completed';
      if (activeTab === 'closed') return p.status === 'closed';
      return true;
    })
    .sort((a, b) => {
      // Active non-timed-out open problems come first
      const timedOutA = checkProblemTimeOut(a) ? 1 : 0;
      const timedOutB = checkProblemTimeOut(b) ? 1 : 0;
      if (timedOutA !== timedOutB) {
        return timedOutA - timedOutB;
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedProblems = filteredProblems.slice(
    (validCurrentPage - 1) * pageSize,
    validCurrentPage * pageSize
  );

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
          className={`admin-filter-tab ${activeTab === 'open' ? 'active' : ''}`}
          onClick={() => setActiveTab('open')}
        >
          Open ({problems.filter((p) => p.status === 'open').length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Problems ({problems.length})
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
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>
            {paginatedProblems.map((p) => {
              const count = proposalCounts[p.id] || 0;
              const isTimedOut = checkProblemTimeOut(p);
              return (
                <div
                  key={p.id}
                  className={`card ${isTimedOut ? 'card-timed-out' : ''}`}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: isTimedOut ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isTimedOut && (
                    <div className="card-watermark-expired" aria-hidden="true">
                      EXPIRED
                    </div>
                  )}
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)', wordBreak: 'break-word' }}>
                          {p.title}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          <span
                            className={`status-badge ${
                              p.status === 'open' ? 'badge-accepted' : 'badge-completed'
                            } mono`}
                            style={{ fontSize: '11px' }}
                          >
                            {p.status}
                          </span>
                          {isTimedOut && (
                            <span className="stamp-timeout" title="This problem's scheduled preferred time or urgency has expired">
                              <ClockIcon size={11} /> EXPIRED
                            </span>
                          )}
                          {!isTimedOut && count > 0 && (
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
                      </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="mono" style={{ fontWeight: 700, fontSize: '16px', color: 'var(--brand)' }}>
                        {p.budget ? `₹${p.budget}` : 'Flexible'}
                      </div>
                      <div className="sub" style={{ fontSize: '11px', margin: 0 }}>Budget</div>
                    </div>
                  </div>

                  <div className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginBottom: '10px' }}>
                    Posted {p.created_at ? `${new Date(p.created_at).toLocaleDateString()} at ${new Date(p.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Recent'}
                  </div>

                  <p className="sub" style={{ margin: '0 0 10px', fontSize: '13px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description}
                  </p>

                  {p.skills && p.skills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {p.skills.map((s) => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer action bar */}
                <div
                  style={{
                    marginTop: 'auto',
                    borderTop: '1px solid var(--grid)',
                    paddingTop: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => openDetails(p)}
                  >
                    View Details
                  </button>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isTimedOut ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            fontSize: '12px',
                            padding: '6px 14px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'var(--accent)',
                          }}
                          onClick={() => openEditModal(p)}
                        >
                          <FileEditIcon size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '12px', padding: '6px 8px', display: 'inline-flex', alignItems: 'center' }}
                          onClick={() => handleDelete(p.id)}
                          title="Delete Problem"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        {p.status === 'open' ? (
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
                        ) : count > 0 && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                            onClick={() => openProposals(p)}
                          >
                            Proposals ({count})
                          </button>
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
                      </>
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
          totalItems={filteredProblems.length}
          itemsPerPage={pageSize}
          itemLabel="problems"
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

      {/* Problem Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedProblem(null);
        }}
        title={selectedProblem?.title || 'Problem Details'}
      >
        {selectedProblem && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status-badge ${selectedProblem.status === 'open' ? 'badge-accepted' : 'badge-completed'} mono`}>
                  {selectedProblem.status}
                </span>
                {checkProblemTimeOut(selectedProblem) && (
                  <span className="stamp-timeout">
                    <ClockIcon size={12} /> EXPIRED
                  </span>
                )}
              </div>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {(selectedProblem.skills || []).map((s) => (
                <span key={s} className="tag">{s}</span>
              ))}
            </div>

            {/* Proposals & Negotiation History inside Problem Details */}
            {loadingProposals ? (
              <p className="sub" style={{ fontSize: '12.5px', marginBottom: '16px' }}>
                Loading proposals &amp; negotiation history...
              </p>
            ) : proposals.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <div className="section-label" style={{ marginBottom: '8px' }}>
                  Proposals &amp; Negotiations ({proposals.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {proposals.map((prop) => (
                    <div
                      key={prop.id}
                      style={{
                        background: 'var(--bg)',
                        border: prop.status === 'accepted'
                          ? '1px solid rgba(16, 185, 129, 0.4)'
                          : prop.status === 'negotiating'
                          ? '1px solid rgba(99, 102, 241, 0.4)'
                          : '1px solid var(--grid)',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{prop.mentor_name}</strong>
                          <span
                            className={`status-badge ${
                              prop.status === 'accepted'
                                ? 'badge-accepted'
                                : prop.status === 'rejected' || prop.status === 'declined'
                                ? 'badge-declined'
                                : 'badge-pending'
                            } mono`}
                            style={{ fontSize: '10px' }}
                          >
                            {prop.status}
                          </span>
                        </div>
                        <span className="mono" style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--accent)' }}>
                          ₹{prop.status === 'negotiating' && prop.counter_price ? prop.counter_price : prop.proposed_price}
                        </span>
                      </div>
                      <CounterHistoryTimeline
                        history={prop.counter_history}
                        viewerRole="learner"
                        title={proposals.length > 1 ? `Negotiation History — ${prop.mentor_name}` : 'Negotiation & Counter-Offer History'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => {
                  setDetailsModalOpen(false);
                  setSelectedProblem(null);
                }}
              >
                Close
              </button>
              {selectedProblem.status === 'open' && checkProblemTimeOut(selectedProblem) ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => {
                    const prob = selectedProblem;
                    setDetailsModalOpen(false);
                    openEditModal(prob);
                  }}
                >
                  <FileEditIcon size={14} /> Edit Problem
                </button>
              ) : (
                (selectedProblem.status === 'open' || proposals.length > 0 || (proposalCounts[selectedProblem.id] || 0) > 0) && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const prob = selectedProblem;
                      setDetailsModalOpen(false);
                      openProposals(prob);
                    }}
                  >
                    View Proposals ({proposals.length || proposalCounts[selectedProblem.id] || 0})
                  </button>
                )
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

                    {/* Full Saved Counter-Offer & Negotiation History */}
                    {Array.isArray(prop.counter_history) && prop.counter_history.some((e) => e.action === 'counter') && (
                      <div style={{ marginBottom: '12px' }}>
                        <CounterHistoryTimeline
                          history={prop.counter_history}
                          viewerRole="learner"
                        />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        to={`/chat?with=${prop.mentor_id}&name=${encodeURIComponent(prop.mentor_name)}${selectedProblem?.id ? `&problem=${selectedProblem.id}&problem_title=${encodeURIComponent(selectedProblem.title || '')}` : ''}`}
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
                step="1"
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

      {/* Edit Problem Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit & Reactivate Problem"
      >
        {editingProblem && (
          <form onSubmit={handleSaveEdit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                Problem Title *
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', fontSize: '13px' }}
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                Problem Description *
              </label>
              <textarea
                className="input"
                rows={4}
                style={{ width: '100%', fontSize: '13px', lineHeight: 1.5, resize: 'vertical' }}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                  Budget (₹, optional)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="input"
                  style={{ width: '100%', fontSize: '13px' }}
                  placeholder="e.g. 500"
                  value={editFormData.budget}
                  onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                  Preferred Duration
                </label>
                <select
                  className="input"
                  style={{ width: '100%', fontSize: '13px' }}
                  value={editFormData.duration}
                  onChange={(e) => setEditFormData({ ...editFormData, duration: e.target.value })}
                >
                  <option value="30">30 mins</option>
                  <option value="60">60 mins</option>
                  <option value="90">90 mins</option>
                  <option value="120">120 mins</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                Skills (comma-separated)
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', fontSize: '13px' }}
                placeholder="e.g. Python, Django, Docker"
                value={editFormData.skills}
                onChange={(e) => setEditFormData({ ...editFormData, skills: e.target.value })}
              />
            </div>

            {/* Urgency & Scheduling */}
            <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--grid)', marginBottom: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '8px', color: 'var(--brand)' }}>
                Urgency &amp; Scheduling (Reactivate)
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  How urgently do you need help?
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {['ASAP (Next 2h)', 'Today', 'This Week', 'Flexible'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      className={`btn ${editFormData.urgency === u ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: '11px', padding: '6px 4px', textAlign: 'center', justifyContent: 'center' }}
                      onClick={() => setEditFormData({ ...editFormData, urgency: u })}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  New Preferred Date &amp; Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  style={{ width: '100%', fontSize: '12.5px' }}
                  value={editFormData.preferredTime}
                  onChange={(e) => setEditFormData({ ...editFormData, preferredTime: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                disabled={submittingEdit}
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                disabled={submittingEdit}
              >
                {submittingEdit ? 'Reactivating...' : (
                  <>
                    <CheckIcon size={14} /> Save &amp; Reactivate Problem
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PortalLayout>
  );
}
