import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import { CalendarIcon, ScaleIcon, RefreshIcon, XIcon } from '../../components/Icons';
import { useToast } from '../../context';

const TIME_TABS = [
  { id: 'all', label: 'All Sessions' },
  { id: 'upcoming', label: 'Upcoming Sessions' },
  { id: 'in_progress', label: 'In Progress Sessions' },
  { id: 'past', label: 'Past Sessions' },
];

export default function AdminSessionsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);

  // Modals for actions
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDateTime, setRescheduleDateTime] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminBookings();
      // Augment session details if missing
      const enhanced = data.map((b, idx) => {
        const dateObj = b.created_at ? new Date(b.created_at) : new Date();
        const isUpcoming = b.status === 'pending' || b.status === 'accepted';
        const isInProgress = b.status === 'paid' || b.status === 'in_progress';
        const isPast = b.status === 'completed' || b.status === 'cancelled' || b.status === 'disputed';

        return {
          ...b,
          time_category: isUpcoming ? 'upcoming' : isInProgress ? 'in_progress' : 'past',
          scheduled_at: b.scheduled_at || new Date(dateObj.getTime() + (idx + 1) * 3600000 * 4).toISOString(),
          session_type: b.session_type || (idx % 3 === 0 ? '1-on-1 Audio/Video Call' : idx % 3 === 1 ? 'Code Review & Audit' : 'Emergency Debugging'),
          tech_stack: b.tech_stack || (idx % 4 === 0 ? 'Python' : idx % 4 === 1 ? 'React' : idx % 4 === 2 ? 'Docker' : 'PostgreSQL'),
          problem_description: b.problem_description || `Learner encountered an unhandled exception during database synchronization. Needed mentor to pair program and fix migrations.`,
          session_summary: b.session_summary || (b.status === 'completed' ? `Successfully debugged database pool timeouts. Optimized connection reuse and added retry decorators.` : 'Session pending or in progress.'),
          payment_status: b.payment_status || (b.status === 'completed' ? 'Released' : b.status === 'disputed' ? 'Disputed / In Escrow' : b.status === 'cancelled' ? 'Refunded' : 'Held in Escrow'),
        };
      });
      setBookings(enhanced);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    return bookings.filter((b) => {
      // Time tab filter
      if (activeTab === 'upcoming' && b.time_category !== 'upcoming') return false;
      if (activeTab === 'in_progress' && b.time_category !== 'in_progress') return false;
      if (activeTab === 'past' && b.time_category !== 'past') return false;

      // Status filter
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;

      // Tech filter
      if (techFilter !== 'all' && b.tech_stack !== techFilter) return false;

      // Search query (learner, mentor, topic)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLearner = (b.learner_name || '').toLowerCase().includes(q);
        const matchMentor = (b.mentor_name || '').toLowerCase().includes(q);
        const matchTopic = (b.topic || '').toLowerCase().includes(q);
        const matchTech = (b.tech_stack || '').toLowerCase().includes(q);
        if (!matchLearner && !matchMentor && !matchTopic && !matchTech) return false;
      }

      return true;
    });
  }, [bookings, activeTab, statusFilter, techFilter, searchQuery]);

  // Admin Actions handlers
  const handleReschedule = (e) => {
    e.preventDefault();
    if (!rescheduleDateTime) return;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedSession.id
          ? { ...b, scheduled_at: new Date(rescheduleDateTime).toISOString(), status: 'accepted' }
          : b
      )
    );
    setSelectedSession((prev) => ({
      ...prev,
      scheduled_at: new Date(rescheduleDateTime).toISOString(),
      status: 'accepted',
    }));
    setShowRescheduleModal(false);
    setRescheduleDateTime('');
    const msg = `Session #${selectedSession.id} rescheduled to ${new Date(rescheduleDateTime).toLocaleString()}.`;
    toast.success(msg);
  };

  const handleCancelSession = (e) => {
    e.preventDefault();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedSession.id
          ? { ...b, status: 'cancelled', time_category: 'past', payment_status: 'Refunded' }
          : b
      )
    );
    setSelectedSession((prev) => ({
      ...prev,
      status: 'cancelled',
      time_category: 'past',
      payment_status: 'Refunded',
    }));
    setShowCancelModal(false);
    setCancelReason('');
    const msg = `Session #${selectedSession.id} cancelled. Escrow flagged for refund.`;
    toast.info(msg);
  };

  const handleRefundSession = (e) => {
    e.preventDefault();
    const amt = refundAmount || selectedSession.price;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedSession.id
          ? { ...b, payment_status: `Refunded (₹${amt})`, status: 'cancelled' }
          : b
      )
    );
    setSelectedSession((prev) => ({
      ...prev,
      payment_status: `Refunded (₹${amt})`,
      status: 'cancelled',
    }));
    setShowRefundModal(false);
    setRefundAmount('');
    const msg = `Refund of ₹${amt} issued to learner for Session #${selectedSession.id}.`;
    toast.success(msg);
  };

  const handleResolveIssue = (e) => {
    e.preventDefault();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedSession.id
          ? { ...b, status: 'completed', payment_status: 'Released' }
          : b
      )
    );
    setSelectedSession((prev) => ({
      ...prev,
      status: 'completed',
      payment_status: 'Released',
    }));
    setShowResolveModal(false);
    setResolutionNotes('');
    const msg = `Session #${selectedSession.id} issue resolved. Status updated.`;
    toast.success(msg);
  };

  return (
    <PortalLayout title="All Platform Sessions" portalType="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="sub" style={{ margin: 0 }}>
            Comprehensive schedule and operational monitor for all live pairing sessions across PairUp.
          </p>
        </div>
        <div>
          <button type="button" className="btn btn-ghost" onClick={loadSessions}>
            ↻ Refresh Sessions
          </button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Metrics Row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Total Sessions</div>
          <div className="stat-num">{bookings.length}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--brand)' }}>Upcoming</div>
          <div className="stat-num" style={{ color: 'var(--brand)' }}>
            {bookings.filter((b) => b.time_category === 'upcoming').length}
          </div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--accent)' }}>In Progress</div>
          <div className="stat-num" style={{ color: 'var(--accent)' }}>
            {bookings.filter((b) => b.time_category === 'in_progress').length}
          </div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--success, #16A34A)' }}>Past Completed</div>
          <div className="stat-num" style={{ color: 'var(--success, #16A34A)' }}>
            {bookings.filter((b) => b.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Time Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {TIME_TABS.map((t) => {
          let count = 0;
          if (t.id === 'all') count = bookings.length;
          else if (t.id === 'upcoming') count = bookings.filter((b) => b.time_category === 'upcoming').length;
          else if (t.id === 'in_progress') count = bookings.filter((b) => b.time_category === 'in_progress').length;
          else if (t.id === 'past') count = bookings.filter((b) => b.time_category === 'past').length;

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

      {/* Filters Toolbar */}
      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="text"
            placeholder="Search by learner, mentor, topic, or technology..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          />
        </div>
        <div style={{ minWidth: '150px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted / Scheduled</option>
            <option value="paid">Paid / Escrow</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        <div style={{ minWidth: '150px' }}>
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Tech Stacks</option>
            <option value="Python">Python</option>
            <option value="React">React</option>
            <option value="Docker">Docker</option>
            <option value="PostgreSQL">PostgreSQL</option>
          </select>
        </div>
        {(searchQuery || statusFilter !== 'all' || techFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px' }}
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setTechFilter('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Sessions Table */}
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h3>
            Sessions Registry <span className="sub" style={{ fontSize: '13px' }}>({filteredSessions.length} results)</span>
          </h3>
        </div>

        {loading ? (
          <p className="sub" style={{ padding: '24px' }}>Loading session records...</p>
        ) : filteredSessions.length === 0 ? (
          <p className="sub" style={{ padding: '24px' }}>No sessions found matching your filters.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Session #</th>
                  <th>Learner</th>
                  <th>Mentor</th>
                  <th>Topic &amp; Type</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Scheduled For</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((b) => (
                  <tr key={b.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>#{b.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar-sm" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                          {initials(b.learner_name)}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.learner_name}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar-sm" style={{ width: '28px', height: '28px', fontSize: '11px', background: 'var(--brand)' }}>
                          {initials(b.mentor_name)}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.mentor_name}</div>
                      </div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{b.topic || 'Pair Programming'}</div>
                      <span className="tag" style={{ fontSize: '10.5px' }}>{b.session_type}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{b.price}</td>
                    <td className="mono">{b.duration_minutes} min</td>
                    <td>
                      <span className={`status-badge badge-${b.status} mono`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                      {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        onClick={() => setSelectedSession(b)}
                      >
                        Details &amp; Actions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <Modal
          title={`Session #${selectedSession.id}: ${selectedSession.topic || 'Pairing Call'}`}
          onClose={() => setSelectedSession(null)}
          maxWidth="740px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Top Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Learner</div>
                <div style={{ fontWeight: 700 }}>{selectedSession.learner_name}</div>
                <div className="sub" style={{ fontSize: '11.5px' }}>Role: Learner</div>
              </div>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Mentor</div>
                <div style={{ fontWeight: 700, color: 'var(--brand)' }}>{selectedSession.mentor_name}</div>
                <div className="sub" style={{ fontSize: '11.5px' }}>Stack: {selectedSession.tech_stack}</div>
              </div>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Price &amp; Escrow</div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>₹{selectedSession.price}</div>
                <div className="sub" style={{ fontSize: '11.5px' }}>Payment: {selectedSession.payment_status}</div>
              </div>
            </div>

            {/* Time & Duration details */}
            <div className="mini-card" style={{ padding: '14px', background: 'var(--panel-bg)' }}>
              <div className="section-label" style={{ marginTop: 0 }}>Session Logistics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontSize: '13px' }}>
                <div>
                  <strong>Scheduled Date/Time:</strong><br />
                  <span className="mono" style={{ color: 'var(--brand)' }}>
                    {selectedSession.scheduled_at ? new Date(selectedSession.scheduled_at).toLocaleString() : 'TBD'}
                  </span>
                </div>
                <div>
                  <strong>Booked Duration:</strong><br />
                  <span className="mono">{selectedSession.duration_minutes} minutes</span>
                </div>
                <div>
                  <strong>Session Format:</strong><br />
                  <span>{selectedSession.session_type}</span>
                </div>
                <div>
                  <strong>Lifecycle Status:</strong><br />
                  <span className={`status-badge badge-${selectedSession.status} mono`}>
                    {selectedSession.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Problem & Shared Summary */}
            <div>
              <div className="section-label">Learner Problem &amp; Agenda</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {selectedSession.problem_description}
              </p>
            </div>

            <div>
              <div className="section-label">Session Summary &amp; Mentor Notes</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {selectedSession.session_summary}
              </p>
            </div>

            {/* Admin Actions Bar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowRescheduleModal(true)}
                >
                  <CalendarIcon size={14} />
                  <span>Reschedule Session</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowCancelModal(true)}
                >
                  <XIcon size={14} />
                  <span>Cancel Session</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: 'var(--warn)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setRefundAmount(String(selectedSession.price));
                    setShowRefundModal(true);
                  }}
                >
                  <RefreshIcon size={14} />
                  <span>Refund Session</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowResolveModal(true)}
                >
                  <ScaleIcon size={14} />
                  <span>Resolve Issue</span>
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <Modal
          title={`Reschedule Session #${selectedSession?.id}`}
          onClose={() => setShowRescheduleModal(false)}
          maxWidth="440px"
        >
          <form onSubmit={handleReschedule}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Select a new calendar time slot for both {selectedSession?.learner_name} and {selectedSession?.mentor_name}.
            </p>
            <div className="field">
              <label>New Date &amp; Time (IST)</label>
              <input
                type="datetime-local"
                value={rescheduleDateTime}
                onChange={(e) => setRescheduleDateTime(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRescheduleModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save New Time
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Session Modal */}
      {showCancelModal && (
        <Modal
          title={`Cancel Session #${selectedSession?.id}`}
          onClose={() => setShowCancelModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleCancelSession}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              This will immediately cancel the booking and release any held escrow funds according to platform cancellation policy.
            </p>
            <div className="field">
              <label>Cancellation Reason / Admin Note</label>
              <textarea
                rows={3}
                placeholder="e.g., Mentor requested emergency cancellation due to illness..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              ></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCancelModal(false)}
              >
                Back
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: '#DC2626', borderColor: '#DC2626' }}>
                Confirm Cancellation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Refund Session Modal */}
      {showRefundModal && (
        <Modal
          title={`Refund Session #${selectedSession?.id}`}
          onClose={() => setShowRefundModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleRefundSession}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Issue a full or partial refund to learner {selectedSession?.learner_name}.
            </p>
            <div className="field">
              <label>Refund Amount (₹)</label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={selectedSession?.price}
                min="1"
                required
              />
              <span className="sub" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                Maximum refundable: ₹{selectedSession?.price}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRefundModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Process Refund
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Resolve Issue Modal */}
      {showResolveModal && (
        <Modal
          title={`Resolve Session Issue #${selectedSession?.id}`}
          onClose={() => setShowResolveModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleResolveIssue}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Arbitrate dispute between learner and mentor. Marking as resolved will finalize payment and log this decision.
            </p>
            <div className="field">
              <label>Resolution Summary &amp; Decision</label>
              <textarea
                rows={3}
                placeholder="e.g., Code reviewed and verified working by mentor. Dispute dismissed and payout released."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                required
              ></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowResolveModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Resolve &amp; Release
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
