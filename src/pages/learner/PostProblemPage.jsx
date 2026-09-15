import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api, learnerDrafts } from '../../api/client';
import { useToast } from '../../context';
import { DocumentIcon, CheckCircleIcon, ClockIcon, ShieldCheckIcon, UsersIcon } from '../../components/Icons';

export default function PostProblemPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    category: 'Python',
    description: '',
    skills: '',
    expectedOutcome: '',
    whatTried: '',
    budgetType: 'fixed',
    budget: '',
    duration: '60',
    urgency: 'Today',
    preferredTime: '',
    codeSnippet: '',
    visibility: 'public',
  });

  const [attachedFiles, setAttachedFiles] = useState([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = learnerDrafts.getProblemDraft();
    if (saved && saved.title) {
      setHasDraft(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveDraft = () => {
    learnerDrafts.saveProblemDraft({ ...formData, attachedFiles });
    toast.info('Draft saved to your browser! You can restore it anytime.');
    setHasDraft(true);
  };

  const handleRestoreDraft = () => {
    const saved = learnerDrafts.getProblemDraft();
    if (saved) {
      setFormData(saved);
      if (saved.attachedFiles) setAttachedFiles(saved.attachedFiles);
      setSuccess('Draft restored!');
      toast.success('Draft restored!');
      setTimeout(() => setSuccess(''), 2500);
    }
  };

  const handleSimulateUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const fileNames = files.map((f) => ({ name: f.name, size: (f.size / 1024).toFixed(1) + ' KB' }));
      setAttachedFiles((prev) => [...prev, ...fileNames]);
    }
  };

  const handleRemoveFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim() || !formData.description.trim()) {
      const msg = 'Please provide a title and detailed problem description.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    // Format rich combined description with all fields
    const fullDescription = [
      formData.description.trim(),
      formData.expectedOutcome ? `\n\n### Expected Outcome:\n${formData.expectedOutcome.trim()}` : '',
      formData.whatTried ? `\n\n### What I Have Tried:\n${formData.whatTried.trim()}` : '',
      formData.codeSnippet ? `\n\n### Code Snippet / Error Logs:\n\`\`\`\n${formData.codeSnippet.trim()}\n\`\`\`` : '',
      `\n\n*Urgency: ${formData.urgency} | Preferred Duration: ${formData.duration} mins | Format: ${formData.budgetType}*`,
      attachedFiles.length > 0 ? `\n*Attachments: ${attachedFiles.map((f) => f.name).join(', ')}*` : '',
    ].join('');

    // Combine category with skills
    const combinedSkills = [formData.category, formData.skills].filter(Boolean).join(', ');

    try {
      await api.createProblem({
        title: `[${formData.category}] ${formData.title.trim()}`,
        description: fullDescription,
        skills: combinedSkills,
        budget: formData.budget ? Number(formData.budget) : null,
      });

      // Clear draft on successful publish
      learnerDrafts.clearProblemDraft();

      const msg = 'Problem published! Mentors can now view it and submit proposals.';
      setSuccess(msg);
      toast.success(msg);
      setTimeout(() => {
        navigate('/learner/my-problems');
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to publish problem');
      setError(err.message || 'Failed to publish problem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLayout
      title="Post a Problem Request"
      portalType="learner"
      actions={
        hasDraft && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleRestoreDraft}
          >
            <DocumentIcon size={14} /> Restore Saved Draft
          </button>
        )
      }
    >
      <p className="sub" style={{ maxWidth: '1240px', marginBottom: '20px' }}>
        Can't find the exact mentor or want them to come to you? Describe your bug or architectural challenge. Verified mentors will review it and submit tailored proposals.
      </p>

      {error && <div className="error-box" style={{ maxWidth: '1240px', marginBottom: '16px' }}>{error}</div>}
      {success && (
        <div
          className="alert alert-success"
          style={{
            maxWidth: '1240px',
            marginBottom: '16px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderColor: '#22c55e',
            color: '#22c55e',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          {success}
        </div>
      )}

      <div className="post-problem-layout">
        <form onSubmit={handleSubmit} style={{ minWidth: 0 }}>
        {/* Section 1: Problem Details */}
        <div className="panel" style={{ margin: '0 0 20px 0' }}>
          <div className="section-label" style={{ marginTop: 0 }}>1. Problem Details</div>

          <div className="field">
            <label>Problem Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Django migration failing with IntegrityError on foreign key cascade"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Technology / Category *</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="Python">Python</option>
                <option value="JavaScript">JavaScript / TypeScript</option>
                <option value="PHP">PHP</option>
                <option value="AWS">AWS &amp; Cloud</option>
                <option value="DevOps">DevOps &amp; Docker</option>
                <option value="SQL">Database / SQL</option>
                <option value="React">React / Frontend</option>
                <option value="Other">Other Skills</option>
              </select>
            </div>

            <div className="field">
              <label>Skills Required (comma separated)</label>
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="PostgreSQL, Celery, Docker"
              />
            </div>
          </div>

          <div className="field">
            <label>Detailed Problem Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Explain the background, current system architecture, and where the issue occurs..."
              required
              rows={4}
            />
          </div>

          <div className="field">
            <label>Expected Outcome</label>
            <textarea
              name="expectedOutcome"
              value={formData.expectedOutcome}
              onChange={handleChange}
              placeholder="What does success look like? (e.g. Migration runs cleanly and unit test passes)"
              rows={2}
            />
          </div>

          <div className="field">
            <label>What I Have Tried</label>
            <textarea
              name="whatTried"
              value={formData.whatTried}
              onChange={handleChange}
              placeholder="What solutions or debugging attempts have you already tried?"
              rows={2}
            />
          </div>
        </div>

        {/* Section 2: Budget & Duration */}
        <div className="panel" style={{ margin: '0 0 20px 0' }}>
          <div className="section-label" style={{ marginTop: 0 }}>2. Budget &amp; Preferred Duration</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Budget Type</label>
              <select name="budgetType" value={formData.budgetType} onChange={handleChange}>
                <option value="fixed">Fixed Price (₹ Total)</option>
                <option value="hourly">Hourly Rate (₹ / hr)</option>
              </select>
            </div>

            <div className="field">
              <label>Budget Amount (₹, optional)</label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                min="0"
                placeholder="e.g. 1500 (leave blank if flexible)"
              />
            </div>
          </div>

          <div className="field">
            <label>Preferred Session Duration</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['30', '60', '90', '120'].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  className={`btn ${formData.duration === dur ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                  onClick={() => setFormData((prev) => ({ ...prev, duration: dur }))}
                >
                  {dur} mins
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Urgency & Preferred Time */}
        <div className="panel" style={{ margin: '0 0 20px 0' }}>
          <div className="section-label" style={{ marginTop: 0 }}>3. Urgency &amp; Scheduling</div>

          <div className="field">
            <label>How urgently do you need help?</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['ASAP (Next 2h)', 'Today', 'This Week', 'Flexible'].map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`btn ${formData.urgency === u ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, minWidth: '120px', padding: '8px', fontSize: '13px' }}
                  onClick={() => setFormData((prev) => ({ ...prev, urgency: u }))}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Preferred Date &amp; Time (Optional)</label>
            <input
              type="datetime-local"
              name="preferredTime"
              value={formData.preferredTime}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Section 4: Attachments & Logs */}
        <div className="panel" style={{ margin: '0 0 20px 0' }}>
          <div className="section-label" style={{ marginTop: 0 }}>4. Code Snippets &amp; Attachments</div>

          <div className="field">
            <label>Paste Code Snippet or Error Trace</label>
            <textarea
              name="codeSnippet"
              value={formData.codeSnippet}
              onChange={handleChange}
              placeholder="Paste stack traces, error output, or relevant code blocks here..."
              rows={4}
              style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12.5px' }}
            />
          </div>

          <div className="field">
            <label>Upload Screenshots or Logs (Simulated)</label>
            <input
              type="file"
              multiple
              onChange={handleSimulateUpload}
              style={{ padding: '8px 10px' }}
            />
            {attachedFiles.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="mini-card"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px' }}
                  >
                    <span style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><DocumentIcon size={14} /> {file.name} ({file.size})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--warn)', cursor: 'pointer' }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="field" style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
              Visibility
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: formData.visibility === 'public' ? '1.5px solid var(--accent)' : '1px solid var(--grid-strong)',
                  background: formData.visibility === 'public' ? 'var(--accent-soft, rgba(99, 102, 241, 0.05))' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  margin: 0,
                }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={formData.visibility === 'public'}
                  onChange={handleChange}
                  style={{ marginTop: '2px', accentColor: 'var(--accent)', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                    Public to all verified mentors
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                    Broadcast to all verified mentors for fastest proposals and help.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: formData.visibility === 'invite' ? '1.5px solid var(--accent)' : '1px solid var(--grid-strong)',
                  background: formData.visibility === 'invite' ? 'var(--accent-soft, rgba(99, 102, 241, 0.05))' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  margin: 0,
                }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="invite"
                  checked={formData.visibility === 'invite'}
                  onChange={handleChange}
                  style={{ marginTop: '2px', accentColor: 'var(--accent)', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                    Direct / Invite only
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                    Hidden from public feed; only mentors you directly share with can view.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 5: Actions */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={handleSaveDraft}
          >
            Save Draft
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 2 }}
            disabled={loading}
          >
            {loading ? 'Publishing problem...' : 'Publish Problem'}
          </button>
        </div>
      </form>

      {/* Right Column: Live Marketplace Preview, Posting Guidelines, Escrow Guarantee */}
      <aside className="post-problem-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px' }}>
        {/* Card 1: Real-time Request Preview */}
        <div className="panel" style={{ margin: 0, padding: '18px 20px', border: '1px solid var(--grid-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="section-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
              Live Request Preview
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
              Marketplace View
            </span>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--grid)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                padding: '2px 8px',
                borderRadius: '6px',
              }}>
                {formData.category || 'Tech'}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: formData.urgency?.startsWith('ASAP') ? '#ef4444' : 'var(--ink-muted)',
                background: formData.urgency?.startsWith('ASAP') ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)',
                border: '1px solid var(--grid)',
                padding: '2px 8px',
                borderRadius: '6px',
              }}>
                {formData.urgency || 'Flexible'}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--ink-muted)',
                marginLeft: 'auto',
              }}>
                {formData.duration} mins
              </span>
            </div>

            <h4 style={{
              fontSize: '14.5px',
              fontWeight: 700,
              color: formData.title ? 'var(--ink)' : 'var(--ink-muted)',
              margin: '0 0 8px 0',
              lineHeight: 1.35,
              fontStyle: formData.title ? 'normal' : 'italic',
            }}>
              {formData.title || 'Your problem title will appear here...'}
            </h4>

            <p style={{
              fontSize: '12.5px',
              color: 'var(--ink-muted)',
              margin: '0 0 12px 0',
              lineHeight: 1.45,
              maxHeight: '75px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}>
              {formData.description || 'Explain the background, current system architecture, and where the issue occurs. Mentors will read this to formulate proposals.'}
            </p>

            {/* Skills pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
              {formData.skills ? (
                formData.skills.split(',').map((s, i) => s.trim() && (
                  <span key={i} style={{ fontSize: '10.5px', background: 'var(--surface)', border: '1px solid var(--grid)', padding: '2px 6px', borderRadius: '4px', color: 'var(--ink)' }}>
                    {s.trim()}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                  Add skills (e.g. Django, Docker)
                </span>
              )}
            </div>

            {/* Footer info: Budget & Visibility */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--grid)' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--ink-faint)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Budget</span>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--add)' }}>
                  {formData.budget ? `₹${Number(formData.budget).toLocaleString('en-IN')}` : 'Flexible'}
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink-muted)' }}>
                    {formData.budgetType === 'fixed' ? ' fixed' : '/hr'}
                  </span>
                </span>
              </div>

              <span style={{
                fontSize: '11px',
                color: 'var(--ink-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                {formData.visibility === 'public' ? '🌐 Public Request' : '🔒 Direct Invite'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Tips for Getting Fast Proposals */}
        <div className="panel" style={{ margin: 0, padding: '18px 20px', border: '1px solid var(--grid-strong)' }}>
          <div className="section-label" style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
            <CheckCircleIcon size={14} /> Tips for Faster Proposals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700 }}>1</div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>Include Exact Error Logs</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', lineHeight: 1.4, marginTop: '2px' }}>
                  Paste stack traces and error messages into Section 4. Mentors can diagnose root cause faster.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700 }}>2</div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>State What You Already Tried</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', lineHeight: 1.4, marginTop: '2px' }}>
                  Helps mentors avoid recommending solutions you already tested and speeds up resolution.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700 }}>3</div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>Set a Realistic Budget</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', lineHeight: 1.4, marginTop: '2px' }}>
                  Competitive milestone pricing attracts senior architects and top-tier mentors immediately.
                </div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '14px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'var(--bg)',
            border: '1px dashed var(--grid-strong)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <ClockIcon size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: '11.5px', color: 'var(--ink)', fontWeight: 600 }}>
              Average response time: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>15–25 mins</span>
            </span>
          </div>
        </div>

        {/* Card 3: Escrow Guarantee & Trust Card */}
        <div className="panel" style={{ margin: 0, padding: '18px 20px', border: '1px solid var(--grid-strong)', background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheckIcon size={16} />
            </div>
            <div>
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>100% Escrow Protection</h5>
              <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>Zero financial risk guarantee</span>
            </div>
          </div>

          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11.5px', color: 'var(--ink-muted)', lineHeight: 1.55 }}>
            <li>Payment is locked in escrow and only released after you test and approve the fix.</li>
            <li>Review mentor credentials, ratings, and code reviews before hiring.</li>
            <li>24/7 PairUp dispute protection with full refunds on unfulfilled requests.</li>
          </ul>
        </div>
      </aside>
    </div>
    </PortalLayout>
  );
}
