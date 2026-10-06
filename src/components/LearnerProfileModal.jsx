import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import { learnerProfile, initials } from '../api/client';
import {
  MessageIcon,
  MapPinIcon,
  BriefcaseIcon,
  GlobeIcon,
  GithubIcon,
  LinkedinIcon,
  BookIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  UserIcon,
} from './Icons';

export default function LearnerProfileModal({ isOpen, onClose, learner }) {
  const profile = useMemo(() => {
    if (!learner) return null;
    const defaultUser = {
      id: learner.id || learner.learner_id || learner.user_id,
      name: learner.name || learner.learner_name,
      email: learner.email || learner.learner_email,
    };
    const loaded = learnerProfile.getProfile(defaultUser);
    
    // Ensure skills are an array
    let skills = loaded?.skillsLearning || [];
    if (typeof skills === 'string') {
      skills = skills.split(',').map((s) => s.trim()).filter(Boolean);
    }

    return {
      ...loaded,
      name: learner.name || learner.learner_name || loaded?.name || 'Learner',
      avatar: learner.avatar || learner.photo_url || loaded?.avatar || loaded?.photo_url || '',
      id: defaultUser.id,
      skillsLearning: skills,
    };
  }, [learner]);

  if (!isOpen || !profile) return null;

  const chatLink = `/chat?with=${profile.id || ''}&name=${encodeURIComponent(profile.name)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Learner Profile"
      maxWidth="560px"
      icon={<UserIcon size={18} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Header Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            padding: '16px',
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            borderRadius: '12px',
          }}
        >
          <div
            className="avatar-lg"
            style={{
              width: '56px',
              height: '56px',
              fontSize: '20px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--brand, #2563eb), #4f46e5)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '14px',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials(profile.name)
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                {profile.name}
              </h3>
              <span
                className="tag"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--brand, #2563eb)',
                }}
              >
                Learner
              </span>
              {profile.emailVerified && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: '#10b981',
                    fontWeight: 500,
                  }}
                  title="Verified Account"
                >
                  <CheckCircleIcon size={13} />
                  <span>Verified</span>
                </span>
              )}
            </div>

            {profile.headline && (
              <p
                style={{
                  margin: '6px 0 8px',
                  fontSize: '13px',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.4,
                }}
              >
                {profile.headline}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '12px',
                color: 'var(--ink-muted)',
                flexWrap: 'wrap',
              }}
            >
              {profile.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPinIcon size={13} /> {profile.location}
                </span>
              )}
              {profile.currentRole && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <BriefcaseIcon size={13} /> {profile.currentRole}
                  {profile.organization ? ` @ ${profile.organization}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to={chatLink}
            onClick={onClose}
            className="btn btn-primary"
            style={{
              flex: 1,
              justifyContent: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              padding: '9px 16px',
            }}
          >
            <MessageIcon size={15} />
            <span>Message {profile.name}</span>
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ fontSize: '13px', padding: '9px 16px' }}
          >
            Close
          </button>
        </div>

        {/* Learning Goals */}
        {profile.learningGoals && (
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--bg)',
              border: '1px solid var(--grid)',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
                marginBottom: '6px',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <BookIcon size={14} /> Learning Goals
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.5 }}>
              {profile.learningGoals}
            </p>
          </div>
        )}

        {/* Skills Learning */}
        {profile.skillsLearning && profile.skillsLearning.length > 0 && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Skills &amp; Technologies
              </span>
              {profile.skillLevel && (
                <span className="tag" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                  Level: {profile.skillLevel}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.skillsLearning.map((skill, idx) => (
                <span
                  key={idx}
                  className="tag"
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--grid-strong)',
                    fontWeight: 500,
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferences Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--grid)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Learning Style
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
              {profile.learningStyle || 'Hands-on Coding & Pair Programming'}
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--grid)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Preferred Language
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
              {profile.preferredLanguage || 'English'}
            </div>
          </div>
        </div>

        {/* Social / Portfolio Links */}
        {(profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                }}
              >
                <GithubIcon size={14} />
                <span>GitHub</span>
                <ExternalLinkIcon size={11} style={{ opacity: 0.6 }} />
              </a>
            )}
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                }}
              >
                <LinkedinIcon size={14} />
                <span>LinkedIn</span>
                <ExternalLinkIcon size={11} style={{ opacity: 0.6 }} />
              </a>
            )}
            {profile.portfolioUrl && profile.portfolioUrl !== profile.githubUrl && (
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                }}
              >
                <GlobeIcon size={14} />
                <span>Portfolio</span>
                <ExternalLinkIcon size={11} style={{ opacity: 0.6 }} />
              </a>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
