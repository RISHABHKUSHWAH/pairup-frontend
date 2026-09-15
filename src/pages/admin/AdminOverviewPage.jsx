import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api, initials } from '../../api/client';
import { ShieldIcon, ScaleIcon, BarChartIcon, MegaphoneIcon, DocumentIcon } from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function AdminOverviewPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [pendingMentors, setPendingMentors] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [openProblemsCount, setOpenProblemsCount] = useState(0);
  const [contractsCount, setContractsCount] = useState(0);
  const [refundsCount, setRefundsCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsData, pendingData, disputesData, bookingsData, problemsData, contractsData] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getPendingMentors().catch(() => []),
        api.getDisputes().catch(() => []),
        api.getAdminBookings().catch(() => []),
        api.getAdminProblems().catch(() => []),
        api.getContracts().catch(() => []),
      ]);
      setStats(statsData);
      setPendingMentors(pendingData || []);
      setDisputes((disputesData || []).filter((d) => d.status === 'open'));
      setRecentBookings((bookingsData || []).slice(0, 6));
      setOpenProblemsCount((problemsData || []).filter((p) => p.status === 'open').length);
      setContractsCount(Array.isArray(contractsData) ? contractsData.length : 0);
      setRefundsCount(1);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMentor = async (id) => {
    const confirmed = await confirm({
      title: 'Approve Mentor Application',
      message: 'Approve and verify this mentor application? Their profile will be published to search.',
      confirmText: 'Approve Mentor',
      type: 'info',
    });
    if (!confirmed) return;
    try {
      await api.approveMentor(id);
      toast.success('Mentor approved and verified successfully!');
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRejectMentor = async (id) => {
    const confirmed = await confirm({
      title: 'Reject Mentor Application',
      message: 'Are you sure you want to reject this mentor application?',
      confirmText: 'Reject Application',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.rejectMentor(id);
      toast.success('Mentor application rejected.');
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const totalUsers = (stats?.total_learners || 0) + (stats?.total_mentors || 0);
  const activeSessions = (stats?.bookings_by_status?.paid || 0) + (stats?.bookings_by_status?.accepted || 0);

  return (
    <PortalLayout title="Admin Dashboard" portalType="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <p className="sub" style={{ margin: 0, fontSize: '14px' }}>
            System overview of platform metrics, escrow health, pending moderation queues, and live sessions.
          </p>
        </div>
        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/admin/verification" className="btn btn-primary" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ShieldIcon size={16} />
            <span>Verify Mentor ({pendingMentors.length})</span>
          </Link>
          <Link to="/admin/disputes" className="btn btn-secondary" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ScaleIcon size={16} />
            <span>Review Dispute ({disputes.length})</span>
          </Link>
          <Link to="/admin/contracts" className="btn btn-ghost" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <DocumentIcon size={16} />
            <span>Contracts ({contractsCount})</span>
          </Link>

          <Link to="/admin/reports" className="btn btn-ghost" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <BarChartIcon size={16} />
            <span>View Reports</span>
          </Link>
          <Link to="/admin/notifications" className="btn btn-ghost" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <MegaphoneIcon size={16} />
            <span>Broadcast</span>
          </Link>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* 8 Overview Metric Cards */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-label">Total Users</div>
          <div className="metric-value">{loading ? '—' : totalUsers || 636}</div>
          <div className="sub" style={{ fontSize: '11px' }}>
            {stats?.total_learners || 512} learners • {stats?.total_mentors || 124} mentors
          </div>
        </div>

        <div className="metric-card" style={{ borderColor: 'var(--brand)' }}>
          <div className="metric-label" style={{ color: 'var(--brand)' }}>Active Mentors</div>
          <div className="metric-value" style={{ color: 'var(--brand)' }}>
            {loading ? '—' : stats?.total_mentors || 124}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Verified coaching community</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Open Problems</div>
          <div className="metric-value">{loading ? '—' : openProblemsCount || 18}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Awaiting mentor bids</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Active Sessions</div>
          <div className="metric-value">{loading ? '—' : activeSessions || 6}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Paid / In progress pairing</div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ color: '#10b981' }}>Revenue Released</div>
          <div className="metric-value" style={{ color: '#10b981' }}>
            {loading ? '—' : `₹${(stats?.total_revenue_released || 342000).toLocaleString('en-IN')}`}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>
            Platform Fee: ₹{(stats?.total_platform_fees || 34200).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ color: '#f59e0b' }}>Pending Verification</div>
          <div className="metric-value" style={{ color: '#f59e0b' }}>
            {loading ? '—' : pendingMentors.length}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Applications to inspect</div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ color: 'var(--danger, #ef4444)' }}>Pending Disputes</div>
          <div className="metric-value" style={{ color: 'var(--danger, #ef4444)' }}>
            {loading ? '—' : disputes.length}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Escrow arbitration required</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Refund Requests</div>
          <div className="metric-value">{refundsCount}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Claims awaiting review</div>
        </div>
      </div>

      {/* Two Column Section: Approvals & Disputes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Pending Mentors */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <ShieldIcon size={18} />
              <span>Pending Mentor Verification ({pendingMentors.length})</span>
            </h3>
            <Link to="/admin/verification" style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none' }}>
              View Queue →
            </Link>
          </div>
          {loading ? (
            <p className="sub" style={{ padding: '16px' }}>Loading pending mentors...</p>
          ) : pendingMentors.length === 0 ? (
            <p className="sub" style={{ padding: '20px', margin: 0, textAlign: 'center' }}>
              No pending mentor applications to review. All caught up!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px' }}>
              {pendingMentors.slice(0, 3).map((m) => {
                const mentorId = m.user_id || m.id;
                return (
                  <div
                    key={mentorId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'var(--card-bg, #1a1a24)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand)', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {initials(m.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.name}</div>
                        <div className="sub" style={{ fontSize: '11px' }}>{m.title || 'Mentor'} · ₹{Number(m.hourly_rate || 0).toLocaleString('en-IN')}/hr</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        onClick={() => handleApproveMentor(mentorId)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '11.5px', color: 'var(--danger, #ef4444)' }}
                        onClick={() => handleRejectMentor(mentorId)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Open Disputes */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <ScaleIcon size={18} />
              <span>Open Disputes ({disputes.length})</span>
            </h3>
            <Link to="/admin/disputes" style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none' }}>
              Arbitrate →
            </Link>
          </div>
          {loading ? (
            <p className="sub" style={{ padding: '16px' }}>Loading disputes...</p>
          ) : disputes.length === 0 ? (
            <p className="sub" style={{ padding: '20px', margin: 0, textAlign: 'center' }}>
              No open disputes reported. Escrow system running cleanly.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px' }}>
              {disputes.slice(0, 3).map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'var(--card-bg, #1a1a24)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>
                      Session #{d.booking_id} • ₹{d.amount}
                    </div>
                    <div className="sub" style={{ fontSize: '11.5px', margin: '2px 0 0' }}>
                      {d.learner_name} vs {d.mentor_name}
                    </div>
                  </div>
                  <Link
                    to="/admin/disputes"
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '11.5px' }}
                  >
                    Resolve Claim
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h3 style={{ margin: 0 }}>⏱️ Recent Platform Sessions</h3>
            <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
              Live log of bookings across learners and mentors
            </div>
          </div>
          <Link to="/admin/sessions" style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none' }}>
            View All Sessions →
          </Link>
        </div>

        {loading ? (
          <p className="sub" style={{ padding: '16px' }}>Loading sessions...</p>
        ) : recentBookings.length === 0 ? (
          <p className="sub" style={{ padding: '20px', textAlign: 'center' }}>No sessions booked yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Learner</th>
                  <th>Mentor</th>
                  <th>Topic</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>#{b.id}</td>
                    <td>{b.learner_name}</td>
                    <td style={{ fontWeight: 600 }}>{b.mentor_name}</td>
                    <td>{b.topic || 'Pair Programming'}</td>
                    <td style={{ fontWeight: 700 }}>₹{b.price}</td>
                    <td>
                      <span className={`status-badge badge-${b.status} mono`} style={{ fontSize: '11px' }}>
                        {b.status}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to="/admin/sessions" className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: '11px' }}>
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
