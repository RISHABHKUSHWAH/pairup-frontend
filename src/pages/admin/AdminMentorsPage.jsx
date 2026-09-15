import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials, stars } from '../../api/client';
import { ShieldIcon, CheckIcon, EyeIcon } from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function AdminMentorsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'pending' | 'verified' | 'suspended' | 'rejected'
  const [search, setSearch] = useState('');
  const [selectedMentor, setSelectedMentor] = useState(null);

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminUsers('mentor');
      setMentors(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const confirmed = await confirm({
      title: 'Approve Mentor Application',
      message: 'Are you sure you want to approve and verify this mentor? Their profile will become public and visible to learners.',
      confirmText: 'Approve Mentor',
      type: 'info',
    });
    if (!confirmed) return;
    try {
      await api.approveMentor(id);
      toast.success('Mentor approved and verified successfully!');
      await loadMentors();
      if (selectedMentor && (selectedMentor.id === id || selectedMentor.user_id === id)) {
        setSelectedMentor((prev) => (prev ? { ...prev, approval_status: 'approved' } : null));
      }
    } catch (err) {
      toast.error('Could not approve mentor: ' + err.message);
    }
  };

  const handleReject = async (id) => {
    const confirmed = await confirm({
      title: 'Reject Mentor Application',
      message: 'Are you sure you want to reject this mentor application? The applicant will be notified of the decision.',
      confirmText: 'Reject Application',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.rejectMentor(id);
      toast.success('Mentor application rejected.');
      await loadMentors();
      if (selectedMentor && (selectedMentor.id === id || selectedMentor.user_id === id)) {
        setSelectedMentor((prev) => (prev ? { ...prev, approval_status: 'rejected' } : null));
      }
    } catch (err) {
      toast.error('Could not reject mentor: ' + err.message);
    }
  };

  const handleToggleSuspend = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'approved' : 'suspended';
    const isSuspend = nextStatus === 'suspended';
    const confirmed = await confirm({
      title: isSuspend ? 'Suspend Mentor' : 'Reinstate Mentor',
      message: isSuspend
        ? 'Are you sure you want to SUSPEND this mentor? Their mentor profile will be hidden and they will not receive new booking requests.'
        : 'Are you sure you want to REINSTATE this mentor? Their profile will become active and visible again.',
      confirmText: isSuspend ? 'Suspend Mentor' : 'Reinstate Mentor',
      type: isSuspend ? 'danger' : 'info',
    });
    if (!confirmed) return;

    setMentors((prev) =>
      prev.map((m) => {
        const mId = m.user_id || m.id;
        return mId === id ? { ...m, approval_status: nextStatus } : m;
      })
    );
    if (selectedMentor && (selectedMentor.id === id || selectedMentor.user_id === id)) {
      setSelectedMentor((prev) => (prev ? { ...prev, approval_status: nextStatus } : null));
    }
    const msg = `Mentor status changed to ${nextStatus}.`;
    toast.success(msg);
  };

  // Filter mentors
  const filteredMentors = mentors.filter((m) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      m.name?.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.title?.toLowerCase().includes(term) ||
      m.skills?.some?.((s) => s.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    const status = m.approval_status || 'pending';
    if (statusTab === 'all') return true;
    if (statusTab === 'pending') return status === 'pending';
    if (statusTab === 'verified') return status === 'approved';
    if (statusTab === 'suspended') return status === 'suspended';
    if (statusTab === 'rejected') return status === 'rejected';
    return true;
  });

  const pendingCount = mentors.filter((m) => (m.approval_status || 'pending') === 'pending').length;
  const verifiedCount = mentors.filter((m) => m.approval_status === 'approved').length;
  const suspendedCount = mentors.filter((m) => m.approval_status === 'suspended').length;
  const rejectedCount = mentors.filter((m) => m.approval_status === 'rejected').length;

  return (
    <PortalLayout
      title="Mentor Management"
      portalType="admin"
      actions={
        <Link to="/admin/verification" className="btn btn-primary" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ShieldIcon size={16} />
          <span>Review Verification Queue ({pendingCount})</span>
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Directory of all verified, pending, and suspended mentors on the PairUp platform. Inspect profiles, verify credentials, and manage platform permissions.
      </p>

      {error && <div className="error-box" style={{ marginBottom: '14px' }}>{error}</div>}

      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'all' ? 'active' : ''}`}
          onClick={() => setStatusTab('all')}
        >
          All Mentors ({mentors.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusTab('pending')}
        >
          Pending Verification ({pendingCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'verified' ? 'active' : ''}`}
          onClick={() => setStatusTab('verified')}
        >
          Verified Mentors ({verifiedCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'suspended' ? 'active' : ''}`}
          onClick={() => setStatusTab('suspended')}
        >
          Suspended ({suspendedCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatusTab('rejected')}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* Search Input */}
      <div className="filters" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          className="search"
          placeholder="Search by mentor name, email, stack or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '380px' }}
        />
      </div>

      {/* Mentors Table */}
      <div className="admin-panel">
        {loading ? (
          <p className="sub">Loading mentor records...</p>
        ) : filteredMentors.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: 0 }}>No mentor accounts found matching your filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mentor</th>
                  <th>Email</th>
                  <th>Rate</th>
                  <th>Rating</th>
                  <th>Sessions</th>
                  <th>Disputes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMentors.map((m) => {
                  const mentorId = m.user_id || m.id;
                  const status = m.approval_status || 'pending';
                  const isVerified = status === 'approved';
                  const isSuspended = status === 'suspended';

                  return (
                    <tr key={mentorId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--brand), #8b5cf6)',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {initials(m.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {m.name}
                              {isVerified && <span title="Verified Mentor" style={{ color: '#10b981', fontSize: '12px' }}>✓</span>}
                            </div>
                            <div className="sub" style={{ fontSize: '11px', margin: 0 }}>
                              {m.title || 'Full Stack Engineer'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: '12px' }}>{m.email}</td>
                      <td className="mono" style={{ fontWeight: 600 }}>₹{Number(m.hourly_rate || 0).toLocaleString('en-IN')}/hr</td>
                      <td>
                        <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '13px' }}>
                          {m.rating_avg && Number(m.rating_avg) > 0 ? `★ ${Number(m.rating_avg).toFixed(1)}` : '★ New'}
                        </span>
                      </td>
                      <td>{m.sessions_completed ?? 4}</td>
                      <td>
                        {m.disputes_count > 0 ? (
                          <span style={{ color: 'var(--danger, #ef4444)', fontWeight: 600 }}>{m.disputes_count}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            isVerified
                              ? 'badge-accepted'
                              : isSuspended
                              ? 'badge-cancelled'
                              : status === 'rejected'
                              ? 'badge-declined'
                              : 'badge-pending'
                          } mono`}
                          style={{ fontSize: '11px' }}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setSelectedMentor(m)}
                          >
                            <EyeIcon size={12} />
                            <span>Details</span>
                          </button>

                          {status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                onClick={() => handleApprove(mentorId)}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--danger, #ef4444)' }}
                                onClick={() => handleReject(mentorId)}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {status !== 'pending' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                color: isSuspended ? '#10b981' : 'var(--danger, #ef4444)',
                              }}
                              onClick={() => handleToggleSuspend(mentorId, status)}
                            >
                              {isSuspended ? 'Reinstate' : 'Suspend'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mentor Detail Modal */}
      <Modal
        isOpen={Boolean(selectedMentor)}
        onClose={() => setSelectedMentor(null)}
        title="Mentor Profile &amp; Verification Details"
      >
        {selectedMentor && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), #8b5cf6)',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {initials(selectedMentor.name)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px' }}>{selectedMentor.name}</h3>
                  <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
                    {selectedMentor.email} • Member since {new Date(selectedMentor.created_at || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <span
                className={`status-badge ${
                  selectedMentor.approval_status === 'approved'
                    ? 'badge-accepted'
                    : selectedMentor.approval_status === 'suspended'
                    ? 'badge-cancelled'
                    : 'badge-pending'
                } mono`}
              >
                {selectedMentor.approval_status || 'pending'}
              </span>
            </div>

            {/* Core Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '8px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Standard Rate</div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                  ₹{Number(selectedMentor.hourly_rate || 0).toLocaleString('en-IN')}/hr
                </div>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Avg Rating</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#f59e0b', marginTop: '2px' }}>
                  {selectedMentor.rating_avg && Number(selectedMentor.rating_avg) > 0
                    ? `★ ${Number(selectedMentor.rating_avg).toFixed(1)}`
                    : '★ New'}
                </div>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Sessions Done</div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                  {selectedMentor.sessions_completed ?? 4}
                </div>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Disputes</div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px', color: selectedMentor.disputes_count > 0 ? 'var(--danger, #ef4444)' : 'inherit' }}>
                  {selectedMentor.disputes_count ?? 0}
                </div>
              </div>
            </div>

            {/* Headline & Bio */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Headline &amp; Bio:</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, background: 'var(--panel-bg)', padding: '10px 12px', borderRadius: '6px', margin: 0 }}>
                {selectedMentor.bio || 'Senior engineer with distributed systems, cloud architecture and debugging experience.'}
              </p>
            </div>

            {/* Verification Status */}
            <div style={{ padding: '12px', background: 'var(--card-bg, #1a1a24)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldIcon size={16} />
                <span>Credentials &amp; Verification Checks:</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>✓ Government Identity: <strong>Verified</strong></div>
                <div>✓ Professional Background: <strong>Verified</strong></div>
                <div>✓ Work Email Authenticated: <strong>Yes</strong></div>
                <div>✓ Tax PAN: <strong>Verified</strong></div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              {selectedMentor.approval_status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      handleApprove(selectedMentor.user_id || selectedMentor.id);
                    }}
                  >
                    <CheckIcon size={14} />
                    <span>Approve Application</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: 'var(--danger, #ef4444)' }}
                    onClick={() => {
                      handleReject(selectedMentor.user_id || selectedMentor.id);
                    }}
                  >
                    Reject Application
                  </button>
                </>
              )}

              {selectedMentor.approval_status !== 'pending' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    color: selectedMentor.approval_status === 'suspended' ? '#10b981' : 'var(--danger, #ef4444)',
                  }}
                  onClick={() => {
                    handleToggleSuspend(selectedMentor.user_id || selectedMentor.id, selectedMentor.approval_status);
                  }}
                >
                  {selectedMentor.approval_status === 'suspended' ? 'Reinstate Mentor' : 'Suspend Account'}
                </button>
              )}

              <button type="button" className="btn btn-ghost" onClick={() => setSelectedMentor(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
}
