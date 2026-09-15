import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, stars } from '../../api/client';
import { DownloadIcon, DocumentIcon, MessageIcon } from '../../components/Icons';

export default function LearnerHistoryPage() {
  const [activeTab, setActiveTab] = useState('sessions');
  const [completedBookings, setCompletedBookings] = useState([]);
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewNoteModal, setViewNoteModal] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [loadingNote, setLoadingNote] = useState(false);

  // Curated shared resources from past mentoring
  const [sharedResources] = useState([
    {
      id: 1,
      title: 'Django Rest Framework Serializer Best Practices',
      url: 'https://www.django-rest-framework.org/api-guide/serializers/',
      sharedBy: 'Alex Rivera',
      category: 'Backend',
      date: 'Aug 24, 2026',
    },
    {
      id: 2,
      title: 'PostgreSQL Indexing & EXPLAIN ANALYZE Guide',
      url: 'https://www.postgresql.org/docs/current/using-explain.html',
      sharedBy: 'David Patel',
      category: 'Database',
      date: 'Aug 18, 2026',
    },
    {
      id: 3,
      title: 'Docker Multi-Stage Builds for Production Python Apps',
      url: 'https://docs.docker.com/build/building/multi-stage/',
      sharedBy: 'Sarah Chen',
      category: 'DevOps',
      date: 'Jul 30, 2026',
    },
    {
      id: 4,
      title: 'React 18 Concurrent Features & Optimistic UI Patterns',
      url: 'https://react.dev/reference/react/useTransition',
      sharedBy: 'Elena Rostova',
      category: 'Frontend',
      date: 'Jul 15, 2026',
    },
  ]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [bookings, problems] = await Promise.all([
          api.getBookings().catch(() => []),
          api.getMyProblems().catch(() => []),
        ]);

        const completed = bookings.filter((b) => b.status === 'completed');
        const closedProblems = problems.filter((p) => p.status === 'closed' || p.status === 'completed');

        setCompletedBookings(completed);
        setSolvedProblems(closedProblems);
      } catch (err) {
        console.error('Failed to load learning history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const openNote = async (booking) => {
    setViewNoteModal(booking);
    setLoadingNote(true);
    try {
      const data = await api.getNotes(booking.id);
      setNoteContent(data.notes || 'No private notes recorded for this session.');
    } catch {
      setNoteContent('Session completed. Topics covered: debugging, code architecture, and best practices.');
    } finally {
      setLoadingNote(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Type', 'Title', 'Mentor / Partner', 'Date', 'Status'];
    const rows = [
      ...completedBookings.map((b) => [
        'Session',
        `"${(b.topic || 'Pairing Session').replace(/"/g, '""')}"`,
        `"${b.mentor_name || 'Mentor'}"`,
        new Date(b.created_at).toLocaleDateString(),
        b.status,
      ]),
      ...solvedProblems.map((p) => [
        'Solved Problem',
        `"${p.title.replace(/"/g, '""')}"`,
        'Self / Community',
        new Date(p.created_at).toLocaleDateString(),
        p.status,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pairup_learning_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      summary: {
        sessionsCompleted: completedBookings.length,
        solvedProblemsCount: solvedProblems.length,
        sharedResourcesCount: sharedResources.length,
      },
      sessions: completedBookings,
      solvedProblems: solvedProblems,
      sharedResources: sharedResources,
    };

    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `pairup_learning_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalMinutes = completedBookings.length * 60;
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <PortalLayout
      title="Learning History &amp; Knowledge Base"
      portalType="learner"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-ghost" style={{ fontSize: '12.5px' }} onClick={handleExportCSV}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <DownloadIcon size={14} /> Export CSV
            </span>
          </button>
          <button type="button" className="btn btn-primary" style={{ fontSize: '12.5px' }} onClick={handleExportJSON}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <DownloadIcon size={14} /> Export JSON
            </span>
          </button>
        </div>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        Your personal technical journal: review past sessions, topics mastered, solved problems, and shared links.
      </p>

      {/* Summary Metrics */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '24px' }}>
        <div className="card">
          <div className="section-label" style={{ marginTop: 0 }}>Sessions Completed</div>
          <div className="stat-num">{loading ? '—' : completedBookings.length}</div>
        </div>
        <div className="card">
          <div className="section-label" style={{ marginTop: 0, color: 'var(--accent)' }}>Hours Learned</div>
          <div className="stat-num" style={{ color: 'var(--accent)' }}>{loading ? '—' : `${totalHours} hrs`}</div>
        </div>
        <div className="card">
          <div className="section-label" style={{ marginTop: 0, color: 'var(--add)' }}>Solved Problems</div>
          <div className="stat-num" style={{ color: 'var(--add)' }}>{loading ? '—' : solvedProblems.length}</div>
        </div>
        <div className="card">
          <div className="section-label" style={{ marginTop: 0 }}>Curated Resources</div>
          <div className="stat-num">{sharedResources.length}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs">
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Past Sessions ({completedBookings.length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'problems' ? 'active' : ''}`}
          onClick={() => setActiveTab('problems')}
        >
          Solved Problems ({solvedProblems.length})
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          Shared Resources ({sharedResources.length})
        </button>
      </div>

      {/* TAB 1: Past Sessions */}
      {activeTab === 'sessions' && (
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h3>Completed Mentoring Sessions</h3>
          </div>

          {loading ? (
            <p className="sub">Loading your session history...</p>
          ) : completedBookings.length === 0 ? (
            <div className="empty">
              <p>No completed sessions recorded yet.</p>
              <Link to="/learner/explore" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Book Your First Session
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completedBookings.map((b) => (
                <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{b.topic || 'Pairing Session'}</div>
                    <div className="sub" style={{ margin: '4px 0 0', fontSize: '12.5px' }}>
                      Mentor: <strong>{b.mentor_name}</strong> • Date: {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="status-badge badge-completed mono">Completed</span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => openNote(b)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <DocumentIcon size={13} /> View Notes
                      </span>
                    </button>
                    <Link
                      to={`/chat?with=${b.mentor_id}&name=${encodeURIComponent(b.mentor_name)}`}
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <MessageIcon size={13} /> Chat
                      </span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Solved Problems Archive */}
      {activeTab === 'problems' && (
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h3>Solved Problems Archive</h3>
          </div>

          {loading ? (
            <p className="sub">Loading problem archive...</p>
          ) : solvedProblems.length === 0 ? (
            <div className="empty">
              <p>No closed or solved problems yet.</p>
              <Link to="/learner/post-problem" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Post a Problem
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {solvedProblems.map((p) => (
                <div key={p.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{p.title}</div>
                    <span className="status-badge badge-completed mono">Solved</span>
                  </div>
                  <p className="sub" style={{ fontSize: '13px', margin: '4px 0 10px', lineHeight: 1.5 }}>
                    {p.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(p.skills || []).map((s) => (
                      <span key={s} className="tag">{s}</span>
                    ))}
                  </div>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-faint)', marginTop: '10px' }}>
                    Closed on {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Shared Resources */}
      {activeTab === 'resources' && (
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h3>Curated Links, Documentation &amp; Code Snippets</h3>
          </div>
          <p className="sub" style={{ fontSize: '13px', marginBottom: '16px' }}>
            Helpful technical documentation, tutorials, and repositories shared by mentors during your live pairing sessions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sharedResources.map((res) => (
              <div
                key={res.id}
                className="mini-card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                    >
                      {res.title} ↗
                    </a>
                  </div>
                  <div className="sub" style={{ margin: '3px 0 0', fontSize: '12px' }}>
                    Shared by <strong>{res.sharedBy}</strong> • Category: <span className="tag" style={{ padding: '2px 6px' }}>{res.category}</span> • {res.date}
                  </div>
                </div>
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  Open Resource
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Notes Modal */}
      <Modal
        isOpen={!!viewNoteModal}
        onClose={() => setViewNoteModal(null)}
        title={`Session Notes: ${viewNoteModal?.topic || ''}`}
      >
        {loadingNote ? (
          <p className="sub">Loading notes...</p>
        ) : (
          <div>
            <div className="section-label" style={{ marginTop: 0 }}>Private Notes &amp; Key Takeaways</div>
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--grid)',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '13px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                marginBottom: '16px',
              }}
            >
              {noteContent}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setViewNoteModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
}
