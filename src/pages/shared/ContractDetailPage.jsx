import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Modal from '../../components/Modal';
import { api, initials, formatCurrency, formatDateTime } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  DocumentIcon,
  ClockIcon,
  ShieldIcon,
  CheckCircleIcon,
  CalendarIcon,
  MessageIcon,
  AlertTriangleIcon,
  StarIcon,
  ArrowLeftIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function ContractDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Session Notes & Files Modal
  const [notesModalSession, setNotesModalSession] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionFiles, setSessionFiles] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);


  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getContract(id);
      setContract(data);
    } catch (err) {
      setError(err.message || 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  const isLearner = user?.id === contract?.learner_id;
  const isMentor = user?.id === contract?.mentor_id;

  // Handle Pay Contract
  const handlePayContract = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.payContract(id, { payment_method: paymentMethod });
      setPayModalOpen(false);
      toast.success(res.message || 'Contract funded! Funds are held in escrow.');
      await loadContract();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Mentor Complete
  const handleCompleteByMentor = async () => {
    const confirmed = await confirm({
      title: 'Submit Contract for Review',
      message: 'Mark all sessions as conducted and submit this contract for learner review?',
      confirmText: 'Submit for Review',
      type: 'info',
    });
    if (!confirmed) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.completeContractByMentor(id);
      toast.success(res.message);
      await loadContract();
    } catch (err) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Learner Approve & Release
  const handleApproveContract = async (e) => {
    e?.preventDefault();
    setReviewError('');

    if (!rating || rating < 1 || rating > 5) {
      setReviewError('Please select a star rating between 1 and 5 stars for your mentor.');
      return;
    }

    if (!reviewComment.trim()) {
      setReviewError('Please provide written feedback before approving the contract and releasing payment.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const res = await api.approveContract(id, {
        rating,
        comment: reviewComment.trim(),
      });
      setApproveModalOpen(false);
      toast.success(res.message);
      await loadContract();
    } catch (err) {
      toast.error(err.message);
      setReviewError(err.message);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Dispute
  const handleDisputeContract = async (e) => {
    e?.preventDefault();
    if (!disputeReason.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.disputeContract(id, disputeReason.trim());
      setDisputeModalOpen(false);
      toast.info(res.message);
      await loadContract();
    } catch (err) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Decline
  const handleDeclineContract = async () => {
    const confirmed = await confirm({
      title: 'Decline Contract Proposal',
      message: 'Are you sure you want to decline this contract proposal? This decision cannot be reversed.',
      confirmText: 'Decline Contract',
      type: 'danger',
    });
    if (!confirmed) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.declineContract(id);
      toast.success(res.message);
      await loadContract();
    } catch (err) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Schedule Session
  const handleScheduleSession = async (e) => {
    e?.preventDefault();
    if (!selectedSession || !scheduleDateTime) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.scheduleContractSession(id, selectedSession.id, scheduleDateTime);
      setScheduleModalOpen(false);
      toast.success(res.message);
      await loadContract();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenNotes = async (session) => {
    setNotesModalSession(session);
    setLoadingNotes(true);
    setSessionNotes('');
    setSessionFiles([]);
    try {
      const [notesRes, filesRes] = await Promise.all([
        api.getNotes(session.id).catch(() => ({ notes: '' })),
        api.getSessionFiles(session.id).catch(() => []),
      ]);
      setSessionNotes(notesRes?.notes || '');
      setSessionFiles(Array.isArray(filesRes) ? filesRes : []);
    } catch (err) {
      console.error('Failed to load session notes/files:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  if (loading) {

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main className="container" style={{ flex: 1, padding: '60px 0', textAlign: 'center' }}>
          <div className="spinner-sm" style={{ margin: '0 auto 16px' }}></div>
          <p className="sub">Loading contract details...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main className="container" style={{ flex: 1, padding: '60px 0', textAlign: 'center' }}>
          <div className="error-box" style={{ maxWidth: '500px', margin: '0 auto 20px' }}>
            {error}
          </div>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const statusBadgeClass = {
    proposed: 'badge-pending',
    active: 'badge-paid',
    completed_by_mentor: 'badge-accepted',
    completed: 'badge-completed',
    disputed: 'badge-disputed',
    declined: 'badge-cancelled',
  }[contract.status] || 'badge-pending';

  const statusLabel = {
    proposed: 'Proposal Pending',
    active: 'Active · Escrow Held',
    completed_by_mentor: 'Completed by Mentor · Awaiting Review',
    completed: 'Completed · Payment Released',
    disputed: 'Disputed · Under Admin Review',
    declined: 'Declined',
  }[contract.status] || contract.status;

  const otherPersonName = isLearner ? contract.mentor_name : contract.learner_name;
  const otherPersonId = isLearner ? contract.mentor_id : contract.learner_id;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, paddingTop: '28px', paddingBottom: '60px' }}>
        {/* Navigation Breadcrumb & Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate(user?.role === 'mentor' ? '/mentor/contracts' : '/learner/contracts');
              }
            }}
            className="portal-back-btn"
            title="Go back"
            aria-label="Go back to previous page"
          >
            <ArrowLeftIcon size={15} />
            <span>Back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink-muted)' }}>
            <Link to={user?.role === 'mentor' ? '/mentor/contracts' : '/learner/contracts'} style={{ color: 'var(--accent)' }}>
              Contracts
            </Link>
            <span>/</span>
            <span className="mono">Contract #{contract.id}</span>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {/* Contract Header Banner */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            borderRadius: '14px',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span className={`status-badge ${statusBadgeClass}`} style={{ fontSize: '11px', fontWeight: 700 }}>
                  {statusLabel}
                </span>
                <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  Created {formatDateTime(contract.created_at)}
                </span>
              </div>

              <h1 style={{ fontSize: '26px', margin: '0 0 10px 0', lineHeight: 1.25 }}>
                {contract.title}
              </h1>

              {contract.description && (
                <p style={{ color: 'var(--ink-muted)', fontSize: '14.5px', lineHeight: 1.6, margin: '0 0 14px 0' }}>
                  {contract.description}
                </p>
              )}

              {/* Technology badges */}
              {contract.technology && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {contract.technology.split(',').map((tech, idx) => (
                    <span key={idx} className="tag" style={{ background: 'var(--bg)', border: '1px solid var(--grid)' }}>
                      {tech.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Total Price & Escrow Card */}
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '12px',
                padding: '20px 24px',
                minWidth: '240px',
                textAlign: 'right',
              }}
            >
              <div className="sub" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                Total Contract Price
              </div>
              <div className="rate-num" style={{ fontSize: '28px', color: 'var(--ink)', marginBottom: '4px' }}>
                {formatCurrency(contract.total_price)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono' }}>
                ~{formatCurrency(Math.round(contract.total_price / contract.total_sessions))} per session
              </div>

              {contract.payment && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--grid-strong)', fontSize: '11.5px', color: 'var(--add)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <ShieldIcon size={14} />
                  <span>Escrow: {contract.payment.status.toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Participants Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginTop: '20px',
              paddingTop: '18px',
              borderTop: '1px solid var(--grid)',
              flexWrap: 'wrap',
            }}
          >
            {/* Learner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '13px' }}>
                {initials(contract.learner_name)}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Learner</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{contract.learner_name}</div>
              </div>
            </div>

            <span style={{ color: 'var(--grid-strong)', fontSize: '18px' }}>⇄</span>

            {/* Mentor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '13px', background: 'var(--accent)' }}>
                {initials(contract.mentor_name)}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Mentor</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  <Link to={`/mentor/${contract.mentor_id}`} style={{ color: 'var(--accent)' }}>
                    {contract.mentor_name}
                  </Link>
                </div>
              </div>
            </div>

            {/* Chat button */}
            <div style={{ marginLeft: 'auto' }}>
              <Link
                to={`/chat?with=${otherPersonId}&name=${encodeURIComponent(otherPersonName)}&contract=${contract.id}`}
                className="btn btn-ghost"
                style={{ fontSize: '13px' }}
              >
                <MessageIcon size={16} />
                Message {otherPersonName}
              </Link>
            </div>
          </div>
        </div>

        {/* Dispute Notice Banner */}
        {contract.status === 'disputed' && (
          <div className="error-box" style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertTriangleIcon size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14.5px', marginBottom: '4px' }}>
                This contract is currently under Dispute Review
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', opacity: 0.9 }}>
                Reason: "{contract.dispute_reason}"
              </p>
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                Our administrative resolution team will examine all session recordings, code files, and chat logs to mediate this contract.
              </div>
            </div>
          </div>
        )}

        {/* Curriculum & Topics Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 340px) 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Topics Syllabus */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '24px',
            }}
          >
            <div className="section-label" style={{ marginTop: 0 }}>
              Curriculum Topics ({contract.topics?.length || 0})
            </div>
            <p className="sub" style={{ fontSize: '13px' }}>
              Agreed syllabus covered across {contract.total_sessions} mentorship sessions:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contract.topics && contract.topics.length > 0 ? (
                contract.topics.map((topic, index) => {
                  const isDone = index < (contract.completed_sessions || 0);
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: isDone ? 'var(--add-bg)' : 'var(--bg)',
                        border: `1px solid ${isDone ? 'var(--add)' : 'var(--grid)'}`,
                      }}
                    >
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: isDone ? 'var(--add)' : 'var(--grid-strong)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {isDone ? '✓' : index + 1}
                      </span>
                      <div style={{ flex: 1, fontSize: '13.5px', fontWeight: 600, color: isDone ? 'var(--add)' : 'var(--ink)' }}>
                        {topic}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="sub" style={{ fontStyle: 'italic' }}>
                  No specific topics listed.
                </div>
              )}
            </div>

            {/* Escrow Guarantee Trust Banner */}
            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(38, 71, 214, 0.05)',
                border: '1px solid var(--accent)',
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--accent)', fontSize: '13px' }}>
                <ShieldIcon size={18} />
                <span>100% Platform Escrow</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Payment is locked securely in platform escrow. Funds are only disbursed to the mentor once the learner finishes and approves all sessions.
              </p>
            </div>
          </div>

          {/* Right Column: Milestone Sessions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '19px', margin: 0 }}>
                Milestone Sessions ({contract.completed_sessions || 0} / {contract.total_sessions} Completed)
              </h2>

              {/* Progress Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                <div style={{ flex: 1, height: '8px', background: 'var(--grid)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--add)',
                      width: `${Math.round(((contract.completed_sessions || 0) / contract.total_sessions) * 100)}%`,
                      transition: 'width 0.3s ease',
                    }}
                  ></div>
                </div>
                <span className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  {Math.round(((contract.completed_sessions || 0) / contract.total_sessions) * 100)}%
                </span>
              </div>
            </div>

            {/* Sessions Cards */}
            {contract.sessions && contract.sessions.length > 0 ? (
              contract.sessions.map((s) => {
                const isContractFinished = contract.status === 'completed';
                const isCompleted = s.status === 'completed' || isContractFinished;

                return (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--grid-strong)',
                      borderRadius: '12px',
                      padding: '20px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Session Number Circle */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: isCompleted ? 'var(--add-bg)' : 'var(--accent-soft)',
                        color: isCompleted ? 'var(--add)' : 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'JetBrains Mono',
                        fontWeight: 800,
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      {isCompleted ? '✓' : `#${s.session_number}`}
                    </div>

                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
                        {s.topic}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--ink-muted)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ClockIcon size={14} />
                          {s.duration_minutes} minutes
                        </span>

                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarIcon size={14} />
                          {s.scheduled_at ? formatDateTime(s.scheduled_at) : 'Not scheduled yet'}
                        </span>

                        {s.has_notes && <span style={{ color: 'var(--accent)' }}>📝 Notes saved</span>}
                        {s.files_count > 0 && <span style={{ color: 'var(--add)' }}>📎 {s.files_count} files</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* When session is completed or contract is finished */}
                      {isCompleted ? (
                        <>
                          <span
                            style={{
                              fontSize: '11.5px',
                              padding: '5px 11px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--add)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                            }}
                          >
                            <CheckCircleIcon size={14} /> Completed
                          </span>

                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => handleOpenNotes(s)}
                            title="View session notes and shared files"
                          >
                            <DocumentIcon size={13} /> Notes &amp; Files
                          </button>
                        </>
                      ) : contract.status === 'active' ? (
                        <>
                          {/* Schedule / Reschedule Button */}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: '12.5px', padding: '8px 12px' }}
                            onClick={() => {
                              setSelectedSession(s);
                              setScheduleDateTime(s.scheduled_at ? s.scheduled_at.slice(0, 16) : '');
                              setScheduleModalOpen(true);
                            }}
                          >
                            <CalendarIcon size={14} />
                            {s.scheduled_at ? 'Reschedule' : 'Schedule'}
                          </button>

                          {/* Join Live Session (Only active & non-completed sessions!) */}
                          <Link
                            to={s.room_url}
                            className="btn btn-primary"
                            style={{ fontSize: '12.5px', padding: '8px 14px' }}
                          >
                            Join Live Session
                          </Link>
                        </>
                      ) : (
                        <span className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                          Pending activation
                        </span>
                      )}
                    </div>
                  </div>
                );
              })

            ) : (
              <div className="empty" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--grid-strong)' }}>
                Sessions will be activated once the contract is funded.
              </div>
            )}

            {/* Action Bar based on Contract Status and Role */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '12px',
                padding: '20px 24px',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              {/* If Proposed -> Learner can Accept & Pay */}
              {contract.status === 'proposed' && isLearner && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>Ready to start your mentorship?</div>
                    <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                      Accept terms and deposit {formatCurrency(contract.total_price)} into escrow to activate all {contract.total_sessions} sessions.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-ghost" onClick={handleDeclineContract} disabled={actionLoading}>
                      Decline
                    </button>
                    <button className="btn btn-primary" onClick={() => setPayModalOpen(true)} disabled={actionLoading}>
                      Accept & Fund ({formatCurrency(contract.total_price)})
                    </button>
                  </div>
                </>
              )}

              {/* If Proposed -> Mentor waiting */}
              {contract.status === 'proposed' && isMentor && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>Contract proposal sent to {contract.learner_name}</div>
                    <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                      Waiting for the learner to accept and fund the contract in platform escrow.
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={handleDeclineContract} disabled={actionLoading}>
                    Withdraw Proposal
                  </button>
                </>
              )}

              {/* If Active -> Mentor can complete */}
              {contract.status === 'active' && isMentor && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>Conducted all {contract.total_sessions} sessions?</div>
                    <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                      Submit this contract for learner review to release escrow funds to your account.
                    </div>
                  </div>
                  <button className="btn btn-success" onClick={handleCompleteByMentor} disabled={actionLoading}>
                    Mark Completed & Request Payout
                  </button>
                </>
              )}

              {/* If Active -> Learner can raise dispute if needed */}
              {contract.status === 'active' && isLearner && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>Contract Active · 100% Escrow Protected</div>
                    <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                      Attend each milestone session with your mentor. If you encounter any issue, you may raise a dispute.
                    </div>
                  </div>
                  <button className="btn btn-danger" onClick={() => setDisputeModalOpen(true)} disabled={actionLoading}>
                    Raise Dispute
                  </button>
                </>
              )}

              {/* If Completed by Mentor -> Learner Reviews & Approves */}
              {contract.status === 'completed_by_mentor' && isLearner && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--add)' }}>
                      🎉 Mentor has completed all sessions!
                    </div>
                    <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                      Please review all sessions. Approving will release the escrow funds ({formatCurrency(contract.total_price)}) to {contract.mentor_name}.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-danger" onClick={() => setDisputeModalOpen(true)} disabled={actionLoading}>
                      Raise Dispute
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => {
                        setReviewError('');
                        setApproveModalOpen(true);
                      }}
                      disabled={actionLoading}
                    >
                      Approve & Release Payment
                    </button>
                  </div>
                </>
              )}

              {/* If Completed by Mentor -> Mentor waiting for review */}
              {contract.status === 'completed_by_mentor' && isMentor && (
                <div style={{ width: '100%', textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--accent)' }}>
                    Contract submitted for learner review!
                  </div>
                  <div className="sub" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                    {contract.learner_name} has been notified to review and approve the escrow payout.
                  </div>
                </div>
              )}

              {/* If Completed */}
              {contract.status === 'completed' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px 0' }}>
                  <div style={{ textAlign: 'center', color: 'var(--add)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <CheckCircleIcon size={20} />
                    <span style={{ fontWeight: 700 }}>
                      Contract Completed Successfully · Payment of {formatCurrency(contract.total_price)} Released!
                    </span>
                  </div>

                  {contract.review && (
                    <div
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--grid-strong)',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        marginTop: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)' }}>
                            Learner Rating & Feedback:
                          </span>
                          <div style={{ display: 'flex', gap: '2px', color: 'var(--gold)' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} style={{ fontSize: '16px', lineHeight: 1 }}>
                                {s <= contract.review.rating ? '★' : '☆'}
                              </span>
                            ))}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gold)' }}>
                            {contract.review.rating}/5
                          </span>
                        </div>
                        {contract.review.created_at && (
                          <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                            Submitted {formatDateTime(contract.review.created_at)}
                          </span>
                        )}
                      </div>
                      {contract.review.comment && (
                        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.55 }}>
                          "{contract.review.comment}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Escrow Checkout Modal */}
      <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Fund Mentorship Contract">
        <div style={{ padding: '6px 0' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--grid-strong)', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Contract:</span>
              <span style={{ fontWeight: 600 }}>{contract.title}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Total Sessions:</span>
              <span className="mono">{contract.total_sessions} sessions ({contract.session_duration_minutes} min each)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--grid-strong)', paddingTop: '10px', marginTop: '10px' }}>
              <span style={{ fontWeight: 700 }}>Total Escrow Amount:</span>
              <span className="mono" style={{ fontWeight: 800, fontSize: '17px', color: 'var(--add)' }}>
                {formatCurrency(contract.total_price)}
              </span>
            </div>
          </div>

          <div className="field">
            <label>Payment Method</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['upi', 'card', 'netbanking'].map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, textTransform: 'uppercase', fontSize: '12px' }}
                  onClick={() => setPaymentMethod(method)}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '18px 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
            <ShieldIcon size={16} color="var(--accent)" />
            <span>Funds held safely by PairUp until all sessions are conducted and approved.</span>
          </div>

          <button className="btn btn-primary btn-block" onClick={handlePayContract} disabled={actionLoading}>
            {actionLoading ? 'Processing Escrow...' : `Pay & Fund Contract (${formatCurrency(contract.total_price)})`}
          </button>
        </div>
      </Modal>

      {/* Approve & Review Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Rate Mentor & Release Payment"
      >
        <form onSubmit={handleApproveContract} style={{ padding: '6px 0' }}>
          {/* Informational Escrow Notice */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <ShieldIcon size={22} color="var(--add)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--ink)' }}>
              <strong>Before releasing payment:</strong> Please provide your honest rating and feedback for <strong>{contract.mentor_name}</strong>. Upon submission, platform escrow will disburse <strong>{formatCurrency(contract.total_price)}</strong> directly to the mentor.
            </div>
          </div>

          {reviewError && (
            <div className="error-box" style={{ marginBottom: '16px', fontSize: '13px' }}>
              {reviewError}
            </div>
          )}

          {/* Rating Section */}
          <div className="field" style={{ marginBottom: '18px' }}>
            <label style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
              Rate your experience with {contract.mentor_name} <span style={{ color: 'var(--red, #ef4444)' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '6px 0', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isHighlighted = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => {
                        setRating(star);
                        setReviewError('');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '30px',
                        lineHeight: 1,
                        padding: '2px',
                        transition: 'transform 0.1s ease, color 0.15s ease',
                        transform: isHighlighted ? 'scale(1.15)' : 'scale(1)',
                        color: isHighlighted ? 'var(--gold)' : 'var(--grid-strong)',
                      }}
                      title={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  );
                })}
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: (hoverRating || rating) > 0 ? 'var(--gold)' : 'var(--ink-muted)',
                }}
              >
                {
                  {
                    1: '1 - Unsatisfactory',
                    2: '2 - Fair / Needed Improvement',
                    3: '3 - Good / Met Expectations',
                    4: '4 - Very Good / Highly Satisfied',
                    5: '5 - Exceptional / Excellent Mentorship',
                  }[hoverRating || rating] || 'Select your rating'
                }
              </span>
            </div>
          </div>

          {/* Written Feedback Section */}
          <div className="field" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '13.5px', margin: 0 }}>
                Written Feedback & Review <span style={{ color: 'var(--red, #ef4444)' }}>*</span>
              </label>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                {reviewComment.trim().length} chars
              </span>
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => {
                setReviewComment(e.target.value);
                if (reviewError) setReviewError('');
              }}
              placeholder={`Share your experience with ${contract.mentor_name}: curriculum coverage, technical skills taught, communication quality, and advice for future learners...`}
              rows={4}
              required
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid var(--grid-strong)',
                padding: '10px 12px',
                fontSize: '13.5px',
                lineHeight: 1.5,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setApproveModalOpen(false)}
              disabled={actionLoading}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={actionLoading}
              style={{ flex: 2, justifyContent: 'center' }}
            >
              {actionLoading ? 'Releasing Funds...' : `Submit Review & Release ${formatCurrency(contract.total_price)}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dispute Modal */}
      <Modal isOpen={disputeModalOpen} onClose={() => setDisputeModalOpen(false)} title="Raise Contract Dispute">
        <form onSubmit={handleDisputeContract} style={{ padding: '6px 0' }}>
          <p style={{ fontSize: '13.5px', color: 'var(--warn)', marginBottom: '14px' }}>
            Raising a dispute will freeze the escrow payment. A platform arbitrator will review session logs, chat history, and notes to resolve the dispute.
          </p>

          <div className="field">
            <label>Detailed Reason for Dispute</label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Please explain specifically what issues occurred during the sessions..."
              required
              rows={4}
            />
          </div>

          <button type="submit" className="btn btn-danger btn-block" disabled={actionLoading}>
            {actionLoading ? 'Submitting...' : 'Submit Dispute'}
          </button>
        </form>
      </Modal>

      {/* Schedule Session Modal */}
      <Modal isOpen={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title={`Schedule ${selectedSession?.topic || 'Session'}`}>
        <form onSubmit={handleScheduleSession} style={{ padding: '6px 0' }}>
          <div className="field">
            <label>Select Date & Time</label>
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Confirm Schedule'}
          </button>
        </form>
      </Modal>

      {/* Session Notes & Files Modal */}
      <Modal
        isOpen={!!notesModalSession}
        onClose={() => setNotesModalSession(null)}
        title={`Session #${notesModalSession?.session_number}: ${notesModalSession?.topic || 'Milestone Session'}`}
      >
        {loadingNotes ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <div className="spinner-sm" style={{ margin: '0 auto 10px' }} />
            <p className="sub" style={{ fontSize: '13px' }}>Loading session notes &amp; files...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DocumentIcon size={15} /> Session Notes &amp; Recap
              </div>
              {sessionNotes ? (
                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--grid)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {sessionNotes}
                </div>
              ) : (
                <p className="sub" style={{ fontSize: '12.5px', fontStyle: 'italic', margin: 0 }}>
                  No collaborative notes were saved during this session.
                </p>
              )}
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DocumentIcon size={15} /> Shared Files ({sessionFiles.length})
              </div>
              {sessionFiles.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {sessionFiles.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--bg)',
                        border: '1px solid var(--grid)',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{f.filename || f.name}</span>
                      {f.file_url && (
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          Download ⤓
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="sub" style={{ fontSize: '12.5px', fontStyle: 'italic', margin: 0 }}>
                  No files were uploaded during this session.
                </p>
              )}
            </div>

            <div style={{ marginTop: '10px', textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setNotesModalSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Footer />

    </div>
  );
}
