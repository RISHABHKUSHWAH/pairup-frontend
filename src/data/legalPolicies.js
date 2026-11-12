/**
 * PairUp Official Legal Policies & Regulatory Compliance Content
 * Covers all statutory requirements including:
 * - Terms of Service
 * - Privacy Policy (DPDPA 2023 & GDPR aligned)
 * - Consent & User Preferences
 * - Grievance / Complaint Redressal Officer (IT Rules 2021)
 * - Cookie Policy & Tracking
 * - Cancellation, Refund & Rescheduling Policy
 * - Children's Privacy & Safety (18+ / Parental Verification)
 * - Data Security (Encryption, Infrastructure & Access Controls)
 * - Data Deletion & Account Closure (Right to be Forgotten)
 * - Data Retention & Statutory Financial Records
 * - Platform Fees, Escrow Payments & GST Invoicing
 */

export const LEGAL_POLICIES = {
  'terms': {
    slug: 'terms',
    title: 'Terms of Service',
    shortTitle: 'Terms of Service',
    category: 'Core Terms',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'The master contract governing the use of the PairUp platform, user rights, mentor responsibilities, code exchange protocols, intellectual property, and community guidelines.',
    highlights: [
      'Peer-to-peer developer pairing and mentorship marketplace',
      'Code and intellectual property shared in sessions remains 100% yours',
      'Escrow protection on all session bookings and milestone contracts',
      'Strict prohibition of harassment, code plagiarism, and off-platform payments'
    ],
    sections: [
      {
        id: 'acceptance',
        title: '1. Acceptance of Terms',
        content: `By registering, accessing, browsing, or utilizing any services provided by PairUp Technologies Private Limited ("PairUp", "we", "our", or "us") via our web application, mobile applications, or APIs (collectively, the "Platform"), you ("User", "Learner", or "Mentor") unequivocally agree to be bound by these Terms of Service ("Terms") and all incorporated policies.`
      },
      {
        id: 'services',
        title: '2. The PairUp Service Description',
        content: `PairUp operates an online technology marketplace facilitating real-time live pairing, debugging, architecture reviews, and technical mentorship between software developers ("Learners") and experienced engineering mentors ("Mentors"). PairUp acts as a neutral technology intermediary and payment facilitation platform.`
      },
      {
        id: 'user-accounts',
        title: '3. User Accounts and Verification',
        content: `You must be at least 18 years of age to establish an account on PairUp. You represent that all registration information provided—including legal name, email, credentials, and payment details—is truthful and accurate. Users are strictly prohibited from sharing login credentials, sublicensing accounts, or establishing duplicate accounts to circumvent administrative suspensions.`
      },
      {
        id: 'pairing-sessions',
        title: '4. Live Pairing Sessions & Monaco Collaborative Workspace',
        content: `PairUp provides collaborative interactive tooling, including live Monaco code editors, bidirectional web terminal simulations, and audio/video WebRTC streaming. Users agree to use these collaboration tools solely for legitimate educational, mentorship, and software development troubleshooting purposes.`
      },
      {
        id: 'intellectual-property',
        title: '5. Intellectual Property and Code Ownership',
        content: `<strong>Learner Code Ownership:</strong> All code snippets, repositories, proprietary business logic, and intellectual property brought to or shared in a session by a Learner remain the exclusive intellectual property of the Learner. Mentors gain no ownership rights in Learner code.<br/><br/><strong>Mentor Guidance:</strong> Guidance, sample code, and explanatory snippets provided by Mentors during pairing sessions are licensed under the MIT License to the Learner upon payment clearance, unless mutually agreed otherwise in an express written agreement.`
      },
      {
        id: 'non-solicitation',
        title: '6. Non-Circumvention and Off-Platform Payments',
        content: `Mentors and Learners agree not to solicit, invoice, or accept payments outside of the PairUp platform for connections initiated through PairUp for a period of twelve (12) months following the initial booking. Circumventing the PairUp escrow and payment infrastructure results in immediate forfeiture of accrued payouts and permanent account termination.`
      },
      {
        id: 'escrow-payouts',
        title: '7. Payment, Escrow Mechanics, and Payouts',
        content: `All session fees and contract milestones are deposited into a secure platform escrow before a session begins. Funds are disbursed to the Mentor only after the session concludes without an active dispute or after learner milestone sign-off. Platform fees are deducted in accordance with our Platform Fees and GST Policy.`
      },
      {
        id: 'code-of-conduct',
        title: '8. Professional Conduct & Harassment Zero-Tolerance',
        content: `PairUp maintains zero tolerance for discrimination, hate speech, sexual harassment, academic dishonesty (e.g., impersonating an individual on live graded exams), or malicious software distribution. Violations result in instant ban and referral to relevant legal authorities where appropriate.`
      },
      {
        id: 'liability',
        title: '9. Limitation of Liability',
        content: `To the maximum extent permitted by applicable law, PairUp shall not be liable for any indirect, incidental, punitive, or consequential damages, including loss of data, production system downtime, or lost revenue arising out of code advice provided by independent mentors.`
      },
      {
        id: 'governing-law',
        title: '10. Governing Law & Dispute Jurisdiction',
        content: `These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any legal dispute arising under or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.`
      }
    ]
  },

  'privacy': {
    slug: 'privacy',
    title: 'Privacy Policy',
    shortTitle: 'Privacy Policy',
    category: 'Privacy & Data',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'Details regarding what personal data PairUp collects, how it is processed, encrypted, stored, and shared, and how you can exercise your privacy rights under global regulations.',
    highlights: [
      'Alinged with India DPDPA 2023, GDPR, and CCPA/CPRA',
      'We never sell your personal data or codebase contents to third-party data brokers',
      'All live editor sessions are transmitted over encrypted TLS 1.3 channels',
      'Granular control to export or permanently erase your data at any time'
    ],
    sections: [
      {
        id: 'introduction',
        title: '1. Commitment to Privacy',
        content: `PairUp Technologies Private Limited ("PairUp", "we", "us") values developer privacy. This Privacy Policy outlines our transparent data practices across our platform, mobile apps, and developer portals in compliance with the Digital Personal Data Protection Act, 2023 (India), the General Data Protection Regulation (EU/UK GDPR), and other applicable data protection regimes.`
      },
      {
        id: 'data-collected',
        title: '2. Information We Collect',
        content: `We collect information necessary to deliver pairing sessions and verify community trust:
        <ul>
          <li><strong>Identity Data:</strong> Full legal name, email address, profile avatar, GitHub/Google OAuth IDs.</li>
          <li><strong>Mentor Verification:</strong> Professional resume, LinkedIn profile, identity documents (for KYC/tax compliance), and bank payout accounts.</li>
          <li><strong>Session & Interaction Data:</strong> Booking times, session durations, messages exchanged in platform chat, problem descriptions, and mutual ratings.</li>
          <li><strong>Technical Telemetry:</strong> IP address, device fingerprints, browser versions, and performance diagnostics.</li>
        </ul>
        <em>We do NOT record live audio/video or terminal commands unless expressly opted into for educational replay by both parties.</em>`
      },
      {
        id: 'processing-purposes',
        title: '3. Legal Grounds for Processing',
        content: `We process your data on legitimate legal bases:
        <ul>
          <li><strong>Contract Performance:</strong> To book sessions, manage escrow, facilitate real-time code editor synchronization, and process bank payouts.</li>
          <li><strong>Legal Compliance:</strong> To generate statutory GST invoices, satisfy TDS tax withholding, and comply with law enforcement requirements.</li>
          <li><strong>Legitimate Interests:</strong> To prevent fraud, moderate platform safety, enforce terms, and detect malicious code exploits.</li>
          <li><strong>Consent:</strong> For marketing updates, voluntary feature testing, and optional third-party integrations.</li>
        </ul>`
      },
      {
        id: 'data-sharing',
        title: '4. Third-Party Data Sharing & Sub-Processors',
        content: `PairUp does NOT sell, rent, or monetize your personal information. We share data only with certified enterprise sub-processors required to deliver our core infrastructure:
        <ul>
          <li><strong>Cloud Infrastructure:</strong> Google Cloud Platform (GCP) & Amazon Web Services (AES-256 encrypted data centers).</li>
          <li><strong>Payment Gateways:</strong> Razorpay & Stripe (PCI-DSS Level 1 certified processors).</li>
          <li><strong>Realtime WebRTC & Chat:</strong> End-to-end encrypted session relays.</li>
          <li><strong>Transactional Notifications:</strong> SendGrid & Twilio for booking confirmations.</li>
        </ul>`
      },
      {
        id: 'data-rights',
        title: '5. Your Rights as a Data Principal',
        content: `You possess comprehensive statutory rights over your personal data:
        <ul>
          <li><strong>Right of Access & Portability:</strong> Download a full machine-readable JSON/CSV archive of your profile, booking records, and billing statements.</li>
          <li><strong>Right to Rectification:</strong> Update inaccurate contact or professional data via your account dashboard.</li>
          <li><strong>Right to Erasure (To be Forgotten):</strong> Request permanent purging of your account and personal identifiers under our Data Deletion Policy.</li>
          <li><strong>Right to Withdraw Consent:</strong> Revoke consent for non-essential notifications and analytics at any time.</li>
        </ul>`
      },
      {
        id: 'cookies-tracking',
        title: '6. Cookies and Tracking Technologies',
        content: `We utilize strictly necessary session tokens, authentication cookies, and privacy-preserving performance trackers. Refer to our dedicated <a href="/cookie-policy" style="color: var(--accent); text-decoration: underline;">Cookie Policy</a> for detailed classification and opt-out controls.`
      },
      {
        id: 'contact-privacy',
        title: '7. Privacy Inquiries & Contact',
        content: `For any privacy questions or requests to exercise your data rights, contact our Data Protection Team at <a href="mailto:privacy@pairup.dev" style="color: var(--accent);">privacy@pairup.dev</a>.`
      }
    ]
  },

  'consent-preferences': {
    slug: 'consent-preferences',
    title: 'Consent and User Preferences',
    shortTitle: 'Consent & Preferences',
    category: 'Privacy & Data',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'A transparent guide to how PairUp collects, records, and manages user consent across platform communications, profiling, third-party analytics, and session telemetry.',
    highlights: [
      'Freely given, specific, and revocable consent across all touchpoints',
      'Granular toggle controls available in Account Settings',
      'No dark patterns or pre-ticked consent checkboxes',
      'Instant opt-out from marketing, product digests, and non-essential notifications'
    ],
    sections: [
      {
        id: 'consent-framework',
        title: '1. PairUp Consent Framework',
        content: `Under the Digital Personal Data Protection Act, 2023 and global privacy standards, consent must be freely given, specific, informed, and unconditional. PairUp never uses deceptive UI dark patterns, forced consents, or bundled mandatory agreements for optional platform features.`
      },
      {
        id: 'consent-categories',
        title: '2. Categorization of User Consents',
        content: `We categorize user consents into four distinct levels:
        <ul>
          <li><strong>Core Platform Functionality (Mandatory):</strong> Authentication, session scheduling, payment escrow, and transactional notifications required to execute bookings.</li>
          <li><strong>Educational Session Replay (Optional):</strong> Consent to record audio/video and terminal output during an active mentorship session for learner revision. Both parties must opt in.</li>
          <li><strong>Product Insights & Performance Telemetry (Optional):</strong> Anonymized usage analytics that help our engineering team identify platform lag and UI bottlenecks.</li>
          <li><strong>Marketing & Mentor Spotlight Communications (Optional):</strong> Weekly digest emails, recommended mentors, educational discounts, and community event invitations.</li>
        </ul>`
      },
      {
        id: 'managing-preferences',
        title: '3. Managing Your Preferences',
        content: `You may adjust, enable, or revoke your consent preferences at any time:
        <ol>
          <li>Navigate to <strong>Settings &gt; Notifications &amp; Privacy</strong> in your dashboard.</li>
          <li>Toggle on or off individual categories for email notifications, SMS alerts, and analytics.</li>
          <li>Click <em>Save Preferences</em> to update our consent registry instantly across all nodes.</li>
        </ol>
        Revoking consent does not affect the legality of data processing carried out prior to revocation.`
      },
      {
        id: 'consent-records',
        title: '4. Consent Logging and Audit Trail',
        content: `PairUp maintains an immutable cryptographic log of consent timestamps, terms versions, and specific items accepted by each user account. This audit trail is retained to fulfill legal compliance obligations under statutory privacy regulations.`
      }
    ]
  },

  'grievance-officer': {
    slug: 'grievance-officer',
    title: 'Grievance / Complaint Redressal Officer',
    shortTitle: 'Grievance Officer',
    category: 'Trust & Safety',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'Designation, statutory contact information, complaint submission mechanisms, and escalation timelines of the Grievance Redressal Officer pursuant to the Information Technology Rules, 2021.',
    highlights: [
      'Appointed in compliance with Rule 3(2) of the Information Technology Rules, 2021',
      'Statutory 24-hour formal acknowledgment of received grievances',
      'Binding resolution and corrective action provided within 15 calendar days',
      'Dedicated channel for reporting abusive conduct, impersonation, or copyright infringement'
    ],
    sections: [
      {
        id: 'statutory-designation',
        title: '1. Statutory Appointment & Contact Particulars',
        content: `In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and Section 13 of the Digital Personal Data Protection Act, 2023, the details of our designated Grievance Officer are set out below:
        <div style="background: var(--bg); border: 1.5px solid var(--grid-strong); border-radius: 10px; padding: 18px; margin: 14px 0; font-family: inherit;">
          <div style="font-weight: 700; font-size: 15px; color: var(--ink); margin-bottom: 6px;">Mr. N. Ramanathan</div>
          <div style="font-size: 13px; color: var(--accent); font-weight: 600; margin-bottom: 8px;">Designation: Chief Grievance &amp; Compliance Officer</div>
          <div style="font-size: 12.5px; color: var(--ink-muted); line-height: 1.6;">
            <strong>Company:</strong> PairUp Technologies Private Limited<br/>
            <strong>Registered Office:</strong> Level 5, Embassy TechVillage, Outer Ring Road, Devarabisanahalli, Bengaluru, Karnataka — 560103, India<br/>
            <strong>Official Grievance Email:</strong> <a href="mailto:grievance-officer@pairup.dev" style="color: var(--accent); font-weight: 600;">grievance-officer@pairup.dev</a><br/>
            <strong>Escalation Phone:</strong> +91 (80) 4129-8800 (Monday to Friday, 10:00 AM – 6:00 PM IST)<br/>
            <strong>Response SLA:</strong> Acknowledged within 24 Hours · Resolved within 15 Days
          </div>
        </div>`
      },
      {
        id: 'complaint-types',
        title: '2. Matters Handled by the Grievance Officer',
        content: `You may file a formal complaint with our Grievance Officer concerning:
        <ul>
          <li><strong>Content & Conduct Violations:</strong> Harassment, hate speech, threats, defamation, or unsolicited explicit behavior during a live session.</li>
          <li><strong>Intellectual Property & Plagiarism:</strong> Unauthorized disclosure, distribution, or copying of private source code or proprietary repositories.</li>
          <li><strong>Account & Impersonation Frauds:</strong> Unauthorized access, false mentor credential representations, or identity hijacking.</li>
          <li><strong>Escrow & Financial Arbitration:</strong> Unresolved payment disputes after standard customer support escalation.</li>
          <li><strong>Personal Data Grievances:</strong> Failure to execute data access, rectification, or deletion requests.</li>
        </ul>`
      },
      {
        id: 'submission-process',
        title: '3. Procedure for Submitting a Grievance',
        content: `To ensure prompt investigation, your grievance submission should contain:
        <ol>
          <li>Your registered account name, user ID, and email address.</li>
          <li>The specific URL, booking ID, contract ID, or profile link involved in the complaint.</li>
          <li>A clear, factual summary of the incident with supporting evidence (e.g., chat screenshots, session timestamps, Git commit links).</li>
          <li>A declaration that the statements provided are true and accurate to the best of your knowledge.</li>
        </ol>`
      },
      {
        id: 'resolution-timeline',
        title: '4. Investigation, Remediation & Timeline',
        content: `Upon receiving a formal complaint:
        <ul>
          <li><strong>Within 24 Hours:</strong> The Grievance Officer will issue an automated reference number acknowledging receipt.</li>
          <li><strong>Within 72 Hours:</strong> Interim review and preservation of relevant logs, chat transcripts, or session attachments.</li>
          <li><strong>Within 15 Days:</strong> Detailed written communication of investigation findings, administrative remedies implemented (e.g., content removal, account suspension, or financial refund), and closure.</li>
        </ul>`
      }
    ]
  },

  'cookie-policy': {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    shortTitle: 'Cookie Policy',
    category: 'Privacy & Data',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'Explanation of how and why PairUp uses cookies, session storage, local storage, and similar web tracking technologies on our web platform and apps.',
    highlights: [
      'Strictly necessary cookies required for secure authentication and CSRF protection',
      'No third-party cross-site behavioral tracking cookies',
      'Zero advertising or data broker trackers',
      'Direct browser-level controls to delete or block stored cookies'
    ],
    sections: [
      {
        id: 'what-are-cookies',
        title: '1. What Are Cookies?',
        content: `Cookies are compact text files placed onto your device by websites you visit. They are widely used to maintain secure authentication sessions, remember user interface preferences (such as dark theme), and monitor platform reliability.`
      },
      {
        id: 'cookies-we-use',
        title: '2. Categories of Cookies Used by PairUp',
        content: `PairUp utilizes minimal, privacy-centric cookies grouped as follows:
        <div style="overflow-x: auto; margin: 12px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid var(--grid-strong); color: var(--ink);">
                <th style="padding: 8px;">Cookie Category</th>
                <th style="padding: 8px;">Purpose</th>
                <th style="padding: 8px;">Lifespan</th>
                <th style="padding: 8px;">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--grid);">
                <td style="padding: 8px; font-weight: 600;">Strictly Necessary</td>
                <td style="padding: 8px;">Maintains encrypted JWT auth sessions and protects against Cross-Site Request Forgery (CSRF).</td>
                <td style="padding: 8px;">Session / 30 Days</td>
                <td style="padding: 8px;">Essential</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--grid);">
                <td style="padding: 8px; font-weight: 600;">Preferences</td>
                <td style="padding: 8px;">Remembers your theme (light/dark mode) and folded sidebar navigation state.</td>
                <td style="padding: 8px;">1 Year</td>
                <td style="padding: 8px;">Functional</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--grid);">
                <td style="padding: 8px; font-weight: 600;">Performance & Telemetry</td>
                <td style="padding: 8px;">Monitors client-side WebSocket latency, Monaco code editor loading speeds, and crash logs.</td>
                <td style="padding: 8px;">90 Days</td>
                <td style="padding: 8px;">Analytics</td>
              </tr>
            </tbody>
          </table>
        </div>`
      },
      {
        id: 'browser-control',
        title: '3. Managing and Disabling Cookies',
        content: `You can control, block, or delete cookies at any time through your browser settings. Please note that disabling strictly necessary cookies will prevent you from logging in, maintaining an authenticated session, or completing code pairing bookings on PairUp.`
      }
    ]
  },

  'cancellation-refund': {
    slug: 'cancellation-refund',
    title: 'Cancellation, Refund and Rescheduling Policy',
    shortTitle: 'Cancellation & Refunds',
    category: 'Finance & Orders',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'Comprehensive rules regarding session cancellations, free rescheduling windows, mentor no-shows, technical failures, escrow release conditions, and dispute arbitration.',
    highlights: [
      '100% full refund on sessions cancelled at least 2 hours before the scheduled time',
      'Free rescheduling available up to 1 hour before session commencement',
      '100% automatic refund + platform credit if a mentor fails to attend (No-Show)',
      'Escrow protection: funds held safely until learner confirms successful session completion'
    ],
    sections: [
      {
        id: 'escrow-protection',
        title: '1. The PairUp Escrow Guarantee',
        content: `To ensure peace of mind for both Learners and Mentors, all booking payments and contract milestone funds are held in secure platform escrow. Funds are never disbursed to a Mentor until the scheduled session concludes and the Learner validates completion, or after the standard 48-hour automated clearance window expires without a dispute.`
      },
      {
        id: 'cancellation-terms',
        title: '2. Learner Cancellation Rules & Refunds',
        content: `Learners may cancel a scheduled pairing session directly from their Sessions console according to the following tier schedule:
        <ul>
          <li><strong>More than 2 Hours Before Session Start:</strong> 100% Full Refund credited to original payment method or wallet instantly.</li>
          <li><strong>Between 30 Minutes and 2 Hours Before Start:</strong> 80% Refund (20% retained and transferred to Mentor to compensate for reserved calendar block).</li>
          <li><strong>Less than 30 Minutes or Learner No-Show:</strong> 50% Refund (50% transferred to Mentor as late cancellation compensation).</li>
        </ul>`
      },
      {
        id: 'mentor-cancellation',
        title: '3. Mentor Cancellations and No-Shows',
        content: `Reliability is the foundation of PairUp:
        <ul>
          <li><strong>Mentor Cancellation:</strong> If a Mentor cancels a session at any time prior to start, the Learner immediately receives a 100% full refund.</li>
          <li><strong>Mentor No-Show:</strong> If a Mentor fails to join the session within ten (10) minutes of the scheduled time, the Learner may flag a No-Show. The Learner receives an immediate 100% full refund plus a ₹250 platform pairing credit. The Mentor incurs an administrative strike on their public reliability score.</li>
        </ul>`
      },
      {
        id: 'rescheduling',
        title: '4. Rescheduling Windows',
        content: `Both Learners and Mentors may reschedule a session for free up to one (1) hour prior to the scheduled start time. Rescheduling requests made within one hour of start require mutual consent via the platform chat.`
      },
      {
        id: 'technical-disputes',
        title: '5. Technical Failures & Quality Disputes',
        content: `If a session is severely impaired by platform technical failures (e.g., WebRTC server outage, collaborative Monaco editor synchronization failure) or genuine mentor incompetence, the Learner can open a dispute within forty-eight (48) hours of session conclusion. Our arbitration team reviews the session duration, editor telemetry, and logs to award a full or partial refund within 24 hours.`
      },
      {
        id: 'refund-timeline',
        title: '6. Refund Processing Timelines',
        content: `Refunds to the PairUp Platform Wallet are instant and available for immediate rebooking. Refunds processed back to original credit cards, debit cards, UPI, or net banking typically reflect in your bank statement within 3 to 5 business days, depending on your issuing bank.`
      }
    ]
  },

  'payments-gst': {
    slug: 'payments-gst',
    title: 'Platform Fees, Payments and GST Policy',
    shortTitle: 'Platform Fees & GST',
    category: 'Finance & Orders',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'Detailed explanation of platform commission percentages, transparent learner billing, statutory GST tax invoices (18%), TDS withholding, and mentor payout cycles.',
    highlights: [
      'Transparent flat platform fee structure with zero hidden markups',
      'Official statutory GST invoices provided for all learner transactions',
      'TDS deduction and Form 16A quarterly certificates for Indian mentors',
      'Direct bank account payouts via NEFT/IMPS/UPI processed in 24 hours'
    ],
    sections: [
      {
        id: 'pricing-model',
        title: '1. Transparent Pricing & Marketplace Model',
        content: `Mentors set their own hourly rates and custom milestone contract pricing. PairUp charges a transparent platform service fee that funds our real-time video infrastructure, collaborative code editors, escrow safety mechanisms, and customer support.`
      },
      {
        id: 'fee-structure',
        title: '2. Platform Commission Structure',
        content: `PairUp deducts a platform service fee from the gross session billing upon milestone release:
        <ul>
          <li><strong>Standard Mentor Platform Fee:</strong> Standard commission is calibrated between 6% to 15% depending on mentor tier, volume, and active community status.</li>
          <li><strong>Learner Payment Processing:</strong> Direct gateway processing fees are clearly itemized before booking confirmation. There are no hidden subscription charges or recurring traps.</li>
        </ul>`
      },
      {
        id: 'gst-compliance',
        title: '3. Goods and Services Tax (GST) Compliance',
        content: `PairUp Technologies Private Limited is registered under the Central Goods and Services Tax Act, 2017 (GSTIN provided on official tax invoices).
        <ul>
          <li><strong>Service Accounting Code (SAC):</strong> 998315 (Hosting and IT infrastructure provisioning services) and 999293 (Commercial training and coaching services).</li>
          <li><strong>GST Rate:</strong> Platform facilitation fees are subject to 18% GST (9% CGST + 9% SGST for intra-state transactions, or 18% IGST for inter-state transactions).</li>
          <li><strong>B2B Invoicing with Input Tax Credit (ITC):</strong> Corporate learners providing a valid GSTIN receive compliant B2B tax invoices enabling full input tax credit claim.</li>
        </ul>`
      },
      {
        id: 'tds-withholding',
        title: '4. Tax Deducted at Source (TDS) for Mentors',
        content: `In compliance with the Indian Income Tax Act, 1961:
        <ul>
          <li><strong>Section 194-O / 194-J:</strong> PairUp deducts applicable TDS from mentor payouts as mandated by law.</li>
          <li><strong>PAN Requirement:</strong> Mentors must provide a valid Permanent Account Number (PAN). Payouts to unverified PANs are subject to statutory higher withholding tax rates.</li>
          <li><strong>Form 16A:</strong> Quarterly TDS certificates are generated and downloadable directly from the mentor Taxes dashboard.</li>
        </ul>`
      },
      {
        id: 'payout-mechanics',
        title: '5. Mentor Payout Cycles and Security',
        content: `Cleared escrow funds can be withdrawn at any time via direct Bank Wire (IMPS/NEFT) or UPI. Withdrawals are processed within one (1) to two (2) business days with zero withdrawal transaction fees on standard transfers.`
      }
    ]
  },

  'children-privacy': {
    slug: 'children-privacy',
    title: "Children's Privacy and Safety",
    shortTitle: "Children's Privacy",
    category: 'Trust & Safety',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'Our strict age thresholds, parental consent safeguards, child data protection measures, and community safety policies protecting young developers.',
    highlights: [
      'Strict 18+ requirement for independent financial transactions and mentoring',
      'Youth developers aged 13-17 require verifiable parental consent',
      'Zero commercial profiling or behavioral tracking of minors',
      'Immediate termination and reporting of child endangerment or exploitation'
    ],
    sections: [
      {
        id: 'age-eligibility',
        title: '1. Age Eligibility Requirements',
        content: `The PairUp platform is intended for professional software developers and students aged 18 and older. Children under the age of 13 are strictly prohibited from using the platform, registering an account, or providing any personal data.`
      },
      {
        id: 'teen-accounts',
        title: '2. Developers Aged 13 to 17 (Parental Consent Required)',
        content: `Minors between the ages of 13 and 17 may only utilize PairUp under the active supervision and verified consent of a parent or legal guardian. The parent or legal guardian must agree to these Terms and our Privacy Policy on behalf of the minor.`
      },
      {
        id: 'child-protection',
        title: '3. Enhanced Protection for Minor Data',
        content: `In accordance with Section 9 of the Digital Personal Data Protection Act, 2023:
        <ul>
          <li>We never engage in tracking, behavioral monitoring, or targeted advertising directed at individuals identified as minors.</li>
          <li>We never process children's data in any manner that is likely to cause detrimental effect on the well-being of a child.</li>
          <li>Audio/video sessions involving verified minors are subject to automated safety auditing to detect improper conduct.</li>
        </ul>`
      },
      {
        id: 'reporting-violations',
        title: '4. Immediate Reporting of Violations',
        content: `If you believe that a child under 13 has provided us with personal information without parental consent, or if you witness inappropriate behavior directed at a minor, immediately contact our safety team at <a href="mailto:safety@pairup.dev" style="color: var(--accent);">safety@pairup.dev</a> or contact our Grievance Officer.`
      }
    ]
  },

  'data-security': {
    slug: 'data-security',
    title: 'Data Security Policy',
    shortTitle: 'Data Security',
    category: 'Privacy & Data',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'Our comprehensive technical and organizational measures (TOMs), cryptographic standards, perimeter defense, infrastructure isolation, and access controls.',
    highlights: [
      'AES-256 bit encryption at rest and TLS 1.3 in transit across all endpoints',
      'SOC 2 Type II and ISO 27001 certified cloud infrastructure',
      'Strict Zero-Trust role-based access control (RBAC) and mandatory 2FA for staff',
      'Automated daily encrypted backups with multi-region disaster recovery'
    ],
    sections: [
      {
        id: 'encryption-standards',
        title: '1. Cryptographic Standards',
        content: `PairUp enforces military-grade encryption across every layer of the platform architecture:
        <ul>
          <li><strong>Data in Transit:</strong> All HTTP and WebSocket connections enforce TLS 1.3 with HSTS (HTTP Strict Transport Security) and strong cipher suites.</li>
          <li><strong>Data at Rest:</strong> All databases, session attachments, chat logs, and cloud storage volumes are encrypted using industry-standard AES-256 bit encryption keys managed by Google Cloud KMS.</li>
          <li><strong>Password Security:</strong> Passwords are hashed using the Argon2id / PBKDF2 algorithm with high iteration counts and cryptographic salt. Plaintext passwords are never stored or logged.</li>
        </ul>`
      },
      {
        id: 'infrastructure-security',
        title: '2. Cloud Infrastructure & Network Isolation',
        content: `Our cloud architecture operates within private Google Cloud Virtual Private Clouds (VPC) with restricted egress/ingress gateways. Production databases are completely isolated from public internet exposure and accessible only via secured bastion hosts and mutual TLS (mTLS).`
      },
      {
        id: 'access-control',
        title: '3. Principle of Least Privilege & Access Controls',
        content: `PairUp adheres to Zero Trust access principles:
        <ul>
          <li>Staff access to customer databases is governed by Role-Based Access Control (RBAC) and strictly limited to senior engineers resolving active technical tickets.</li>
          <li>All internal engineering access requires hardware security keys (FIDO2 / WebAuthn) and multi-factor authentication (MFA).</li>
          <li>Every administrative query and privileged operation is recorded in an immutable audit ledger with automated anomaly detection alerts.</li>
        </ul>`
      },
      {
        id: 'incident-response',
        title: '4. Vulnerability Management & Incident Response',
        content: `We conduct automated daily vulnerability scanning, regular third-party penetration testing, and maintain a 24/7 Security Operations Center (SOC). In the unlikely event of a confirmed security incident impacting user data, PairUp will notify affected users and regulatory authorities within statutory timelines.`
      }
    ]
  },

  'data-deletion': {
    slug: 'data-deletion',
    title: 'Data Deletion and Account Closure',
    shortTitle: 'Data Deletion',
    category: 'Privacy & Data',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'Your statutory Right to be Forgotten: how to request permanent account closure, automated 30-day purge cycles, and exceptions for regulatory compliance.',
    highlights: [
      'Self-serve "Delete My Account" option available directly in Account Settings',
      'Irreversible hard deletion of profile data, chat messages, and session code',
      'Statutory financial records retained solely to fulfill tax and GST legal mandates',
      'Confirmation receipt and data destruction certificate issued upon completion'
    ],
    sections: [
      {
        id: 'right-to-deletion',
        title: '1. The Right to Erasure (Right to be Forgotten)',
        content: `Every PairUp user has the right to permanently erase their account and delete personal data from our active systems pursuant to Section 12 of the Digital Personal Data Protection Act, 2023, Article 17 of the GDPR, and the California Consumer Privacy Act (CCPA).`
      },
      {
        id: 'how-to-request',
        title: '2. How to Request Account Deletion',
        content: `You may initiate account deletion through either of the following methods:
        <ul>
          <li><strong>Self-Service:</strong> Go to <strong>Settings &gt; Account Security &gt; Danger Zone</strong> and click <em>Permanently Delete Account</em>. Confirm your password to initiate the deletion workflow.</li>
          <li><strong>Email Request:</strong> Send an email from your registered address to <a href="mailto:privacy@pairup.dev" style="color: var(--accent);">privacy@pairup.dev</a> with the subject line <em>"Account Deletion Request"</em>.</li>
        </ul>`
      },
      {
        id: 'deletion-timeline',
        title: '3. Deletion Workflow & 30-Day Grace Period',
        content: `To prevent accidental loss from account compromises:
        <ol>
          <li><strong>Immediate Deactivation:</strong> Upon submitting your deletion request, your public mentor profile is removed from search, all active bookings are halted, and your session tokens are revoked.</li>
          <li><strong>14-Day Grace Window:</strong> If you log in within 14 calendar days, you may cancel the deletion request.</li>
          <li><strong>30-Day Permanent Purge:</strong> After 30 calendar days, our automated data scrubbers permanently overwrite and purge all personal identifiers, profile avatars, problem submissions, and private chat histories from production databases and backup replicas.</li>
        </ol>`
      },
      {
        id: 'statutory-retention-exceptions',
        title: '4. Legal Exceptions to Immediate Deletion',
        content: `As required by applicable statutory laws, certain limited records cannot be immediately erased:
        <ul>
          <li><strong>Financial & Tax Invoices:</strong> Payment receipts, GST tax invoices, and TDS withholding records must be retained for eight (8) financial years as mandated by Section 128 of the Companies Act, 2013 and Section 36 of the CGST Act, 2017.</li>
          <li><strong>Active Fraud & Arbitration Files:</strong> Accounts involved in pending chargebacks, financial fraud investigations, or active legal arbitration are retained until formal dispute closure.</li>
        </ul>
        Such retained data is quarantined in access-restricted read-only storage and never used for commercial or marketing operations.`
      }
    ]
  },

  'data-retention': {
    slug: 'data-retention',
    title: 'Data Retention and Records Management Policy',
    shortTitle: 'Data Retention',
    category: 'Privacy & Data',
    lastUpdated: 'October 28, 2026',
    effectiveDate: 'October 1, 2026',
    summary: 'Schedule and guidelines governing how long PairUp retains different categories of data, purpose-based storage limitation, and secure media sanitization.',
    highlights: [
      'Strict purpose-based data minimization and storage limitation',
      'Session telemetry and chat messages retained for active account lifecycle',
      'Statutory 8-year retention for financial transaction ledgers and GST records',
      'NIST SP 800-88 cryptographic wiping standards for decommissioned hardware'
    ],
    sections: [
      {
        id: 'retention-principles',
        title: '1. Principles of Data Retention',
        content: `PairUp retains personal data only for as long as is necessary to fulfill the specific purposes for which it was collected, to provide high-quality developer mentorship services, and to satisfy mandatory statutory and regulatory record-keeping requirements.`
      },
      {
        id: 'retention-schedule',
        title: '2. Standard Retention Schedule',
        content: `Our data retention schedule categorizes data types as follows:
        <div style="overflow-x: auto; margin: 12px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid var(--grid-strong); color: var(--ink);">
                <th style="padding: 8px;">Record Classification</th>
                <th style="padding: 8px;">Data Elements Included</th>
                <th style="padding: 8px;">Retention Duration</th>
                <th style="padding: 8px;">Statutory Basis</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--grid);">
                <td style="padding: 8px; font-weight: 600;">Active Account Records</td>
                <td style="padding: 8px;">Profile data, developer skills, ratings, reviews, preferences.</td>
                <td style="padding: 8px;">Duration of active account + 30 days after deletion request.</td>
                <td style="padding: 8px;">Contract Performance</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--grid);">
                <td style="padding: 8px; font-weight: 600;">Session Telemetry & Chat</td>
                <td style="padding: 8px;">Pairing session duration, chat messages, problem descriptions.</td>
                <td style="padding: 8px;">24 Months from session conclusion (or purged upon user deletion).</td>
                <td style="padding: 8px;">Quality & Dispute Audit</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--grid);">
                <td style="padding: 8px; font-weight: 600;">Financial & Tax Ledgers</td>
                <td style="padding: 8px;">Invoices, payment gateway IDs, GSTIN data, TDS deductions.</td>
                <td style="padding: 8px;">8 Financial Years (approx. 96 Months).</td>
                <td style="padding: 8px;">Companies Act &amp; CGST Act</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--grid);">
                <td style="padding: 8px; font-weight: 600;">Security & Access Logs</td>
                <td style="padding: 8px;">Authentication IPs, firewall logs, privileged admin actions.</td>
                <td style="padding: 8px;">180 Days to 1 Year (CERT-In compliance guidelines).</td>
                <td style="padding: 8px;">Information Technology Act</td>
              </tr>
            </tbody>
          </table>
        </div>`
      },
      {
        id: 'secure-disposal',
        title: '3. Secure Disposal and Media Sanitization',
        content: `When data reaches the expiration of its designated retention period, PairUp executes automated cryptographically verifiable data destruction in adherence to NIST Special Publication 800-88 Revision 1 (Guidelines for Media Sanitization). Data is permanently rendered unrecoverable.`
      }
    ]
  }
};

export const POLICY_LIST = Object.values(LEGAL_POLICIES);
