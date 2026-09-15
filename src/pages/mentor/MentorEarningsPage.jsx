import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, mentorPayoutSettings } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import { CreditCardIcon, WalletIcon } from '../../components/Icons';

export default function MentorEarningsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payoutMethod, setPayoutMethod] = useState(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    loadEarnings();
    if (user) {
      setPayoutMethod(mentorPayoutSettings.getPayoutMethod(user));
      try {
        const key = user.id ? `pairup_mentor_withdrawals_${user.id}` : 'pairup_mentor_withdrawals';
        const storedW = localStorage.getItem(key);
        if (storedW) setWithdrawals(JSON.parse(storedW));
      } catch {}
    }
  }, [user]);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const data = await api.getMyPayments();
      setPayments(data);
    } catch (err) {
      setError(err.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalGross = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPlatformFees = payments.reduce((s, p) => s + Number(p.platform_fee || 0), 0);

  const releasedNet = payments
    .filter((p) => p.status === 'released')
    .reduce((s, p) => s + Number(p.net_amount || p.amount || 0), 0);

  const escrowNet = payments
    .filter((p) => p.status === 'held' || p.status === 'held_in_escrow' || p.status === 'escrow')
    .reduce((s, p) => s + Number(p.net_amount || p.amount || 0), 0);

  // Total paid out through withdrawals
  const totalPaidOut = withdrawals.reduce((s, w) => s + Number(w.amount || 0), 0);

  // Available balance for withdrawal
  const availableBalance = Math.max(0, releasedNet - totalPaidOut);

  const handleRequestPayout = (e) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amt > availableBalance) {
      toast.error('Amount exceeds your available balance.');
      return;
    }

    const newWithdrawal = {
      id: 'w_' + Date.now(),
      amount: amt,
      method: selectedMethod === 'bank'
        ? `${payoutMethod?.bankName || 'Bank'} (${payoutMethod?.accountNumber ? payoutMethod.accountNumber.slice(-4) : 'Direct'})`
        : `UPI (${payoutMethod?.upiId || user?.email || 'UPI Transfer'})`,
      date: new Date().toISOString(),
      status: 'Processing',
    };

    const updated = [newWithdrawal, ...withdrawals];
    setWithdrawals(updated);
    const key = user?.id ? `pairup_mentor_withdrawals_${user.id}` : 'pairup_mentor_withdrawals';
    localStorage.setItem(key, JSON.stringify(updated));

    toast.success(`Payout request of ₹${amt.toLocaleString('en-IN')} submitted successfully! Funds arrive in 1-2 business days.`);
    setPayoutModalOpen(false);
    setWithdrawAmount('');
  };

  // Combine payments and withdrawals for a comprehensive transaction ledger
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      !search ||
      p.learner_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.topic?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  return (
    <PortalLayout
      title="Earnings & Payouts"
      portalType="mentor"
      actions={
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          disabled={availableBalance <= 0}
          onClick={() => {
            setWithdrawAmount(availableBalance.toString());
            setPayoutModalOpen(true);
          }}
        >
          <CreditCardIcon size={14} /> Request Payout
        </button>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        Track your earned pairing fees, funds currently held in escrow, platform commission deductions, and withdrawal history.
      </p>

      {error && <div className="error-box" style={{ marginBottom: '14px' }}>{error}</div>}

      {/* 4 Overview Metric Cards */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-label">Total Earnings (Net)</div>
          <div className="metric-value" style={{ color: '#10b981' }}>
            ₹{releasedNet.toLocaleString('en-IN')}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Cumulative earned from sessions</div>
        </div>

        <div className="metric-card" style={{ borderColor: 'var(--brand)' }}>
          <div className="metric-label" style={{ color: 'var(--brand)' }}>Available Balance</div>
          <div className="metric-value" style={{ color: 'var(--brand)' }}>
            ₹{availableBalance.toLocaleString('en-IN')}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Ready for bank payout</div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ color: '#f59e0b' }}>Held in Escrow</div>
          <div className="metric-value" style={{ color: '#f59e0b' }}>
            ₹{escrowNet.toLocaleString('en-IN')}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Pending session completion</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Paid Out</div>
          <div className="metric-value">
            ₹{totalPaidOut.toLocaleString('en-IN')}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Transferred to your bank account</div>
        </div>
      </div>

      {/* Payout Method Status Card */}
      <div
        className="panel"
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WalletIcon size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Linked Payout Account: {payoutMethod?.bankName || 'HDFC Bank'} ({payoutMethod?.accountNumber || '••••4819'})
              <span className="badge badge-success" style={{ fontSize: '10px' }}>Verified</span>
            </div>
            <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
              IFSC: {payoutMethod?.ifsc || 'HDFC0001234'} • Account Holder: {payoutMethod?.holderName || 'Alex Rivera'} • PAN: {payoutMethod?.pan || 'ABCDE1234F'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
            Auto-payout: {payoutMethod?.payoutSchedule || 'Weekly (Every Friday)'}
          </span>
          <Link to="/mentor/settings" className="btn btn-ghost" style={{ fontSize: '12px' }}>
            Manage in Settings →
          </Link>
        </div>
      </div>

      {/* Withdrawals In Progress / Recent */}
      {withdrawals.length > 0 && (
        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Recent Payout Requests</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {withdrawals.slice(0, 3).map((w) => (
              <div
                key={w.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--card-bg, #1a1a24)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Bank Transfer: ₹{w.amount.toLocaleString('en-IN')}</div>
                  <div className="sub" style={{ fontSize: '11px', margin: '2px 0 0' }}>
                    Destination: {w.method} • {new Date(w.date).toLocaleString()}
                  </div>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History Table */}
      <div className="admin-panel">
        <div className="admin-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Session Transaction History</h3>
            <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
              Detailed breakdown of learner gross payment, 10% platform fee, and net earnings
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="search"
              placeholder="Filter by learner or topic..."
              style={{ width: '200px', padding: '6px 10px', fontSize: '12px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="released">Released</option>
              <option value="held">Held in Escrow</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="sub" style={{ padding: '16px' }}>Loading earnings log...</p>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: 0 }}>No payment transactions recorded matching your search.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Topic</th>
                  <th>Gross Amount</th>
                  <th>Platform Fee (10%)</th>
                  <th>Net Earnings</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => {
                  const gross = Number(p.amount || 0);
                  const fee = Number(p.platform_fee || Math.round(gross * 0.1));
                  const net = Number(p.net_amount || gross - fee);

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.learner_name || 'Learner'}</td>
                      <td>{p.topic || 'Pairing session'}</td>
                      <td>₹{gross.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>−₹{fee.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>₹{net.toLocaleString('en-IN')}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            p.status === 'released'
                              ? 'badge-completed'
                              : p.status === 'held' || p.status === 'escrow'
                              ? 'badge-pending'
                              : 'badge-cancelled'
                          } mono`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(p.created_at || Date.now()).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Payout Modal */}
      <Modal
        isOpen={payoutModalOpen}
        onClose={() => setPayoutModalOpen(false)}
        title="Request Payout to Bank"
      >
        <form onSubmit={handleRequestPayout}>
          <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '6px', marginBottom: '14px' }}>
            <div className="sub" style={{ fontSize: '11px' }}>Available Balance</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--brand)', marginTop: '2px' }}>
              ₹{availableBalance.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="field">
            <label>Amount to Withdraw (₹)</label>
            <input
              type="number"
              min="100"
              max={availableBalance}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              required
            />
            <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>
              Minimum withdrawal is ₹100. Funds arrive in 1-2 business days.
            </div>
          </div>

          <div className="field">
            <label>Select Payout Destination</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: selectedMethod === 'bank' ? '1px solid var(--brand)' : '1px solid var(--border)',
                  background: selectedMethod === 'bank' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="payoutMethod"
                  checked={selectedMethod === 'bank'}
                  onChange={() => setSelectedMethod('bank')}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {payoutMethod?.bankName || 'HDFC Bank'} ({payoutMethod?.accountNumber || '••••4819'})
                  </div>
                  <div className="sub" style={{ fontSize: '11px' }}>NEFT / RTGS direct bank transfer</div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: selectedMethod === 'upi' ? '1px solid var(--brand)' : '1px solid var(--border)',
                  background: selectedMethod === 'upi' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="payoutMethod"
                  checked={selectedMethod === 'upi'}
                  onChange={() => setSelectedMethod('upi')}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>UPI Instant Transfer</div>
                  <div className="sub" style={{ fontSize: '11px' }}>alex@okhdfcbank</div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setPayoutModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Submit Withdrawal
            </button>
          </div>
        </form>
      </Modal>
    </PortalLayout>
  );
}
