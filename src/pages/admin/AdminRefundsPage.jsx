import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { adminRefunds } from '../../api/client';
import { CheckIcon, XIcon, CreditCardIcon } from '../../components/Icons';
import { useToast } from '../../context';

export default function AdminRefundsPage() {
  const { toast } = useToast();
  const [refunds, setRefunds] = useState([]);
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected' | 'completed'
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadRefunds();
  }, []);

  const loadRefunds = () => {
    setRefunds(adminRefunds.getRefunds());
  };

  const handleUpdateStatus = (id, newStatus) => {
    adminRefunds.updateStatus(id, newStatus, adminNotes);
    const msg = `Refund request marked as ${newStatus}!`;
    toast.success(msg);
    setSelectedRefund(null);
    setAdminNotes('');
    loadRefunds();
  };

  const filteredRefunds = refunds.filter((r) => {
    if (statusTab === 'all') return true;
    return r.status === statusTab;
  });

  const pendingCount = refunds.filter((r) => r.status === 'pending').length;
  const approvedCount = refunds.filter((r) => r.status === 'approved').length;
  const rejectedCount = refunds.filter((r) => r.status === 'rejected').length;
  const completedCount = refunds.filter((r) => r.status === 'completed').length;

  const totalRefundAmount = refunds
    .filter((r) => r.status === 'approved' || r.status === 'completed')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <PortalLayout title="Refund Management" portalType="admin">
      <p className="sub" style={{ marginBottom: '16px' }}>
        Review, arbitrate, and process learner refund claims for cancelled, interrupted, or disputed pairing sessions.
      </p>

      {/* Metrics Row */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <div className="metric-card" style={{ borderColor: 'var(--brand)' }}>
          <div className="metric-label" style={{ color: 'var(--brand)' }}>Pending Review</div>
          <div className="metric-value" style={{ color: 'var(--brand)' }}>{pendingCount}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Awaiting admin arbitration</div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ color: '#10b981' }}>Approved Claims</div>
          <div className="metric-value" style={{ color: '#10b981' }}>{approvedCount}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Ready for wallet/bank transfer</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Rejected Claims</div>
          <div className="metric-value">{rejectedCount}</div>
          <div className="sub" style={{ fontSize: '11px' }}>No-show or terms violation</div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ color: '#f59e0b' }}>Total Refunded</div>
          <div className="metric-value" style={{ color: '#f59e0b' }}>₹{totalRefundAmount.toLocaleString('en-IN')}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Total returned to learners</div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="filter-bar" style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'all' ? 'active' : ''}`}
          onClick={() => setStatusTab('all')}
        >
          All Requests ({refunds.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusTab('pending')}
        >
          ⏳ Pending ({pendingCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'approved' ? 'active' : ''}`}
          onClick={() => setStatusTab('approved')}
        >
          Approved ({approvedCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'completed' ? 'active' : ''}`}
          onClick={() => setStatusTab('completed')}
        >
          Completed ({completedCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${statusTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatusTab('rejected')}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* Refunds Table */}
      <div className="admin-panel">
        {filteredRefunds.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: 0 }}>No refund requests found matching this status filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Learner</th>
                  <th>Mentor</th>
                  <th>Booking #</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((r) => (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>{r.id}</td>
                    <td style={{ fontWeight: 600 }}>{r.learner_name}</td>
                    <td>{r.mentor_name}</td>
                    <td className="mono">#{r.booking_id}</td>
                    <td style={{ fontWeight: 700, color: 'var(--brand)' }}>₹{r.amount}</td>
                    <td style={{ maxWidth: '240px', fontSize: '12px' }}>
                      {r.reason ? r.reason.slice(0, 60) + '...' : '—'}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          r.status === 'approved' || r.status === 'completed'
                            ? 'badge-accepted'
                            : r.status === 'rejected'
                            ? 'badge-cancelled'
                            : 'badge-pending'
                        } mono`}
                        style={{ fontSize: '11px' }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        onClick={() => {
                          setSelectedRefund(r);
                          setAdminNotes(r.adminNotes || '');
                        }}
                      >
                        Review Claim
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Detail & Decision Modal */}
      <Modal
        isOpen={Boolean(selectedRefund)}
        onClose={() => setSelectedRefund(null)}
        title="Refund Claim Details &amp; Decision"
      >
        {selectedRefund && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Claim {selectedRefund.id}</h3>
                <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
                  Submitted on {new Date(selectedRefund.created_at).toLocaleString()}
                </div>
              </div>
              <span
                className={`status-badge ${
                  selectedRefund.status === 'approved' || selectedRefund.status === 'completed'
                    ? 'badge-accepted'
                    : selectedRefund.status === 'rejected'
                    ? 'badge-cancelled'
                    : 'badge-pending'
                } mono`}
              >
                {selectedRefund.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Learner</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>{selectedRefund.learner_name}</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Mentor</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>{selectedRefund.mentor_name}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Linked Booking #</div>
                <div className="mono" style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>#{selectedRefund.booking_id}</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Claimed Refund Amount</div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--brand)', marginTop: '2px' }}>₹{selectedRefund.amount}</div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Learner Statement &amp; Reason:</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, background: 'var(--panel-bg)', padding: '10px 12px', borderRadius: '6px', margin: 0 }}>
                {selectedRefund.reason}
              </p>
            </div>

            <div className="field" style={{ marginBottom: '16px' }}>
              <label>Admin Decision Notes</label>
              <textarea
                rows={3}
                placeholder="Document your decision notes for audit log..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              {selectedRefund.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleUpdateStatus(selectedRefund.id, 'approved')}
                  >
                    <CheckIcon size={14} />
                    <span>Approve Refund</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: 'var(--danger, #ef4444)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleUpdateStatus(selectedRefund.id, 'rejected')}
                  >
                    <XIcon size={14} />
                    <span>Reject Claim</span>
                  </button>
                </>
              )}

              {selectedRefund.status === 'approved' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleUpdateStatus(selectedRefund.id, 'completed')}
                >
                  <CreditCardIcon size={14} />
                  <span>Mark Refund Completed</span>
                </button>
              )}

              <button type="button" className="btn btn-ghost" onClick={() => setSelectedRefund(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
}
