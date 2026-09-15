import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { adminReports } from '../../api/client';
import { DownloadIcon } from '../../components/Icons';
import { useToast } from '../../context';

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'sessions' | 'finance' | 'analytics'
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(adminReports.getAnalytics());
  }, []);

  if (!data) return null;

  return (
    <PortalLayout
      title="Platform Reports &amp; Analytics"
      portalType="admin"
      actions={
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          onClick={() => toast.info('Exporting complete platform analytics summary (CSV)...')}
        >
          <DownloadIcon size={14} />
          <span>Export Reports</span>
        </button>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Comprehensive reporting console across User Growth, Session Fulfillment, Financial Ledgers, and Platform Conversion Metrics.
      </p>

      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Growth &amp; Cohorts
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Session Fulfillment
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'finance' ? 'active' : ''}`}
          onClick={() => setActiveTab('finance')}
        >
          Financial Overview
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Platform Conversion KPIs
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div>
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
            <div className="metric-card">
              <div className="metric-label">Total Registered Users</div>
              <div className="metric-value">636</div>
              <div className="sub" style={{ fontSize: '11px' }}>+34% this month</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Learner Accounts</div>
              <div className="metric-value">512</div>
              <div className="sub" style={{ fontSize: '11px' }}>80.5% of community</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Verified Mentors</div>
              <div className="metric-value" style={{ color: 'var(--brand)' }}>124</div>
              <div className="sub" style={{ fontSize: '11px' }}>19.5% of community</div>
            </div>
            <div className="metric-card">
              <div className="metric-label" style={{ color: '#10b981' }}>Monthly Active Users</div>
              <div className="metric-value" style={{ color: '#10b981' }}>482</div>
              <div className="sub" style={{ fontSize: '11px' }}>75.7% active engagement</div>
            </div>
          </div>

          <div className="panel">
            <div className="section-label" style={{ marginTop: 0 }}>Monthly User Growth Trajectory</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>New Learners</th>
                    <th>New Mentors</th>
                    <th>Total Cumulative</th>
                    <th>Growth Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.userGrowth.map((row, idx) => (
                    <tr key={row.month}>
                      <td style={{ fontWeight: 600 }}>{row.month}</td>
                      <td>+{row.learners}</td>
                      <td>+{row.mentors}</td>
                      <td style={{ fontWeight: 700 }}>{row.total}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>
                        {idx === 0 ? '—' : `+${Math.round(((row.total - data.userGrowth[idx - 1].total) / data.userGrowth[idx - 1].total) * 100)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SESSIONS */}
      {activeTab === 'sessions' && (
        <div>
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
            <div className="metric-card">
              <div className="metric-label">Total Bookings</div>
              <div className="metric-value">{data.sessions.totalBooked}</div>
              <div className="sub" style={{ fontSize: '11px' }}>Lifetime platform pairings</div>
            </div>
            <div className="metric-card" style={{ borderColor: 'var(--brand)' }}>
              <div className="metric-label" style={{ color: '#10b981' }}>Completion Rate</div>
              <div className="metric-value" style={{ color: '#10b981' }}>{data.sessions.completionRate}%</div>
              <div className="sub" style={{ fontSize: '11px' }}>258 sessions successfully concluded</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Cancellation Rate</div>
              <div className="metric-value" style={{ color: 'var(--danger, #ef4444)' }}>6.3%</div>
              <div className="sub" style={{ fontSize: '11px' }}>18 mutual or learner cancellations</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Average Duration</div>
              <div className="metric-value">{data.sessions.avgDurationMinutes} mins</div>
              <div className="sub" style={{ fontSize: '11px' }}>Per pairing encounter</div>
            </div>
          </div>

          <div className="panel">
            <div className="section-label" style={{ marginTop: 0 }}>Session Duration Distribution</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '10px' }}>
              {Object.entries(data.sessions.durationBreakdown).map(([dur, count]) => (
                <div key={dur} style={{ padding: '14px', background: 'var(--card-bg, #1a1a24)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div className="sub" style={{ fontSize: '12px' }}>{dur} Duration</div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '4px 0' }}>{count} sessions</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {Math.round((count / data.sessions.totalBooked) * 100)}% of all sessions
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCE */}
      {activeTab === 'finance' && (
        <div>
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
            <div className="metric-card">
              <div className="metric-label">Gross Transaction Volume</div>
              <div className="metric-value">₹{data.finance.grossVolume.toLocaleString('en-IN')}</div>
              <div className="sub" style={{ fontSize: '11px' }}>100% processed through escrow</div>
            </div>
            <div className="metric-card" style={{ borderColor: 'var(--brand)' }}>
              <div className="metric-label" style={{ color: 'var(--brand)' }}>Platform Commission (Net)</div>
              <div className="metric-value" style={{ color: 'var(--brand)' }}>
                ₹{data.finance.platformRevenue.toLocaleString('en-IN')}
              </div>
              <div className="sub" style={{ fontSize: '11px' }}>10% standard platform take</div>
            </div>
            <div className="metric-card">
              <div className="metric-label" style={{ color: '#10b981' }}>Disbursed to Mentors</div>
              <div className="metric-value" style={{ color: '#10b981' }}>
                ₹{data.finance.netMentorPayouts.toLocaleString('en-IN')}
              </div>
              <div className="sub" style={{ fontSize: '11px' }}>Bank transfers & instant UPI</div>
            </div>
            <div className="metric-card">
              <div className="metric-label" style={{ color: '#f59e0b' }}>Held in Escrow</div>
              <div className="metric-value" style={{ color: '#f59e0b' }}>
                ₹{data.finance.escrowHeld.toLocaleString('en-IN')}
              </div>
              <div className="sub" style={{ fontSize: '11px' }}>Upcoming & active calls</div>
            </div>
          </div>

          <div className="panel">
            <div className="section-label" style={{ marginTop: 0 }}>Key Financial Averages</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '8px' }}>
              <div style={{ padding: '12px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Average Booking Value</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }}>₹{data.finance.avgBookingValue}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Refund Claim Ratio</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }}>1.2%</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Mentor Retention</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>94.2%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM ANALYTICS */}
      {activeTab === 'analytics' && (
        <div>
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
            <div className="metric-card">
              <div className="metric-label">Problems Posted vs Solved</div>
              <div className="metric-value">{data.platformKpis.problemsSolved} / {data.platformKpis.problemsPosted}</div>
              <div className="sub" style={{ fontSize: '11px' }}>{data.platformKpis.problemSolveRate}% resolution rate</div>
            </div>
            <div className="metric-card">
              <div className="metric-label" style={{ color: 'var(--brand)' }}>Mentor Acceptance Rate</div>
              <div className="metric-value" style={{ color: 'var(--brand)' }}>{data.platformKpis.mentorAcceptanceRate}%</div>
              <div className="sub" style={{ fontSize: '11px' }}>Session invitations accepted</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Proposal Conversion Rate</div>
              <div className="metric-value">{data.platformKpis.proposalConversionRate}%</div>
              <div className="sub" style={{ fontSize: '11px' }}>Proposals accepted by learners</div>
            </div>
            <div className="metric-card">
              <div className="metric-label" style={{ color: '#10b981' }}>Repeat Learners</div>
              <div className="metric-value" style={{ color: '#10b981' }}>{data.platformKpis.repeatLearnerRate}%</div>
              <div className="sub" style={{ fontSize: '11px' }}>Learners booking 2+ sessions</div>
            </div>
          </div>

          <div className="panel">
            <div className="section-label" style={{ marginTop: 0 }}>Platform Quality &amp; Trust Index</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '14px', background: 'var(--card-bg, #1a1a24)', borderRadius: '8px' }}>
              <div style={{ fontSize: '36px' }}>⭐</div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                  ★ {data.platformKpis.avgMentorRating} Average Platform Rating
                </div>
                <div className="sub" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
                  Calculated across all verified reviews given by learners over the past 12 months.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
