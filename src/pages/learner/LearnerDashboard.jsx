import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import BookSessionModal from '../../components/BookSessionModal';
import TourBanner from '../../components/TourBanner';
import { api, initials, stars, learnerFavorites } from '../../api/client';
import { SearchIcon, PlusIcon, DocumentIcon } from '../../components/Icons';
import { useToast } from '../../context';
import PairUpLoader from '../../components/PairUpLoader';

export default function LearnerDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    active: 0,
    openProblems: 0,
    pendingProposals: 0,
    conversations: 0,
    spent: 0,
  });

  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [openProblems, setOpenProblems] = useState([]);
  const [pendingProposals, setPendingProposals] = useState([]);
  const [recommendedMentors, setRecommendedMentors] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick booking modal state
  const [bookingMentor, setBookingMentor] = useState(null);
  const [bookingTopic, setBookingTopic] = useState('');
  const [bookingDuration, setBookingDuration] = useState(60);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const navigate = useNavigate();

  const isSessionLive = (s) => {
    if (s.status !== 'paid') return false;
    const raw = s.scheduled_at || s.scheduled_time;
    if (!raw) return true;
    const date = new Date(raw);
    if (isNaN(date.getTime())) return true;
    const durationMs = (s.duration_minutes || 60) * 60 * 1000;
    const startMs = date.getTime();
    const endMs = startMs + durationMs;
    const now = Date.now();
    return now >= (startMs - 15 * 60 * 1000) && now <= (endMs + 30 * 60 * 1000);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [bookings, problems, conversations, mentors, payments] = await Promise.all([
          api.getBookings().catch(() => []),
          api.getMyProblems().catch(() => []),
          api.getConversations().catch(() => []),
          api.getMentors({ sort: 'rating' }).catch(() => []),
          api.getMyPayments().catch(() => []),
        ]);

        const upcoming = bookings.filter((b) => ['pending', 'accepted', 'paid'].includes(b.status));
        const openProbs = problems.filter((p) => p.status === 'open');

        // Fetch proposals for open problems to show pending proposals queue
        let proposalsList = [];
        try {
          const propPromises = openProbs.slice(0, 3).map((p) =>
            api.getProposals(p.id).then((props) =>
              props.map((prop) => ({ ...prop, problem_title: p.title, problem_id: p.id }))
            ).catch(() => [])
          );
          const propResults = await Promise.all(propPromises);
          proposalsList = propResults.flat().filter((pr) => pr.status === 'pending');
        } catch {
          proposalsList = [];
        }

        const spent = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        setStats({
          active: upcoming.length,
          openProblems: openProbs.length,
          pendingProposals: proposalsList.length,
          conversations: conversations.length,
          spent,
        });

        setUpcomingSessions(upcoming.slice(0, 4));
        setOpenProblems(openProbs.slice(0, 3));
        setPendingProposals(proposalsList.slice(0, 4));
        setRecommendedMentors(mentors.slice(0, 4));
        setRecentMessages(conversations.slice(0, 4));
        setRecentPayments(payments.slice(0, 4));
      } catch (err) {
        console.error('Failed to load learner dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const openBooking = (mentor) => {
    setBookingMentor(mentor);
    setBookingTopic('');
    setBookingDuration(60);
    setBookingDate(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    setBookingError('');
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingTopic.trim()) {
      setBookingError('Please enter a session topic.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    try {
      const calculatedPrice = Math.max(1, Math.round((Number(bookingMentor.hourly_rate || 50) * bookingDuration) / 60));
      await api.createBooking({
        mentor_id: Number(bookingMentor.user_id || bookingMentor.id),
        topic: bookingTopic.trim(),
        duration_minutes: bookingDuration,
        price: calculatedPrice,
        hourly_rate: Number(bookingMentor.hourly_rate || 50),
        scheduled_at: bookingDate,
      });

      toast.success('Session requested! Check Upcoming Sessions.');
      setBookingMentor(null);
      navigate('/learner/sessions');
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAcceptProposal = async (problemId, proposalId) => {
    try {
      await api.acceptProposal(problemId, proposalId);
      toast.success('Proposal accepted! A booking has been created for your session.');
      navigate('/learner/sessions');
    } catch (err) {
      toast.error('Could not accept proposal: ' + err.message);
    }
  };

  if (loading) {
    return (
      <PortalLayout title="Learner Dashboard" portalType="learner">
        <div style={{ minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PairUpLoader text="LOADING YOUR DASHBOARD" size={440} />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      title="Learner Dashboard"
      portalType="learner"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/learner/explore" className="btn btn-ghost" style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <SearchIcon size={14} />
            <span>Explore Mentors</span>
          </Link>
          <Link to="/learner/post-problem" className="btn btn-primary" style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <PlusIcon size={14} />
            <span>Post a Problem</span>
          </Link>
        </div>
      }
    >
      <TourBanner role="learner" />

      <p className="sub" style={{ marginBottom: '20px' }}>
        Welcome back! Here is a live overview of your mentoring sessions, open bugs, and proposals.
      </p>

      {/* 1. Overview Metrics (4 Cards) */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }} data-tour="metrics">
        <div className="card">
          <div className="section-label" style={{ marginTop: 0 }}>Upcoming Sessions</div>
          <div className="stat-num">{loading ? '—' : stats.active}</div>
        </div>
        <div className="card">
          <div className="section-label" style={{ marginTop: 0 }}>Open Problems</div>
          <div className="stat-num">{loading ? '—' : stats.openProblems}</div>
        </div>
        <div className="card">
          <div className="section-label" style={{ marginTop: 0, color: 'var(--accent)' }}>Pending Proposals</div>
          <div className="stat-num" style={{ color: 'var(--accent)' }}>{loading ? '—' : stats.pendingProposals}</div>
        </div>
        <div className="card">
          <div className="section-label" style={{ marginTop: 0 }}>Active Chats</div>
          <div className="stat-num">{loading ? '—' : stats.conversations}</div>
        </div>
      </div>

      {/* Quick Actions Banners */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: '28px' }} data-tour="quick-actions">
        <Link
          to="/learner/explore"
          className="card"
          style={{
            display: 'block',
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--accent-soft) 100%)',
            border: '1px solid var(--accent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)' }}>
              <SearchIcon size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>Explore Mentors</div>
              <p className="sub" style={{ margin: '4px 0 0', fontSize: '12.5px' }}>
                Search and filter top software engineers by stack, rating, or rate.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/learner/post-problem"
          className="card"
          style={{
            display: 'block',
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--add-bg) 100%)',
            border: '1px solid var(--add)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)' }}>
              <PlusIcon size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>Post a Problem</div>
              <p className="sub" style={{ margin: '4px 0 0', fontSize: '12.5px' }}>
                Describe your code bug or architecture questions and receive proposals.
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* 2. Upcoming Sessions */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-head">
            <h3>Upcoming Sessions</h3>
            <Link to="/learner/sessions">View all ({stats.active})</Link>
          </div>

          {loading ? (
            <p className="sub">Loading sessions...</p>
          ) : upcomingSessions.length === 0 ? (
            <div className="empty" style={{ padding: '30px 0' }}>
              <p style={{ margin: 0 }}>No upcoming sessions scheduled.</p>
              <Link to="/learner/explore" className="btn btn-ghost" style={{ marginTop: '10px', fontSize: '12px' }}>
                Find a Mentor
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingSessions.map((s) => (
                <div key={s.id} className="mini-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '12px' }}>
                      {initials(s.mentor_name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{s.mentor_name}</div>
                      <div className="sub" style={{ margin: 0, fontSize: '12px' }}>
                        {s.topic || 'Pairing'} · <span className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.duration_minutes || 60}m</span>
                      </div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Pending scheduling'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`status-badge badge-${s.status} mono`} style={{ fontSize: '10px', padding: '3px 8px' }}>
                      {s.status}
                    </span>
                    {s.status === 'paid' && isSessionLive(s) ? (
                      <Link to={`/session?booking_id=${s.id}`} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        Join Live
                      </Link>
                    ) : (
                      <Link to="/learner/sessions" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        {s.status === 'paid' ? 'View' : 'Manage'}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Open Problems */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-head">
            <h3>Open Problems</h3>
            <Link to="/learner/my-problems">View all ({stats.openProblems})</Link>
          </div>

          {loading ? (
            <p className="sub">Loading problems...</p>
          ) : openProblems.length === 0 ? (
            <div className="empty" style={{ padding: '30px 0' }}>
              <p style={{ margin: 0 }}>No open problems right now.</p>
              <Link to="/learner/post-problem" className="btn btn-ghost" style={{ marginTop: '10px', fontSize: '12px' }}>
                Post a Bug
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {openProblems.map((p) => (
                <div key={p.id} className="mini-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.title}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      {(p.skills || []).slice(0, 2).map((s) => (
                        <span key={s} className="tag" style={{ fontSize: '10px', padding: '2px 6px' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                      {p.budget ? `₹${p.budget}` : 'Flexible'}
                    </span>
                    <div>
                      <Link to="/learner/my-problems" style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>
                        Review →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Pending Proposals Queue */}
      {pendingProposals.length > 0 && (
        <div className="admin-panel" style={{ marginBottom: '28px', border: '1px solid var(--accent)' }}>
          <div className="admin-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DocumentIcon size={18} />
              <h3 style={{ color: 'var(--accent)' }}>Pending Proposals from Mentors</h3>
            </div>
            <Link to="/learner/my-problems">Compare all ({pendingProposals.length})</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {pendingProposals.map((prop) => (
              <div key={prop.id} className="card" style={{ background: 'var(--bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{prop.mentor_name}</div>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                    ₹{prop.proposed_price}
                  </span>
                </div>
                <div className="sub" style={{ fontSize: '11.5px', margin: '0 0 8px', color: 'var(--ink-muted)' }}>
                  For: <em>{prop.problem_title}</em>
                </div>
                <p className="sub" style={{ fontSize: '12px', margin: '0 0 12px', lineHeight: 1.4 }}>
                  "{prop.message.slice(0, 90)}..."
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '6px', fontSize: '11.5px' }}
                    onClick={() => handleAcceptProposal(prop.problem_id, prop.id)}
                  >
                    Accept &amp; Book
                  </button>
                  <Link
                    to={`/chat?with=${prop.mentor_id}&name=${encodeURIComponent(prop.mentor_name)}`}
                    className="btn btn-ghost"
                    style={{ padding: '6px 10px', fontSize: '11.5px' }}
                  >
                    Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Recommended Mentors */}
      <div className="admin-panel" style={{ marginBottom: '28px' }}>
        <div className="admin-panel-head">
          <h3>Recommended Mentors for You</h3>
          <Link to="/learner/explore">Explore all mentors</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
          {recommendedMentors.map((m) => {
            const id = m.user_id || m.id;
            return (
              <div key={id} className="mini-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '14px' }}>
                    {initials(m.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{m.name}</div>
                    <div className="sub" style={{ margin: 0, fontSize: '11.5px' }}>{m.title || 'Engineer'}</div>
                  </div>
                </div>

                <div style={{ margin: '10px 0', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(m.skills || []).slice(0, 3).map((s) => (
                    <span key={s} className="tag" style={{ fontSize: '10px', padding: '2px 6px' }}>{s}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px dashed var(--grid-strong)' }}>
                  <div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '12.5px' }}>
                      ₹{Number(m.hourly_rate || 0).toLocaleString('en-IN')}/hr
                    </div>
                    <div className="stars" style={{ fontSize: '11px' }}>
                      {m.rating_avg && Number(m.rating_avg) > 0 ? (
                        <>{stars(m.rating_avg)} {Number(m.rating_avg).toFixed(1)}</>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)' }}>★ New</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '5px 10px', fontSize: '11.5px' }}
                    onClick={() => openBooking(m)}
                  >
                    Book
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Recent Messages & 7. Recent Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Messages */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-head">
            <h3>Recent Messages</h3>
            <Link to="/chat">Open Chat</Link>
          </div>

          {recentMessages.length === 0 ? (
            <p className="sub">No recent messages yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentMessages.map((conv) => (
                <Link
                  key={conv.other_id}
                  to={`/chat?with=${conv.other_id}&name=${encodeURIComponent(conv.other_name)}`}
                  className="mini-card"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                    <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '11px' }}>
                      {initials(conv.other_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{conv.other_name}</div>
                      <div className="sub" style={{ margin: 0, fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.last_message || 'Active conversation'}
                      </div>
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: '10.5px', color: 'var(--ink-faint)', flex: 'none', marginLeft: '8px' }}>
                    Open →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-head">
            <h3>Recent Payments</h3>
            <Link to="/learner/payments">Billing ledger</Link>
          </div>

          {recentPayments.length === 0 ? (
            <p className="sub">No payment transactions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentPayments.map((p) => (
                <div key={p.id} className="mini-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.mentor_name}</div>
                    <div className="sub" style={{ margin: 0, fontSize: '11.5px' }}>{p.topic || 'Mentoring session'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '13px' }}>
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </div>
                    <span
                      className={`status-badge ${
                        p.status === 'held' ? 'badge-pending' : p.status === 'refunded' ? 'badge-cancelled' : 'badge-completed'
                      } mono`}
                      style={{ fontSize: '9px', padding: '2px 6px' }}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      <BookSessionModal
        isOpen={!!bookingMentor}
        onClose={() => setBookingMentor(null)}
        mentor={bookingMentor}
      />
    </PortalLayout>
  );
}
