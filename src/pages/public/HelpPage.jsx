import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PairUpLogo from '../../components/PairUpLogo';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import {
  SearchIcon,
  ShieldIcon,
  MentorIcon,
  MessageIcon,
  ClockIcon,
  CreditCardIcon,
  UsersIcon,
  StarIcon,
  DocumentIcon,
  BookIcon,
  WalletIcon,
  ScaleIcon,
} from '../../components/Icons';

export default function HelpPage() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [expandedArticle, setExpandedArticle] = useState(
    initialCategory === 'mentor' ? 'mentor-application-profile' : 'learner-getting-started'
  );
  const [helpfulFeedback, setHelpfulFeedback] = useState({});

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setActiveCategory(cat);
      if (cat === 'mentor') {
        setExpandedArticle('mentor-application-profile');
      } else if (cat === 'learner') {
        setExpandedArticle('learner-getting-started');
      }
    }
  }, [searchParams]);


  const categories = [
    { id: 'all', label: 'All Guides', icon: BookIcon },
    { id: 'learner', label: 'For Learners (Clients)', icon: UsersIcon, count: 7 },
    { id: 'mentor', label: 'For Mentors (Experts)', icon: MentorIcon, count: 7 },
    { id: 'escrow', label: 'Trust & Escrow', icon: ShieldIcon, count: 4 },
    { id: 'webrtc', label: 'Live Session & Rooms', icon: ClockIcon, count: 4 },
  ];

  const guideArticles = [
    // -------------------------------------------------------------
    // LEARNER GUIDES (UPWORK CLIENT STYLE)
    // -------------------------------------------------------------
    {
      id: 'learner-getting-started',
      category: 'learner',
      title: 'Getting Started as a Learner: Account Setup & First Steps',
      summary: 'How to set up your learner profile, configure notification preferences, and prepare for your first debugging session.',
      tags: ['Learner', 'Account', 'Setup', 'Getting Started'],
      readTime: '3 min read',
      content: (
        <div>
          <p>
            Welcome to PairUp! Like hiring on Upwork, getting started as a learner takes less than two minutes.
            Your learner account gives you instant access to verified senior IT engineers across 50+ technology stacks.
          </p>
          <h4>1. Complete Your Learner Profile</h4>
          <p>
            Head to <strong>Learner Dashboard &gt; Profile</strong>. Fill in your name, current tech focus (e.g. React, Python, AWS),
            and timezone. Having an accurate timezone ensures mentors propose session times that fit your working hours.
          </p>
          <h4>2. Understand the Two Ways to Get Help</h4>
          <ul>
            <li>
              <strong>Direct Mentor Booking:</strong> Browse active mentors, filter by skill, read reviews, and book directly. Best for urgent production bugs when an expert is already online.
            </li>
            <li>
              <strong>Post a Problem Request (Job Post):</strong> Write a problem ticket detailing your issue. Qualified mentors submit custom proposals with their estimated diagnostic time.
            </li>
          </ul>
          <div className="help-callout callout-tip">
            <strong>Pro Tip (Upwork Parallel):</strong> You don't need to commit money to explore. You can freely message mentors or post a problem ticket with zero upfront charges.
          </div>
        </div>
      ),
    },
    {
      id: 'learner-finding-mentors',
      category: 'learner',
      title: 'Finding and Vetting the Best Mentor for Your Stack',
      summary: 'How to use technology filters, review past ratings, evaluate GitHub profiles, and select the right domain expert.',
      tags: ['Learner', 'Search', 'Mentors', 'Filters', 'Ratings'],
      readTime: '4 min read',
      content: (
        <div>
          <p>
            Finding the right mentor is critical. Just like reviewing freelancer proposals on Upwork, PairUp provides deep transparency into each mentor's real-world credentials.
          </p>
          <h4>1. Filter by Exact Technology Stacks</h4>
          <p>
            Use the dynamic filter bar on the homepage or Explore page. You can multi-select technologies like <code>Django</code> + <code>PostgreSQL</code> or <code>Docker</code> + <code>AWS</code> to narrow down mentors who specialize in your exact architecture.
          </p>
          <h4>2. Inspecting the Mentor Card & Profile</h4>
          <ul>
            <li>
              <strong>Green Online Indicator:</strong> Means the mentor is actively at their computer and available for an immediate live pairing session.
            </li>
            <li>
              <strong>Verified Badges:</strong> Indicates our team has verified their professional identity, GitHub repositories, and industry background.
            </li>
            <li>
              <strong>Session Star Ratings & Reviews:</strong> Read real feedback from developers who completed paid sessions with this mentor. Every review is cryptographically tied to a completed escrow transaction.
            </li>
            <li>
              <strong>Hourly Rate:</strong> Clearly displayed on every card. Sessions can be booked for 30, 45, 60, or 120 minutes with fair pro-rata calculation.
            </li>
          </ul>
          <div className="help-callout callout-info">
            <strong>Best Practice:</strong> Check the mentor's bio for specific experience with version numbers or frameworks (e.g. Next.js 14 App Router vs Pages Router, Kubernetes Ingress configurations).
          </div>
        </div>
      ),
    },
    {
      id: 'learner-posting-problem',
      category: 'learner',
      title: 'Posting a Problem Ticket (Marketplace Job Posting)',
      summary: 'Write high-converting problem tickets with error traces and repo context so qualified mentors apply quickly.',
      tags: ['Learner', 'Post Problem', 'Job Post', 'Proposals'],
      readTime: '4 min read',
      content: (
        <div>
          <p>
            Posting a problem on PairUp is the equivalent of creating a Job Post on Upwork. It broadcasts your challenge to all qualified mentors on the platform.
          </p>
          <h4>How to Write an Effective Problem Ticket</h4>
          <ol>
            <li>
              <strong>Descriptive Title:</strong> Avoid generic titles like "Help with code". Use specific headings like <em>"Next.js hydration mismatch error on dynamic server component with Supabase auth"</em>.
            </li>
            <li>
              <strong>Stack Tags:</strong> Tag your issue with all relevant libraries (e.g. <code>react</code>, <code>typescript</code>, <code>next.js</code>, <code>supabase</code>).
            </li>
            <li>
              <strong>Error Trace & Logs:</strong> Paste the exact stack trace and terminal output in markdown code blocks.
            </li>
            <li>
              <strong>What You Have Tried:</strong> Mention the solutions or StackOverflow threads you already tested. This saves valuable minutes during the live call.
            </li>
            <li>
              <strong>Estimated Budget / Target Duration:</strong> Specify whether you anticipate a quick 30-minute unblock or a deeper 1-to-2 hour architectural review.
            </li>
          </ol>
          <h4>Reviewing Incoming Mentor Proposals</h4>
          <p>
            Mentors will review your ticket and submit proposals explaining their diagnostic hypothesis, proposed session time, and rate. You can review their profiles and message them before accepting.
          </p>
        </div>
      ),
    },
    {
      id: 'learner-chat-scoping',
      category: 'learner',
      title: 'Pre-Session Direct Chat & Project Scoping Rules',
      summary: 'How to communicate in free direct messages before booking, align on expectations, and avoid off-platform risks.',
      tags: ['Learner', 'Chat', 'Scoping', 'Security', 'Policy'],
      readTime: '3 min read',
      content: (
        <div>
          <p>
            PairUp includes free real-time chat so you can speak directly with any mentor before committing funds to escrow.
          </p>
          <h4>Recommended Pre-Booking Questions</h4>
          <ul>
            <li>"Have you worked with this specific library or database driver before?"</li>
            <li>"Here is the error log [paste]. Do you think we can diagnose this in a 30 or 60 minute session?"</li>
            <li>"Can we do a live screen-share call today around 4:00 PM UTC?"</li>
          </ul>
          <div className="help-callout callout-warning">
            <strong>Strict Platform Security Rule:</strong> Never exchange phone numbers, personal WhatsApp, Telegram, or PayPal handles to pay outside PairUp. Off-platform transactions immediately void all escrow protections, dispute guarantees, and result in permanent account suspension.
          </div>
        </div>
      ),
    },
    {
      id: 'learner-escrow-booking',
      category: 'learner',
      title: 'Booking & Escrow Payment Protection Explained',
      summary: 'How your funds are safely held in platform escrow, pro-rata calculations, and our 100% money-back guarantee.',
      tags: ['Learner', 'Escrow', 'Payment', 'Refunds', 'Guarantee'],
      readTime: '4 min read',
      content: (
        <div>
          <p>
            Just like Upwork's milestone escrow, your money is 100% protected on PairUp. When you book a session:
          </p>
          <h4>The Escrow Lifecycle</h4>
          <ol>
            <li>
              <strong>Deposit Held in Escrow:</strong> You select the duration (e.g. 30m, 60m, 120m). The pro-rata amount is charged and placed into a secure escrow vault. The mentor does <em>not</em> have access to these funds.
            </li>
            <li>
              <strong>Session Delivered:</strong> You and the mentor meet in the native WebRTC session room, share screens, and collaborate on the bug.
            </li>
            <li>
              <strong>Learner Approval & Release:</strong> After the session concludes, you click "Confirm Completion & Release Payment". Only then are the funds credited to the mentor's earnings.
            </li>
            <li>
              <strong>Dispute Window:</strong> If the mentor fails to show up, disconnects early, or cannot provide the agreed expertise, you can open a dispute before releasing funds to receive a full refund.
            </li>
          </ol>
          <div className="help-callout callout-tip">
            <strong>Pro-Rata Formula:</strong> Session Price = <code>(Mentor Hourly Rate × Minutes) / 60</code>. No hidden platform markups or surprise surcharges.
          </div>
        </div>
      ),
    },
    {
      id: 'learner-session-room',
      category: 'learner',
      title: 'Inside the Live 1-on-1 Session Room (WebRTC & Screen Share)',
      summary: 'Step-by-step instructions on joining the call, sharing your screen/IDE, using collaborative notes, and testing mic/camera.',
      tags: ['Learner', 'WebRTC', 'Screen Share', 'Session Room'],
      readTime: '4 min read',
      content: (
        <div>
          <p>
            PairUp features a zero-install, built-in WebRTC session room. You do not need Zoom, Google Meet, or third-party meeting links.
          </p>
          <h4>How to Enter and Share Your Screen</h4>
          <ol>
            <li>
              Navigate to <strong>Sessions</strong> and click <strong>"Enter Live Room"</strong> when your scheduled time arrives.
            </li>
            <li>
              When prompted by your browser, grant permission for <strong>Microphone</strong> and <strong>Camera</strong> (camera is optional; mic and screen share are recommended).
            </li>
            <li>
              Click <strong>"Share Screen"</strong>. You can choose to share:
              <ul>
                <li><strong>Entire Screen:</strong> Recommended if you are toggling between your code editor (VS Code), browser console, and terminal.</li>
                <li><strong>Application Window:</strong> Share only your IDE or terminal.</li>
              </ul>
            </li>
            <li>
              Use the built-in <strong>Collaborative Notes</strong> panel on the right side to paste code snippets, command outputs, and links. Notes persist after the call for your records.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'learner-reviews-disputes',
      category: 'learner',
      title: 'Releasing Escrow, Leaving Reviews & Raising Disputes',
      summary: 'How to release payments, write honest public feedback, and request mediation if an issue occurs.',
      tags: ['Learner', 'Reviews', 'Disputes', 'Escrow Release'],
      readTime: '3 min read',
      content: (
        <div>
          <h4>Releasing Escrow & Reviewing</h4>
          <p>
            When your pairing session is complete, head to the session summary screen. Click <strong>"Release Payment"</strong> and leave a 1-to-5 star rating with a brief review. Your honest review helps other learners discover high-performing mentors.
          </p>
          <h4>When and How to Open a Dispute</h4>
          <p>
            You can file a dispute if:
          </p>
          <ul>
            <li>The mentor did not attend the scheduled session.</li>
            <li>The mentor had severe technical issues and disconnected without rescheduling.</li>
            <li>The mentor clearly misrepresented their technical competencies.</li>
          </ul>
          <p>
            Click <strong>"Report Issue / Open Dispute"</strong> on the contract details page. Provide a brief summary of what happened. Our moderation team reviews the session room attendance logs, WebRTC heartbeat metrics, and chat history to execute a fair resolution or full refund within 24 hours.
          </p>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // MENTOR GUIDES (UPWORK FREELANCER / EXPERT STYLE)
    // -------------------------------------------------------------
    {
      id: 'mentor-application-profile',
      category: 'mentor',
      title: 'Becoming a Verified Mentor: Application & Profile Optimization',
      summary: 'How to craft a high-converting mentor profile, pass verification, and attract motivated learners.',
      tags: ['Mentor', 'Profile', 'Verification', 'Application'],
      readTime: '4 min read',
      content: (
        <div>
          <p>
            Mentoring on PairUp allows you to monetize your senior engineering expertise on your own schedule. Like top-rated freelancers on Upwork, the most successful mentors maintain clear, specialized profiles.
          </p>
          <h4>1. Crafting a High-Converting Headline</h4>
          <p>
            Be specific rather than generic. Instead of <em>"Software Developer"</em>, use <em>"Staff Python &amp; Django Architect | 8+ yrs Distributed Systems &amp; AWS"</em>. Specific headlines convert 3x higher.
          </p>
          <h4>2. Tagging Your Core Skills</h4>
          <p>
            Add 4 to 8 primary technologies you are truly confident debugging live under pressure. It is far better to be a 5-star expert in <code>React</code> and <code>TypeScript</code> than a superficial generalist in 20 tools.
          </p>
          <h4>3. Linking GitHub &amp; LinkedIn</h4>
          <p>
            Providing your GitHub and LinkedIn profiles helps our moderation team verify your credentials and award the verified checkmark badge.
          </p>
        </div>
      ),
    },
    {
      id: 'mentor-rates-availability',
      category: 'mentor',
      title: 'Setting Rates, Managing Availability & The Online Toggle',
      summary: 'How to price your time, set hourly rates, and toggle Instant Live Pairing to receive immediate requests.',
      tags: ['Mentor', 'Pricing', 'Availability', 'Online Toggle'],
      readTime: '3 min read',
      content: (
        <div>
          <h4>1. Setting Your Hourly Rate</h4>
          <p>
            Mentors have 100% freedom to set their hourly rate (e.g. ₹800/hr to ₹6,000+/hr, or international USD equivalent). Rates are calculated pro-rata per minute during sessions.
          </p>
          <h4>2. The "Online" Status Toggle (Instant Pairing)</h4>
          <p>
            In the top bar, mentors have a live switch: <strong>Online / Offline</strong>.
          </p>
          <ul>
            <li>
              <strong>When Online:</strong> Your card appears with a pulsing green dot at the top of search results. Learners who need urgent, right-now debugging can book an immediate session with you.
            </li>
            <li>
              <strong>When Offline:</strong> You will only receive scheduled calendar bookings or asynchronous problem ticket proposals.
            </li>
          </ul>
          <h4>3. Availability Calendar</h4>
          <p>
            Under <strong>Mentor Dashboard &gt; Availability</strong>, set your weekly recurring available time slots so learners can schedule days in advance.
          </p>
        </div>
      ),
    },
    {
      id: 'mentor-submitting-proposals',
      category: 'mentor',
      title: 'Finding Problem Requests & Submitting Winning Proposals',
      summary: 'How to browse public problem tickets, write compelling pitches, and win high-paying contracts.',
      tags: ['Mentor', 'Proposals', 'Problem Tickets', 'Bidding'],
      readTime: '4 min read',
      content: (
        <div>
          <p>
            Similar to submitting proposals on Upwork job posts, mentors on PairUp can browse <strong>Problem Requests</strong> posted by learners and pitch their solution.
          </p>
          <h4>Formula for a Winning Proposal</h4>
          <ol>
            <li>
              <strong>Acknowledge the Specific Error:</strong> Quote the exact error message from their ticket to prove you read their issue and didn't copy-paste a generic template.
            </li>
            <li>
              <strong>State Your Hypothesis:</strong> Briefly explain what you think the underlying root cause might be (e.g. <em>"This CORS error with credentials usually stems from a missing Access-Control-Allow-Credentials header combined with wildcard origins in Fastify"</em>).
            </li>
            <li>
              <strong>Realistic Time Estimate:</strong> State how long you think it will take to isolate and fix (e.g. <em>"We should be able to resolve this in a 30 to 45 minute pairing session"</em>).
            </li>
            <li>
              <strong>Call to Action:</strong> Invite them to reply in chat or schedule a session right away.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'mentor-pre-session-scoping',
      category: 'mentor',
      title: 'Pre-Session Scoping & Qualify Expectations',
      summary: 'Best practices for vetting problem tickets in chat before agreeing to a paid live call.',
      tags: ['Mentor', 'Scoping', 'Communication', 'Expectations'],
      readTime: '3 min read',
      content: (
        <div>
          <p>
            Before accepting a booking or proposal, spend 2 minutes reviewing the learner's environment in chat:
          </p>
          <ul>
            <li>Ask what operating system and framework versions they are running.</li>
            <li>Ensure their local development server can reproduce the issue.</li>
            <li>If the problem requires third-party access (e.g. AWS console, Stripe sandbox), ensure they have credentials ready before the session timer starts.</li>
          </ul>
          <div className="help-callout callout-info">
            <strong>Mentor Safety:</strong> Never accept off-platform payments or offer to do code work outside of PairUp contracts. Doing so voids all non-payment protections and risks removal from the mentor roster.
          </div>
        </div>
      ),
    },
    {
      id: 'mentor-session-excellence',
      category: 'mentor',
      title: 'Conducting a 5-Star Live Pairing Session: Mentorship Mindset',
      summary: 'How to structure a live debugging call, teach senior mental models, and earn repeat clients.',
      tags: ['Mentor', 'Pair Programming', 'Best Practices', '5-Star'],
      readTime: '5 min read',
      content: (
        <div>
          <p>
            The difference between a mediocre freelancer and an elite PairUp mentor is <strong>pedagogy</strong>. Learners come to PairUp not just for a quick patch, but to learn how you think.
          </p>
          <h4>Recommended 5-Step Session Structure</h4>
          <ol>
            <li>
              <strong>Reproduce the Bug (Minutes 0-5):</strong> Ask the learner to demonstrate the error live in their browser or terminal. Observe without interrupting.
            </li>
            <li>
              <strong>Isolate the Boundary (Minutes 5-15):</strong> Walk through your mental model out loud. Place breakpoints, add logging statements, or inspect network payloads.
            </li>
            <li>
              <strong>Test the Hypothesis (Minutes 15-30):</strong> Guide the learner to write the fix themselves rather than dictating code. Having them type reinforces muscle memory.
            </li>
            <li>
              <strong>Verify Edge Cases (Minutes 30-40):</strong> Test boundary conditions, rerun unit tests, and confirm the bug is truly quashed.
            </li>
            <li>
              <strong>Document Next Steps (Last 5 mins):</strong> Add bullet points in the shared Session Notes summarizing what was fixed and recommended architectural improvements.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'mentor-earnings-payouts',
      category: 'mentor',
      title: 'Earnings, Platform Commission & Payout Methods',
      summary: 'Transparent breakdown of mentor earnings, commission rates, escrow disbursement schedules, and bank/UPI transfers.',
      tags: ['Mentor', 'Earnings', 'Payouts', 'Commission', 'Wallet'],
      readTime: '4 min read',
      content: (
        <div>
          <p>
            PairUp provides a real-time earnings ledger in your <strong>Mentor Dashboard &gt; Earnings</strong>.
          </p>
          <h4>Fee Breakdown</h4>
          <ul>
            <li>Mentors receive the agreed session fee minus a transparent platform commission that covers WebRTC infrastructure, escrow processing, and dispute guarantees.</li>
            <li>No hidden fees, no charges to apply, and zero listing costs.</li>
          </ul>
          <h4>Disbursement Timeline</h4>
          <p>
            As soon as the learner approves the session completion (or after the automatic 48-hour fulfillment window closes without dispute), funds transition from <em>Pending Escrow</em> to <em>Available for Withdrawal</em>.
          </p>
          <h4>Requesting Payouts</h4>
          <p>
            You can withdraw directly to your verified Bank Account (NEFT/IMPS) or UPI ID. Payout requests are processed daily.
          </p>
        </div>
      ),
    },
    {
      id: 'mentor-dispute-protection',
      category: 'mentor',
      title: 'Dispute Prevention & Maintaining Your Top-Rated Badge',
      summary: 'How to protect yourself against unfair dispute claims, maintain a 5.0 rating, and get featured.',
      tags: ['Mentor', 'Disputes', 'Top Rated', 'Reputation'],
      readTime: '3 min read',
      content: (
        <div>
          <h4>How to Prevent Disputes</h4>
          <ul>
            <li>Always summarize session accomplishments in the shared room notes before hanging up.</li>
            <li>If an issue turns out to be an upstream library bug or out of scope, explain it clearly and offer actionable documentation links.</li>
            <li>If technical difficulties arise on your side, proactively offer to reschedule or add extra minutes.</li>
          </ul>
          <h4>How Dispute Reviews Protect Mentors</h4>
          <p>
            PairUp does not automatically issue one-sided refunds. If a learner files a dispute, our moderation team inspects:
          </p>
          <ol>
            <li>WebRTC call duration and connection logs.</li>
            <li>In-room shared notes and chat transcript.</li>
            <li>Original problem description vs session scope.</li>
          </ol>
          <p>
            If you showed up on time and provided professional guidance, your payout is protected.
          </p>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // TRUST & ESCROW (UPWORK TRUST & SAFETY STYLE)
    // -------------------------------------------------------------
    {
      id: 'escrow-how-it-works',
      category: 'escrow',
      title: 'The PairUp Escrow Guarantee: How Payments Are Secured',
      summary: 'Understanding the technical and financial architecture of our escrow hold system.',
      tags: ['Escrow', 'Security', 'Guarantee', 'Trust'],
      readTime: '3 min read',
      content: (
        <div>
          <p>
            The cornerstone of PairUp is financial trust. Neither party takes unfair financial risk:
          </p>
          <ul>
            <li><strong>Learners are protected:</strong> The mentor is not paid until the session is completed to your satisfaction.</li>
            <li><strong>Mentors are protected:</strong> You never have to chase clients for unpaid invoices or worry about fraudulent chargebacks. The money is verified and locked in escrow before you enter the room.</li>
          </ul>
          <div className="help-callout callout-tip">
            <strong>100% Escrow Refund Guarantee:</strong> If a mentor fails to show up or cannot deliver the scheduled session, you receive an immediate, full refund back to your payment method or platform balance.
          </div>
        </div>
      ),
    },
    {
      id: 'escrow-anti-circumvention',
      category: 'escrow',
      title: 'Anti-Circumvention Policy: Why Keep All Payments On-Platform',
      summary: 'Why paying or receiving money off-platform violates Terms of Service and forfeits all guarantees.',
      tags: ['Escrow', 'Policy', 'Circumvention', 'Terms'],
      readTime: '3 min read',
      content: (
        <div>
          <p>
            To maintain safety, all communications, contracts, and payments must remain on PairUp.
          </p>
          <h4>Risks of Off-Platform Transactions</h4>
          <ul>
            <li><strong>No Escrow Protection:</strong> If an outside payment is sent via PayPal or UPI, PairUp cannot recover funds if the other party disappears.</li>
            <li><strong>No Dispute Mediation:</strong> Our admin team cannot inspect off-platform Zoom or Google Meet calls to settle disputes.</li>
            <li><strong>Account Suspension:</strong> Accounts attempting to solicit off-platform payments will face permanent restriction and forfeiture of platform privileges.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'escrow-code-privacy',
      category: 'escrow',
      title: 'Code Confidentiality & Screen Sharing Safety Guidelines',
      summary: 'How to protect sensitive credentials, API keys, and proprietary code during screen sharing.',
      tags: ['Security', 'Privacy', 'Screen Share', 'Confidentiality'],
      readTime: '3 min read',
      content: (
        <div>
          <h4>Privacy Best Practices Before Sharing Your Screen</h4>
          <ol>
            <li>
              <strong>Hide Environment Secrets:</strong> Close <code>.env</code>, <code>credentials.json</code>, or production config files before sharing your desktop.
            </li>
            <li>
              <strong>Use Git Clean / Stash:</strong> Ensure you are working on a dedicated git branch rather than directly against production environments.
            </li>
            <li>
              <strong>Close Sensitive Browser Tabs:</strong> Close personal email, banking, or customer database tabs before starting screen share.
            </li>
          </ol>
          <div className="help-callout callout-info">
            <strong>Mentor NDA &amp; Code Privacy:</strong> All mentors on PairUp agree to strict confidentiality terms prohibiting them from copying, distributing, or utilizing any client proprietary code viewed during sessions.
          </div>
        </div>
      ),
    },
    {
      id: 'escrow-dispute-mediation',
      category: 'escrow',
      title: 'Dispute Mediation Process & Timelines',
      summary: 'A step-by-step breakdown of how our admin team investigates and resolves disputes.',
      tags: ['Disputes', 'Mediation', 'Refunds', 'Admin'],
      readTime: '4 min read',
      content: (
        <div>
          <p>
            In the rare event that a session cannot be resolved amicably, our dedicated Dispute Mediation Team steps in.
          </p>
          <h4>The 3-Step Dispute Timeline</h4>
          <ol>
            <li>
              <strong>Filing (Within 48 hours of session):</strong> Either party can raise a dispute from their contract view, stating the issue and attaching any relevant screenshots.
            </li>
            <li>
              <strong>Investigation (24 hours):</strong> Our mediation staff checks system telemetry (WebRTC join timestamps, connection durations, shared notes, and pre-session chat).
            </li>
            <li>
              <strong>Resolution:</strong> The mediator issues a binding determination:
              <ul>
                <li><strong>Full Refund to Learner:</strong> If the mentor did not attend or failed to provide relevant guidance.</li>
                <li><strong>Partial Credit / Split:</strong> If technical issues disrupted half of the scheduled call.</li>
                <li><strong>Disbursement to Mentor:</strong> If the mentor fulfilled the agreed scope in good faith.</li>
              </ul>
            </li>
          </ol>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // LIVE WEBRTC ROOM & TECHNICAL GUIDES
    // -------------------------------------------------------------
    {
      id: 'tech-browser-requirements',
      category: 'webrtc',
      title: 'Browser Compatibility & System Requirements',
      summary: 'Recommended browsers, minimum internet speeds, and hardware setups for smooth live debugging.',
      tags: ['WebRTC', 'Browser', 'Compatibility', 'Requirements'],
      readTime: '2 min read',
      content: (
        <div>
          <p>PairUp uses standard WebRTC protocols supported natively in modern web browsers:</p>
          <ul>
            <li><strong>Google Chrome:</strong> Version 90+ (Recommended)</li>
            <li><strong>Mozilla Firefox:</strong> Version 88+</li>
            <li><strong>Microsoft Edge:</strong> Version 90+</li>
            <li><strong>Brave &amp; Opera:</strong> Supported with WebRTC permissions enabled</li>
            <li><strong>Apple Safari:</strong> Supported on macOS 12+ and iOS 15+</li>
          </ul>
          <p>
            <strong>Recommended Connection Speed:</strong> At least 5 Mbps upload and download for 1080p screen sharing alongside bidirectional audio.
          </p>
        </div>
      ),
    },
    {
      id: 'tech-screen-sharing-permissions',
      category: 'webrtc',
      title: 'Granting Screen Sharing Permissions on macOS & Windows',
      summary: 'How to enable system screen recording permissions if the browser cannot capture your screen.',
      tags: ['WebRTC', 'Screen Share', 'Permissions', 'macOS', 'Windows'],
      readTime: '3 min read',
      content: (
        <div>
          <h4>For macOS Users:</h4>
          <ol>
            <li>Open <strong>System Settings &gt; Privacy &amp; Security &gt; Screen &amp; System Audio Recording</strong>.</li>
            <li>Ensure your browser (Google Chrome, Firefox, or Safari) is toggled to <strong>ON</strong>.</li>
            <li>If prompted, restart your browser for changes to take effect.</li>
          </ol>
          <h4>For Windows Users:</h4>
          <p>
            Windows natively permits screen capture in modern browsers. If you see a black screen, ensure hardware acceleration is enabled in Chrome: <em>Settings &gt; System &gt; Use graphics acceleration when available</em>.
          </p>
        </div>
      ),
    },
    {
      id: 'tech-audio-video-troubleshooting',
      category: 'webrtc',
      title: 'Microphone & Camera Troubleshooting',
      summary: 'Resolve common audio echo, microphone mute issues, and device switching inside the session room.',
      tags: ['WebRTC', 'Audio', 'Microphone', 'Camera', 'Troubleshooting'],
      readTime: '3 min read',
      content: (
        <div>
          <h4>Cannot Hear the Other Developer?</h4>
          <ul>
            <li>Check your system output device (headphones vs built-in speakers).</li>
            <li>Ensure you haven't muted the browser tab in Chrome or Edge (look for the speaker icon on the tab bar).</li>
          </ul>
          <h4>Echo or Feedback?</h4>
          <p>
            Always wear headphones or earbuds when pair programming. Built-in laptop speakers frequently leak into laptop microphones, triggering acoustic feedback loops.
          </p>
        </div>
      ),
    },
    {
      id: 'tech-network-firewall',
      category: 'webrtc',
      title: 'Network & Corporate Firewall Guidelines',
      summary: 'How to connect through corporate VPNs, strict NATs, or restrictive office firewalls.',
      tags: ['WebRTC', 'Network', 'Firewall', 'VPN', 'STUN/TURN'],
      readTime: '3 min read',
      content: (
        <div>
          <p>
            If you are connecting from a corporate enterprise network or bank VPN with strict UDP blocking:
          </p>
          <ul>
            <li>PairUp incorporates automated STUN/TURN fallback servers that tunnel WebRTC traffic over secure TLS port 443.</li>
            <li>If your corporate VPN completely blocks WebRTC peer traffic, try temporarily disconnecting from the VPN for the duration of the pairing call, or consult your IT department to allow standard WebRTC media ports.</li>
          </ul>
        </div>
      ),
    },
  ];

  // Filtered articles based on active tab and search query
  const filteredArticles = useMemo(() => {
    return guideArticles.filter((article) => {
      // Category filter
      if (activeCategory !== 'all' && article.category !== activeCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = article.title.toLowerCase().includes(query);
        const summaryMatch = article.summary.toLowerCase().includes(query);
        const tagsMatch = article.tags.some((t) => t.toLowerCase().includes(query));
        return titleMatch || summaryMatch || tagsMatch;
      }

      return true;
    });
  }, [activeCategory, searchQuery]);

  const handleToggleArticle = (id) => {
    setExpandedArticle(expandedArticle === id ? null : id);
  };

  const handleFeedback = (id, isHelpful) => {
    setHelpfulFeedback((prev) => ({
      ...prev,
      [id]: isHelpful,
    }));
  };

  return (
    <div className="help-center-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* HERO SECTION */}
        <section className="help-hero-section">
          <div className="container" style={{ maxWidth: '980px', textAlign: 'center' }}>
            <div className="hero-terminal-pill" style={{ margin: '0 auto 16px' }}>
              <span className="terminal-dot"></span>
              <span className="terminal-text">$ pairup --help-center &amp; user-guide</span>
            </div>

            <h1 className="help-hero-title">
              How can we <span className="accent">help you</span> today?
            </h1>

            <p className="help-hero-subtitle">
              Comprehensive platform guides for learners and mentors. Everything from finding senior mentors,
              posting problem tickets, running live WebRTC rooms, to escrow payment protection.
            </p>

            {/* SEARCH BOX */}
            <div className="help-search-wrapper">
              <div className="help-search-box">
                <SearchIcon size={20} className="help-search-icon" />
                <input
                  type="text"
                  className="help-search-input"
                  placeholder="Search guides: escrow, screen sharing, mentor payouts, post a problem..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="help-search-clear"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Search Chips */}
              <div className="help-quick-chips">
                <span className="quick-label">Popular topics:</span>
                <button type="button" className="quick-chip" onClick={() => setSearchQuery('escrow')}>
                  Escrow Guarantee
                </button>
                <button type="button" className="quick-chip" onClick={() => setSearchQuery('screen share')}>
                  Screen Share
                </button>
                <button type="button" className="quick-chip" onClick={() => setSearchQuery('payouts')}>
                  Mentor Payouts
                </button>
                <button type="button" className="quick-chip" onClick={() => setSearchQuery('post a problem')}>
                  Post a Problem
                </button>
                <button type="button" className="quick-chip" onClick={() => setSearchQuery('disputes')}>
                  Disputes
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* GUIDES MAIN CONTAINER */}
        <section className="help-main-content">
          <div className="container" style={{ maxWidth: '1080px' }}>
            {/* CATEGORY TABS */}
            <div className="help-category-tabs" role="tablist">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`help-cat-tab ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <Icon size={18} />
                    <span>{cat.label}</span>
                    {cat.count && <span className="cat-count-badge">{cat.count}</span>}
                  </button>
                );
              })}
            </div>

            {/* RESULTS COUNT / SEARCH STATUS */}
            <div className="help-results-bar">
              <span>
                Showing <strong>{filteredArticles.length}</strong> guide{filteredArticles.length === 1 ? '' : 's'}
                {activeCategory !== 'all' && (
                  <span> in <strong>{categories.find((c) => c.id === activeCategory)?.label}</strong></span>
                )}
                {searchQuery && (
                  <span> matching "<strong>{searchQuery}</strong>"</span>
                )}
              </span>

              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSearchQuery('')}
                >
                  Reset search
                </button>
              )}
            </div>

            {/* ARTICLES LIST ACCORDION */}
            {filteredArticles.length === 0 ? (
              <div className="help-empty-state">
                <div className="empty-icon-wrap">
                  <SearchIcon size={32} />
                </div>
                <h3>No matching guides found</h3>
                <p>We couldn't find any articles matching "{searchQuery}". Try a different keyword or reset your search.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                >
                  View All Guides
                </button>
              </div>
            ) : (
              <div className="help-articles-accordion">
                {filteredArticles.map((article) => {
                  const isExpanded = expandedArticle === article.id;
                  const feedback = helpfulFeedback[article.id];

                  return (
                    <article
                      key={article.id}
                      className={`help-article-card ${isExpanded ? 'expanded' : ''}`}
                    >
                      <header
                        className="help-article-header"
                        onClick={() => handleToggleArticle(article.id)}
                      >
                        <div className="help-header-left">
                          <div className="help-article-tags">
                            <span className={`help-cat-pill cat-${article.category}`}>
                              {article.category === 'learner'
                                ? 'Learner Guide'
                                : article.category === 'mentor'
                                ? 'Mentor Guide'
                                : article.category === 'escrow'
                                ? 'Trust & Escrow'
                                : 'Session Room'}
                            </span>
                            <span className="help-read-time">{article.readTime}</span>
                          </div>
                          <h3 className="help-article-title">{article.title}</h3>
                          {!isExpanded && (
                            <p className="help-article-summary">{article.summary}</p>
                          )}
                        </div>

                        <div className="help-header-right">
                          <span className="help-expand-indicator">
                            {isExpanded ? 'Collapse ↑' : 'Read Guide ↓'}
                          </span>
                        </div>
                      </header>

                      {isExpanded && (
                        <div className="help-article-body">
                          <div className="help-body-content">
                            {article.content}
                          </div>

                          {/* ARTICLE FOOTER / FEEDBACK */}
                          <div className="help-article-footer">
                            <div className="help-tags-list">
                              {article.tags.map((tag) => (
                                <span key={tag} className="tag">
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            <div className="help-feedback-widget">
                              <span className="feedback-label">Was this guide helpful?</span>
                              {feedback !== undefined ? (
                                <span className="feedback-thanks">
                                  {feedback ? '✓ Thanks for the feedback!' : '✓ We will improve this guide!'}
                                </span>
                              ) : (
                                <div className="feedback-buttons">
                                  <button
                                    type="button"
                                    className="btn-feedback"
                                    onClick={() => handleFeedback(article.id, true)}
                                    title="Yes, this was helpful"
                                  >
                                    👍 Yes
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-feedback"
                                    onClick={() => handleFeedback(article.id, false)}
                                    title="No, this needs improvement"
                                  >
                                    👎 No
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px' }}>
              <button
                type="button"
                className="inline-back-to-top-btn"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Scroll back to top"
              >
                <span>↑ Back to top</span>
              </button>
            </div>
          </div>
        </section>

        {/* COMPARISON / UPWORK WORKFLOW CHEAT SHEET */}
        <section className="help-cheatsheet-section">
          <div className="container" style={{ maxWidth: '1080px' }}>
            <div className="section-eyebrow">$ workflow comparison</div>
            <h2 className="section-heading">PairUp vs Upwork: Feature &amp; Workflow Map</h2>
            <p className="section-sub">
              Familiar with Upwork? Here is how PairUp maps the best of Upwork to live, real-time developer pair debugging.
            </p>

            <div className="cheatsheet-table-card">
              <table className="cheatsheet-table">
                <thead>
                  <tr>
                    <th>Workflow Stage</th>
                    <th>Upwork Equivalent</th>
                    <th>PairUp Live Experience</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Hiring / Requesting Help</strong></td>
                    <td>Job Posting or Direct Talent Search</td>
                    <td><strong>Post a Problem Ticket</strong> or instant filter by 50+ tech stacks</td>
                  </tr>
                  <tr>
                    <td><strong>Freelancer / Mentor Pitch</strong></td>
                    <td>Bidding Proposals with Cover Letters</td>
                    <td><strong>Targeted Proposals</strong> with diagnostic hypothesis &amp; time estimates</td>
                  </tr>
                  <tr>
                    <td><strong>Financial Protection</strong></td>
                    <td>Milestone Escrow Deposit</td>
                    <td><strong>100% Escrow Hold</strong> released only when session completes</td>
                  </tr>
                  <tr>
                    <td><strong>Delivery &amp; Work</strong></td>
                    <td>Asynchronous delivery over days/weeks</td>
                    <td><strong>Live In-Browser WebRTC Room</strong> with video, mic &amp; screen share</td>
                  </tr>
                  <tr>
                    <td><strong>Billing Structure</strong></td>
                    <td>Hourly tracking app or Fixed Price</td>
                    <td><strong>Fair Pro-Rata Minute/Block Billing</strong> (30m, 60m, 120m)</td>
                  </tr>
                  <tr>
                    <td><strong>Dispute Settlement</strong></td>
                    <td>Upwork Dispute Resolution</td>
                    <td><strong>24hr Platform Mediation</strong> with attendance &amp; telemetry review</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
              <button
                type="button"
                className="inline-back-to-top-btn"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Scroll back to top"
              >
                <span>↑ Back to top</span>
              </button>
            </div>
          </div>
        </section>

        {/* STILL NEED HELP? CTA */}
        <section className="help-support-cta">
          <div className="container" style={{ maxWidth: '900px' }}>
            <div className="support-card-inner">
              <div className="support-icon-wrap">
                <MessageIcon size={32} />
              </div>
              <h2>Still have questions?</h2>
              <p>
                Our community and developer support team are here to assist you with any questions about session rooms,
                escrow payments, or mentor onboarding.
              </p>
              <div className="support-actions">
                <Link to="/contact" className="btn btn-primary btn-large">
                  Contact Developer Support
                </Link>
                <Link to="/what-is-pairup" className="btn btn-secondary btn-large">
                  What is PairUp?
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
