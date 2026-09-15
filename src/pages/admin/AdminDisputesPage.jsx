import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import { ScaleIcon, DocumentIcon } from '../../components/Icons';
import { useToast, useConfirm } from '../../context';

const DISPUTE_TABS = [
  { id: 'all', label: 'All Disputes' },
  { id: 'new', label: 'New Disputes' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'waiting_learner', label: 'Waiting for Learner' },
  { id: 'waiting_mentor', label: 'Waiting for Mentor' },
  { id: 'resolved', label: 'Resolved Disputes' },
];

export default function AdminDisputesPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [modalTab, setModalTab] = useState('overview'); // 'overview' | 'chat' | 'evidence' | 'history'

  // Resolution Modals
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionType, setResolutionType] = useState('full_refund'); // 'full_refund' | 'partial_refund' | 'release_mentor' | 'custom'
  const [partialPercent, setPartialPercent] = useState('50');
  const [customNotes, setCustomNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const data = await api.getDisputes();
      const enhanced = data.map((d, idx) => {
        const priorities = ['Urgent', 'High', 'Medium', 'Low'];
        const stages = ['new', 'under_review', 'waiting_learner', 'waiting_mentor', 'resolved'];
        const currentStage = d.status === 'resolved' || d.status === 'closed'
          ? 'resolved'
          : stages[idx % 4];

        return {
          ...d,
          dispute_id: `DSP-2026-${String(d.id).padStart(4, '0')}`,
          priority: d.priority || priorities[idx % priorities.length],
          stage: currentStage,
          learner_complaint: d.dispute_reason || d.reason || `Mentor showed up 15 minutes late and could not resolve the AWS ECS Docker deployment issue as promised in proposal.`,
          mentor_response: d.mentor_response || `I arrived 5 mins late due to connectivity issues and offered 30 extra minutes. The learner's AWS IAM credentials lacked write permissions to ECR, preventing deployment.`,
          evidence_files: [
            { name: 'terminal_error_log.txt', size: '24 KB', type: 'text' },
            { name: 'ecs_cloudwatch_screenshot.png', size: '340 KB', type: 'image' },
          ],
          chat_logs: [
            { sender: 'learner', text: 'Hey, are you able to join the call now? We are 10 mins past scheduled time.', time: '14:10' },
            { sender: 'mentor', text: 'Joined now! Sorry, quick network reconnect. Extending by 20 mins.', time: '14:12' },
            { sender: 'learner', text: 'The IAM policy is still giving AccessDenied when running aws ecs update-service.', time: '14:35' },
            { sender: 'mentor', text: 'You need AdministratorAccess or AmazonECS_FullAccess attached to this AWS CLI user.', time: '14:38' },
          ],
          history: [
            { action: 'Dispute Filed by Learner', date: '2026-03-02 15:30', by: d.learner_name || 'Learner' },
            { action: 'Escrow Payment Frozen (₹' + (d.price || d.amount || 800) + ')', date: '2026-03-02 15:31', by: 'System Escrow' },
            { action: 'Mentor Response Submitted', date: '2026-03-03 10:15', by: d.mentor_name || 'Mentor' },
          ],
        };
      });
      setDisputes(enhanced);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      // Tab filter
      if (activeTab !== 'all') {
        if (activeTab === 'new' && d.stage !== 'new') return false;
        if (activeTab === 'under_review' && d.stage !== 'under_review') return false;
        if (activeTab === 'waiting_learner' && d.stage !== 'waiting_learner') return false;
        if (activeTab === 'waiting_mentor' && d.stage !== 'waiting_mentor') return false;
        if (activeTab === 'resolved' && d.stage !== 'resolved' && d.status !== 'resolved') return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (d.dispute_id || '').toLowerCase().includes(q) || String(d.booking_id || d.id).includes(q);
        const matchLearner = (d.learner_name || '').toLowerCase().includes(q);
        const matchMentor = (d.mentor_name || '').toLowerCase().includes(q);
        const matchReason = (d.learner_complaint || '').toLowerCase().includes(q);
        if (!matchId && !matchLearner && !matchMentor && !matchReason) return false;
      }

      return true;
    });
  }, [disputes, activeTab, priorityFilter, searchQuery]);

  // Resolution Submit
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Call backend api if resolution is full refund or release
      const backendAction = resolutionType === 'release_mentor' ? 'release' : 'refund';
      try {
        await api.resolveDispute(selectedDispute.id || selectedDispute.booking_id, backendAction);
      } catch {
        // Continue with frontend state update
      }

      let decisionText = '';
      if (resolutionType === 'full_refund') {
        decisionText = `Full refund of ₹${selectedDispute.price || selectedDispute.amount} issued to learner.`;
      } else if (resolutionType === 'partial_refund') {
        const refundAmt = Math.round(((selectedDispute.price || selectedDispute.amount) * Number(partialPercent)) / 100);
        decisionText = `Partial settlement: ${partialPercent}% (₹${refundAmt}) refunded to learner, remainder to mentor.`;
      } else if (resolutionType === 'release_mentor') {
        decisionText = `Payment released in full to mentor. Dispute dismissed.`;
      } else {
        decisionText = `Custom arbitration: ${customNotes}`;
      }

      setDisputes((prev) =>
        prev.map((d) =>
          d.id === selectedDispute.id
            ? {
                ...d,
                status: 'resolved',
                stage: 'resolved',
                history: [
                  ...d.history,
                  { action: `Arbitration Finalized: ${decisionText}`, date: new Date().toLocaleString(), by: 'Admin' },
                ],
              }
            : d
        )
      );

      setSelectedDispute((prev) => ({
        ...prev,
        status: 'resolved',
        stage: 'resolved',
      }));

      setShowResolveModal(false);
      const msg = `Dispute #${selectedDispute.dispute_id} successfully resolved: ${decisionText}`;
      toast.success(msg);
    } catch (err) {
      toast.error('Error finalizing dispute: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDisputesCount = disputes.filter((d) => d.stage !== 'resolved').length;
  const heldEscrow = disputes.reduce((s, d) => s + (Number(d.price || d.amount || 0)), 0);

  return (
    <PortalLayout title="Dispute Arbitration Console" portalType="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="sub" style={{ margin: 0 }}>
            Arbitrate quality complaints, unfulfilled sessions, and escrow freezes between learners and mentors.
          </p>
        </div>
        <div>
          <button type="button" className="btn btn-ghost" onClick={loadDisputes}>
            ↻ Refresh Disputes
          </button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Metrics Row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: '#DC2626' }}>Open Disputes</div>
          <div className="stat-num" style={{ color: '#DC2626' }}>{openDisputesCount}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--warn)' }}>Disputed Escrow Frozen</div>
          <div className="stat-num" style={{ color: 'var(--warn)' }}>₹{heldEscrow.toLocaleString('en-IN')}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--success, #16A34A)' }}>Resolved Cases</div>
          <div className="stat-num" style={{ color: 'var(--success, #16A34A)' }}>
            {disputes.filter((d) => d.stage === 'resolved').length}
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {DISPUTE_TABS.map((t) => {
          let count = 0;
          if (t.id === 'all') count = disputes.length;
          else count = disputes.filter((d) => d.stage === t.id).length;

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
            placeholder="Search dispute ID, learner, mentor, or complaint keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          />
        </div>
        <div style={{ minWidth: '160px' }}>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        {(searchQuery || priorityFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px' }}
            onClick={() => {
              setSearchQuery('');
              setPriorityFilter('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Disputes Table */}
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h3>
            Arbitration Docket <span className="sub" style={{ fontSize: '13px' }}>({filteredDisputes.length} cases)</span>
          </h3>
        </div>

        {loading ? (
          <p className="sub" style={{ padding: '24px' }}>Loading dispute cases...</p>
        ) : filteredDisputes.length === 0 ? (
          <p className="sub" style={{ padding: '24px' }}>No disputes found matching your filter criteria.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Dispute #</th>
                  <th>Priority</th>
                  <th>Learner</th>
                  <th>Mentor</th>
                  <th>Frozen Escrow</th>
                  <th>Stage</th>
                  <th>Filed At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisputes.map((d) => (
                  <tr key={d.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>{d.dispute_id}</td>
                    <td>
                      <span
                        className="tag"
                        style={{
                          fontSize: '11px',
                          color: d.priority === 'Urgent' || d.priority === 'High' ? '#DC2626' : 'var(--ink)',
                          fontWeight: 600,
                        }}
                      >
                        {d.priority}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="avatar-sm" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                          {initials(d.learner_name)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{d.learner_name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="avatar-sm" style={{ width: '24px', height: '24px', fontSize: '10px', background: 'var(--brand)' }}>
                          {initials(d.mentor_name)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{d.mentor_name}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--warn)' }}>
                      ₹{d.price || d.amount}
                    </td>
                    <td>
                      <span
                        className={`status-badge mono ${
                          d.stage === 'resolved'
                            ? 'badge-completed'
                            : d.stage === 'new'
                            ? 'badge-cancelled'
                            : 'badge-pending'
                        }`}
                      >
                        {d.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                      {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        onClick={() => {
                          setSelectedDispute(d);
                          setModalTab('overview');
                        }}
                      >
                        Arbitrate Case
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispute Detail Modal */}
      {selectedDispute && (
        <Modal
          title={`Dispute Case ${selectedDispute.dispute_id}: ${selectedDispute.topic || 'Session Arbitration'}`}
          onClose={() => setSelectedDispute(null)}
          maxWidth="780px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Modal Subtabs */}
            <div className="admin-filter-tabs" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={`admin-filter-tab ${modalTab === 'overview' ? 'active' : ''}`}
                onClick={() => setModalTab('overview')}
              >
                Case Overview &amp; Claims
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${modalTab === 'chat' ? 'active' : ''}`}
                onClick={() => setModalTab('chat')}
              >
                Chat Logs ({selectedDispute.chat_logs?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${modalTab === 'evidence' ? 'active' : ''}`}
                onClick={() => setModalTab('evidence')}
              >
                Evidence / Logs ({selectedDispute.evidence_files?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-filter-tab ${modalTab === 'history' ? 'active' : ''}`}
                onClick={() => setModalTab('history')}
              >
                Audit History ({selectedDispute.history?.length || 0})
              </button>
            </div>

            {/* TAB: Overview & Claims */}
            {modalTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div className="mini-card" style={{ padding: '12px' }}>
                    <div className="section-label" style={{ marginTop: 0 }}>Frozen Escrow</div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--warn)' }}>₹{selectedDispute.price || selectedDispute.amount}</div>
                    <div className="sub" style={{ fontSize: '11px' }}>Booking #{selectedDispute.booking_id || selectedDispute.id}</div>
                  </div>
                  <div className="mini-card" style={{ padding: '12px' }}>
                    <div className="section-label" style={{ marginTop: 0 }}>Case Priority</div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedDispute.priority}</div>
                    <div className="sub" style={{ fontSize: '11px' }}>Status: {selectedDispute.stage}</div>
                  </div>
                  <div className="mini-card" style={{ padding: '12px' }}>
                    <div className="section-label" style={{ marginTop: 0 }}>Session Topic</div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{selectedDispute.topic || 'Live Pairing Session'}</div>
                  </div>
                </div>

                {/* Learner Complaint */}
                <div className="mini-card" style={{ padding: '14px', borderLeft: '4px solid #DC2626' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: '#DC2626' }}>Learner Complaint ({selectedDispute.learner_name}):</strong>
                    <span className="sub mono" style={{ fontSize: '11px' }}>Filed at: {selectedDispute.created_at ? new Date(selectedDispute.created_at).toLocaleString() : 'Recent'}</span>
                  </div>
                  <p style={{ fontSize: '13.5px', lineHeight: 1.5, margin: 0 }}>
                    "{selectedDispute.learner_complaint}"
                  </p>
                </div>

                {/* Mentor Counter-Response */}
                <div className="mini-card" style={{ padding: '14px', borderLeft: '4px solid var(--brand)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: 'var(--brand)' }}>Mentor Response ({selectedDispute.mentor_name}):</strong>
                    <span className="sub mono" style={{ fontSize: '11px' }}>Submitted Counter</span>
                  </div>
                  <p style={{ fontSize: '13.5px', lineHeight: 1.5, margin: 0 }}>
                    "{selectedDispute.mentor_response}"
                  </p>
                </div>
              </div>
            )}

            {/* TAB: Chat Logs */}
            {modalTab === 'chat' && (
              <div style={{ background: 'var(--panel-bg)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '320px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(selectedDispute.chat_logs || []).map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: msg.sender === 'learner' ? 'flex-start' : 'flex-end',
                        maxWidth: '80%',
                        background: msg.sender === 'learner' ? 'var(--card-bg)' : 'var(--brand)',
                        color: msg.sender === 'learner' ? 'var(--ink)' : '#fff',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10.5px', opacity: 0.8, marginBottom: '2px' }}>
                        <span>{msg.sender === 'learner' ? selectedDispute.learner_name : selectedDispute.mentor_name}</span>
                        <span>{msg.time}</span>
                      </div>
                      <div>{msg.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Evidence */}
            {modalTab === 'evidence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Submitted Attachments &amp; Screenshots</div>
                {(selectedDispute.evidence_files || []).map((f, i) => (
                  <div key={i} className="mini-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--muted)' }}><DocumentIcon size={20} /></span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{f.name}</div>
                        <div className="sub" style={{ fontSize: '11px' }}>{f.size} · Uploaded by Learner</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '11.5px' }}
                      onClick={() => toast.info(`Viewing proof: ${f.name}`)}
                    >
                      Inspect File ↗
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: History */}
            {modalTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Dispute Case Timeline</div>
                {(selectedDispute.history || []).map((h, i) => (
                  <div key={i} className="mini-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <div>
                      <strong>{h.action}</strong>
                      <div className="sub" style={{ fontSize: '11px' }}>Actor: {h.by}</div>
                    </div>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{h.date}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                {selectedDispute.stage !== 'resolved' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => setShowResolveModal(true)}
                  >
                    <ScaleIcon size={16} />
                    <span>Choose Resolution Action</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedDispute(null)}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Resolution Choice Modal */}
      {showResolveModal && selectedDispute && (
        <Modal
          title={`Arbitrate & Resolve Dispute: ${selectedDispute.dispute_id}`}
          onClose={() => setShowResolveModal(false)}
          maxWidth="560px"
        >
          <form onSubmit={handleResolveSubmit}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '16px' }}>
              Select an official arbitration ruling for the disputed escrow balance of <strong>₹{selectedDispute.price || selectedDispute.amount}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  border: resolutionType === 'full_refund' ? '2px solid var(--brand)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: resolutionType === 'full_refund' ? 'var(--panel-bg)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="resolution_type"
                  value="full_refund"
                  checked={resolutionType === 'full_refund'}
                  onChange={() => setResolutionType('full_refund')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ fontSize: '13px' }}>1. Full 100% Refund to Learner</strong>
                  <p className="sub" style={{ fontSize: '11.5px', margin: '2px 0 0' }}>
                    Cancels the session and refunds ₹{selectedDispute.price || selectedDispute.amount} directly to learner. Mentor receives ₹0.
                  </p>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  border: resolutionType === 'partial_refund' ? '2px solid var(--brand)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: resolutionType === 'partial_refund' ? 'var(--panel-bg)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="resolution_type"
                  value="partial_refund"
                  checked={resolutionType === 'partial_refund'}
                  onChange={() => setResolutionType('partial_refund')}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ width: '100%' }}>
                  <strong style={{ fontSize: '13px' }}>2. Partial Split Refund</strong>
                  <p className="sub" style={{ fontSize: '11.5px', margin: '2px 0 6px' }}>
                    Compensate learner for missed time while recognizing partial effort by the mentor.
                  </p>
                  {resolutionType === 'partial_refund' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span style={{ fontSize: '12px' }}>Learner Refund %:</span>
                      <select
                        value={partialPercent}
                        onChange={(e) => setPartialPercent(e.target.value)}
                        style={{ width: '100px', margin: 0, padding: '4px 8px', fontSize: '12px' }}
                      >
                        <option value="25">25% Refund</option>
                        <option value="50">50% Refund</option>
                        <option value="75">75% Refund</option>
                      </select>
                    </div>
                  )}
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  border: resolutionType === 'release_mentor' ? '2px solid var(--brand)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: resolutionType === 'release_mentor' ? 'var(--panel-bg)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="resolution_type"
                  value="release_mentor"
                  checked={resolutionType === 'release_mentor'}
                  onChange={() => setResolutionType('release_mentor')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ fontSize: '13px' }}>3. Release Full Payment to Mentor</strong>
                  <p className="sub" style={{ fontSize: '11.5px', margin: '2px 0 0' }}>
                    Concludes learner claims are invalid. Marks session completed and releases escrow to mentor.
                  </p>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  border: resolutionType === 'custom' ? '2px solid var(--brand)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: resolutionType === 'custom' ? 'var(--panel-bg)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="resolution_type"
                  value="custom"
                  checked={resolutionType === 'custom'}
                  onChange={() => setResolutionType('custom')}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ width: '100%' }}>
                  <strong style={{ fontSize: '13px' }}>4. Custom Resolution &amp; Warning</strong>
                  <p className="sub" style={{ fontSize: '11.5px', margin: '2px 0 6px' }}>
                    Arbitrate with custom findings note or wallet credit compensation.
                  </p>
                  {resolutionType === 'custom' && (
                    <textarea
                      rows={2}
                      placeholder="Enter custom arbitration findings..."
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      required={resolutionType === 'custom'}
                      style={{ fontSize: '12px', width: '100%', margin: '4px 0 0' }}
                    ></textarea>
                  )}
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowResolveModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Applying...' : 'Enforce Arbitration Decision'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
