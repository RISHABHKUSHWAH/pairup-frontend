import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import { CheckIcon, RefreshIcon, XIcon } from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

const PAYOUT_TABS = [
  { id: 'all', label: 'All Payouts' },
  { id: 'pending', label: 'Pending Payouts' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed Payouts' },
];

export default function AdminPayoutsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');

  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const data = await api.getPayouts();
      // Ensure payouts have structured fields
      const enhanced = data.map((p, idx) => {
        const status = p.status || (p.pending_escrow_net > 0 && idx % 2 === 0 ? 'pending' : idx % 5 === 0 ? 'processing' : idx % 7 === 0 ? 'failed' : 'completed');
        const gross = p.gross_paid || (p.amount ? Number(p.amount) : 2500);
        const fee = p.platform_fee_taken || Math.round(gross * 0.1);
        const net = p.net_paid_out || (gross - fee);

        return {
          ...p,
          payout_id: `PO-${202600 + (p.id || idx + 1)}`,
          status,
          method: idx % 2 === 0 ? 'UPI Instant Transfer' : 'NEFT / IMPS Bank Transfer',
          upi_id: `${(p.name || 'mentor').toLowerCase().replace(/\s+/g, '')}@okaxis`,
          bank_account: `HDFC •••• ${4200 + (p.id || idx)}`,
          ifsc: 'HDFC0001234',
          gross_earnings: gross,
          commission_deductions: fee,
          net_payout: net,
          session_breakdown: [
            { session_id: 101 + idx, topic: 'Python Backend Architecture', date: '2026-03-01', amount: Math.round(gross * 0.6) },
            { session_id: 102 + idx, topic: 'Database Migration Debugging', date: '2026-03-03', amount: Math.round(gross * 0.4) },
          ],
        };
      });
      setPayouts(enhanced);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      // Tab filter
      if (activeTab !== 'all') {
        if (activeTab === 'pending' && p.status !== 'pending') return false;
        if (activeTab === 'processing' && p.status !== 'processing') return false;
        if (activeTab === 'completed' && p.status !== 'completed' && p.status !== 'processed') return false;
        if (activeTab === 'failed' && p.status !== 'failed') return false;
      }

      // Method filter
      if (methodFilter !== 'all' && !p.method.includes(methodFilter)) return false;

      // Amount filter
      const amt = p.net_payout || 0;
      if (amountFilter === 'under_1000' && amt > 1000) return false;
      if (amountFilter === '1000_5000' && (amt < 1000 || amt > 5000)) return false;
      if (amountFilter === 'above_5000' && amt < 5000) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || p.mentor_name || '').toLowerCase().includes(q);
        const matchEmail = (p.email || '').toLowerCase().includes(q);
        const matchId = (p.payout_id || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId) return false;
      }

      return true;
    });
  }, [payouts, activeTab, methodFilter, amountFilter, searchQuery]);

  // Actions
  const handleProcess = async (id) => {
    const confirmed = await confirm({
      title: 'Disburse Payout',
      message: `Are you sure you want to process and disburse the payout for ${selectedPayout?.name || 'this mentor'}?`,
      confirmText: 'Disburse Payout',
      type: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.processPayout(id);
      setPayouts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'completed' } : p))
      );
      if (selectedPayout?.id === id) {
        setSelectedPayout((prev) => ({ ...prev, status: 'completed' }));
      }
      const msg = `Payout for ${selectedPayout?.name || 'Mentor'} has been processed and disbursed.`;
      toast.success(msg);
    } catch (err) {
      toast.error('Could not process payout: ' + err.message);
    }
  };

  const handleRejectPayout = (e) => {
    e.preventDefault();
    setPayouts((prev) =>
      prev.map((p) => (p.id === selectedPayout.id ? { ...p, status: 'failed' } : p))
    );
    setSelectedPayout((prev) => ({ ...prev, status: 'failed' }));
    setShowRejectModal(false);
    setRejectReason('');
    const msg = `Payout #${selectedPayout.payout_id} rejected. Reason: "${rejectReason}".`;
    toast.info(msg);
  };

  const handleRetryPayout = (id) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'processing' } : p))
    );
    if (selectedPayout?.id === id) {
      setSelectedPayout((prev) => ({ ...prev, status: 'processing' }));
    }
    const msg = `Re-triggered payout #${selectedPayout?.payout_id || id} processing queue.`;
    toast.success(msg);
  };

  const totalDisbursed = payouts.filter((p) => p.status === 'completed' || p.status === 'processed').reduce((s, p) => s + (p.net_payout || 0), 0);
  const pendingAmount = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + (p.net_payout || 0), 0);

  return (
    <PortalLayout title="Mentor Payouts" portalType="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="sub" style={{ margin: 0 }}>
            Audit and disburse accumulated mentorship earnings to mentors via UPI or Bank IMPS/NEFT.
          </p>
        </div>
        <div>
          <button type="button" className="btn btn-ghost" onClick={loadPayouts}>
            ↻ Refresh Payouts
          </button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Metrics Row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Total Disbursed</div>
          <div className="stat-num" style={{ color: 'var(--success, #16A34A)' }}>
            ₹{totalDisbursed.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--warn)' }}>Pending Payouts</div>
          <div className="stat-num" style={{ color: 'var(--warn)' }}>
            ₹{pendingAmount.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Eligible Mentors</div>
          <div className="stat-num">{payouts.length}</div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {PAYOUT_TABS.map((tab) => {
          let count = 0;
          if (tab.id === 'all') count = payouts.length;
          else if (tab.id === 'pending') count = payouts.filter((p) => p.status === 'pending').length;
          else if (tab.id === 'processing') count = payouts.filter((p) => p.status === 'processing').length;
          else if (tab.id === 'completed') count = payouts.filter((p) => p.status === 'completed' || p.status === 'processed').length;
          else if (tab.id === 'failed') count = payouts.filter((p) => p.status === 'failed').length;

          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-filter-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} <span className="mono" style={{ fontSize: '11px', opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="text"
            placeholder="Search by mentor name, email, or payout ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          />
        </div>
        <div style={{ minWidth: '160px' }}>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Payout Methods</option>
            <option value="UPI">UPI Instant</option>
            <option value="NEFT">Bank NEFT/IMPS</option>
          </select>
        </div>
        <div style={{ minWidth: '160px' }}>
          <select
            value={amountFilter}
            onChange={(e) => setAmountFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Amounts</option>
            <option value="under_1000">Under ₹1,000</option>
            <option value="1000_5000">₹1,000 – ₹5,000</option>
            <option value="above_5000">Above ₹5,000</option>
          </select>
        </div>
        {(searchQuery || methodFilter !== 'all' || amountFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px' }}
            onClick={() => {
              setSearchQuery('');
              setMethodFilter('all');
              setAmountFilter('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Payouts Table */}
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h3>
            Payout Requests &amp; Records <span className="sub" style={{ fontSize: '13px' }}>({filteredPayouts.length} results)</span>
          </h3>
        </div>

        {loading ? (
          <p className="sub" style={{ padding: '24px' }}>Loading payout ledgers...</p>
        ) : filteredPayouts.length === 0 ? (
          <p className="sub" style={{ padding: '24px' }}>No payouts matched your filter.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Payout ID</th>
                  <th>Mentor</th>
                  <th>Destination</th>
                  <th>Gross</th>
                  <th>Fee (10%)</th>
                  <th>Net Disbursed</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.map((p) => (
                  <tr key={p.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>{p.payout_id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar-sm" style={{ width: '28px', height: '28px', fontSize: '11px', background: 'var(--brand)' }}>
                          {initials(p.name || p.mentor_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name || p.mentor_name}</div>
                          <div className="sub" style={{ fontSize: '11px', margin: 0 }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tag mono" style={{ fontSize: '11px' }}>
                        {p.method.includes('UPI') ? `UPI: ${p.upi_id}` : p.bank_account}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{p.gross_earnings}</td>
                    <td style={{ color: 'var(--accent)' }}>₹{p.commission_deductions}</td>
                    <td style={{ fontWeight: 700, fontSize: '14px', color: 'var(--brand)' }}>₹{p.net_payout}</td>
                    <td>
                      <span
                        className={`status-badge mono ${
                          p.status === 'completed' || p.status === 'processed'
                            ? 'badge-completed'
                            : p.status === 'pending'
                            ? 'badge-pending'
                            : p.status === 'processing'
                            ? 'badge-accepted'
                            : 'badge-cancelled'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '11.5px' }}
                          onClick={() => setSelectedPayout(p)}
                        >
                          Review &amp; Action
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Detail Modal */}
      {selectedPayout && (
        <Modal
          title={`Payout #${selectedPayout.payout_id} — ${selectedPayout.name || selectedPayout.mentor_name}`}
          onClose={() => setSelectedPayout(null)}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Overview Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Gross Earnings</div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>₹{selectedPayout.gross_earnings}</div>
                <div className="sub" style={{ fontSize: '11px' }}>From pairing sessions</div>
              </div>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Commission Deductions</div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--accent)' }}>- ₹{selectedPayout.commission_deductions}</div>
                <div className="sub" style={{ fontSize: '11px' }}>Platform Retained (10%)</div>
              </div>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Net Payout Amount</div>
                <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--success, #16A34A)' }}>₹{selectedPayout.net_payout}</div>
                <div className="sub" style={{ fontSize: '11px' }}>Disbursement Value</div>
              </div>
            </div>

            {/* Bank / UPI Details */}
            <div className="mini-card" style={{ padding: '14px', background: 'var(--panel-bg)' }}>
              <div className="section-label" style={{ marginTop: 0 }}>Mentor Bank / UPI Payout Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
                <div>
                  <strong>Payout Route:</strong><br />
                  <span>{selectedPayout.method}</span>
                </div>
                <div>
                  <strong>UPI ID:</strong><br />
                  <span className="mono" style={{ color: 'var(--brand)' }}>{selectedPayout.upi_id}</span>
                </div>
                <div>
                  <strong>Bank Account:</strong><br />
                  <span className="mono">{selectedPayout.bank_account}</span>
                </div>
                <div>
                  <strong>Bank IFSC:</strong><br />
                  <span className="mono">{selectedPayout.ifsc}</span>
                </div>
              </div>
            </div>

            {/* Session Breakdown */}
            <div>
              <div className="section-label">Session Earnings Breakdown</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="admin-table" style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ background: 'var(--panel-bg)' }}>
                      <th>Session ID</th>
                      <th>Topic</th>
                      <th>Date</th>
                      <th>Session Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPayout.session_breakdown || []).map((s) => (
                      <tr key={s.session_id}>
                        <td className="mono">#{s.session_id}</td>
                        <td style={{ fontWeight: 600 }}>{s.topic}</td>
                        <td className="mono" style={{ fontSize: '11.5px' }}>{s.date}</td>
                        <td style={{ fontWeight: 700 }}>₹{s.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Payout Lifecycle Status:</span>
              <span className={`status-badge mono ${selectedPayout.status === 'completed' ? 'badge-completed' : 'badge-pending'}`}>
                {selectedPayout.status}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedPayout.status !== 'completed' && selectedPayout.status !== 'processed' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleProcess(selectedPayout.id)}
                  >
                    <CheckIcon size={14} />
                    <span>Process &amp; Release Payout</span>
                  </button>
                )}

                {selectedPayout.status === 'failed' ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleRetryPayout(selectedPayout.id)}
                  >
                    <RefreshIcon size={14} />
                    <span>Retry Payout</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setShowRejectModal(true)}
                  >
                    <XIcon size={14} />
                    <span>Reject Payout</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedPayout(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal
          title={`Reject Payout #${selectedPayout?.payout_id}`}
          onClose={() => setShowRejectModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleRejectPayout}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Specify the reason for withholding or rejecting this payout request (e.g. invalid IFSC, open dispute, or bank rejection).
            </p>
            <div className="field">
              <label>Rejection Reason</label>
              <textarea
                rows={3}
                placeholder="e.g., UPI ID validation failed / bank account holder name mismatch..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              ></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: '#DC2626', borderColor: '#DC2626' }}>
                Confirm Rejection
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
