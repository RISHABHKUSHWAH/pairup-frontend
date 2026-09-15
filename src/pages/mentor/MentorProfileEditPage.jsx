import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { mentorProfileSettings, initials, stars } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import { EyeIcon, ShieldIcon, UsersIcon } from '../../components/Icons';

export default function MentorProfileEditPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'expertise' | 'pricing' | 'trust'
  const [newSkill, setNewSkill] = useState('');
  const [newLang, setNewLang] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // New Cert modal/inline state
  const [certForm, setCertForm] = useState({ title: '', issuer: '', year: new Date().getFullYear().toString() });
  const [showCertForm, setShowCertForm] = useState(false);

  // New Work history modal/inline state
  const [workForm, setWorkForm] = useState({ role: '', company: '', duration: '', description: '' });
  const [showWorkForm, setShowWorkForm] = useState(false);

  useEffect(() => {
    const data = mentorProfileSettings.getProfile(user);
    setProfile(data);
  }, [user]);

  if (!profile) return null;

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const val = newSkill.trim();
    if (val && !profile.skills.includes(val)) {
      setProfile((prev) => ({ ...prev, skills: [...prev.skills, val] }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skillToRemove) }));
  };

  const handleAddLang = (e) => {
    e.preventDefault();
    const val = newLang.trim();
    if (val && !profile.languages.includes(val)) {
      setProfile((prev) => ({ ...prev, languages: [...prev.languages, val] }));
      setNewLang('');
    }
  };

  const handleRemoveLang = (langToRemove) => {
    setProfile((prev) => ({ ...prev, languages: prev.languages.filter((l) => l !== langToRemove) }));
  };

  const handleAddCert = (e) => {
    e.preventDefault();
    if (!certForm.title || !certForm.issuer) return;
    const item = { id: 'cert_' + Date.now(), ...certForm };
    setProfile((prev) => ({ ...prev, certifications: [...prev.certifications, item] }));
    setCertForm({ title: '', issuer: '', year: new Date().getFullYear().toString() });
    setShowCertForm(false);
  };

  const handleRemoveCert = (id) => {
    setProfile((prev) => ({ ...prev, certifications: prev.certifications.filter((c) => c.id !== id) }));
  };

  const handleAddWork = (e) => {
    e.preventDefault();
    if (!workForm.role || !workForm.company) return;
    const item = { id: 'work_' + Date.now(), ...workForm };
    setProfile((prev) => ({ ...prev, workHistory: [...prev.workHistory, item] }));
    setWorkForm({ role: '', company: '', duration: '', description: '' });
    setShowWorkForm(false);
  };

  const handleRemoveWork = (id) => {
    setProfile((prev) => ({ ...prev, workHistory: prev.workHistory.filter((w) => w.id !== id) }));
  };

  const handleToggleSessionType = (id) => {
    setProfile((prev) => ({
      ...prev,
      sessionTypes: prev.sessionTypes.map((st) => (st.id === id ? { ...st, active: !st.active } : st)),
    }));
  };

  const handleSessionPriceChange = (id, newPrice) => {
    setProfile((prev) => ({
      ...prev,
      sessionTypes: prev.sessionTypes.map((st) =>
        st.id === id ? { ...st, price: Number(newPrice) || 0 } : st
      ),
    }));
  };

  const handleDurationToggle = (dur) => {
    setProfile((prev) => {
      const exists = prev.durationOptions.includes(dur);
      if (exists && prev.durationOptions.length === 1) return prev; // keep at least one
      const updated = exists ? prev.durationOptions.filter((d) => d !== dur) : [...prev.durationOptions, dur].sort();
      return { ...prev, durationOptions: updated };
    });
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    mentorProfileSettings.saveProfile(profile, user?.id);
    toast.success('Profile changes saved successfully!');
  };

  return (
    <PortalLayout
      title="Mentor Profile"
      portalType="mentor"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setPreviewOpen(true)}
          >
            <EyeIcon size={14} /> Preview Profile Card
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '13px' }}
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        Manage your public mentor persona across 4 core pillars: Personal Info, Technical Expertise, Sessions & Pricing, and Trust & Verification.
      </p>

      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: '20px', maxWidth: '800px' }}>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          1. Basic Profile
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'expertise' ? 'active' : ''}`}
          onClick={() => setActiveTab('expertise')}
        >
          2. Technical Expertise
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          3. Sessions &amp; Pricing
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'trust' ? 'active' : ''}`}
          onClick={() => setActiveTab('trust')}
        >
          4. Trust &amp; Verification
        </button>
      </div>

      <div style={{ maxWidth: '800px' }}>
        {/* PILLAR 1: BASIC PROFILE */}
        {activeTab === 'basic' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Basic Profile Information</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' }}>
              <div className="avatar-lg" style={{ fontSize: '26px', width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand), #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {initials(profile.name)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{profile.name}</div>
                <div className="sub" style={{ margin: '2px 0 6px', fontSize: '12px' }}>
                  {profile.email} • Verified Mentor
                </div>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>
                  Official Mentor Account
                </span>
              </div>
            </div>

            <div className="field">
              <label>Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Professional Headline</label>
              <input
                type="text"
                value={profile.headline}
                onChange={(e) => handleChange('headline', e.target.value)}
                placeholder="e.g. Senior Full-Stack & Cloud Architect | Ex-Staff Engineer"
              />
            </div>

            <div className="field">
              <label>Bio / About You</label>
              <textarea
                rows={4}
                value={profile.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Share your engineering background, coaching style, and mentoring philosophy..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="field">
                <label>Location / City</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g. Bengaluru, India"
                />
              </div>

              <div className="field">
                <label>Languages Spoken</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value)}
                    placeholder="Add language..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLang(e);
                      }
                    }}
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleAddLang}>
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.languages.map((l) => (
                    <span
                      key={l}
                      className="badge badge-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                    >
                      {l}
                      <span
                        style={{ cursor: 'pointer', fontWeight: 'bold' }}
                        onClick={() => handleRemoveLang(l)}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PILLAR 2: TECHNICAL EXPERTISE */}
        {activeTab === 'expertise' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Technical Expertise & Background</div>

            {/* Skills chips */}
            <div className="field">
              <label>Skills & Core Technologies</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Type a technology (e.g. Docker, GraphQL, Kubernetes) and press Add..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(e);
                    }
                  }}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddSkill}>
                  Add Skill
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: 'var(--card-bg, #1a1a24)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="badge badge-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 10px', fontSize: '13px' }}
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s)}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="field">
                <label>Primary Focus Area</label>
                <input
                  type="text"
                  value={profile.primaryTech}
                  onChange={(e) => handleChange('primaryTech', e.target.value)}
                  placeholder="e.g. Python & Cloud Architecture"
                />
              </div>

              <div className="field">
                <label>Total Years of Professional Experience</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={profile.yearsExperience}
                  onChange={(e) => handleChange('yearsExperience', Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="field">
                <label>GitHub Profile Link</label>
                <input
                  type="url"
                  value={profile.githubUrl}
                  onChange={(e) => handleChange('githubUrl', e.target.value)}
                  placeholder="https://github.com/..."
                />
              </div>

              <div className="field">
                <label>Portfolio / Personal Website</label>
                <input
                  type="url"
                  value={profile.portfolioUrl}
                  onChange={(e) => handleChange('portfolioUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Certifications */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Certifications & Credentials</div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '12px' }}
                  onClick={() => setShowCertForm(!showCertForm)}
                >
                  {showCertForm ? 'Cancel' : '+ Add Certification'}
                </button>
              </div>

              {showCertForm && (
                <div style={{ padding: '14px', background: 'var(--card-bg, #1a1a24)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="Certificate Name (e.g. AWS Solutions Architect)"
                      value={certForm.title}
                      onChange={(e) => setCertForm((c) => ({ ...c, title: e.target.value }))}
                    />
                    <input
                      type="text"
                      placeholder="Issuer (e.g. AWS)"
                      value={certForm.issuer}
                      onChange={(e) => setCertForm((c) => ({ ...c, issuer: e.target.value }))}
                    />
                    <input
                      type="text"
                      placeholder="Year"
                      value={certForm.year}
                      onChange={(e) => setCertForm((c) => ({ ...c, year: e.target.value }))}
                    />
                  </div>
                  <button type="button" className="btn btn-primary" style={{ fontSize: '12px' }} onClick={handleAddCert}>
                    Save Certification
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profile.certifications?.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.title}</div>
                      <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                        {c.issuer} • Issued {c.year}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', padding: '4px 8px' }}
                      onClick={() => handleRemoveCert(c.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Work History */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Work Experience Timeline</div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '12px' }}
                  onClick={() => setShowWorkForm(!showWorkForm)}
                >
                  {showWorkForm ? 'Cancel' : '+ Add Position'}
                </button>
              </div>

              {showWorkForm && (
                <div style={{ padding: '14px', background: 'var(--card-bg, #1a1a24)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="Role (e.g. Senior Engineer)"
                      value={workForm.role}
                      onChange={(e) => setWorkForm((w) => ({ ...w, role: e.target.value }))}
                    />
                    <input
                      type="text"
                      placeholder="Company (e.g. Google, Stripe)"
                      value={workForm.company}
                      onChange={(e) => setWorkForm((w) => ({ ...w, company: e.target.value }))}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="Duration (e.g. 2021 - Present)"
                      value={workForm.duration}
                      onChange={(e) => setWorkForm((w) => ({ ...w, duration: e.target.value }))}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: '10px' }}>
                    <textarea
                      rows={2}
                      placeholder="Key achievements or responsibilities..."
                      value={workForm.description}
                      onChange={(e) => setWorkForm((w) => ({ ...w, description: e.target.value }))}
                    />
                  </div>
                  <button type="button" className="btn btn-primary" style={{ fontSize: '12px' }} onClick={handleAddWork}>
                    Save Experience
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {profile.workHistory?.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{w.role} at {w.company}</div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', padding: '2px 6px' }}
                        onClick={() => handleRemoveWork(w.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="sub" style={{ fontSize: '11px', margin: '2px 0 6px' }}>{w.duration}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{w.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PILLAR 3: SESSIONS & PRICING */}
        {activeTab === 'pricing' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Sessions & Pricing Strategy</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="field">
                <label>Base Hourly Rate (₹ / hour)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>₹</span>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={profile.hourlyRate}
                    onChange={(e) => handleChange('hourlyRate', Number(e.target.value))}
                  />
                </div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>
                  Your platform standard rate displayed on your profile card.
                </div>
              </div>

              <div className="field">
                <label>Weekly Mentorship Capacity (Hours/week)</label>
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={profile.weeklyHours}
                  onChange={(e) => handleChange('weeklyHours', Number(e.target.value))}
                />
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>
                  Limits maximum sessions scheduled per calendar week.
                </div>
              </div>
            </div>

            {/* Session types */}
            <div className="field" style={{ marginTop: '14px' }}>
              <label>Offered Session Types & Custom Pricing</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                {profile.sessionTypes?.map((st) => (
                  <div
                    key={st.id}
                    style={{
                      padding: '14px',
                      background: 'var(--panel-bg)',
                      border: st.active ? '1px solid var(--brand)' : '1px solid var(--border)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={st.active}
                          onChange={() => handleToggleSessionType(st.id)}
                        />
                        <span>{st.name}</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Price: ₹</span>
                        <input
                          type="number"
                          style={{ width: '90px', padding: '4px 8px', fontSize: '13px' }}
                          disabled={!st.active}
                          value={st.price}
                          onChange={(e) => handleSessionPriceChange(st.id, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="sub" style={{ fontSize: '12px' }}>{st.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Duration Options */}
            <div className="field" style={{ marginTop: '20px' }}>
              <label>Allowed Session Durations</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                {[30, 60, 90, 120].map((dur) => (
                  <label
                    key={dur}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      border: profile.durationOptions?.includes(dur) ? '1px solid var(--brand)' : '1px solid var(--border)',
                      borderRadius: '6px',
                      background: profile.durationOptions?.includes(dur) ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={profile.durationOptions?.includes(dur) || false}
                      onChange={() => handleDurationToggle(dur)}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{dur} Minutes</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PILLAR 4: TRUST & VERIFICATION */}
        {activeTab === 'trust' && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Trust, Credentials & Verification</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  padding: '16px',
                  background: 'var(--panel-bg)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', marginTop: '2px' }}><ShieldIcon size={24} /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#10b981' }}>
                    Identity Verification
                  </div>
                  <div className="sub" style={{ fontSize: '12px', margin: '4px 0 8px' }}>
                    Government ID & photo match authenticated.
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>
                    Verified Level 2
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'var(--panel-bg)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', marginTop: '2px' }}><UsersIcon size={24} /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#10b981' }}>
                    Professional Background
                  </div>
                  <div className="sub" style={{ fontSize: '12px', margin: '4px 0 8px' }}>
                    Work email & LinkedIn engineering history verified.
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>
                    Staff Engineer Tier
                  </span>
                </div>
              </div>
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
              <div className="metric-card">
                <div className="metric-label">Average Rating</div>
                <div className="metric-value" style={{ color: '#f59e0b', fontSize: '22px' }}>
                  ★ {profile.rating}
                </div>
                <div className="sub" style={{ fontSize: '11px' }}>Out of 5.0</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Total Reviews</div>
                <div className="metric-value" style={{ fontSize: '22px' }}>{profile.reviewCount}</div>
                <div className="sub" style={{ fontSize: '11px' }}>100% verified learners</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Sessions Completed</div>
                <div className="metric-value" style={{ fontSize: '22px' }}>{profile.sessionsCompleted}</div>
                <div className="sub" style={{ fontSize: '11px' }}>48+ mentorship hours</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Member Since</div>
                <div className="metric-value" style={{ fontSize: '16px', marginTop: '4px' }}>{profile.memberSince}</div>
                <div className="sub" style={{ fontSize: '11px' }}>Active Community Mentor</div>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                background: 'rgba(79, 70, 229, 0.06)',
                border: '1px solid var(--brand)',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brand)' }}>
                ⭐ Verified Mentor Status
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                Your verified badge is prominently displayed on the Explore Mentors page, Search results, and Problem Requests proposal cards. Mentors with verified status receive 3.4x more booking requests from learners.
              </p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save Profile Changes
          </button>
          <button type="button" className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setPreviewOpen(true)}>
            <EyeIcon size={14} /> Preview Public Card
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Public Mentor Card Preview"
      >
        <div style={{ padding: '6px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
            <div className="avatar-lg" style={{ width: '56px', height: '56px', fontSize: '22px', background: 'linear-gradient(135deg, var(--brand), #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold' }}>
              {initials(profile.name)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px' }}>{profile.name}</h3>
                <span className="badge badge-success" style={{ fontSize: '10px' }}>Verified</span>
              </div>
              <div className="sub" style={{ fontSize: '12px', margin: '2px 0' }}>{profile.headline}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {profile.location} • {profile.languages?.join(', ')} • {profile.yearsExperience} yrs exp
              </div>
            </div>
          </div>

          <p style={{ fontSize: '13px', lineHeight: 1.5, margin: '0 0 14px' }}>{profile.bio}</p>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Skills & Technologies:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.skills?.map((s) => (
                <span key={s} className="badge badge-primary" style={{ fontSize: '11px' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'var(--panel-bg)', borderRadius: '6px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rating & Reviews</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#f59e0b' }}>
                {stars(profile.rating)} {profile.rating} ({profile.reviewCount})
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Standard Rate</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--brand)' }}>
                ₹{profile.hourlyRate} / hr
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </button>
          </div>
        </div>
      </Modal>
    </PortalLayout>
  );
}
