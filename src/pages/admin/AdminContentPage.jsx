import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';

const CMS_TABS = [
  { id: 'homepage', label: 'Homepage Content' },
  { id: 'technologies', label: 'Categories & Technologies' },
  { id: 'skills', label: 'Skills Management' },
  { id: 'faqs', label: 'FAQs' },
  { id: 'help', label: 'Help Articles' },
  { id: 'guidelines', label: 'Mentor Guidelines' },
  { id: 'policies', label: 'Platform Policies' },
];

export default function AdminContentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperadmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('homepage');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Homepage Content State
  const [homepageContent, setHomepageContent] = useState(() => {
    try {
      const saved = localStorage.getItem('pairup_cms_homepage');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      hero_title: 'Pair Program with Expert Developers in Real Time',
      hero_subtitle: 'Overcome challenging bugs, master cloud infrastructure, and accelerate your engineering career with 1-on-1 live mentoring.',
      cta_primary: 'Find a Mentor Now',
      cta_secondary: 'Post a Problem Request',
      stat_learners: '2,400+',
      stat_mentors: '180+',
      stat_sessions: '5,800+',
      stat_rating: '4.9/5',
    };
  });

  // Technologies & Categories State
  const [technologies, setTechnologies] = useState(() => {
    try {
      const saved = localStorage.getItem('pairup_cms_techs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, name: 'Python', category: 'Backend', tags: ['Django', 'FastAPI', 'Flask', 'Celery'] },
      { id: 2, name: 'JavaScript / TypeScript', category: 'Frontend & Full-Stack', tags: ['React', 'Next.js', 'Node.js', 'Vue'] },
      { id: 3, name: 'Cloud & DevOps', category: 'Infrastructure', tags: ['AWS', 'Docker', 'Kubernetes', 'Terraform'] },
      { id: 4, name: 'Databases & SQL', category: 'Data & Storage', tags: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'] },
    ];
  });

  // Skills State
  const [skills, setSkills] = useState(() => {
    try {
      const saved = localStorage.getItem('pairup_cms_skills');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, name: 'Docker Containerization', category: 'DevOps', popular: true },
      { id: 2, name: 'React State Management', category: 'Frontend', popular: true },
      { id: 3, name: 'PostgreSQL Query Optimization', category: 'Backend', popular: true },
      { id: 4, name: 'AWS ECS & Fargate', category: 'Cloud', popular: false },
      { id: 5, name: 'Microservices Architecture', category: 'Architecture', popular: true },
    ];
  });

  // FAQs State
  const [faqs, setFaqs] = useState(() => {
    try {
      const saved = localStorage.getItem('pairup_cms_faqs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, type: 'learner', question: 'How do live pairing sessions work?', answer: 'Once you book a mentor or accept a proposal, a secure audio/video room with live code sharing is provided.' },
      { id: 2, type: 'learner', question: 'Is my payment protected in escrow?', answer: 'Yes, funds remain in escrow until you verify the session was delivered satisfactorily.' },
      { id: 3, type: 'mentor', question: 'When do I receive payouts for completed sessions?', answer: 'Payouts are credited directly to your UPI ID or Bank account upon session completion.' },
      { id: 4, type: 'payment', question: 'What happens if a mentor does not show up?', answer: 'If a mentor misses a call, you receive an automatic 100% full refund to your original payment method.' },
    ];
  });

  // Help Articles State
  const [helpArticles, setHelpArticles] = useState(() => {
    try {
      const saved = localStorage.getItem('pairup_cms_help');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'getting_started', title: 'Getting Started on PairUp', content: 'Step-by-step guide on creating an account, choosing technologies, and scheduling your first 1-on-1 session.' },
      { id: 'how_sessions_work', title: 'How Live Pairing Sessions Work', content: 'Best practices for screen sharing, preparing reproducible bug snippets, and communicating with your mentor.' },
      { id: 'troubleshooting', title: 'Troubleshooting Audio/Video & Code Sync', content: 'Ensure WebRTC permissions are granted and WebSockets are allowed through your network firewall.' },
    ];
  });

  // Policies (Privacy & Terms)
  const [policySlug, setPolicySlug] = useState('privacy');
  const [policyTitle, setPolicyTitle] = useState('Privacy Policy');
  const [policyHtml, setPolicyHtml] = useState('<h3>PairUp Privacy Policy</h3><p>We respect your privacy and never sell your personal data...</p>');
  const [policyLoading, setPolicyLoading] = useState(false);

  // New Item Modals
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechCategory, setNewTechCategory] = useState('Backend');
  const [newTechTags, setNewTechTags] = useState('');

  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Backend');

  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [newFaqType, setNewFaqType] = useState('learner');
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  // Load Policy when tab is 'policies'
  useEffect(() => {
    if (activeTab === 'policies') {
      loadPolicy(policySlug);
    }
  }, [activeTab, policySlug]);

  const loadPolicy = async (slug) => {
    setPolicyLoading(true);
    try {
      const data = await api.getPage(slug);
      setPolicyTitle(data.title || (slug === 'privacy' ? 'Privacy Policy' : slug === 'terms' ? 'Terms of Service' : 'Refund Policy'));
      setPolicyHtml(data.content_html || '');
    } catch {
      // Fallback
      if (slug === 'privacy') {
        setPolicyTitle('Privacy Policy');
        setPolicyHtml('<h2>Privacy Policy</h2><p>PairUp Technologies Inc. is committed to protecting developer privacy and data confidentiality.</p>');
      } else if (slug === 'terms') {
        setPolicyTitle('Terms of Service');
        setPolicyHtml('<h2>Terms of Service</h2><p>By accessing or using the PairUp platform, you agree to these legal terms of service.</p>');
      } else {
        setPolicyTitle('Refund & Escrow Policy');
        setPolicyHtml('<h2>Refund & Escrow Policy</h2><p>Payments are deposited into escrow and released upon learner session confirmation.</p>');
      }
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleSaveHomepage = (e) => {
    e.preventDefault();
    setSaving(true);
    localStorage.setItem('pairup_cms_homepage', JSON.stringify(homepageContent));
    setTimeout(() => {
      setSaving(false);
      const msg = 'Homepage copy and metrics updated successfully!';
      toast.success(msg);
    }, 400);
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateAdminPage(policySlug, {
        title: policyTitle,
        content_html: policyHtml,
      });
      const msg = `"${policyTitle}" published live!`;
      toast.success(msg);
    } catch (err) {
      toast.error(err.message || 'Failed to save policy');
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTechnology = (e) => {
    e.preventDefault();
    const newTech = {
      id: Date.now(),
      name: newTechName,
      category: newTechCategory,
      tags: newTechTags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    const updated = [...technologies, newTech];
    setTechnologies(updated);
    localStorage.setItem('pairup_cms_techs', JSON.stringify(updated));
    setShowAddTechModal(false);
    setNewTechName('');
    setNewTechTags('');
    const msg = `Added technology "${newTechName}".`;
    toast.success(msg);
  };

  const handleDeleteTech = (id) => {
    const updated = technologies.filter((t) => t.id !== id);
    setTechnologies(updated);
    localStorage.setItem('pairup_cms_techs', JSON.stringify(updated));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const newSkill = {
      id: Date.now(),
      name: newSkillName,
      category: newSkillCategory,
      popular: false,
    };
    const updated = [...skills, newSkill];
    setSkills(updated);
    localStorage.setItem('pairup_cms_skills', JSON.stringify(updated));
    setShowAddSkillModal(false);
    setNewSkillName('');
    const msg = `Added skill "${newSkillName}".`;
    toast.success(msg);
  };

  const handleDeleteSkill = (id) => {
    const updated = skills.filter((s) => s.id !== id);
    setSkills(updated);
    localStorage.setItem('pairup_cms_skills', JSON.stringify(updated));
  };

  const handleTogglePopularSkill = (id) => {
    const updated = skills.map((s) => (s.id === id ? { ...s, popular: !s.popular } : s));
    setSkills(updated);
    localStorage.setItem('pairup_cms_skills', JSON.stringify(updated));
  };

  const handleAddFaq = (e) => {
    e.preventDefault();
    const newFaq = {
      id: Date.now(),
      type: newFaqType,
      question: newFaqQ,
      answer: newFaqA,
    };
    const updated = [...faqs, newFaq];
    setFaqs(updated);
    localStorage.setItem('pairup_cms_faqs', JSON.stringify(updated));
    setShowAddFaqModal(false);
    setNewFaqQ('');
    setNewFaqA('');
    const msg = 'FAQ entry added.';
    toast.success(msg);
  };

  const handleDeleteFaq = (id) => {
    const updated = faqs.filter((f) => f.id !== id);
    setFaqs(updated);
    localStorage.setItem('pairup_cms_faqs', JSON.stringify(updated));
  };

  return (
    <PortalLayout title="Content Management System (CMS)" portalType="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="sub" style={{ margin: 0 }}>
            Curate homepage copy, manage technical taxonomies, organize FAQs, and maintain legal platform policies.
          </p>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Main CMS Navigation Tabs */}
      <div className="admin-filter-tabs" style={{ marginBottom: '20px' }}>
        {CMS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-filter-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: HOMEPAGE CONTENT */}
      {activeTab === 'homepage' && (
        <form onSubmit={handleSaveHomepage} className="panel" style={{ maxWidth: '780px', margin: 0 }}>
          <div className="section-label" style={{ marginTop: 0 }}>Hero Section Copy</div>
          <div className="field">
            <label>Hero Title / Main Headline</label>
            <input
              type="text"
              value={homepageContent.hero_title}
              onChange={(e) => setHomepageContent({ ...homepageContent, hero_title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Hero Subtitle</label>
            <textarea
              rows={3}
              value={homepageContent.hero_subtitle}
              onChange={(e) => setHomepageContent({ ...homepageContent, hero_subtitle: e.target.value })}
              required
            ></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Primary CTA Button Label</label>
              <input
                type="text"
                value={homepageContent.cta_primary}
                onChange={(e) => setHomepageContent({ ...homepageContent, cta_primary: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Secondary CTA Button Label</label>
              <input
                type="text"
                value={homepageContent.cta_secondary}
                onChange={(e) => setHomepageContent({ ...homepageContent, cta_secondary: e.target.value })}
              />
            </div>
          </div>

          <div className="section-label">Homepage Statistics Counter</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="field">
              <label>Active Learners</label>
              <input
                type="text"
                value={homepageContent.stat_learners}
                onChange={(e) => setHomepageContent({ ...homepageContent, stat_learners: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Verified Mentors</label>
              <input
                type="text"
                value={homepageContent.stat_mentors}
                onChange={(e) => setHomepageContent({ ...homepageContent, stat_mentors: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Sessions Completed</label>
              <input
                type="text"
                value={homepageContent.stat_sessions}
                onChange={(e) => setHomepageContent({ ...homepageContent, stat_sessions: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Average Rating</label>
              <input
                type="text"
                value={homepageContent.stat_rating}
                onChange={(e) => setHomepageContent({ ...homepageContent, stat_rating: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Publishing...' : 'Save & Publish Homepage Copy'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: CATEGORIES & TECHNOLOGIES */}
      {activeTab === 'technologies' && (
        <div style={{ maxWidth: '820px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Supported Technologies &amp; Category Hierarchy</h3>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddTechModal(true)}
            >
              + Add Technology
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {technologies.map((t) => (
              <div key={t.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '15px' }}>{t.name}</strong>
                    <span className="tag" style={{ background: 'var(--brand)', color: '#fff', fontSize: '10.5px' }}>{t.category}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {t.tags.map((tag) => (
                      <span key={tag} className="tag" style={{ fontSize: '11px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: '#DC2626', fontSize: '12px', padding: '4px 8px' }}
                  onClick={() => handleDeleteTech(t.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SKILLS MANAGEMENT */}
      {activeTab === 'skills' && (
        <div style={{ maxWidth: '820px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Platform Skills Taxonomy</h3>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddSkillModal(true)}
            >
              + Add New Skill
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Skill Name</th>
                  <th>Category</th>
                  <th>Popular / Featured</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><span className="tag">{s.category}</span></td>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={s.popular}
                          onChange={() => handleTogglePopularSkill(s.id)}
                        />
                        <span style={{ fontSize: '12px' }}>{s.popular ? '⭐ Popular' : 'Standard'}</span>
                      </label>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ color: '#DC2626', fontSize: '11.5px', padding: '2px 8px' }}
                        onClick={() => handleDeleteSkill(s.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FAQs */}
      {activeTab === 'faqs' && (
        <div style={{ maxWidth: '820px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Frequently Asked Questions</h3>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddFaqModal(true)}
            >
              + Add FAQ Question
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((f) => (
              <div key={f.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14px' }}>{f.question}</strong>
                    <span className="tag mono" style={{ fontSize: '10.5px' }}>{f.type}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: '#DC2626', fontSize: '11px', padding: '2px 6px' }}
                    onClick={() => handleDeleteFaq(f.id)}
                  >
                    Delete
                  </button>
                </div>
                <p className="sub" style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                  {f.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: HELP ARTICLES */}
      {activeTab === 'help' && (
        <div style={{ maxWidth: '820px' }}>
          <h3 style={{ marginBottom: '16px' }}>Help Center &amp; Support Knowledge Base</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {helpArticles.map((art) => (
              <div key={art.id} className="card" style={{ padding: '16px' }}>
                <strong style={{ fontSize: '15px' }}>{art.title}</strong>
                <p style={{ fontSize: '13px', lineHeight: 1.5, margin: '8px 0 0', color: 'var(--ink)' }}>
                  {art.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: MENTOR GUIDELINES */}
      {activeTab === 'guidelines' && (
        <div className="card" style={{ maxWidth: '780px', padding: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Official PairUp Mentor Code of Conduct &amp; Guidelines</h3>
          <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--ink)' }}>
            <h4>1. Punctuality &amp; Professionalism</h4>
            <p className="sub">Mentors must join the live audio/video room within 3 minutes of scheduled start time. If delayed, mentors must notify learners in advance.</p>

            <h4>2. Pair Programming vs. Writing Code For Them</h4>
            <p className="sub">Focus on guiding learners through debuggers, architecture explanations, and interactive coaching rather than silently writing all code.</p>

            <h4>3. Zero Off-Platform Solicitation</h4>
            <p className="sub">All communication, session scheduling, and payment disbursements must occur exclusively within PairUp to guarantee escrow insurance.</p>
          </div>
        </div>
      )}

      {/* TAB 7: PLATFORM POLICIES (HTML CMS) */}
      {activeTab === 'policies' && (
        <div style={{ maxWidth: '820px' }}>
          <div className="admin-filter-tabs" style={{ marginBottom: '16px' }}>
            <button
              type="button"
              className={`admin-filter-tab ${policySlug === 'privacy' ? 'active' : ''}`}
              onClick={() => setPolicySlug('privacy')}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              className={`admin-filter-tab ${policySlug === 'terms' ? 'active' : ''}`}
              onClick={() => setPolicySlug('terms')}
            >
              Terms of Service
            </button>
            <button
              type="button"
              className={`admin-filter-tab ${policySlug === 'refunds' ? 'active' : ''}`}
              onClick={() => setPolicySlug('refunds')}
            >
              Refund Policy
            </button>
          </div>

          <form onSubmit={handleSavePolicy} className="panel" style={{ margin: 0 }}>
            {policyLoading ? (
              <p className="sub">Loading legal page content...</p>
            ) : (
              <>
                <div className="field">
                  <label>Document Title</label>
                  <input
                    type="text"
                    value={policyTitle}
                    onChange={(e) => setPolicyTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>HTML / Markdown Content</label>
                  <textarea
                    rows={12}
                    value={policyHtml}
                    onChange={(e) => setPolicyHtml(e.target.value)}
                    style={{ fontFamily: 'IBM Plex Mono', fontSize: '12px' }}
                    required
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Publishing...' : 'Save & Publish Policy'}
                  </button>
                  <Link to={`/${policySlug}`} target="_blank" className="btn btn-ghost">
                    Preview Live Policy ↗
                  </Link>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Add Technology Modal */}
      {showAddTechModal && (
        <Modal
          title="Add New Supported Technology"
          onClose={() => setShowAddTechModal(false)}
          maxWidth="460px"
        >
          <form onSubmit={handleAddTechnology}>
            <div className="field">
              <label>Technology Name</label>
              <input
                type="text"
                placeholder="e.g., Rust"
                value={newTechName}
                onChange={(e) => setNewTechName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Category</label>
              <select
                value={newTechCategory}
                onChange={(e) => setNewTechCategory(e.target.value)}
              >
                <option value="Backend">Backend</option>
                <option value="Frontend & Full-Stack">Frontend &amp; Full-Stack</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Data & Storage">Data &amp; Storage</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>
            <div className="field">
              <label>Associated Tags (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., Tokio, Actix, Cargo, WebAssembly"
                value={newTechTags}
                onChange={(e) => setNewTechTags(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowAddTechModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Technology
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Skill Modal */}
      {showAddSkillModal && (
        <Modal
          title="Add New Skill"
          onClose={() => setShowAddSkillModal(false)}
          maxWidth="440px"
        >
          <form onSubmit={handleAddSkill}>
            <div className="field">
              <label>Skill Name</label>
              <input
                type="text"
                placeholder="e.g., GraphQL API Design"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Category</label>
              <select
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
              >
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="DevOps">DevOps</option>
                <option value="Cloud">Cloud</option>
                <option value="Database">Database</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowAddSkillModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Skill
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add FAQ Modal */}
      {showAddFaqModal && (
        <Modal
          title="Add New FAQ"
          onClose={() => setShowAddFaqModal(false)}
          maxWidth="500px"
        >
          <form onSubmit={handleAddFaq}>
            <div className="field">
              <label>Target Audience / Category</label>
              <select
                value={newFaqType}
                onChange={(e) => setNewFaqType(e.target.value)}
              >
                <option value="learner">Learner FAQs</option>
                <option value="mentor">Mentor FAQs</option>
                <option value="payment">Payment &amp; Escrow FAQs</option>
              </select>
            </div>
            <div className="field">
              <label>Question</label>
              <input
                type="text"
                placeholder="e.g., What equipment do I need for pairing calls?"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Answer</label>
              <textarea
                rows={3}
                placeholder="Detailed answer..."
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                required
              ></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowAddFaqModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Publish FAQ
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PortalLayout>
  );
}
