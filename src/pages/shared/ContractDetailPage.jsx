import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Modal from '../../components/Modal';
import RescheduleModal from '../../components/RescheduleModal';
import LearnerProfileModal from '../../components/LearnerProfileModal';
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
  VideoIcon,
  FileEditIcon,
} from '../../components/Icons';
import { useConfirm, useToast } from '../../context';
import { useRealtimeSync, broadcastDataChange } from '../../utils';

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
  const [selectedLearner, setSelectedLearner] = useState(null);

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

  // Session Notes & Files Modal
  const [notesModalSession, setNotesModalSession] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionFiles, setSessionFiles] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Edit Contract Proposal Terms Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    technology: '',
    topics: [],
    total_sessions: 3,
    session_duration_minutes: 60,
    total_price: 0,
  });
  const [editError, setEditError] = useState('');


  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await api.getContract(id);
      setContract(data);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load contract');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useRealtimeSync({
    onSync: () => loadContract(true),
    entities: ['contracts'],
    intervalMs: 3500,
  });

  const isLearner = user?.id === contract?.learner_id;
  const isMentor = user?.id === contract?.mentor_id;
  const isCreator = user?.id === contract?.created_by_id;

  const effectiveSessions = (contract?.topics && contract.topics.length > 0)
    ? contract.topics.length
    : (contract?.total_sessions || 1);

  // Handle Accept Proposal
  const handleAcceptContract = async () => {
    const isCurrentUserMentor = user?.id === contract?.mentor_id;
    const titleText = isCurrentUserMentor ? 'Accept Learner Contract Proposal' : 'Accept Mentorship Contract Proposal';
    const msgText = `Are you sure you want to accept "${contract.title}" for ${formatCurrency(contract.total_price)} (${contract.total_sessions} sessions)?`;

    const confirmed = await confirm({
      title: titleText,
      message: msgText,
      confirmText: 'Accept Proposal',
      type: 'info',
    });
    if (!confirmed) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.acceptContract(id);
      toast.success(res.message || 'Contract proposal accepted successfully!');
      broadcastDataChange('contracts');
      await loadContract();
    } catch (err) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal with prefilled contract data
  const openEditModal = () => {
    if (!contract) return;
    const initialTopics = Array.isArray(contract.topics) && contract.topics.length > 0
      ? [...contract.topics]
      : Array.from({ length: contract.total_sessions || 3 }, (_, i) => `Milestone Session ${i + 1}`);

    setEditForm({
      title: contract.title || '',
      description: contract.description || '',
      technology: contract.technology || '',
      topics: initialTopics,
      total_sessions: initialTopics.length,
      session_duration_minutes: contract.session_duration_minutes || 60,
      total_price: contract.total_price || 0,
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const handleAddEditTopic = () => {
    setEditForm((prev) => {
      const nextTopics = [...prev.topics, `Milestone Session ${prev.topics.length + 1}`];
      return {
        ...prev,
        topics: nextTopics,
        total_sessions: nextTopics.length,
      };
    });
  };

  const handleRemoveEditTopic = (idx) => {
    setEditForm((prev) => {
      const nextTopics = prev.topics.filter((_, i) => i !== idx);
      return {
        ...prev,
        topics: nextTopics,
        total_sessions: Math.max(1, nextTopics.length),
      };
    });
  };

  const handleEditSessionsChange = (num) => {
    const n = Math.max(1, Math.min(50, parseInt(num, 10) || 1));
    setEditForm((prev) => {
      let nextTopics = [...prev.topics];
      if (n > nextTopics.length) {
        for (let i = nextTopics.length; i < n; i++) {
          nextTopics.push(`Milestone Session ${i + 1}`);
        }
      } else if (n < nextTopics.length) {
        nextTopics = nextTopics.slice(0, n);
      }
      return { ...prev, total_sessions: n, topics: nextTopics };
    });
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    setEditError('');

    if (!editForm.title.trim()) {
      setEditError('Contract title is required.');
      return;
    }
    const cleanTopics = editForm.topics.map((t) => t.trim()).filter(Boolean);
    const finalSessions = cleanTopics.length > 0
      ? cleanTopics.length
      : Math.max(1, parseInt(editForm.total_sessions, 10) || 1);

    const price = parseFloat(editForm.total_price);
    if (!price || price <= 0) {
      setEditError('Total price must be greater than 0.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        technology: editForm.technology.trim(),
        topics: cleanTopics,
        total_sessions: finalSessions,
        session_duration_minutes: parseInt(editForm.session_duration_minutes, 10) || 60,
        total_price: price,
      };

      const res = await api.updateContract(id, payload);
      setEditModalOpen(false);
      toast.success(res.message || 'Contract terms updated! Sent for review.');
      broadcastDataChange('contracts');
      await loadContract();
    } catch (err) {
      setEditError(err.message || 'Failed to update contract terms.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Pay Contract
  const handlePayContract = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.payContract(id, { payment_method: paymentMethod });
      setPayModalOpen(false);
      toast.success(res.message || 'Contract funded! Funds are held in escrow.');
      broadcastDataChange('contracts');
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
      broadcastDataChange('contracts');
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
      broadcastDataChange('contracts');
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
      broadcastDataChange('contracts');
      await loadContract();
    } catch (err) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Decline / Withdraw
  const handleDeclineContract = async () => {
    const isCurrentCreator = user?.id === contract?.created_by_id;
    const titleText = isCurrentCreator ? 'Withdraw Contract Proposal' : 'Decline Contract Proposal';
    const messageText = isCurrentCreator
      ? 'Are you sure you want to withdraw this contract proposal? This proposal will be closed.'
      : 'Are you sure you want to decline this contract proposal? This decision cannot be reversed.';
    const confirmBtnText = isCurrentCreator ? 'Withdraw Proposal' : 'Decline Contract';

    const confirmed = await confirm({
      title: titleText,
      message: messageText,
      confirmText: confirmBtnText,
      type: 'danger',
    });
    if (!confirmed) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.declineContract(id);
      toast.success(res.message || 'Contract proposal closed.');
      broadcastDataChange('contracts');
      await loadContract();
    } catch (err) {
      toast.error(err.message);
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
      <div className="portal-page-grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      <div className="portal-page-grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
    accepted: 'badge-accepted',
    active: 'badge-paid',
    completed_by_mentor: 'badge-accepted',
    completed: 'badge-completed',
    disputed: 'badge-disputed',
    declined: 'badge-cancelled',
  }[contract.status] || 'badge-pending';

  const statusLabel = {
    proposed: 'Proposal Pending',
    accepted: 'Proposal Accepted',
    active: 'Active · Escrow Held',
    completed_by_mentor: 'Completed by Mentor · Awaiting Review',
    completed: 'Completed · Payment Released',
    disputed: 'Disputed · Under Admin Review',
    declined: 'Declined',
  }[contract.status] || contract.status;

  const otherPersonName = isLearner ? contract.mentor_name : contract.learner_name;
  const otherPersonId = isLearner ? contract.mentor_id : contract.learner_id;

  // Check whether a milestone session is currently live (15m before start until 30m after end)
  const isSessionLive = (session) => {
    if (!session || !session.scheduled_at) return false;
    const date = new Date(session.scheduled_at);
    if (isNaN(date.getTime())) return false;
    const durationMs = (session.duration_minutes || 60) * 60 * 1000;
    const startMs = date.getTime();
    const endMs = startMs + durationMs;
    const now = Date.now();
    return now >= (startMs - 15 * 60 * 1000) && now <= (endMs + 30 * 60 * 1000);
  };

  const isSessionExpired = (session) => {
    if (!session || !session.scheduled_at) return false;
    const date = new Date(session.scheduled_at);
    if (isNaN(date.getTime())) return false;
    const durationMs = (session.duration_minutes || 60) * 60 * 1000;
    const endMs = date.getTime() + durationMs;
    const now = Date.now();
    return now > (endMs + 30 * 60 * 1000);
  };

  return (
    <div className="portal-page-grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
            <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>Contract #{contract.id}</span>
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
            <div style={{ flex: 1, minWidth: 'min(100%, 280px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.16)',
                    color: '#818cf8',
                    border: '1.5px solid rgba(99, 102, 241, 0.4)',
                    letterSpacing: '0.4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <DocumentIcon size={12} />
                  Contract #{contract.id}
                </span>
                <span className={`status-badge ${statusBadgeClass}`} style={{ fontSize: '11px', fontWeight: 700 }}>
                  {statusLabel}
                </span>
                <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  Created {formatDateTime(contract.created_at)}
                </span>
                {['proposed', 'accepted'].includes(contract.status) && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '11px', padding: '3px 8px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={openEditModal}
                    title="Edit contract proposal terms"
                  >
                    <FileEditIcon size={12} />
                    <span>Edit Terms</span>
                  </button>
                )}
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
                minWidth: 'min(100%, 240px)',
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
                ~{formatCurrency(Math.round(contract.total_price / effectiveSessions))} per session
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
            <div
              className="user-profile-trigger"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px', borderRadius: '8px' }}
              onClick={() => setSelectedLearner({
                id: contract.learner_id,
                name: contract.learner_name,
                email: contract.learner_email,
              })}
              title="Click to view learner profile"
            >
              <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '13px' }}>
                {initials(contract.learner_name)}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Learner</div>
                <div className="user-profile-name" style={{ fontWeight: 600, fontSize: '14px' }}>
                  {contract.learner_name}
                </div>
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

            {/* Chat & Contract ID Info */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                className="mono"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--ink-muted)',
                  background: 'var(--bg)',
                  border: '1px solid var(--grid)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  letterSpacing: '0.3px',
                }}
              >
                Contract Number: #{contract.id}
              </span>
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
        <div className="contract-detail-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(min(100%, 300px), 340px) 1fr', gap: '24px', alignItems: 'start' }}>
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
              Agreed syllabus covered across {effectiveSessions} mentorship sessions:
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
                Milestone Sessions ({contract.completed_sessions || 0} / {effectiveSessions} Completed)
              </h2>

              {/* Progress Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                <div style={{ flex: 1, height: '8px', background: 'var(--grid)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--add)',
                      width: `${Math.round(((contract.completed_sessions || 0) / effectiveSessions) * 100)}%`,
                      transition: 'width 0.3s ease',
                    }}
                  ></div>
                </div>
                <span className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  {Math.round(((contract.completed_sessions || 0) / effectiveSessions) * 100)}%
                </span>
              </div>
            </div>

            {/* Sessions Cards */}
            {contract.sessions && contract.sessions.length > 0 ? (
              contract.sessions.map((s) => {
                const isContractFinished = contract.status === 'completed';
                const isCompleted = s.status === 'completed' || isContractFinished;
                const isLive = !isCompleted && isSessionLive(s);
                const isExpired = !isCompleted && isSessionExpired(s);

                return (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--surface)',
                      border: isLive
                        ? '1px solid rgba(16, 185, 129, 0.45)'
                        : isExpired
                        ? '1px solid rgba(239, 68, 68, 0.35)'
                        : '1px solid var(--grid-strong)',
                      borderRadius: '12px',
                      padding: '20px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap',
                      boxShadow: isLive ? '0 0 16px rgba(16, 185, 129, 0.08)' : 'none',
                    }}
                  >
                    {/* Session Number Circle */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: isCompleted
                          ? 'var(--add-bg)'
                          : isLive
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'var(--accent-soft)',
                        color: isCompleted
                          ? 'var(--add)'
                          : isLive
                          ? '#10b981'
                          : 'var(--accent)',
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

                    <div style={{ flex: 1, minWidth: 'min(100%, 220px)' }}>
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

                        {isLive && (
                          <span
                            className="mono"
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            LIVE NOW
                          </span>
                        )}

                        {isExpired && (
                          <span
                            className="mono"
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#ef4444',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            EXPIRED
                          </span>
                        )}

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
                            className={!s.scheduled_at ? 'btn btn-primary' : 'btn btn-ghost'}
                            style={{ fontSize: '12.5px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => {
                              setSelectedSession(s);
                              setScheduleModalOpen(true);
                            }}
                            title={s.scheduled_at ? (isExpired ? 'Session time expired. Click to reschedule.' : 'Reschedule session time. Live room opens 15m before start.') : 'Pick a date and time for this milestone session'}
                          >
                            <CalendarIcon size={14} />
                            {s.scheduled_at ? (isExpired ? 'Reschedule (Expired)' : 'Reschedule') : 'Schedule'}
                          </button>

                          {/* Join Live Session (Only active when session is currently live / within 15 minutes of start time!) */}
                          {isLive && (
                            <Link
                              to={s.room_url}
                              className="btn btn-primary"
                              style={{
                                fontSize: '12.5px',
                                padding: '8px 14px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#10b981',
                                borderColor: '#10b981',
                                boxShadow: '0 0 12px rgba(16, 185, 129, 0.35)',
                              }}
                            >
                              <VideoIcon size={14} /> Join Live Session
                            </Link>
                          )}
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
              {/* Status: Proposed -> Recipient can Accept, Creator waits, Both can Edit */}
              {contract.status === 'proposed' && !isCreator && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                      Mentorship Proposal from {otherPersonName}
                    </div>
                    <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                      {otherPersonName} proposed a {effectiveSessions}-session contract for {formatCurrency(contract.total_price)} ({contract.session_duration_minutes} min/session). Review terms, accept the proposal, or edit terms.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={handleDeclineContract} disabled={actionLoading}>
                      Decline
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={openEditModal}
                      disabled={actionLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FileEditIcon size={14} /> Edit Terms
                    </button>
                    {isLearner ? (
                      <>
                        <button className="btn btn-secondary" onClick={handleAcceptContract} disabled={actionLoading}>
                          Accept Proposal
                        </button>
                        <button className="btn btn-primary" onClick={() => setPayModalOpen(true)} disabled={actionLoading}>
                          Accept & Fund ({formatCurrency(contract.total_price)})
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-primary" onClick={handleAcceptContract} disabled={actionLoading}>
                        Accept Proposal
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Status: Proposed -> Creator is waiting for counterparty */}
              {contract.status === 'proposed' && isCreator && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                      Proposal sent to {otherPersonName}
                    </div>
                    <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                      Waiting for {otherPersonName} to review and accept the contract proposal ({formatCurrency(contract.total_price)}). You can modify terms or withdraw at any time.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={handleDeclineContract} disabled={actionLoading}>
                      Withdraw Proposal
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={openEditModal}
                      disabled={actionLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FileEditIcon size={14} /> Edit Terms
                    </button>
                  </div>
                </>
              )}

              {/* Status: Accepted -> Accept button is HIDDEN. Learner deposits escrow, Mentor awaits payment. Both can Edit */}
              {contract.status === 'accepted' && isLearner && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--add)' }}>
                      ✓ Proposal Accepted! Ready to Activate Mentorship
                    </div>
                    <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                      {contract.mentor_name} has accepted the proposal! Deposit {formatCurrency(contract.total_price)} into platform escrow to activate all {effectiveSessions} milestone sessions.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={handleDeclineContract} disabled={actionLoading}>
                      Decline
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={openEditModal}
                      disabled={actionLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FileEditIcon size={14} /> Edit Terms
                    </button>
                    <button className="btn btn-primary" onClick={() => setPayModalOpen(true)} disabled={actionLoading}>
                      Deposit Escrow & Activate ({formatCurrency(contract.total_price)})
                    </button>
                  </div>
                </>
              )}

              {contract.status === 'accepted' && isMentor && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--accent)' }}>
                      ✓ Proposal Accepted · Awaiting Learner Escrow Payment
                    </div>
                    <div className="sub" style={{ margin: 0, fontSize: '13px' }}>
                      The proposal has been accepted! Waiting for {contract.learner_name} to deposit {formatCurrency(contract.total_price)} into escrow to activate the {effectiveSessions} sessions.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={handleDeclineContract} disabled={actionLoading}>
                      Cancel / Withdraw
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={openEditModal}
                      disabled={actionLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FileEditIcon size={14} /> Edit Terms
                    </button>
                  </div>
                </>
              )}

              {/* If Active -> Mentor can complete */}
              {contract.status === 'active' && isMentor && (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>Conducted all {effectiveSessions} sessions?</div>
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
              <span className="mono">{effectiveSessions} sessions ({contract.session_duration_minutes} min each)</span>
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

      {/* Schedule / Reschedule Session Modal */}
      <RescheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedSession(null);
        }}
        booking={selectedSession ? {
          ...selectedSession,
          contract_id: contract?.id || id,
          mentor_id: contract?.mentor_id,
          mentor_name: contract?.mentor_name,
          learner_id: contract?.learner_id,
          learner_name: contract?.learner_name,
          duration_minutes: selectedSession.duration_minutes || contract?.session_duration_minutes || 60,
        } : null}
        userRole={isLearner ? 'learner' : 'mentor'}
        contractId={contract?.id || id}
        onSuccess={async () => {
          setScheduleModalOpen(false);
          setSelectedSession(null);
          await loadContract();
        }}
      />

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

      {/* Edit Contract Proposal Terms Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Contract Proposal Terms"
      >
        <form onSubmit={handleSaveEdit} style={{ padding: '4px 0' }}>
          {editError && (
            <div className="error-box" style={{ marginBottom: '14px' }}>
              {editError}
            </div>
          )}

          <div className="field">
            <label>Contract Title</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="e.g. Master Full-Stack Development with React & Django"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Technology Stack</label>
              <input
                type="text"
                value={editForm.technology}
                onChange={(e) => setEditForm({ ...editForm, technology: e.target.value })}
                placeholder="e.g. React, Django, PostgreSQL"
              />
            </div>
            <div className="field">
              <label>Total Price (₹)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={editForm.total_price}
                onChange={(e) => setEditForm({ ...editForm, total_price: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Number of Sessions</label>
              <input
                type="number"
                min="1"
                max="50"
                value={editForm.total_sessions}
                onChange={(e) => handleEditSessionsChange(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Minutes / Session</label>
              <select
                value={editForm.session_duration_minutes}
                onChange={(e) => setEditForm({ ...editForm, session_duration_minutes: e.target.value })}
              >
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins (1 hr)</option>
                <option value={90}>90 mins (1.5 hrs)</option>
                <option value={120}>120 mins (2 hrs)</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Objectives &amp; Scope</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Outline what will be built, milestones, and learning outcomes..."
            />
          </div>

          <div className="field" style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Milestone Topics ({editForm.topics.length})</label>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleAddEditTopic}
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                + Add Topic
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {editForm.topics.map((topic, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)', width: '24px' }}>
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => handleEditTopicChange(idx, e.target.value)}
                    placeholder={`Milestone topic ${idx + 1}`}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '12.5px' }}
                  />
                  {editForm.topics.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleRemoveEditTopic(idx)}
                      style={{ padding: '4px 8px', color: 'var(--del)', fontSize: '14px' }}
                      title="Remove topic"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--accent-soft)',
              fontSize: '12px',
              marginTop: '14px',
              color: 'var(--ink)',
            }}
          >
            ✏️ <strong>Bilateral proposal terms:</strong> Saving revised terms will update the contract proposal and notify {otherPersonName} to review and accept.
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditModalOpen(false)}
              style={{ flex: 1 }}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : 'Save & Propose Revised Terms'}
            </button>
          </div>
        </form>
      </Modal>

      <LearnerProfileModal
        isOpen={Boolean(selectedLearner)}
        onClose={() => setSelectedLearner(null)}
        learner={selectedLearner}
      />

      <Footer />

    </div>
  );
}
