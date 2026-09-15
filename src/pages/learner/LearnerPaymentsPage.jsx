import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, learnerBilling } from '../../api/client';
import { CreditCardIcon, DocumentIcon, FileEditIcon, DownloadIcon, PlusIcon } from '../../components/Icons';
import { useToast } from '../../context';

export default function LearnerPaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [walletBalance, setWalletBalance] = useState(3200);
  const [savedCards, setSavedCards] = useState([]);
  const [billingInfo, setBillingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals & form state
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState(1000);
  const [addCardModalOpen, setAddCardModalOpen] = useState(false);
  const [newCard, setNewCard] = useState({ holder: '', number: '', exp: '', brand: 'Visa' });
  const [invoiceModalTx, setInvoiceModalTx] = useState(null);
  const [refundModalTx, setRefundModalTx] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [editBillingOpen, setEditBillingOpen] = useState(false);
  const [billingForm, setBillingForm] = useState(null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getMyPayments().catch(() => []);
      setPayments(data);
      setWalletBalance(learnerBilling.getWalletBalance());
      setSavedCards(learnerBilling.getCards());
      const bInfo = learnerBilling.getBillingDetails();
      setBillingInfo(bInfo);
      setBillingForm(bInfo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = (e) => {
    e.preventDefault();
    const updated = learnerBilling.topupWallet(Number(topupAmount));
    setWalletBalance(updated);
    setTopupModalOpen(false);
    toast.success(`₹${Number(topupAmount).toLocaleString('en-IN')} added to your wallet balance!`);
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newCard.number || !newCard.holder) {
      toast.error('Please fill out card details');
      return;
    }
    const updated = learnerBilling.addCard(newCard);
    setSavedCards(updated);
    setAddCardModalOpen(false);
    setNewCard({ holder: '', number: '', exp: '', brand: 'Visa' });
    toast.success('Card added successfully!');
  };

  const handleRemoveCard = (id) => {
    const updated = learnerBilling.removeCard(id);
    setSavedCards(updated);
    toast.info('Payment card removed');
  };

  const handleSetDefaultCard = (id) => {
    const updated = learnerBilling.setDefaultCard(id);
    setSavedCards(updated);
    toast.success('Default payment method updated');
  };

  const handleSaveBilling = (e) => {
    e.preventDefault();
    learnerBilling.saveBillingDetails(billingForm);
    setBillingInfo(billingForm);
    setEditBillingOpen(false);
    toast.success('Billing information updated!');
  };

  const handleRequestRefund = (e) => {
    e.preventDefault();
    toast.info(`Refund request submitted for ${refundModalTx.topic}. Our billing compliance team will review within 24 hours.`);
    setRefundModalTx(null);
    setRefundReason('');
  };

  const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const held = payments.filter((p) => p.status === 'held').reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const filteredPayments = payments.filter((p) => {
    if (filterType === 'all') return true;
    if (filterType === 'held') return p.status === 'held';
    if (filterType === 'released') return p.status === 'released';
    if (filterType === 'refunded') return p.status === 'refunded';
    return true;
  });

  return (
    <PortalLayout title="Payments &amp; Billing" portalType="learner">
      <p className="sub" style={{ marginBottom: '20px' }}>
        Manage payment methods, wallet credits, active escrow holdings, invoices, and billing receipts.
      </p>

      {error && <div className="error-box">{error}</div>}

      {/* 1. Payment Overview Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '28px' }}>
        <div className="card">
          <div className="section-label" style={{ marginTop: 0 }}>Total Spent</div>
          <div className="stat-num">₹{total.toLocaleString('en-IN')}</div>
          <div className="sub" style={{ margin: '4px 0 0', fontSize: '11.5px' }}>Across all completed sessions</div>
        </div>

        <div className="card" style={{ borderColor: 'var(--warn)' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--warn)' }}>Held in Escrow</div>
          <div className="stat-num" style={{ color: 'var(--warn)' }}>₹{held.toLocaleString('en-IN')}</div>
          <div className="sub" style={{ margin: '4px 0 0', fontSize: '11.5px' }}>Released only on completion</div>
        </div>

        <div className="card" style={{ borderColor: 'var(--add)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="section-label" style={{ marginTop: 0, color: 'var(--add)' }}>Wallet Balance</div>
              <div className="stat-num" style={{ color: 'var(--add)' }}>₹{walletBalance.toLocaleString('en-IN')}</div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setTopupModalOpen(true)}
            >
              <PlusIcon size={14} /> Add Funds
            </button>
          </div>
          <div className="sub" style={{ margin: '4px 0 0', fontSize: '11.5px' }}>Available for 1-click booking</div>
        </div>
      </div>

      {/* 2. Payment Methods */}
      <div className="admin-panel" style={{ marginBottom: '28px' }}>
        <div className="admin-panel-head">
          <h3>Saved Payment Methods</h3>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setAddCardModalOpen(true)}
          >
            <PlusIcon size={14} /> Add New Card
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {savedCards.map((c) => (
            <div
              key={c.id}
              className="card"
              style={{
                border: c.isDefault ? '2px solid var(--accent)' : '1px solid var(--grid-strong)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCardIcon size={16} /> {c.brand} •••• {c.last4}
                </div>
                {c.isDefault ? (
                  <span className="tag" style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px' }}>
                    DEFAULT
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => handleSetDefaultCard(c.id)}
                  >
                    Set Default
                  </button>
                )}
              </div>

              <div className="sub" style={{ margin: 0, fontSize: '12px' }}>
                Expires {c.exp} • Holder: {c.holder}
              </div>

              {!c.isDefault && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--warn)', fontSize: '11.5px', cursor: 'pointer' }}
                    onClick={() => handleRemoveCard(c.id)}
                  >
                    Remove Card
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Transaction History */}
      <div className="admin-panel" style={{ marginBottom: '28px' }}>
        <div className="admin-panel-head">
          <h3>Transaction History</h3>
        </div>

        {/* Transaction Type Filters */}
        <div className="admin-filter-tabs">
          <button
            type="button"
            className={`admin-filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Transactions ({payments.length})
          </button>
          <button
            type="button"
            className={`admin-filter-tab ${filterType === 'held' ? 'active' : ''}`}
            onClick={() => setFilterType('held')}
          >
            In Escrow
          </button>
          <button
            type="button"
            className={`admin-filter-tab ${filterType === 'released' ? 'active' : ''}`}
            onClick={() => setFilterType('released')}
          >
            Released
          </button>
          <button
            type="button"
            className={`admin-filter-tab ${filterType === 'refunded' ? 'active' : ''}`}
            onClick={() => setFilterType('refunded')}
          >
            Refunds
          </button>
        </div>

        {loading ? (
          <p className="sub">Loading transactions...</p>
        ) : filteredPayments.length === 0 ? (
          <p className="sub">No transactions recorded for this filter.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mentor &amp; Session</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.mentor_name}</div>
                      <div className="sub" style={{ margin: 0, fontSize: '11.5px' }}>
                        {p.topic || 'Pairing Session'}
                      </div>
                    </td>
                    <td className="mono" style={{ fontWeight: 700, fontSize: '13px' }}>
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          p.status === 'held'
                            ? 'badge-pending'
                            : p.status === 'refunded'
                            ? 'badge-cancelled'
                            : 'badge-completed'
                        } mono`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '11.5px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          onClick={() => setInvoiceModalTx(p)}
                        >
                          <DocumentIcon size={13} /> Invoice
                        </button>
                        {p.status === 'held' && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: '11.5px', padding: '4px 8px', color: 'var(--warn)' }}
                            onClick={() => setRefundModalTx(p)}
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Billing Information */}
      <div className="panel" style={{ maxWidth: '640px', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div className="section-label" style={{ margin: 0 }}>Billing Address &amp; GST Details</div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            onClick={() => setEditBillingOpen(true)}
          >
            <FileEditIcon size={14} /> Edit Billing Details
          </button>
        </div>

        {billingInfo && (
          <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ink)' }}>
            <div><strong>{billingInfo.fullName}</strong> {billingInfo.company ? `(${billingInfo.company})` : ''}</div>
            <div className="sub" style={{ margin: 0 }}>{billingInfo.address}</div>
            <div className="sub" style={{ margin: 0 }}>{billingInfo.city}, {billingInfo.state} - {billingInfo.pin}, {billingInfo.country}</div>
            <div className="mono" style={{ fontSize: '12px', marginTop: '6px' }}>
              Tax / GSTIN: <strong>{billingInfo.taxId}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Top-up Wallet Modal */}
      <Modal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        title="Top-up Wallet Credits"
      >
        <form onSubmit={handleTopup}>
          <p className="sub" style={{ fontSize: '13px' }}>
            Add funds to your PairUp wallet for instant booking without card approvals on every session.
          </p>
          <div className="field">
            <label>Amount to Add (₹)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {[500, 1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`btn ${topupAmount === amt ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, padding: '8px', fontSize: '12.5px' }}
                  onClick={() => setTopupAmount(amt)}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={topupAmount}
              onChange={(e) => setTopupAmount(Number(e.target.value))}
              min="100"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setTopupModalOpen(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Add ₹{topupAmount.toLocaleString('en-IN')} Now
            </button>
          </div>
        </form>
      </Modal>

      {/* Add New Card Modal */}
      <Modal
        isOpen={addCardModalOpen}
        onClose={() => setAddCardModalOpen(false)}
        title="Add Payment Card"
      >
        <form onSubmit={handleAddCard}>
          <div className="field">
            <label>Cardholder Full Name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              value={newCard.holder}
              onChange={(e) => setNewCard({ ...newCard, holder: e.target.value })}
              required
            />
          </div>

          <div className="field">
            <label>Card Number</label>
            <input
              type="text"
              placeholder="4242 •••• •••• 4242"
              maxLength={19}
              value={newCard.number}
              onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Expiry Date</label>
              <input
                type="text"
                placeholder="MM/YY"
                maxLength={5}
                value={newCard.exp}
                onChange={(e) => setNewCard({ ...newCard, exp: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>CVV</label>
              <input type="password" placeholder="•••" maxLength={4} required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAddCardModalOpen(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Save Card
            </button>
          </div>
        </form>
      </Modal>

      {/* Invoice / Printable Receipt Modal */}
      <Modal
        isOpen={!!invoiceModalTx}
        onClose={() => setInvoiceModalTx(null)}
        title="Payment Invoice &amp; Receipt"
      >
        {invoiceModalTx && (
          <div>
            <div style={{ borderBottom: '1px solid var(--grid)', paddingBottom: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>PairUp Technologies Inc.</h3>
                <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  INV-{invoiceModalTx.id.toString().padStart(6, '0')}
                </span>
              </div>
              <div className="sub" style={{ margin: '4px 0 0', fontSize: '12px' }}>
                GSTIN: 29PAIRUP1234F1Z0 • Official Mentoring Receipt
              </div>
            </div>

            <div style={{ fontSize: '12.5px', marginBottom: '16px' }}>
              <div><strong>Billed to:</strong> {billingInfo?.fullName}</div>
              <div className="sub" style={{ margin: 0 }}>{billingInfo?.address}, {billingInfo?.city}</div>
              <div className="mono" style={{ fontSize: '11.5px', marginTop: '4px' }}>
                Date: {new Date(invoiceModalTx.created_at).toLocaleDateString()}
              </div>
            </div>

            <table className="admin-table" style={{ marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    1-on-1 Mentoring Session: {invoiceModalTx.topic || 'Pairing'}
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      Mentor: {invoiceModalTx.mentor_name}
                    </div>
                  </td>
                  <td className="mono">₹{(Number(invoiceModalTx.amount) / 1.18).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>GST (18% Integrated Goods &amp; Services Tax)</td>
                  <td className="mono">₹{(Number(invoiceModalTx.amount) - Number(invoiceModalTx.amount) / 1.18).toFixed(2)}</td>
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td>Total Paid (Escrow Held)</td>
                  <td className="mono">₹{Number(invoiceModalTx.amount).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setInvoiceModalTx(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => window.print()}
              >
                <DownloadIcon size={14} /> Print / Download PDF
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Request Modal */}
      <Modal
        isOpen={!!refundModalTx}
        onClose={() => setRefundModalTx(null)}
        title="Request Payment Refund"
      >
        {refundModalTx && (
          <form onSubmit={handleRequestRefund}>
            <p className="sub" style={{ fontSize: '13px' }}>
              Request refund for <strong>₹{Number(refundModalTx.amount).toLocaleString('en-IN')}</strong> regarding session with {refundModalTx.mentor_name}.
            </p>
            <div className="field">
              <label>Reason for Refund</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Explain why you are requesting a refund (e.g. session was cancelled or mentor could not attend)..."
                rows={3}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRefundModalTx(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>
                Submit Refund Request
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Billing Info Modal */}
      <Modal
        isOpen={editBillingOpen}
        onClose={() => setEditBillingOpen(false)}
        title="Edit Billing Information"
      >
        {billingForm && (
          <form onSubmit={handleSaveBilling}>
            <div className="field">
              <label>Full Legal Name / Entity</label>
              <input
                type="text"
                value={billingForm.fullName}
                onChange={(e) => setBillingForm({ ...billingForm, fullName: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Company / Organization</label>
              <input
                type="text"
                value={billingForm.company}
                onChange={(e) => setBillingForm({ ...billingForm, company: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Billing Address</label>
              <input
                type="text"
                value={billingForm.address}
                onChange={(e) => setBillingForm({ ...billingForm, address: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="field">
                <label>City</label>
                <input
                  type="text"
                  value={billingForm.city}
                  onChange={(e) => setBillingForm({ ...billingForm, city: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>PIN Code</label>
                <input
                  type="text"
                  value={billingForm.pin}
                  onChange={(e) => setBillingForm({ ...billingForm, pin: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Tax / GST Identification Number</label>
              <input
                type="text"
                value={billingForm.taxId}
                onChange={(e) => setBillingForm({ ...billingForm, taxId: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditBillingOpen(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Save Billing Details
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PortalLayout>
  );
}
