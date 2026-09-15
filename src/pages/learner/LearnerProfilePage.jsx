import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { learnerProfile, initials } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import { EyeIcon } from '../../components/Icons';

export default function LearnerProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const data = learnerProfile.getProfile(user);
    setProfile(data);
  }, [user]);

  if (!profile) return null;

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!skillInput.trim()) return;
      if (!profile.skillsLearning.includes(skillInput.trim())) {
        setProfile((prev) => ({
          ...prev,
          skillsLearning: [...prev.skillsLearning, skillInput.trim()],
        }));
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      skillsLearning: prev.skillsLearning.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    learnerProfile.saveProfile(profile, user?.id);
    toast.success('Profile changes saved successfully!');
  };

  return (
    <PortalLayout
      title="Learner Profile"
      portalType="learner"
      actions={
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setPreviewOpen(true)}
        >
          <EyeIcon size={15} /> Preview Profile Card
        </button>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        Tell mentors about your background, learning roadmap, and preferred pairing style.
      </p>

      <form onSubmit={handleSave} style={{ maxWidth: '640px' }}>
        {/* Personal Information */}
        <div className="panel" style={{ margin: '0 0 20px 0' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Personal Information</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
            <div className="avatar-lg" style={{ fontSize: '24px' }}>
              {initials(profile.name)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{profile.name}</div>
              <div className="sub" style={{ margin: '2px 0 0', fontSize: '12px' }}>
                Profile Avatar generated from initials
              </div>
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
            <label>Headline / Bio Title</label>
            <input
              type="text"
              value={profile.headline}
              onChange={(e) => handleChange('headline', e.target.value)}
              placeholder="e.g. Junior Dev mastering Python & System Design"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
                {profile.emailVerified && (
                  <span
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '12px',
                      fontSize: '11px',
                      color: 'var(--add)',
                      fontWeight: 600,
                    }}
                  >
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            <div className="field">
              <label>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
                {profile.phoneVerified && (
                  <span
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '12px',
                      fontSize: '11px',
                      color: 'var(--add)',
                      fontWeight: 600,
                    }}
                  >
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Location</label>
              <input
                type="text"
                value={profile.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g. Bengaluru, India"
              />
            </div>
            <div className="field">
              <label>Timezone</label>
              <input
                type="text"
                value={profile.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Skills & Learning Goals */}
        <div className="panel" style={{ margin: '0 0 20px 0' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Skills &amp; Interests</div>

          <div className="field">
            <label>Current Skill Level</label>
            <select
              value={profile.skillLevel}
              onChange={(e) => handleChange('skillLevel', e.target.value)}
            >
              <option value="Beginner">Beginner (Learning the basics, syntax &amp; simple scripts)</option>
              <option value="Intermediate">Intermediate (Building full apps, working with databases &amp; APIs)</option>
              <option value="Advanced">Advanced (Refactoring, architecture, scale &amp; concurrency)</option>
            </select>
          </div>

          <div className="field">
            <label>Technologies I am Learning</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {profile.skillsLearning.map((s) => (
                <span
                  key={s}
                  className="tag"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px' }}
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add another tech (e.g. Kubernetes, Redis)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleAddSkill}
              >
                Add
              </button>
            </div>
          </div>

          <div className="field">
            <label>Learning Goals</label>
            <textarea
              value={profile.learningGoals}
              onChange={(e) => handleChange('learningGoals', e.target.value)}
              rows={3}
              placeholder="What are you trying to accomplish in the next 3 to 6 months?"
            />
          </div>
        </div>

        {/* Background & Experience */}
        <div className="panel" style={{ margin: '0 0 20px 0' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Background &amp; Social Links</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Current Role / Student Status</label>
              <input
                type="text"
                value={profile.currentRole}
                onChange={(e) => handleChange('currentRole', e.target.value)}
                placeholder="e.g. CS Student / Associate Engineer"
              />
            </div>
            <div className="field">
              <label>College or Company</label>
              <input
                type="text"
                value={profile.organization}
                onChange={(e) => handleChange('organization', e.target.value)}
                placeholder="e.g. University / Tech Startup"
              />
            </div>
          </div>

          <div className="field">
            <label>GitHub Profile URL</label>
            <input
              type="url"
              value={profile.githubUrl}
              onChange={(e) => handleChange('githubUrl', e.target.value)}
              placeholder="https://github.com/yourusername"
            />
          </div>

          <div className="field">
            <label>LinkedIn Profile URL</label>
            <input
              type="url"
              value={profile.linkedinUrl}
              onChange={(e) => handleChange('linkedinUrl', e.target.value)}
              placeholder="https://linkedin.com/in/yourusername"
            />
          </div>
        </div>

        {/* Preferred Learning Style */}
        <div className="panel" style={{ margin: '0 0 24px 0' }}>
          <div className="section-label" style={{ marginTop: 0 }}>Preferred Learning Style</div>

          <div className="field">
            <label>Learning Method</label>
            <select
              value={profile.learningStyle}
              onChange={(e) => handleChange('learningStyle', e.target.value)}
            >
              <option value="Hands-on Coding & Pair Programming">Hands-on Coding &amp; Pair Programming</option>
              <option value="Theory & Core Concepts First">Theory &amp; Core Concepts First</option>
              <option value="Code Review & Architecture Breakdown">Code Review &amp; Architecture Breakdown</option>
              <option value="Interview Simulation & Q&A">Interview Simulation &amp; Q&amp;A</option>
            </select>
          </div>

          <div className="field">
            <label>Preferred Session Language</label>
            <select
              value={profile.preferredLanguage}
              onChange={(e) => handleChange('preferredLanguage', e.target.value)}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Spanish">Spanish</option>
              <option value="German">German</option>
              <option value="Bilingual">Bilingual (English + Regional)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px' }}>
            Save Profile Changes
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setPreviewOpen(true)}
          >
            Preview Learner Card
          </button>
        </div>
      </form>

      {/* Preview Card Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Public Learner Preview"
      >
        <div className="card" style={{ border: '2px solid var(--accent)' }}>
          <div className="card-top">
            <div className="avatar-lg">{initials(profile.name)}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px' }}>{profile.name}</div>
              <div className="sub" style={{ margin: '2px 0 0', fontSize: '13px' }}>
                {profile.headline}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                {profile.location} • {profile.currentRole} @ {profile.organization}
              </div>
            </div>
          </div>

          <div className="section-label">Learning Goals</div>
          <p className="sub" style={{ fontSize: '13px', margin: '4px 0 10px', lineHeight: 1.5 }}>
            {profile.learningGoals}
          </p>

          <div className="section-label">Skills Learning ({profile.skillLevel})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {profile.skillsLearning.map((s) => (
              <span key={s} className="tag">{s}</span>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--grid)', paddingTop: '10px', fontSize: '12px', color: 'var(--ink-muted)' }}>
            <span>Style: <strong>{profile.learningStyle}</strong></span>
            <span>Language: <strong>{profile.preferredLanguage}</strong></span>
          </div>
        </div>
      </Modal>
    </PortalLayout>
  );
}
