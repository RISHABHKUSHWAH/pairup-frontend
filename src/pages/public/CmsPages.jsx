import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../api/client';
import LegalPage from './LegalPage';

export function GenericCmsPage({ slug, defaultTitle, defaultSubtitle }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      try {
        const data = await api.getPage(slug);
        setPage(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [slug]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, paddingTop: '36px', paddingBottom: '60px', maxWidth: '720px' }}>
        <div style={{ fontFamily: 'IBM Plex Mono', color: 'var(--accent)', fontSize: '12px', marginBottom: '8px' }}>
          ₹ site / {slug}
        </div>
        <h1>{page?.title || defaultTitle}</h1>
        {defaultSubtitle && <p className="sub">{defaultSubtitle}</p>}

        {loading ? (
          <p className="sub">Loading content...</p>
        ) : error ? (
          <div className="error-box">Could not load content: {error}</div>
        ) : (
          <div
            className="bio"
            style={{ marginTop: '20px', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: page?.content_html || '' }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export function ContactPage() {
  return <GenericCmsPage slug="contact" defaultTitle="Contact Us" defaultSubtitle="Get in touch with the PairUp team." />;
}

export function PrivacyPage() {
  return <LegalPage slug="privacy" />;
}

export function TermsPage() {
  return <LegalPage slug="terms" />;
}
