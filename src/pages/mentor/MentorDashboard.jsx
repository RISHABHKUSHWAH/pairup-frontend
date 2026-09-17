import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import TourBanner from '../../components/TourBanner';
import { api, initials } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ClockIcon, VideoIcon, MessageIcon, DocumentIcon, FileEditIcon, WalletIcon, SearchIcon, CalendarIcon } from '../../components/Icons';
import PairUpLoader from '../../components/PairUpLoader';

export default function MentorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    upcomingSessions: 0,
    todaySessions: 0,
    openProblems: 0,
    pendingProposals: 0,
    netEarnings: 0,
    escrowEarnings: 0,
    activeChats: 0,
  });
  const [todayList, setTodayList] = useState([]);
  const [upcomingList, setUpcomingList] = useState([]);
  const [newProblems, setNewProblems] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [bookings, problems, proposals, conversations] = await Promise.all([
          api.getBookings().catch(() => []),
          api.getProblems().catch(() => []),
          api.getMyProposals().catch(() => []),
          api.getConversations().catch(() => []),
        ]);

        const todayDateStr = new Date().toISOString().slice(0, 10);

        const upcoming = bookings.filter((b) => ['pending', 'accepted', 'paid'].includes(b.status));
        const today = upcoming.filter((b) => {
          if (!b.scheduled_time) return false;
          return b.scheduled_time.startsWith(todayDateStr);
        });

        let net = 0;
        let escrow = 0;
        try {
          const payments = await api.getMyPayments();
          payments.forEach((p) => {
            const val = Number(p.net_amount || p.amount || 0);
            if (p.status === 'released') net += val;
            if (p.status === 'held_in_escrow' || p.status === 'escrow') escrow += val;
          });
        } catch {
          if (user?.email === 'alex@example.com') {
            net = 14500;
            escrow = 2400;
          }
        }

        let msgs = conversations || [];
        if (msgs.length === 0 && user?.email === 'alex@example.com') {
          msgs = [
            {
              id: 'm1',
              sender: 'Rahul Sharma',
              avatar: 'RS',
              preview: 'Thanks for the explanation on Docker compose volumes! Looking forward to next session.',
              time: '20m ago',
              unread: true,
            },
            {
              id: 'm2',
              sender: 'Priya Patel',
              avatar: 'PP',
              preview: 'Can we move our React review session 30 mins later today if possible?',
              time: '2h ago',
              unread: false,
            },
            {
              id: 'm3',
              sender: 'Amit Verma',
              avatar: 'AV',
              preview: 'I pushed the commit with the revised SQL query we discussed.',
              time: 'Yesterday',
              unread: false,
            },
          ];
        }

        setStats({
          upcomingSessions: upcoming.length,
          todaySessions: today.length,
          openProblems: problems.filter((p) => p.status === 'open').length,
          pendingProposals: proposals.filter((p) => p.status === 'pending').length,
          netEarnings: net,
          escrowEarnings: escrow,
          activeChats: msgs.length,
        });

        setTodayList(today);
        setUpcomingList(upcoming.slice(0, 5));
        setNewProblems(problems.slice(0, 4));
        setMyProposals(proposals.slice(0, 4));
        setRecentMessages(msgs.slice(0, 3));
      } catch (err) {
        console.error('Failed to load mentor dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (loading) {
    return (
      <PortalLayout title="Mentor Dashboard" portalType="mentor">
        <div style={{ minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PairUpLoader text="LOADING MENTOR DASHBOARD" size={440} />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Mentor Dashboard" portalType="mentor">
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <p className="sub" style={{ margin: 0, fontSize: '14px' }}>
            Welcome back! Here's a complete live overview of your mentoring queue, requests, and earnings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/mentor/explore-problems" className="btn btn-primary" style={{ fontSize: '13px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <SearchIcon size={13} /> Explore Problems
            </span>
          </Link>
          <Link to="/mentor/sessions" className="btn btn-secondary" style={{ fontSize: '13px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <ClockIcon size={13} /> My Sessions
            </span>
          </Link>
          <Link to="/mentor/availability" className="btn btn-ghost" style={{ fontSize: '13px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <CalendarIcon size={13} /> Update Availability
            </span>
          </Link>
        </div>
      </div>

      <TourBanner role="mentor" />

      {/* 1. Overview (6 Metric Cards) */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: '24px' }} data-tour="metrics">
        <div className="metric-card">
          <div className="metric-label">Upcoming Sessions</div>
          <div className="metric-value">{loading ? '—' : stats.upcomingSessions}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Active confirmed bookings</div>
        </div>

        <div className="metric-card" style={{ borderColor: 'var(--brand)' }}>
          <div className="metric-label" style={{ color: 'var(--brand)' }}>Today's Sessions</div>
          <div className="metric-value" style={{ color: 'var(--brand)' }}>
            {loading ? '—' : stats.todaySessions}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Scheduled for today</div>
        </div>

        <Link
          to="/mentor/explore-problems"
          className="metric-card"
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Open Problems</div>
            <span style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 600 }}>Explore →</span>
          </div>
          <div className="metric-value">{loading ? '—' : stats.openProblems}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Learner requests awaiting mentors</div>
        </Link>

        <div className="metric-card">
          <div className="metric-label">Pending Proposals</div>
          <div className="metric-value">{loading ? '—' : stats.pendingProposals}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Under learner review</div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ color: '#10b981' }}>Net Earnings</div>
          <div className="metric-value" style={{ color: '#10b981' }}>
            {loading ? '—' : `₹${stats.netEarnings.toLocaleString('en-IN')}`}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>+₹{stats.escrowEarnings} in escrow</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Active Chats</div>
          <div className="metric-value">{loading ? '—' : stats.activeChats}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Direct learner threads</div>
        </div>
      </div>

      {/* Today's Spotlight if any sessions scheduled today */}
      {todayList.length > 0 && (
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(139, 92, 246, 0.1))',
            border: '1px solid var(--brand)',
            borderRadius: '10px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}>
              <ClockIcon size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                You have {todayList.length} session{todayList.length > 1 ? 's' : ''} scheduled today!
              </div>
              <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                Next: {todayList[0].topic || 'Mentorship Session'} with {todayList[0].learner_name} at{' '}
                {new Date(todayList[0].scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to={`/session?booking_id=${todayList[0].id}`} className="btn btn-primary" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <VideoIcon size={14} />
              <span>Enter Room</span>
            </Link>
            <Link to="/chat" className="btn btn-ghost" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <MessageIcon size={14} />
              <span>Chat</span>
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming Sessions Queue */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>⏱️ Upcoming Sessions Queue</h3>
            <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
              Confirmed and pending pairing calls
            </div>
          </div>
          <Link to="/mentor/sessions" className="btn btn-ghost" style={{ fontSize: '12px' }}>
            View All Sessions →
          </Link>
        </div>

        {loading ? (
          <p className="sub">Loading sessions...</p>
        ) : upcomingList.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: 0 }}>
              No upcoming sessions right now. Browse open problem requests to send proposals.
            </p>
            <Link to="/mentor/explore-problems" className="btn btn-primary" style={{ marginTop: '12px', display: 'inline-block', fontSize: '13px' }}>
              Explore Learner Problems
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Topic</th>
                  <th>Schedule</th>
                  <th>Rate</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {upcomingList.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand)', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {initials(b.learner_name)}
                        </div>
                        {b.learner_name}
                      </div>
                    </td>
                    <td>{b.topic || 'Pair Programming'}</td>
                    <td style={{ fontSize: '12px' }}>
                      {b.scheduled_time
                        ? new Date(b.scheduled_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        : 'To be scheduled'}
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{b.price}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span className={`status-badge badge-${b.status} mono`}>{b.status}</span>
                        {b.status === 'paid' || b.payment_status === 'paid' || b.payment_status === 'held_in_escrow' ? (
                          <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            🛡️ Escrow Paid
                          </span>
                        ) : b.status === 'accepted' ? (
                          <span style={{ fontSize: '10.5px', color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            ⏳ Awaiting Payment
                          </span>
                        ) : b.status === 'completed' ? (
                          <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            ✓ Escrow Released
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {b.status === 'paid' ? (
                        <Link to={`/session?booking_id=${b.id}`} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                          Join Call
                        </Link>
                      ) : (
                        <Link to="/mentor/sessions" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                          Manage
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Column Grid: New Problem Requests & Pending Proposals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Explore Learner Problems Feed */}
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SearchIcon size={16} />
                <span>Explore Learner Problems</span>
              </h3>
              <p className="sub" style={{ margin: '2px 0 0', fontSize: '11.5px' }}>
                Live problems posted by learners seeking expert pairing
              </p>
            </div>
            <Link to="/mentor/explore-problems" style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>
              Explore All ({stats.openProblems}) →
            </Link>
          </div>

          {newProblems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p className="sub" style={{ fontSize: '13px', margin: 0 }}>No open problem requests right now.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {newProblems.map((prob) => {
                const budgetLabel = prob.budget
                  ? `₹${prob.budget}`
                  : prob.budget_min && prob.budget_max
                  ? `₹${prob.budget_min} - ₹${prob.budget_max}`
                  : 'Flexible';

                return (
                  <div
                    key={prob.id}
                    style={{
                      padding: '13px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--card-bg, #1a1a24)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)' }}>{prob.title}</div>
                        <div className="sub" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                          Posted by <strong style={{ color: 'var(--ink)' }}>{prob.learner_name || 'Learner'}</strong> • {prob.created_at ? new Date(prob.created_at).toLocaleDateString() : 'Recently'}
                        </div>
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: '11px', flexShrink: 0 }}>
                        {budgetLabel}
                      </span>
                    </div>
                    <div
                      className="sub"
                      style={{
                        fontSize: '12px',
                        lineHeight: 1.45,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {prob.description}
                    </div>
                    {prob.skills && prob.skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {prob.skills.slice(0, 4).map((s) => (
                          <span key={s} className="tag" style={{ fontSize: '10.5px', padding: '2px 7px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className="badge badge-secondary" style={{ fontSize: '10.5px' }}>
                        {prob.category || 'Engineering'}
                      </span>
                      <Link
                        to="/mentor/explore-problems"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                      >
                        Explore &amp; Propose →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Proposals Tracking */}
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileEditIcon size={16} />
              <span>My Proposals Tracking</span>
            </h3>
            <Link to="/mentor/my-proposals" style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none' }}>
              View All ({stats.pendingProposals}) →
            </Link>
          </div>

          {myProposals.length === 0 ? (
            <p className="sub" style={{ fontSize: '13px' }}>
              You haven't submitted any proposals yet. Check open problem requests!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myProposals.map((prop) => (
                <div
                  key={prop.id}
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--card-bg, #1a1a24)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>
                      {prop.problem_title || `Proposal for Request #${prop.problem}`}
                    </div>
                    <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                      Proposed ₹{prop.price} • {prop.estimated_duration_minutes || 60} mins
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-badge badge-${prop.status} mono`} style={{ fontSize: '11px' }}>
                      {prop.status}
                    </span>
                    <Link to="/mentor/my-proposals" className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: '11px' }}>
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Grid: Net Earnings Snapshot & Recent Messages Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {/* Net Earnings Snapshot */}
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WalletIcon size={16} />
              <span>Net Earnings Snapshot</span>
            </h3>
            <Link to="/mentor/earnings" style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none' }}>
              Payout Console →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '12px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div className="sub" style={{ fontSize: '11px' }}>Total Cleared Earnings</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
                ₹{stats.netEarnings.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div className="sub" style={{ fontSize: '11px' }}>Held in Escrow</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--brand)', marginTop: '2px' }}>
                ₹{stats.escrowEarnings.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 14px' }}>
            Funds are held in escrow during active sessions and released automatically 2 hours after completion or upon mutual sign-off.
          </p>

          <Link to="/mentor/earnings" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', fontSize: '13px' }}>
            View Full Earnings & Request Payout
          </Link>
        </div>

        {/* Recent Messages */}
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageIcon size={16} />
              <span>Recent Messages</span>
            </h3>
            <Link to="/chat" style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none' }}>
              Open Chat Room →
            </Link>
          </div>

          {recentMessages.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p className="sub" style={{ margin: 0, fontSize: '13px' }}>
                No messages yet. Direct messages from learners will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentMessages.map((msg) => {
                const partnerId = msg.other_id || msg.user_id || msg.id;
                const partnerName = msg.other_name || msg.name || msg.sender || msg.user_name || 'Learner';
                const chatUrl = partnerId && !isNaN(Number(partnerId))
                  ? `/chat?with=${partnerId}&name=${encodeURIComponent(partnerName)}`
                  : '/chat';
                return (
                  <Link
                    key={msg.id || partnerId}
                    to={chatUrl}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--card-bg, #1a1a24)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--brand)', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                      {msg.avatar || initials(partnerName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{partnerName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{msg.time || msg.last_time || 'Recently'}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {msg.preview || msg.last_message || msg.body || 'Active conversation'}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
