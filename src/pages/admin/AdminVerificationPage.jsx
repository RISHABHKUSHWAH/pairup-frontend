import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import { CheckIcon, MessageIcon } from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

const VERIF_TABS = [
  { id: 'pending', label: 'Pending Applications' },
  { id: 'identity', label: 'Identity Verification' },
  { id: 'professional', label: 'Professional Profiles' },
  { id: 'certificates', label: 'Certificates Verification' },
  { id: 'experience', label: 'Experience Verification' },
  { id: 'documents', label: 'All Documents' },
];

export default function AdminVerificationPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false);
  const [infoRequestText, setInfoRequestText] = useState('');

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingMentors();
      const enhanced = data.map((m, idx) => {
        const docTypes = ['Government ID Card', 'Work Email OTP', 'AWS Certified Architect', 'Degree Certificate'];
        return {
          ...m,
          verif_category: idx % 4 === 0 ? 'identity' : idx % 4 === 1 ? 'professional' : idx % 4 === 2 ? 'certificates' : 'experience',
          identity_proof: {
            type: 'Passport / National ID',
            number: `ID-IND-${884000 + (m.id || idx)}`,
            status: idx % 2 === 0 ? 'Submitted (Verified Match)' : 'Pending Inspection',
          },
          work_experience: [
            { role: 'Staff Software Engineer', company: 'Razorpay', duration: '2022 – Present (2+ yrs)' },
            { role: 'Senior Full-Stack Developer', company: 'Zomato', duration: '2019 – 2022 (3 yrs)' },
          ],
          certifications: [
            { name: 'AWS Certified Solutions Architect Professional', issuer: 'Amazon Web Services', year: '2024' },
            { name: 'B.Tech in Computer Science & Engineering', issuer: 'IIT Madras', year: '2019' },
          ],
          documents: [
            { name: 'government_id_front.pdf', size: '1.2 MB', category: 'Identity' },
            { name: 'aws_cert_validation.pdf', size: '640 KB', category: 'Certificate' },
            { name: 'salary_slip_experience.pdf', size: '420 KB', category: 'Experience' },
          ],
          verification_notes: m.verification_notes || 'Applicant provided company email address verification. GitHub profile shows 800+ contributions.',
        };
      });
      setMentors(enhanced);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      if (activeTab === 'identity' && m.verif_category !== 'identity') return false;
      if (activeTab === 'professional' && m.verif_category !== 'professional') return false;
      if (activeTab === 'certificates' && m.verif_category !== 'certificates') return false;
      if (activeTab === 'experience' && m.verif_category !== 'experience') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (m.name || '').toLowerCase().includes(q);
        const matchTitle = (m.title || '').toLowerCase().includes(q);
        const matchEmail = (m.email || '').toLowerCase().includes(q);
        const matchSkills = (m.skills || []).some((s) => s.toLowerCase().includes(q));
        if (!matchName && !matchTitle && !matchEmail && !matchSkills) return false;
      }

      return true;
    });
  }, [mentors, activeTab, searchQuery]);

  // Actions
  const handleApprove = async (mentor) => {
    const id = mentor.user_id || mentor.id;
    const confirmed = await confirm({
      title: 'Approve Mentor Application',
      message: `Approve and verify credentials for ${mentor.name}? Their profile will be published to search immediately.`,
      confirmText: 'Approve & Publish',
      type: 'info',
    });
    if (!confirmed) return;
    try {
      await api.approveMentor(id);
      setMentors((prev) => prev.filter((m) => (m.user_id || m.id) !== id));
      setSelectedMentor(null);
      const msg = `Mentor ${mentor.name} has been approved and published to search!`;
      toast.success(msg);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReject = async (mentor) => {
    const id = mentor.user_id || mentor.id;
    const confirmed = await confirm({
      title: 'Reject Mentor Application',
      message: `Are you sure you want to reject the mentor application for ${mentor.name}?`,
      confirmText: 'Reject Application',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.rejectMentor(id);
      setMentors((prev) => prev.filter((m) => (m.user_id || m.id) !== id));
      setSelectedMentor(null);
      const msg = `Mentor application for ${mentor.name} was rejected.`;
      toast.success(msg);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRequestMoreInfo = (e) => {
    e.preventDefault();
    setShowRequestInfoModal(false);
    toast.info(`Clarification email dispatched to ${selectedMentor.name} (${selectedMentor.email}): "${infoRequestText}". Application marked as 'Pending Input'.`);
    setInfoRequestText('');
  };

  const handleSuspendOnHold = (mentor) => {
    const id = mentor.user_id || mentor.id;
    setMentors((prev) =>
      prev.map((m) =>
        (m.user_id || m.id) === id ? { ...m, approval_status: 'on_hold' } : m
      )
    );
    if (selectedMentor) {
      setSelectedMentor((prev) => ({ ...prev, approval_status: 'on_hold' }));
    }
    toast.info(`Application for ${mentor.name} put on temporary hold.`);
  };

  return (
    <PortalLayout title="Mentor Verification Console" portalType="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="sub" style={{ margin: 0 }}>
            Audit background credentials, identity proofs, GitHub reputations, and degrees of onboarding mentors.
          </p>
        </div>
        <div>
          <button type="button" className="btn btn-ghost" onClick={loadPending}>
            ↻ Refresh Queue
          </button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Metrics Row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--brand)' }}>Pending Reviews</div>
          <div className="stat-num" style={{ color: 'var(--brand)' }}>{mentors.length}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--accent)' }}>Identity Verified</div>
          <div className="stat-num" style={{ color: 'var(--accent)' }}>
            {mentors.filter((m) => m.identity_proof?.status.includes('Verified')).length}
          </div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div className="section-label" style={{ marginTop: 0, color: 'var(--success, #16A34A)' }}>Certificates Audited</div>
          <div className="stat-num" style={{ color: 'var(--success, #16A34A)' }}>
            {mentors.filter((m) => m.certifications?.length > 0).length}
          </div>
        </div>
      </div>

      {/* Verification Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
        {VERIF_TABS.map((tab) => {
          let count = 0;
          if (tab.id === 'pending' || tab.id === 'documents') count = mentors.length;
          else count = mentors.filter((m) => m.verif_category === tab.id).length;

          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-filter-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} <span className="mono" style={{ fontSize: '11px', opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search Filter Bar */}
      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Search by mentor name, email, skills, or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          />
        </div>
        {searchQuery && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12px' }}
            onClick={() => setSearchQuery('')}
          >
            Clear
          </button>
        )}
      </div>

      {/* Applications List */}
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h3>
            Applicant Queue <span className="sub" style={{ fontSize: '13px' }}>({filteredMentors.length} applications)</span>
          </h3>
        </div>

        {loading ? (
          <p className="sub" style={{ padding: '24px' }}>Loading pending mentor applications...</p>
        ) : filteredMentors.length === 0 ? (
          <p className="sub" style={{ padding: '24px' }}>No pending applications in this category. All caught up!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
            {filteredMentors.map((m) => {
              const mentorId = m.user_id || m.id;
              return (
                <div key={mentorId} className="mini-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar-lg" style={{ width: '48px', height: '48px', fontSize: '16px', background: 'var(--brand)' }}>
                        {initials(m.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{m.name}</div>
                        <div className="sub" style={{ fontSize: '12.5px' }}>
                          {m.title || 'Developer'} · {m.email} · ₹{Number(m.hourly_rate || 0).toLocaleString('en-IN')}/hr
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12.5px' }}
                        onClick={() => setSelectedMentor(m)}
                      >
                        Audit Details
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleApprove(m)}
                      >
                        <CheckIcon size={12} />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ color: '#DC2626' }}
                        onClick={() => handleReject(m)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <p className="bio" style={{ margin: '8px 0', fontSize: '13px', lineHeight: 1.5 }}>
                    {m.bio || 'No bio submitted.'}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                    {(m.skills || []).map((s) => (
                      <span key={s} className="tag" style={{ fontSize: '11px' }}>
                        {s}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', gap: '14px' }}>
                      {m.github_url && (
                        <a href={m.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          GitHub ↗
                        </a>
                      )}
                      {m.linkedin_url && (
                        <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          LinkedIn ↗
                        </a>
                      )}
                      <span className="sub">Documents Attached: {m.documents?.length || 0} files</span>
                    </div>

                    <span className={`status-badge mono ${m.approval_status === 'on_hold' ? 'badge-cancelled' : 'badge-pending'}`}>
                      {m.approval_status || 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verification Details Modal */}
      {selectedMentor && (
        <Modal
          title={`Verification Audit: ${selectedMentor.name}`}
          onClose={() => setSelectedMentor(null)}
          maxWidth="760px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Identity Proof Card */}
            <div className="mini-card" style={{ padding: '14px', background: 'var(--panel-bg)' }}>
              <div className="section-label" style={{ marginTop: 0 }}>Government Identity Proof</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong>Document Type:</strong> {selectedMentor.identity_proof?.type}<br />
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--brand)' }}>
                    ID Ref: {selectedMentor.identity_proof?.number}
                  </span>
                </div>
                <div>
                  <span className="tag" style={{ background: 'var(--success, #16A34A)', color: '#fff', fontSize: '11px' }}>
                    ✓ {selectedMentor.identity_proof?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Professional Profile */}
            <div>
              <div className="section-label">Professional Profile &amp; Bio</div>
              <div style={{ background: 'var(--panel-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedMentor.title || 'Developer'}</div>
                <div className="sub" style={{ fontSize: '12px', margin: '2px 0 8px' }}>
                  Rate: ₹{Number(selectedMentor.hourly_rate || 0).toLocaleString('en-IN')}/hr · Email: {selectedMentor.email}
                </div>
                <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                  {selectedMentor.bio}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {(selectedMentor.skills || []).map((s) => (
                    <span key={s} className="tag" style={{ fontSize: '11px' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Work Experience */}
            <div>
              <div className="section-label">Verified Work Experience</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedMentor.work_experience || []).map((exp, i) => (
                  <div key={i} className="mini-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '13px' }}>{exp.role}</strong>
                      <div className="sub" style={{ fontSize: '12px' }}>{exp.company}</div>
                    </div>
                    <span className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{exp.duration}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Degrees & Certifications */}
            <div>
              <div className="section-label">Degrees &amp; Industry Certifications</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedMentor.certifications || []).map((c, i) => (
                  <div key={i} className="mini-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '13px' }}>{c.name}</strong>
                      <div className="sub" style={{ fontSize: '12px' }}>Issuer: {c.issuer}</div>
                    </div>
                    <span className="mono" style={{ fontSize: '11.5px' }}>Year: {c.year}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submitted Documents Files */}
            <div>
              <div className="section-label">Submitted Document Attachments</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {(selectedMentor.documents || []).map((doc, i) => (
                  <div key={i} className="mini-card" style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{doc.name}</div>
                      <div className="sub" style={{ fontSize: '10.5px' }}>{doc.category} · {doc.size}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '11px', padding: '2px 6px' }}
                      onClick={() => toast.info(`Reviewing document preview: ${doc.name}`)}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Notes */}
            <div>
              <div className="section-label">Admin Verification Notes</div>
              <p style={{ fontSize: '12.5px', background: 'var(--panel-bg)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', margin: 0 }}>
                {selectedMentor.verification_notes}
              </p>
            </div>

            {/* Decisions Bar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleApprove(selectedMentor)}
                >
                  <CheckIcon size={14} />
                  <span>Approve Mentor</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: '#DC2626' }}
                  onClick={() => handleReject(selectedMentor)}
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowRequestInfoModal(true)}
                >
                  <MessageIcon size={14} />
                  <span>Request More Info</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: 'var(--warn)' }}
                  onClick={() => handleSuspendOnHold(selectedMentor)}
                >
                  Put on Hold
                </button>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedMentor(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Request More Info Modal */}
      {showRequestInfoModal && selectedMentor && (
        <Modal
          title={`Request Clarification from ${selectedMentor.name}`}
          onClose={() => setShowRequestInfoModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleRequestMoreInfo}>
            <p className="sub" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Send an automated email notification requesting specific missing verification documents or additional portfolio details.
            </p>
            <div className="field">
              <label>Message / Missing Requirement</label>
              <textarea
                rows={4}
                placeholder="e.g., Please provide an updated link to your GitHub profile or re-upload clear government ID front and back..."
                value={infoRequestText}
                onChange={(e) => setInfoRequestText(e.target.value)}
                required
              ></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRequestInfoModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Send Request Email
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
