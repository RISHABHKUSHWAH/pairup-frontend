import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../api/client';
import { LEGAL_POLICIES, POLICY_LIST } from '../../data/legalPolicies';

const CATEGORIES = [
  {
    name: 'Core Marketplace Terms',
    description: 'Contractual agreements governing sessions, bookings, and platform fees.',
    slugs: ['terms', 'payments-gst', 'cancellation-refund']
  },
  {
    name: 'Privacy & User Consent',
    description: 'Data collection practices, cookies, user consent, and minors policy.',
    slugs: ['privacy', 'consent-preferences', 'cookie-policy', 'children-privacy']
  },
  {
    name: 'Data Protection & Security',
    description: 'Security architecture, data deletion (Right to be Forgotten), and retention schedules.',
    slugs: ['data-security', 'data-deletion', 'data-retention']
  },
  {
    name: 'Statutory Redressal',
    description: 'Nodal compliance and grievance redressal officer details under IT Rules 2021.',
    slugs: ['grievance-officer']
  }
];

export default function LegalPage({ slug: propSlug }) {
  const { slug: paramSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active slug: prop takes priority, then param, fallback to 'terms'
  const activeSlug = propSlug || paramSlug || 'terms';
  const policy = LEGAL_POLICIES[activeSlug] || LEGAL_POLICIES['terms'];

  const [cmsPage, setCmsPage] = useState(null);
  const [cmsLoading, setCmsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Try to load any admin CMS override for this slug (optional enhancement)
  useEffect(() => {
    let isMounted = true;
    async function loadCmsContent() {
      setCmsLoading(true);
      try {
        const data = await api.getPage(activeSlug);
        if (isMounted && data && data.content_html) {
          setCmsPage(data);
        } else if (isMounted) {
          setCmsPage(null);
        }
      } catch {
        // Fallback silently to rich built-in default data in legalPolicies.js
        if (isMounted) setCmsPage(null);
      } finally {
        if (isMounted) setCmsLoading(false);
      }
    }

    loadCmsContent();
    return () => {
      isMounted = false;
    };
  }, [activeSlug]);

  // Scroll to top or target anchor whenever active slug or hash changes
  useEffect(() => {
    if (location.hash) {
      const elem = document.querySelector(location.hash);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSlug, location.hash]);

  const handleCopyLink = () => {
    const url = window.location.origin + `/legal/${activeSlug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }).catch(() => {});
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered policies for search
  const filteredPolicies = POLICY_LIST.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.sections.some(s => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q))
    );
  });

  // Calculate prev and next policy
  const currentIndex = POLICY_LIST.findIndex(p => p.slug === activeSlug);
  const prevPolicy = currentIndex > 0 ? POLICY_LIST[currentIndex - 1] : null;
  const nextPolicy = currentIndex < POLICY_LIST.length - 1 ? POLICY_LIST[currentIndex + 1] : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ flex: 1, paddingTop: '32px', paddingBottom: '72px' }}>
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 20px' }}>
          
          {/* Breadcrumbs & Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-faint)' }}>
              <Link to="/" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>Home</Link>
              <span>/</span>
              <Link to="/legal" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Legal Hub</Link>
              <span>/</span>
              <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{policy.shortTitle}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-ghost"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--grid)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  cursor: 'pointer'
                }}
                title="Copy direct shareable link"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {copiedLink ? 'Link Copied!' : 'Share Link'}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="btn-ghost"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--grid)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  cursor: 'pointer'
                }}
                title="Print official document"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print
              </button>
            </div>
          </div>

          {/* Main Legal Hub Layout Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '36px', alignItems: 'start' }} className="legal-layout-grid">
            
            {/* LEFT SIDEBAR: Policy Directory */}
            <aside style={{ position: 'sticky', top: '90px' }} className="legal-sidebar">
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid)',
                  borderRadius: '12px',
                  padding: '18px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    Policies (11)
                  </h3>
                  <span style={{ fontSize: '11px', background: 'var(--grid)', color: 'var(--ink-muted)', padding: '2px 8px', borderRadius: '10px', fontFamily: 'IBM Plex Mono, monospace' }}>
                    v2026.10
                  </span>
                </div>

                {/* Search / Filter box */}
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Search policies & sections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 30px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--grid)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      boxSizing: 'border-box'
                    }}
                  />
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-faint)', pointerEvents: 'none' }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '8px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--ink-faint)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Categorized Policy Navigation List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: '4px' }}>
                  {searchQuery.trim() ? (
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-faint)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Search Results ({filteredPolicies.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {filteredPolicies.map(p => {
                          const isActive = p.slug === activeSlug;
                          return (
                            <Link
                              key={p.slug}
                              to={`/legal/${p.slug}`}
                              style={{
                                display: 'block',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontSize: '12.5px',
                                color: isActive ? 'var(--accent)' : 'var(--ink)',
                                background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                                fontWeight: isActive ? 600 : 400,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {p.title}
                            </Link>
                          );
                        })}
                        {filteredPolicies.length === 0 && (
                          <p style={{ fontSize: '12px', color: 'var(--ink-faint)', fontStyle: 'italic', margin: '8px 0' }}>
                            No policies matching "{searchQuery}"
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    CATEGORIES.map(cat => (
                      <div key={cat.name}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', fontFamily: 'IBM Plex Mono, monospace' }}>
                          {cat.name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {cat.slugs.map(s => {
                            const p = LEGAL_POLICIES[s];
                            if (!p) return null;
                            const isActive = p.slug === activeSlug;
                            return (
                              <Link
                                key={p.slug}
                                to={`/legal/${p.slug}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                  fontSize: '12.5px',
                                  color: isActive ? 'var(--accent)' : 'var(--ink)',
                                  background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                                  fontWeight: isActive ? 600 : 400,
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.shortTitle}
                                </span>
                                {isActive && (
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* On This Page: Quick Table of Contents */}
                {!cmsPage && policy.sections && policy.sections.length > 0 && (
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--grid)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', fontFamily: 'IBM Plex Mono, monospace' }}>
                      On This Page
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                      {policy.sections.map(sec => (
                        <a
                          key={sec.id}
                          href={`#${sec.id}`}
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--ink-muted)',
                            textDecoration: 'none',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-muted)'; }}
                        >
                          {sec.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </aside>

            {/* RIGHT PANEL: Official Policy Document Content */}
            <article
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--grid)',
                borderRadius: '12px',
                padding: '36px 40px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}
              className="legal-content-card"
            >
              {/* Category & Status Badges */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '11.5px',
                    color: 'var(--accent)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    padding: '3px 10px',
                    borderRadius: '20px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                  {policy.category}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-faint)' }}>
                  <span>Effective: {policy.effectiveDate}</span>
                  <span>•</span>
                  <span>Updated: {policy.lastUpdated}</span>
                </div>
              </div>

              {/* Document Header Title */}
              <h1 style={{ fontSize: '30px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                {cmsPage?.title || policy.title}
              </h1>

              {/* Executive Summary Card */}
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--grid)',
                  borderLeft: '4px solid var(--accent)',
                  borderRadius: '8px',
                  padding: '18px 20px',
                  margin: '20px 0 28px 0'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px', fontFamily: 'IBM Plex Mono, monospace' }}>
                  Policy Overview
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--ink)' }}>
                  {policy.summary}
                </p>

                {/* Key Highlights Checklist */}
                {policy.highlights && policy.highlights.length > 0 && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--grid-strong)' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '8px', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Key Protections & Highlights:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                      {policy.highlights.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: 'var(--ink)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--add, #10b981)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Loading State or Custom Admin CMS content if present */}
              {cmsLoading ? (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '13px' }}>
                  Loading legal policy...
                </div>
              ) : cmsPage?.content_html ? (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-faint)', marginBottom: '14px', padding: '6px 10px', background: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--grid)' }}>
                    Published content verified by PairUp Legal & Compliance
                  </div>
                  <div
                    className="legal-custom-html"
                    style={{ lineHeight: 1.75, color: 'var(--ink)', fontSize: '14px' }}
                    dangerouslySetInnerHTML={{ __html: cmsPage.content_html }}
                  />
                </div>
              ) : (
                /* Default Statutory Policy Sections from legalPolicies.js */
                <div className="legal-policy-sections" style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '24px' }}>
                  {policy.sections.map((sec, idx) => (
                    <section key={sec.id || idx} id={sec.id} style={{ scrollMarginTop: '100px' }}>
                      <h2
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: 'var(--ink)',
                          margin: '0 0 12px 0',
                          paddingBottom: '8px',
                          borderBottom: '1px solid var(--grid)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{sec.title}</span>
                        <a
                          href={`#${sec.id}`}
                          title="Direct link to this section"
                          style={{
                            fontSize: '12px',
                            color: 'var(--ink-faint)',
                            textDecoration: 'none',
                            fontFamily: 'IBM Plex Mono, monospace'
                          }}
                        >
                          #
                        </a>
                      </h2>

                      {/* Content: renders text or HTML blocks (for tables and contact cards) */}
                      <div
                        style={{
                          fontSize: '14px',
                          lineHeight: 1.75,
                          color: 'var(--ink)',
                          whiteSpace: sec.content.includes('<table') || sec.content.includes('<div') ? 'normal' : 'pre-line'
                        }}
                        dangerouslySetInnerHTML={{ __html: sec.content }}
                      />
                    </section>
                  ))}
                </div>
              )}

              {/* Bottom Support & Redressal Help Card */}
              <div
                style={{
                  marginTop: '44px',
                  padding: '24px',
                  borderRadius: '10px',
                  background: 'var(--bg)',
                  border: '1px solid var(--grid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--ink)' }}>
                    Have questions or need legal assistance?
                  </h4>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                    Our legal and grievance compliance team responds within statutory 24-hour windows.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link
                    to="/grievance-officer"
                    className="btn-ghost"
                    style={{
                      padding: '8px 14px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      border: '1px solid var(--grid)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    Grievance Officer
                  </Link>
                  <Link
                    to="/contact"
                    className="btn"
                    style={{
                      padding: '8px 14px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      background: 'var(--accent)',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    Contact Support
                  </Link>
                </div>
              </div>

              {/* Previous / Next Policy Pagination */}
              <div
                style={{
                  marginTop: '32px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--grid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                {prevPolicy ? (
                  <Link
                    to={`/legal/${prevPolicy.slug}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      textDecoration: 'none',
                      color: 'var(--ink)',
                      maxWidth: '45%'
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--ink-faint)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace' }}>
                      ← Previous Policy
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                      {prevPolicy.shortTitle}
                    </span>
                  </Link>
                ) : <div />}

                {nextPolicy && (
                  <Link
                    to={`/legal/${nextPolicy.slug}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      alignItems: 'flex-end',
                      textDecoration: 'none',
                      color: 'var(--ink)',
                      maxWidth: '45%',
                      textAlign: 'right'
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--ink-faint)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Next Policy →
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                      {nextPolicy.shortTitle}
                    </span>
                  </Link>
                )}
              </div>

            </article>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
