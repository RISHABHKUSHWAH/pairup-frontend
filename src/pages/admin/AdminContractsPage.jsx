import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials, formatCurrency, formatDateTime } from '../../api/client';
import {
  DocumentIcon,
  ShieldIcon,
  ScaleIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  SearchIcon,
  RefreshIcon,
  UserIcon,
} from '../../components/Icons';
import { useToast } from '../../context';

export default function AdminContractsPage() {
  const { toast } = useToast();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dispute resolution modal state
  const [disputeModalContract, setDisputeModalContract] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('release_to_mentor');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Quick detail modal state
  const [previewContract, setPreviewContract] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getContracts();
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = async (contractId) => {
    setPreviewLoading(true);
    try {
      const details = await api.getContract(contractId);
      setPreviewContract(details);
    } catch (err) {
      toast.error('Failed to load contract details: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!disputeModalContract) return;

    setSubmittingAction(true);
    setError('');
    try {
      const res = await api.adminResolveContract(
        disputeModalContract.id,
        resolutionAction,
        adminNotes
      );
      toast.success(res.message || 'Dispute resolved successfully.');
      setDisputeModalContract(null);
      setAdminNotes('');
      await loadContracts();
    } catch (err) {
      toast.error(err.message || 'Failed to resolve dispute');
      setError(err.message || 'Failed to resolve dispute');
    } finally {
      setSubmittingAction(false);
    }
  };

  // KPIs
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter((c) => c.status === 'active').length;
  const completedContracts = contracts.filter((c) => c.status === 'completed').length;
  const disputedContracts = contracts.filter((c) => c.status === 'disputed').length;
  const totalEscrowHeld = contracts
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (c.total_price || 0), 0);

  // Filtering
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (c.title || '').toLowerCase().includes(q);
        const matchTech = (c.technology || '').toLowerCase().includes(q);
        const matchMentor = (c.mentor_name || '').toLowerCase().includes(q);
        const matchLearner = (c.learner_name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchTech && !matchMentor && !matchLearner) return false;
      }

      return true;
    });
  }, [contracts, statusFilter, searchQuery]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="status-badge badge-paid">Active · Escrow Held</span>;
      case 'proposed':
        return <span className="status-badge badge-pending">Proposed</span>;
      case 'completed_by_mentor':
        return <span className="status-badge badge-accepted">Awaiting Review</span>;
      case 'completed':
        return <span className="status-badge badge-completed">Completed · Funds Released</span>;
      case 'disputed':
        return <span className="status-badge badge-disputed">Disputed</span>;
      case 'declined':
        return <span className="status-badge badge-cancelled">Declined</span>;
      default:
        return <span className="status-badge badge-cancelled">{status}</span>;
    }
  };

  return (
    <PortalLayout title="Mentorship Contracts" portalType="admin">
      <div style={{ paddingBottom: '40px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', margin: 0 }}>Mentorship Contracts Management</h1>
            <p className="sub" style={{ margin: '4px 0 0' }}>
              Monitor multi-session curricula, oversee platform escrow balances, and resolve contract disputes.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadContracts}
            style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshIcon size={14} /> Refresh List
          </button>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

        {/* KPI Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-num">{totalContracts}</div>
            <div className="stat-label">Total Contracts</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'var(--accent)' }}>
            <div className="stat-num" style={{ color: 'var(--accent)' }}>{activeContracts}</div>
            <div className="stat-label">Active (In Progress)</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'var(--gold)' }}>
            <div className="stat-num" style={{ color: 'var(--gold)' }}>{formatCurrency(totalEscrowHeld)}</div>
            <div className="stat-label">Locked in Escrow</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'var(--add)' }}>
            <div className="stat-num" style={{ color: 'var(--add)' }}>{completedContracts}</div>
            <div className="stat-label">Completed &amp; Released</div>
          </div>
          <div className="stat-card" style={{ borderColor: disputedContracts > 0 ? 'var(--del)' : 'var(--grid)' }}>
            <div className="stat-num" style={{ color: disputedContracts > 0 ? 'var(--del)' : 'inherit' }}>
              {disputedContracts}
            </div>
            <div className="stat-label">Under Dispute</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[
              { id: 'all', label: `All (${totalContracts})` },
              { id: 'active', label: `Active (${activeContracts})` },
              { id: 'proposed', label: 'Proposed' },
              { id: 'completed_by_mentor', label: 'Awaiting Review' },
              { id: 'completed', label: `Completed (${completedContracts})` },
              { id: 'disputed', label: `Disputed (${disputedContracts})` },
              { id: 'declined', label: 'Declined' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`chip ${statusFilter === tab.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab.id)}
                style={{ fontSize: '12px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }}>
              <SearchIcon size={14} />
            </span>
            <input
              type="text"
              placeholder="Search contracts, mentors, learners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: '8px',
                border: '1px solid var(--grid)',
                fontSize: '13px',
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
            />
          </div>
        </div>

        {/* Contracts Table */}
        {loading ? (
          <div className="empty" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--grid-strong)' }}>
            <div className="spinner-sm" style={{ margin: '0 auto 12px' }} />
            <p className="sub">Loading contracts...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="empty" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--grid-strong)', padding: '40px' }}>
            <DocumentIcon size={36} color="var(--ink-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: '16px' }}>No contracts found</div>
            <p className="sub" style={{ fontSize: '13px', margin: '6px 0 0' }}>
              {statusFilter !== 'all' ? `No contracts with status "${statusFilter}".` : 'No mentorship contracts have been created yet.'}
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--grid-strong)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>ID / Title</th>
                    <th style={{ padding: '12px 16px' }}>Learner</th>
                    <th style={{ padding: '12px 16px' }}>Mentor</th>
                    <th style={{ padding: '12px 16px' }}>Milestone Progress</th>
                    <th style={{ padding: '12px 16px' }}>Total Amount</th>
                    <th style={{ padding: '12px 16px' }}>Escrow Status</th>
                    <th style={{ padding: '12px 16px' }}>Contract Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((c) => {
                    const progressPct = Math.round(((c.completed_sessions || 0) / c.total_sessions) * 100);

                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--grid)',
                          transition: 'background 0.2s',
                        }}
                      >
                        {/* ID & Title */}
                        <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                              #{c.id}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                              {c.title}
                            </span>
                          </div>
                          {c.technology && (
                            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {c.technology.split(',').slice(0, 2).map((tech, i) => (
                                <span key={i} className="tag" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                                  {tech.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mono" style={{ fontSize: '10.5px', color: 'var(--ink-faint)', marginTop: '4px' }}>
                            {formatDateTime(c.created_at)}
                          </div>
                        </td>

                        {/* Learner */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="avatar" style={{ width: '26px', height: '26px', fontSize: '11px' }}>
                              {initials(c.learner_name)}
                            </div>
                            <span style={{ fontWeight: 600 }}>{c.learner_name}</span>
                          </div>
                        </td>

                        {/* Mentor */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="avatar" style={{ width: '26px', height: '26px', fontSize: '11px' }}>
                              {initials(c.mentor_name)}
                            </div>
                            <span style={{ fontWeight: 600 }}>{c.mentor_name}</span>
                          </div>
                        </td>

                        {/* Progress */}
                        <td style={{ padding: '14px 16px', minWidth: '150px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                            <span>{c.completed_sessions || 0} of {c.total_sessions} sessions</span>
                            <span className="mono">{progressPct}%</span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--grid)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                background: c.status === 'completed' ? 'var(--add)' : 'var(--accent)',
                                width: `${progressPct}%`,
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', marginTop: '3px' }}>
                            {c.session_duration_minutes}m / session
                          </div>
                        </td>

                        {/* Total Price */}
                        <td style={{ padding: '14px 16px' }}>
                          <div className="rate-num" style={{ fontSize: '15px' }}>
                            {formatCurrency(c.total_price)}
                          </div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                            ~{formatCurrency(Math.round(c.total_price / c.total_sessions))}/sess
                          </div>
                        </td>

                        {/* Escrow Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              background:
                                c.escrow_status === 'released'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : c.escrow_status === 'held'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : c.escrow_status === 'refunded'
                                  ? 'rgba(168, 85, 247, 0.15)'
                                  : 'var(--bg)',
                              color:
                                c.escrow_status === 'released'
                                  ? '#10b981'
                                  : c.escrow_status === 'held'
                                  ? '#f59e0b'
                                  : c.escrow_status === 'refunded'
                                  ? '#a855f7'
                                  : 'var(--ink-muted)',
                            }}
                          >
                            {c.escrow_status || 'Unfunded'}
                          </span>
                        </td>

                        {/* Contract Status */}
                        <td style={{ padding: '14px 16px' }}>
                          {getStatusBadge(c.status)}
                          {c.status === 'disputed' && c.dispute_reason && (
                            <div style={{ fontSize: '11px', color: 'var(--del)', marginTop: '4px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              ⚠ {c.dispute_reason}
                            </div>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            {/* Dispute Resolution Button */}
                            {c.status === 'disputed' && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: '11.5px', padding: '5px 10px', background: 'var(--del)' }}
                                onClick={() => {
                                  setDisputeModalContract(c);
                                  setResolutionAction('release_to_mentor');
                                  setAdminNotes('');
                                }}
                              >
                                Resolve Dispute ⚖️
                              </button>
                            )}

                            {/* Inspect Detail */}
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ fontSize: '11.5px', padding: '5px 10px' }}
                              onClick={() => handleOpenPreview(c.id)}
                            >
                              Quick Inspect 👁️
                            </button>

                            {/* Full Hub Link */}
                            <Link
                              to={`/contracts/${c.id}`}
                              className="btn btn-secondary"
                              style={{ fontSize: '11.5px', padding: '5px 10px' }}
                              target="_blank"
                              title="Open Contract Hub"
                            >
                              Hub ↗
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Admin Dispute Resolution Modal */}
      <Modal
        isOpen={!!disputeModalContract}
        onClose={() => setDisputeModalContract(null)}
        title={`Resolve Contract Dispute #${disputeModalContract?.id}`}
      >
        {disputeModalContract && (
          <form onSubmit={handleResolveDispute}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--del)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--del)', marginBottom: '4px' }}>
                Dispute Reason:
              </div>
              <p style={{ margin: 0, color: 'var(--ink)' }}>
                "{disputeModalContract.dispute_reason || 'No specific reason provided'}"
              </p>
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ink-muted)' }}>
                Contract Amount in Escrow: <strong>{formatCurrency(disputeModalContract.total_price)}</strong>
              </div>
            </div>

            <div className="field">
              <label>Select Resolution Action</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--grid)',
                    background: resolutionAction === 'release_to_mentor' ? 'var(--accent-soft)' : 'var(--bg)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value="release_to_mentor"
                    checked={resolutionAction === 'release_to_mentor'}
                    onChange={(e) => setResolutionAction(e.target.value)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Release Escrow to Mentor ({disputeModalContract.mentor_name})</div>
                    <div className="sub" style={{ fontSize: '11.5px' }}>
                      Marks contract completed and transfers {formatCurrency(disputeModalContract.total_price)} payout to mentor.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--grid)',
                    background: resolutionAction === 'refund_to_learner' ? 'var(--accent-soft)' : 'var(--bg)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value="refund_to_learner"
                    checked={resolutionAction === 'refund_to_learner'}
                    onChange={(e) => setResolutionAction(e.target.value)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Refund Escrow to Learner ({disputeModalContract.learner_name})</div>
                    <div className="sub" style={{ fontSize: '11.5px' }}>
                      Cancels contract and refunds {formatCurrency(disputeModalContract.total_price)} back to learner.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="field">
              <label>Admin Audit Log Notes</label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Explain the findings from session notes, chat logs, and justification for this ruling..."
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDisputeModalContract(null)}
                style={{ flex: 1 }}
                disabled={submittingAction}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, background: resolutionAction === 'refund_to_learner' ? 'var(--del)' : 'var(--add)' }}
                disabled={submittingAction}
              >
                {submittingAction ? 'Executing...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Contract Quick Preview Drawer/Modal */}
      <Modal
        isOpen={!!previewContract}
        onClose={() => setPreviewContract(null)}
        title={previewContract ? `Contract #${previewContract.id}: ${previewContract.title}` : 'Contract Details'}
      >
        {previewLoading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <div className="spinner-sm" style={{ margin: '0 auto 10px' }} />
            <p className="sub">Loading contract details...</p>
          </div>
        ) : previewContract ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Meta summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '12px',
                background: 'var(--bg)',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: 'var(--ink-muted)' }}>Learner:</span>{' '}
                <strong>{previewContract.learner_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-muted)' }}>Mentor:</span>{' '}
                <strong>{previewContract.mentor_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-muted)' }}>Total Amount:</span>{' '}
                <strong style={{ color: 'var(--ink)' }}>{formatCurrency(previewContract.total_price)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-muted)' }}>Escrow Status:</span>{' '}
                <strong style={{ textTransform: 'uppercase' }}>{previewContract.escrow_status || 'Unfunded'}</strong>
              </div>
            </div>

            {/* Curriculum Topics */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                Curriculum Syllabus ({previewContract.topics?.length || 0} topics)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {previewContract.topics && previewContract.topics.length > 0 ? (
                  previewContract.topics.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg)',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span className="mono" style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>
                        #{idx + 1}
                      </span>
                      <span>{t}</span>
                    </div>
                  ))
                ) : (
                  <p className="sub" style={{ fontSize: '12px', fontStyle: 'italic' }}>No topics recorded.</p>
                )}
              </div>
            </div>

            {/* Milestone Sessions */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                Milestone Sessions ({previewContract.sessions?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {previewContract.sessions && previewContract.sessions.length > 0 ? (
                  previewContract.sessions.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>#{s.session_number}: {s.topic}</strong>
                        <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>
                          {s.scheduled_at ? formatDateTime(s.scheduled_at) : 'Not scheduled'} · {s.duration_minutes}m
                        </div>
                      </div>
                      <span
                        className={`status-pill ${s.status}`}
                        style={{ fontSize: '10.5px', textTransform: 'capitalize' }}
                      >
                        {s.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="sub" style={{ fontSize: '12px', fontStyle: 'italic' }}>Sessions not yet activated.</p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Link
                to={`/contracts/${previewContract.id}`}
                className="btn btn-primary"
                target="_blank"
                style={{ fontSize: '12px' }}
              >
                Open Full Contract Hub ↗
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPreviewContract(null)}
                style={{ fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PortalLayout>
  );
}
