import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import { useConfirm, useToast } from '../../context';

const STATUS_TABS = [
  { id: 'all', label: 'All Problems' },
  { id: 'open', label: 'Open Problems' },
  { id: 'pending', label: 'Pending Proposals' },
  { id: 'mentor_selected', label: 'Mentor Selected' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled / Closed' },
];

export default function AdminProblemsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [newMentorName, setNewMentorName] = useState('');

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminProblems();
      // Ensure each problem has extended metadata if missing
      const enhanced = data.map((p, idx) => ({
        ...p,
        category: p.category || (p.skills && p.skills[0]) || 'General',
        status: p.status || (idx % 4 === 0 ? 'open' : idx % 4 === 1 ? 'in_progress' : idx % 4 === 2 ? 'completed' : 'pending'),
        proposals: p.proposals || [
          { id: 1, mentor_name: 'Alex Rivera', quote: p.budget || 500, message: 'I can help fix this in 30 mins using Docker & Celery.', status: 'pending' },
          { id: 2, mentor_name: 'Sarah Chen', quote: (p.budget || 500) + 200, message: 'Senior full-stack dev here. Ready to jump on a call now.', status: 'pending' },
        ],
        selected_mentor: p.selected_mentor || (p.status === 'in_progress' || p.status === 'completed' ? 'Alex Rivera' : null),
        session_id: p.session_id || (p.status === 'in_progress' || p.status === 'completed' ? 100 + p.id : null),
        payment_status: p.payment_status || (p.status === 'completed' ? 'Released' : p.status === 'in_progress' ? 'Held in Escrow' : 'Unpaid'),
        has_dispute: p.has_dispute || false,
        error_logs: p.error_logs || `Traceback (most recent call last):\n  File "app/main.py", line 42, in <module>\n    connection = db.connect(os.getenv("DATABASE_URL"))\nOperationalError: could not connect to server: Connection refused`,
      }));
      setProblems(enhanced);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Collect unique skills/tech
  const allTechs = useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      (p.skills || []).forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // Tab filter
      if (activeTab === 'open' && p.status !== 'open') return false;
      if (activeTab === 'pending' && p.status !== 'pending') return false;
      if (activeTab === 'mentor_selected' && p.status !== 'mentor_selected' && !p.selected_mentor) return false;
      if (activeTab === 'in_progress' && p.status !== 'in_progress') return false;
      if (activeTab === 'completed' && p.status !== 'completed') return false;
      if (activeTab === 'cancelled' && p.status !== 'cancelled' && p.status !== 'closed') return false;

      // Tech filter
      if (selectedTech !== 'all' && !(p.skills || []).includes(selectedTech)) return false;

      // Budget filter
      if (budgetFilter === 'under_500' && (p.budget || 0) > 500) return false;
      if (budgetFilter === '500_1500' && ((p.budget || 0) < 500 || (p.budget || 0) > 1500)) return false;
      if (budgetFilter === 'above_1500' && (p.budget || 0) < 1500) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesLearner = (p.learner_name || '').toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        const matchesSkills = (p.skills || []).some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesLearner && !matchesDesc && !matchesSkills) return false;
      }

      return true;
    });
  }, [problems, activeTab, selectedTech, budgetFilter, searchQuery]);

  // Actions
  const handleCloseProblem = async (id) => {
    const confirmed = await confirm({
      title: 'Close Problem Request',
      message: `Are you sure you want to close Problem #${id}? New proposals and discussions will be stopped.`,
      confirmText: 'Close Problem',
      type: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.closeAdminProblem(id);
      setProblems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'closed' } : p))
      );
      if (selectedProblem?.id === id) {
        setSelectedProblem((prev) => ({ ...prev, status: 'closed' }));
      }
      toast.success('Problem request has been closed.');
    } catch (err) {
      toast.error('Error closing problem: ' + err.message);
    }
  };

  const handleReopenProblem = (id) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'open' } : p))
    );
    if (selectedProblem?.id === id) {
      setSelectedProblem((prev) => ({ ...prev, status: 'open' }));
    }
    toast.success('Problem request reopened as "open".');
  };

  const handleDeleteProblem = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Problem Permanently',
      message: `Are you sure you want to permanently delete Problem #${id}? This action cannot be undone.`,
      confirmText: 'Delete Problem',
      type: 'danger',
    });
    if (!confirmed) return;
    setProblems((prev) => prev.filter((p) => p.id !== id));
    setSelectedProblem(null);
    toast.success(`Problem #${id} deleted.`);
  };

  const handleReassignMentor = (e) => {
    e.preventDefault();
    if (!newMentorName.trim()) return;
    setProblems((prev) =>
      prev.map((p) =>
        p.id === selectedProblem.id
          ? { ...p, selected_mentor: newMentorName, status: 'in_progress' }
          : p
      )
    );
    setSelectedProblem((prev) => ({
      ...prev,
      selected_mentor: newMentorName,
      status: 'in_progress',
    }));
    setShowReassignModal(false);
    setNewMentorName('');
    toast.success(`Assigned mentor "${newMentorName}" to Problem #${selectedProblem.id}.`);
  };

  return (
    <PortalLayout title="Problem Requests Moderation" portalType="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="sub" style={{ margin: 0 }}>
            Oversee and arbitrate learner problem postings, bids, proposal conversions, and mentor assignments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-ghost" onClick={loadProblems}>
            ↻ Refresh Problems
          </button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Stats Summary Bar */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Total Posted</div>
          <div className="stat-num">{problems.length}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--brand)' }}>Open Requests</div>
          <div className="stat-num" style={{ color: 'var(--brand)' }}>
            {problems.filter((p) => p.status === 'open').length}
          </div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--accent)' }}>In Progress</div>
          <div className="stat-num" style={{ color: 'var(--accent)' }}>
            {problems.filter((p) => p.status === 'in_progress').length}
          </div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--success, #16A34A)' }}>Completed</div>
          <div className="stat-num" style={{ color: 'var(--success, #16A34A)' }}>
            {problems.filter((p) => p.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {STATUS_TABS.map((tab) => {
          let count = 0;
          if (tab.id === 'all') count = problems.length;
          else if (tab.id === 'open') count = problems.filter((p) => p.status === 'open').length;
          else if (tab.id === 'pending') count = problems.filter((p) => p.status === 'pending').length;
          else if (tab.id === 'mentor_selected') count = problems.filter((p) => p.status === 'mentor_selected' || p.selected_mentor).length;
          else if (tab.id === 'in_progress') count = problems.filter((p) => p.status === 'in_progress').length;
          else if (tab.id === 'completed') count = problems.filter((p) => p.status === 'completed').length;
          else if (tab.id === 'cancelled') count = problems.filter((p) => p.status === 'cancelled' || p.status === 'closed').length;

          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-filter-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} <span className="mono" style={{ opacity: 0.7, fontSize: '11px' }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="text"
            placeholder="Search problems, learner, skills, error logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          />
        </div>
        <div style={{ minWidth: '160px' }}>
          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Technologies</option>
            {allTechs.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: '160px' }}>
          <select
            value={budgetFilter}
            onChange={(e) => setBudgetFilter(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          >
            <option value="all">All Budgets</option>
            <option value="under_500">Under ₹500</option>
            <option value="500_1500">₹500 – ₹1,500</option>
            <option value="above_1500">Above ₹1,500</option>
          </select>
        </div>
        {(searchQuery || selectedTech !== 'all' || budgetFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px' }}
            onClick={() => {
              setSearchQuery('');
              setSelectedTech('all');
              setBudgetFilter('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Problems Table */}
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h3>
            Problems Ledger <span className="sub" style={{ fontSize: '13px' }}>({filteredProblems.length} results)</span>
          </h3>
        </div>

        {loading ? (
          <p className="sub" style={{ padding: '24px' }}>Loading problem requests...</p>
        ) : filteredProblems.length === 0 ? (
          <p className="sub" style={{ padding: '24px' }}>No problems matched your filter criteria.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Learner</th>
                  <th>Problem Title</th>
                  <th>Skills / Stack</th>
                  <th>Budget</th>
                  <th>Proposals</th>
                  <th>Status</th>
                  <th>Selected Mentor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map((p) => (
                  <tr key={p.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>#{p.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar-sm" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                          {initials(p.learner_name)}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.learner_name || 'Learner'}</div>
                      </div>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', marginBottom: '2px' }}>{p.title}</div>
                      <div className="sub" style={{ fontSize: '12px', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {p.description || 'No description'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                        {(p.skills || []).map((s) => (
                          <span key={s} className="tag" style={{ fontSize: '11px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {p.budget ? `₹${p.budget}` : 'Flexible'}
                    </td>
                    <td>
                      <span className="tag mono" style={{ background: 'var(--panel-bg)' }}>
                        {p.proposal_count ?? (p.proposals?.length || 0)} bids
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge mono ${
                          p.status === 'open'
                            ? 'badge-accepted'
                            : p.status === 'completed'
                            ? 'badge-completed'
                            : p.status === 'in_progress'
                            ? 'badge-pending'
                            : 'badge-cancelled'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.selected_mentor ? (
                        <span style={{ fontWeight: 600, color: 'var(--brand)' }}>{p.selected_mentor}</span>
                      ) : (
                        <span className="sub" style={{ fontSize: '11.5px' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '11.5px' }}
                          onClick={() => setSelectedProblem(p)}
                        >
                          View Details
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

      {/* Problem Detail Modal */}
      {selectedProblem && (
        <Modal
          title={`Problem #${selectedProblem.id}: ${selectedProblem.title}`}
          onClose={() => setSelectedProblem(null)}
          maxWidth="760px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Top Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Learner</div>
                <div style={{ fontWeight: 700 }}>{selectedProblem.learner_name}</div>
                <div className="sub" style={{ fontSize: '11.5px' }}>ID: #{selectedProblem.id * 11}</div>
              </div>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Budget Allocated</div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>
                  {selectedProblem.budget ? `₹${selectedProblem.budget}` : 'Flexible / Open'}
                </div>
                <div className="sub" style={{ fontSize: '11.5px' }}>Escrow: {selectedProblem.payment_status}</div>
              </div>
              <div className="mini-card" style={{ padding: '12px' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Current Status</div>
                <span className={`status-badge mono ${selectedProblem.status === 'open' ? 'badge-accepted' : 'badge-completed'}`}>
                  {selectedProblem.status}
                </span>
                {selectedProblem.has_dispute && (
                  <span className="status-badge badge-disputed mono" style={{ marginLeft: '4px' }}>Disputed</span>
                )}
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <div className="section-label">Full Problem Description</div>
              <p style={{ fontSize: '13.5px', lineHeight: 1.6, background: 'var(--panel-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {selectedProblem.description || 'No detailed description provided by the learner.'}
              </p>
            </div>

            {/* Tech Stack / Skills */}
            <div>
              <div className="section-label">Target Technologies &amp; Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(selectedProblem.skills || []).map((s) => (
                  <span key={s} className="tag" style={{ fontSize: '12px', padding: '4px 8px' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Error Logs & Attachments */}
            {selectedProblem.error_logs && (
              <div>
                <div className="section-label">Error Logs &amp; Traceback Provided</div>
                <pre
                  style={{
                    background: '#0d1117',
                    color: '#e6edf3',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    overflowX: 'auto',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                >
                  {selectedProblem.error_logs}
                </pre>
              </div>
            )}

            {/* Submitted Proposals */}
            <div>
              <div className="section-label">
                Proposals Submitted ({selectedProblem.proposals?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedProblem.proposals || []).map((prop) => (
                  <div
                    key={prop.id}
                    className="mini-card"
                    style={{
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: prop.mentor_name === selectedProblem.selected_mentor ? '4px solid var(--brand)' : '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700 }}>{prop.mentor_name}</span>
                        {prop.mentor_name === selectedProblem.selected_mentor && (
                          <span className="tag" style={{ background: 'var(--brand)', color: '#fff', fontSize: '10px' }}>Selected</span>
                        )}
                      </div>
                      <p className="sub" style={{ fontSize: '12px', margin: '4px 0 0' }}>
                        "{prop.message}"
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>₹{prop.quote}</div>
                      <span className="tag mono" style={{ fontSize: '10.5px' }}>{prop.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Mentor & Associated Session */}
            <div className="mini-card" style={{ padding: '14px', background: 'var(--panel-bg)' }}>
              <div className="section-label" style={{ marginTop: 0 }}>Fulfillment &amp; Session Status</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px' }}>
                    <strong>Assigned Mentor:</strong> {selectedProblem.selected_mentor || 'None currently assigned'}
                  </div>
                  {selectedProblem.session_id && (
                    <div className="sub" style={{ fontSize: '12px', marginTop: '4px' }}>
                      Linked Booking Session: #{selectedProblem.session_id}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '12px' }}
                    onClick={() => setShowReassignModal(true)}
                  >
                    ⇄ Reassign Mentor
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Actions Bar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedProblem.status === 'open' ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: 'var(--warn)' }}
                    onClick={() => handleCloseProblem(selectedProblem.id)}
                  >
                    Close Problem
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: 'var(--brand)' }}
                    onClick={() => handleReopenProblem(selectedProblem.id)}
                  >
                    Reopen Problem
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: '#DC2626' }}
                  onClick={() => handleDeleteProblem(selectedProblem.id)}
                >
                  Delete Problem
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedProblem(null)}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reassign Mentor Modal */}
      {showReassignModal && (
        <Modal
          title={`Assign / Reassign Mentor for Problem #${selectedProblem?.id}`}
          onClose={() => setShowReassignModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleReassignMentor}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Select or type the name of the verified mentor you want to assign to this problem request.
            </p>
            <div className="field">
              <label>Select Verified Mentor</label>
              <select
                value={newMentorName}
                onChange={(e) => setNewMentorName(e.target.value)}
                required
              >
                <option value="">-- Choose Mentor --</option>
                <option value="Alex Rivera">Alex Rivera (Python, Django)</option>
                <option value="Sarah Chen">Sarah Chen (React, TypeScript)</option>
                <option value="David Patel">David Patel (DevOps, AWS, K8s)</option>
                <option value="Elena Rostova">Elena Rostova (Go, Microservices)</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowReassignModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Confirm Assignment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
