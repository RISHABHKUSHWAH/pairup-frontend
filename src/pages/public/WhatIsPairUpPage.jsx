import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PairUpLogo from '../../components/PairUpLogo';
import {
  ShieldIcon,
  MentorIcon,
  MessageIcon,
  ClockIcon,
  CreditCardIcon,
  UsersIcon,
  StarIcon,
} from '../../components/Icons';

export default function WhatIsPairUpPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToHowItWorks = (e) => {
    e.preventDefault();
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: 'What exactly is PairUp?',
      a: 'PairUp is a peer-to-peer IT marketplace designed for live pair programming and 1-on-1 developer mentorship. Instead of spending hours scouring forums or wrestling with hallucinating AI models, you can jump into a live WebRTC audio/video and screen-sharing session with a verified senior developer who unblocks your code in real time.',
    },
    {
      q: 'How does the escrow payment system protect me?',
      a: 'When you confirm a session booking, your payment is held securely in platform escrow. The mentor cannot access or withdraw the funds until the session is completed and both parties confirm fulfillment. If a mentor fails to attend or encounters irrecoverable technical issues, our 100% money-back dispute policy guarantees a prompt refund.',
    },
    {
      q: 'Can I chat with a mentor before committing to payment?',
      a: 'Yes, absolutely! PairUp has a built-in direct messaging system. You can reach out to any mentor for free, describe your bug or architecture questions, share snippets, and verify their familiarity with your stack before booking a session.',
    },
    {
      q: 'Do I need to download Zoom, Teams, or third-party software?',
      a: 'Not at all. PairUp features a built-in, lightweight WebRTC session room directly inside your browser. You get high-definition screen sharing, microphone and camera toggles, session notes, and real-time chat without installing any third-party software.',
    },
    {
      q: 'How much does a session cost?',
      a: 'Mentors set their own transparent hourly rates (e.g. ₹500/hr to ₹5,000+/hr, or equivalent in USD). Sessions can be scheduled for 30, 45, 60, or 120 minutes with pro-rata pricing, meaning you only pay for the exact session duration you book with zero recurring subscription traps.',
    },
    {
      q: 'Can I be both a learner and a mentor on the same account?',
      a: 'Yes! PairUp features a seamless dual-role architecture. You can sign up as a learner to get help on AWS and Docker, and concurrently apply as a mentor in React or Python. Switch contexts effortlessly without creating multiple accounts.',
    },
    {
      q: 'What happens if my bug cannot be resolved during the call?',
      a: 'Our verified mentors are committed to making tangible progress on your problem. If a mentor is unable to diagnose or solve the issue, or if there is a mismatch in advertised skills, you can raise a dispute ticket directly from your session details. Our admin team will investigate and issue a fair refund or credit.',
    },
    {
      q: 'How do I apply to become a mentor?',
      a: 'Click "Become a Mentor" in the top bar or footer, fill out your professional headline, primary skills, GitHub/LinkedIn links, and desired hourly rate. Our team verifies mentor profiles to ensure quality and trust across the platform.',
    },
  ];

  return (
    <div className="what-is-pairup-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* HERO SECTION */}
        <section className="about-hero-section">
          <div className="container" style={{ maxWidth: '1080px' }}>
            <div className="hero-terminal-pill">
              <span className="terminal-dot"></span>
              <span className="terminal-text">$ pairup --about-platform</span>
            </div>

            <h1 className="about-hero-title">
              Real-time pair debugging,<br />
              <span className="accent">human-to-human</span> IT mentorship.
            </h1>

            <p className="about-hero-lead">
              PairUp connects software engineers, learners, and tech founders with verified senior developers
              for instant, 1-on-1 collaborative screen-sharing sessions. Fix stubborn bugs, review architectures,
              and master real-world code with escrow-protected confidence.
            </p>

            <div className="about-hero-actions">
              <Link to="/" className="btn btn-primary btn-large">
                <span>Browse Mentors</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              <Link to="/become-a-mentor" className="btn btn-secondary btn-large">
                <MentorIcon size={18} />
                <span>Become a Mentor</span>
              </Link>

              <a href="#how-it-works" onClick={scrollToHowItWorks} className="about-scroll-link">
                How it works ↓
              </a>
            </div>

            {/* QUICK STATS / TRUST BAR */}
            <div className="about-trust-strip">
              <div className="trust-item">
                <div className="trust-icon-box">
                  <ShieldIcon size={20} className="trust-icon" />
                </div>
                <div>
                  <strong>100% Escrow Protection</strong>
                  <span>Funds released only when you approve</span>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <UsersIcon size={20} className="trust-icon" />
                </div>
                <div>
                  <strong>Verified Senior IT Mentors</strong>
                  <span>Experienced engineers across 50+ stacks</span>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <ClockIcon size={20} className="trust-icon" />
                </div>
                <div>
                  <strong>Instant or Scheduled</strong>
                  <span>Connect right now or book ahead</span>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <CreditCardIcon size={20} className="trust-icon" />
                </div>
                <div>
                  <strong>Transparent Pro-Rata Pricing</strong>
                  <span>Pay per session with zero subscriptions</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THE PROBLEM VS PAIRUP */}
        <section className="about-section about-contrast-section">
          <div className="container" style={{ maxWidth: '1080px' }}>
            <div className="section-eyebrow">$ problem vs solution</div>
            <h2 className="section-heading">Why developers need PairUp</h2>
            <p className="section-sub">
              Every developer hits roadblocks. The traditional ways of getting unblocked are broken, slow, or impersonal.
            </p>

            <div className="contrast-grid">
              <div className="contrast-card contrast-card-old">
                <div className="contrast-card-badge old-badge">Traditional Approaches</div>
                <ul className="contrast-list">
                  <li>
                    <span className="contrast-bullet bullet-bad">✕</span>
                    <div>
                      <strong>StackOverflow &amp; Forums:</strong> Hours or days waiting for answers, often marked as duplicates or closed without explanation.
                    </div>
                  </li>
                  <li>
                    <span className="contrast-bullet bullet-bad">✕</span>
                    <div>
                      <strong>AI Coding Assistants:</strong> Helpful for repetitive boilerplate, but hallucinate when debugging multi-service architectures, edge cases, and local environments.
                    </div>
                  </li>
                  <li>
                    <span className="contrast-bullet bullet-bad">✕</span>
                    <div>
                      <strong>Pre-Recorded Video Courses:</strong> Generic 40-hour tutorials that cannot look at your specific repository or help with unexpected build errors.
                    </div>
                  </li>
                  <li>
                    <span className="contrast-bullet bullet-bad">✕</span>
                    <div>
                      <strong>Senior Team Context Switching:</strong> Teammates are swamped with sprint deadlines and back-to-back meetings, delaying your PR for days.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="contrast-card contrast-card-pairup">
                <div className="contrast-card-badge new-badge">The PairUp Experience</div>
                <ul className="contrast-list">
                  <li>
                    <span className="contrast-bullet bullet-good">✓</span>
                    <div>
                      <strong>Instant Live 1-on-1 Pairing:</strong> Connect with an experienced developer in minutes to inspect the code live together.
                    </div>
                  </li>
                  <li>
                    <span className="contrast-bullet bullet-good">✓</span>
                    <div>
                      <strong>Your Screen, Your Repository:</strong> Share your exact IDE, terminal, and browser devtools through crystal-clear WebRTC video and screen share.
                    </div>
                  </li>
                  <li>
                    <span className="contrast-bullet bullet-good">✓</span>
                    <div>
                      <strong>Senior Problem-Solving Mental Models:</strong> Don't just copy-paste a quick fix—learn how senior engineers think, diagnose, and structure production systems.
                    </div>
                  </li>
                  <li>
                    <span className="contrast-bullet bullet-good">✓</span>
                    <div>
                      <strong>Risk-Free Escrow Protection:</strong> You talk before paying, and your money is securely locked until you confirm the session was delivered.
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="about-section">
          <div className="container" style={{ maxWidth: '1080px' }}>
            <div className="section-eyebrow">$ workflow</div>
            <h2 className="section-heading">How PairUp works</h2>
            <p className="section-sub">
              From finding a mentor to solving your bug in a live pairing session, the entire journey takes just 4 simple steps.
            </p>

            <div className="workflow-steps-grid">
              <div className="workflow-step-card">
                <div className="step-number-badge">01</div>
                <h3>Search or Post</h3>
                <p>
                  Explore mentors filtered by technology stack, hourly rate, and user ratings. Alternatively, post a problem ticket describing your bug so qualified mentors can offer their help.
                </p>
                <div className="step-pill-tag">Stack &amp; Rating Filters</div>
              </div>

              <div className="workflow-step-card">
                <div className="step-number-badge">02</div>
                <h3>Free Direct Chat</h3>
                <p>
                  Send a free message to any mentor before paying. Explain your blocker, verify their exact domain experience, and agree on a session timeframe.
                </p>
                <div className="step-pill-tag">Zero Risk Consultation</div>
              </div>

              <div className="workflow-step-card">
                <div className="step-number-badge">03</div>
                <h3>Escrow Hold Booking</h3>
                <p>
                  Confirm a 30, 45, 60, or 120-minute slot. Funds are securely locked in platform escrow and are never released to the mentor until after the session completes.
                </p>
                <div className="step-pill-tag">Protected Escrow</div>
              </div>

              <div className="workflow-step-card">
                <div className="step-number-badge">04</div>
                <h3>Live WebRTC Session</h3>
                <p>
                  Join our built-in browser room with high-definition screen sharing, live audio/video, collaborative notes, and chat. Debug together and level up.
                </p>
                <div className="step-pill-tag">In-Browser Pairing Room</div>
              </div>
            </div>
          </div>
        </section>

        {/* WHO IS IT FOR */}
        <section className="about-section about-personas-section">
          <div className="container" style={{ maxWidth: '1080px' }}>
            <div className="section-eyebrow">$ community</div>
            <h2 className="section-heading">Built for every developer journey</h2>
            <p className="section-sub">
              Whether you are writing your first lines of code or architecting microservices, PairUp gives you the right human guidance.
            </p>

            <div className="personas-grid">
              <div className="persona-card">
                <div className="persona-icon-header">
                  <span className="persona-emoji">🎓</span>
                  <span className="persona-role-title">Junior Devs &amp; Bootcamp Grads</span>
                </div>
                <p>
                  Break through the steep learning curves of modern tooling, git workflows, Docker containers, and framework conventions. Get your PRs merged with confidence.
                </p>
              </div>

              <div className="persona-card">
                <div className="persona-icon-header">
                  <span className="persona-emoji">🚀</span>
                  <span className="persona-role-title">Solo Founders &amp; Indie Hackers</span>
                </div>
                <p>
                  Ship MVPs 10x faster without hiring expensive full-time consultancies. Consult experienced specialists on payment gateways, database scaling, and DevOps pipelines.
                </p>
              </div>

              <div className="persona-card">
                <div className="persona-icon-header">
                  <span className="persona-emoji">🎯</span>
                  <span className="persona-role-title">Interview Candidates</span>
                </div>
                <p>
                  Practice mock system design interviews, master tricky data structures &amp; algorithms, and receive detailed portfolio code reviews from senior industry veterans.
                </p>
              </div>

              <div className="persona-card">
                <div className="persona-icon-header">
                  <span className="persona-emoji">💼</span>
                  <span className="persona-role-title">Senior Engineers &amp; Mentors</span>
                </div>
                <p>
                  Monetize your technical experience on your own terms. Set your hourly rate, accept sessions when convenient, and empower developers around the world.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PLATFORM FEATURES GRID */}
        <section className="about-section">
          <div className="container" style={{ maxWidth: '1080px' }}>
            <div className="section-eyebrow">$ platform architecture</div>
            <h2 className="section-heading">Enterprise-grade features, developer-first simplicity</h2>
            <p className="section-sub">
              Everything you need for productive pair programming sessions without clutter or friction.
            </p>

            <div className="features-grid">
              <div className="feature-item-box">
                <div className="feature-icon-wrapper">
                  <ShieldIcon size={22} />
                </div>
                <h3>100% Escrow Guarantee</h3>
                <p>Funds are held securely in platform escrow and only disbursed when you confirm your session was fulfilled successfully.</p>
              </div>

              <div className="feature-item-box">
                <div className="feature-icon-wrapper">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <h3>Native WebRTC Rooms</h3>
                <p>No downloads or software installs. High performance audio, video, and screen sharing directly in your modern web browser.</p>
              </div>

              <div className="feature-item-box">
                <div className="feature-icon-wrapper">
                  <UsersIcon size={22} />
                </div>
                <h3>Dual-Role System</h3>
                <p>Learn today, mentor tomorrow. Use a single account to seek help as a learner and earn as a verified mentor without multiple logins.</p>
              </div>

              <div className="feature-item-box">
                <div className="feature-icon-wrapper">
                  <MessageIcon size={22} />
                </div>
                <h3>Real-Time Chat &amp; Proposals</h3>
                <p>Directly communicate with mentors, share code snippets, agree on objectives, and submit or review custom booking proposals.</p>
              </div>

              <div className="feature-item-box">
                <div className="feature-icon-wrapper">
                  <StarIcon size={22} />
                </div>
                <h3>Verified Reviews &amp; Ratings</h3>
                <p>Every review comes from a completed, paid session. No fake testimonials, only genuine feedback from fellow software engineers.</p>
              </div>

              <div className="feature-item-box">
                <div className="feature-icon-wrapper">
                  <ClockIcon size={22} />
                </div>
                <h3>Instant Live &amp; Calendar Booking</h3>
                <p>Connect immediately with active online mentors for urgent production bugs, or book an upcoming slot using integrated availability calendars.</p>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE FAQ ACCORDION */}
        <section className="about-section about-faq-section">
          <div className="container" style={{ maxWidth: '820px' }}>
            <div className="section-eyebrow">$ faq</div>
            <h2 className="section-heading">Frequently asked questions</h2>
            <p className="section-sub">
              Have questions about how PairUp works? Here are answers to the most common questions.
            </p>

            <div className="faq-accordion">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className={`faq-item ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                    >
                      <span className="faq-question-text">{faq.q}</span>
                      <span className="faq-toggle-icon">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div className="faq-answer">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA BANNER */}
        <section className="about-bottom-cta">
          <div className="container" style={{ maxWidth: '900px' }}>
            <div className="cta-inner-card">
              <div className="cta-logo-wrap">
                <PairUpLogo size={36} />
              </div>
              <h2>Ready to pair with a real developer?</h2>
              <p>
                Stop spinning your wheels on stubborn bugs. Connect with a verified mentor today and ship your code with confidence.
              </p>
              <div className="cta-buttons">
                <Link to="/" className="btn btn-primary btn-large">
                  Find a Mentor Now
                </Link>
                <Link to="/become-a-mentor" className="btn btn-secondary btn-large">
                  Apply as a Mentor
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
