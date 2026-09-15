import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api, formatCurrency, formatDateTime, initials } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { DocumentIcon, ClockIcon, ShieldIcon, CheckCircleIcon } from '../../components/Icons';

export default function ContractsListPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const portalType = user?.role === 'mentor' ? 'mentor' : 'learner';

  useEffect(() => {
    loadContracts();
  }, [filter]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await api.getContracts(filter !== 'all' ? { status: filter } : {});
      setContracts(data);
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="status-badge badge-paid">Active · Escrow</span>;
      case 'proposed':
        return <span className="status-badge badge-pending">Proposed</span>;
      case 'completed_by_mentor':
        return <span className="status-badge badge-accepted">Awaiting Review</span>;
      case 'completed':
        return <span className="status-badge badge-completed">Completed</span>;
      case 'disputed':
        return <span className="status-badge badge-disputed">Disputed</span>;
      default:
        return <span className="status-badge badge-cancelled">{status}</span>;
    }
  };

  return (
    <PortalLayout portalType={portalType}>
      <div style={{ paddingBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', margin: 0 }}>Mentorship Contracts</h1>
            <p className="sub" style={{ margin: '4px 0 0' }}>
              Multi-session structured curricula protected by 100% platform escrow.
            </p>
          </div>

          <Link to="/chat" className="btn btn-primary" style={{ fontSize: '13px' }}>
            <DocumentIcon size={16} />
            Propose Contract via Chat
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="filters" style={{ margin: '0 0 24px 0' }}>
          {[
            { label: 'All Contracts', value: 'all' },
            { label: 'Active (Escrow)', value: 'active' },
            { label: 'Proposed', value: 'proposed' },
            { label: 'Completed', value: 'completed' },
            { label: 'Disputed', value: 'disputed' },
          ].map((tab) => (
            <button
              key={tab.value}
              className={`chip ${filter === tab.value ? 'active' : ''}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contracts Grid */}
        {loading ? (
          <div className="empty">Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="empty" style={{ background: 'var(--surface)', border: '1px solid var(--grid-strong)', borderRadius: '12px' }}>
            <DocumentIcon size={36} color="var(--ink-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>No contracts found</div>
            <p className="sub" style={{ maxWidth: '400px', margin: '6px auto 16px' }}>
              {portalType === 'mentor'
                ? 'Discuss with your learners in chat and propose custom multi-session curricula.'
                : 'Browse mentors, discuss your learning roadmap in chat, and start a structured contract.'}
            </p>
            <Link to={portalType === 'mentor' ? '/chat' : '/learner/explore'} className="btn btn-primary">
              {portalType === 'mentor' ? 'Go to Messages' : 'Explore Mentors'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {contracts.map((c) => {
              const otherName = portalType === 'mentor' ? c.learner_name : c.mentor_name;
              const isDone = c.status === 'completed';
              const progressPct = Math.round(((c.completed_sessions || 0) / c.total_sessions) * 100);

              return (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--grid-strong)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                  }}
                >
                  <div>
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      {getStatusBadge(c.status)}
                      <span className="rate-num" style={{ fontSize: '19px' }}>
                        {formatCurrency(c.total_price)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                      <Link to={`/contracts/${c.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                        {c.title}
                      </Link>
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '14px' }}>
                      <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                        {initials(otherName)}
                      </div>
                      <span>
                        {portalType === 'mentor' ? 'Learner: ' : 'Mentor: '}
                        <b>{otherName}</b>
                      </span>
                    </div>

                    {/* Tech Badges */}
                    {c.technology && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
                        {c.technology.split(',').slice(0, 3).map((tech, i) => (
                          <span key={i} className="tag" style={{ fontSize: '10.5px' }}>
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Milestone Progress */}
                  <div style={{ borderTop: '1px solid var(--grid)', paddingTop: '14px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: 'var(--ink-muted)' }}>
                      <span>
                        Milestones: <b>{c.completed_sessions || 0} of {c.total_sessions}</b> sessions
                      </span>
                      <span className="mono">{progressPct}%</span>
                    </div>

                    <div style={{ height: '6px', background: 'var(--grid)', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px' }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: isDone ? 'var(--add)' : 'var(--accent)' }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Link to={`/contracts/${c.id}`} className="btn btn-primary" style={{ flex: 1, fontSize: '12.5px', justifyContent: 'center' }}>
                        View Contract & Milestones
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
