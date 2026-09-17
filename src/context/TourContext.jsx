import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const TourContext = createContext(null);

export const LEARNER_TOUR_STEPS = [
  {
    id: 'welcome',
    target: null, // centered intro
    title: 'Welcome to PairUp Platform',
    badge: 'Overview',
    description:
      'PairUp is an end-to-end peer programming and mentoring platform. Connect with verified senior engineers for live pair coding, code reviews, and instant problem bounties backed by secure escrow.',
    tags: ['1-on-1 Mentoring', 'Code Reviews', 'Escrow Protected'],
    role: 'learner',
  },
  {
    id: 'metrics',
    target: '[data-tour="metrics"]',
    title: 'Live Metrics & Dashboard Overview',
    badge: 'Analytics',
    description:
      'Monitor your active sessions, open problem requests, pending proposals from mentors, and total escrow spending directly from this real-time analytics panel.',
    tags: ['Real-time Stats', 'Session Tracker', 'Wallet Spend'],
    role: 'learner',
  },
  {
    id: 'explore',
    target: '[data-tour="nav-explore"]',
    title: 'Explore & Book Verified Mentors',
    badge: 'Mentors',
    description:
      'Browse through verified senior developers. Filter by programming language, tech stack (React, Python, Go, Docker), hourly rates, and real-time availability. View full profiles and book 1-on-1 sessions with one click.',
    tags: ['Stack Filtering', 'Hourly Rates', 'Direct Booking'],
    role: 'learner',
  },
  {
    id: 'post-problem',
    target: '[data-tour="nav-post-problem"]',
    title: 'Post Technical Problems & Bounties',
    badge: 'Bounties',
    description:
      'Stuck on a tricky bug, architecture design, or build issue? Post a problem with your description and budget. Expert mentors review your request and submit competitive milestone proposals.',
    tags: ['Bug Bounties', 'Competitive Proposals', 'Milestones'],
    role: 'learner',
  },
  {
    id: 'my-problems',
    target: '[data-tour="nav-my-problems"]',
    title: 'My Problems & Proposal Reviews',
    badge: 'Requests',
    description:
      'Track the live status of all your posted challenges. Review incoming proposals from verified mentors, compare pricing, check applicant credentials, and accept offers.',
    tags: ['Proposal Comparison', 'Bounty Tracking', 'Offer Acceptance'],
    role: 'learner',
  },
  {
    id: 'contracts',
    target: '[data-tour="nav-contracts"]',
    title: 'Contracts & Escrow Milestones',
    badge: 'Escrow Security',
    description:
      'Manage active engagements safely. Deposit payments into protected escrow, inspect code milestone progress, verify deliverables, and release funds upon job completion.',
    tags: ['Escrow Protection', 'Milestone Approvals', 'Dispute Resolution'],
    role: 'learner',
  },
  {
    id: 'sessions',
    target: '[data-tour="nav-sessions"]',
    title: 'Interactive Live Session Room',
    badge: 'Collaboration',
    description:
      'When your session begins, jump into the Live Room equipped with WebRTC video and audio, synchronized Monaco code editor, screen sharing, and collaborative notes.',
    tags: ['WebRTC Video', 'Monaco Code Editor', 'Live Notes'],
    role: 'learner',
  },
  {
    id: 'messages',
    target: '[data-tour="nav-messages"]',
    title: 'Direct Chat & Inquiries',
    badge: 'Communication',
    description:
      'Communicate with mentors in real time. Discuss technical specifications, share code snippets, coordinate session times, and ask follow-up questions before booking.',
    tags: ['Instant Messaging', 'Code Sharing', 'Direct Inquiry'],
    role: 'learner',
  },
  {
    id: 'payments',
    target: '[data-tour="nav-payments"]',
    title: 'Payments & Billing Management',
    badge: 'Finances',
    description:
      'Manage your platform wallet, top up funds for upcoming sessions, view downloadable transaction receipts, and manage saved payment methods securely.',
    tags: ['Wallet Top-up', 'Transaction Receipts', 'Secure Checkout'],
    role: 'learner',
  },
  {
    id: 'sidebar-fold',
    target: '[data-tour="sidebar-toggle"]',
    title: 'Collapsible Sidebar & Shortcut',
    badge: 'Navigation',
    description:
      'Need more room to code? Click this fold button or use the keyboard shortcut Ctrl+B anytime to toggle between full navigation and a compact, icon-only sidebar.',
    tags: ['Shortcut: Ctrl+B', 'Compact View', 'Zero-Scroll'],
    role: 'learner',
  },
  {
    id: 'user-menu',
    target: '[data-tour="user-menu"]',
    title: 'User Account, Roles & 24/7 Support',
    badge: 'Account & Help',
    description:
      'Access your profile, notifications, and settings from the user popover menu. Switch seamlessly between Learner and Mentor modes anytime, or open the (?) Help menu to access documentation, FAQs, and support tickets.',
    tags: ['Role Switching', 'Help Center', 'Support Tickets'],
    role: 'learner',
  },
];

export const MENTOR_TOUR_STEPS = [
  {
    id: 'welcome-mentor',
    target: null, // centered intro
    title: 'Welcome to Mentor Workspace',
    badge: 'Mentor Portal',
    description:
      'Monetize your technical experience. Browse learner challenges, submit milestone proposals, conduct live 1-on-1 coding sessions, and receive direct bank/UPI payouts.',
    tags: ['Technical Mentorship', 'Paid Bounties', 'Instant Payouts'],
    role: 'mentor',
  },
  {
    id: 'mentor-metrics',
    target: '[data-tour="metrics"]',
    title: 'Earnings & Session Performance',
    badge: 'Financials',
    description:
      'Keep track of your total net earnings, funds currently held in escrow, upcoming booked sessions, and active client conversations in one central view.',
    tags: ['Net Earnings', 'Escrow Balance', 'Upcoming Schedule'],
    role: 'mentor',
  },
  {
    id: 'explore-problems',
    target: '[data-tour="nav-explore-problems"]',
    title: 'Explore Problems & Submit Proposals',
    badge: 'Marketplace',
    description:
      'Browse open bugs, code audits, and feature requests posted by learners. Filter by tech stacks matching your expertise and submit detailed proposals with custom pricing and delivery timelines.',
    tags: ['Problem Marketplace', 'Custom Proposals', 'Milestones'],
    role: 'mentor',
  },
  {
    id: 'my-proposals',
    target: '[data-tour="nav-my-proposals"]',
    title: 'My Proposals & Bid Tracking',
    badge: 'Bids & Estimates',
    description:
      'Track all your submitted problem bids. Monitor proposal review status (pending, accepted, declined), edit proposal scopes, and follow up with learners.',
    tags: ['Bid Management', 'Custom Quotes', 'Status Tracking'],
    role: 'mentor',
  },
  {
    id: 'mentor-contracts',
    target: '[data-tour="nav-contracts"]',
    title: 'Active Contracts & Milestones',
    badge: 'Job Delivery',
    description:
      'Deliver client work with confidence. Submit milestone deliverables, track progress against specifications, and trigger automatic escrow payment release upon client approval.',
    tags: ['Milestone Delivery', 'Escrow Releases', 'Contract Proof'],
    role: 'mentor',
  },
  {
    id: 'availability',
    target: '[data-tour="nav-availability"]',
    title: 'Availability & Working Hours Engine',
    badge: 'Scheduling',
    description:
      'Set your recurring weekly availability schedule. Select active working days, custom time intervals, timezone preservation, and slot durations so learners can book without scheduling conflicts.',
    tags: ['Weekly Calendar', 'Timezone Preservation', 'Slot Duration'],
    role: 'mentor',
  },
  {
    id: 'calendar',
    target: '[data-tour="nav-calendar"]',
    title: 'Interactive Schedule Calendar',
    badge: 'Bookings',
    description:
      'View your full agenda at a glance. Manage booked sessions, see scheduled pairing appointments, and sync availability with your workflow.',
    tags: ['Agenda View', 'Time Slot Sync', 'Upcoming Bookings'],
    role: 'mentor',
  },
  {
    id: 'mentor-sessions',
    target: '[data-tour="nav-sessions"]',
    title: 'Conduct Live Coding & Code Reviews',
    badge: 'Live Room',
    description:
      'Host real-time technical pairing sessions in our integrated Live Room with WebRTC audio/video, Monaco editor, and live notes. Escrow payment is automatically processed when the session concludes.',
    tags: ['WebRTC Audio/Video', 'Pair Programming', 'Session Notes'],
    role: 'mentor',
  },
  {
    id: 'mentor-messages',
    target: '[data-tour="nav-messages"]',
    title: 'Client Conversations & Inquiries',
    badge: 'Client Messaging',
    description:
      'Coordinate directly with learners. Clarify project requirements, negotiate milestones, provide code feedback, and build long-term mentoring relationships.',
    tags: ['Direct Messaging', 'Code Snippets', 'Client Management'],
    role: 'mentor',
  },
  {
    id: 'earnings',
    target: '[data-tour="nav-earnings"]',
    title: 'Earnings & Payout Withdrawals',
    badge: 'Payouts',
    description:
      'Track your gross and net income, platform fee breakdowns, pending payout requests, and initiate direct withdrawals to your linked bank account or UPI.',
    tags: ['Bank Withdrawals', 'UPI Payouts', 'Fee Breakdown'],
    role: 'mentor',
  },
  {
    id: 'reviews',
    target: '[data-tour="nav-reviews"]',
    title: 'Client Reviews & Reputation Score',
    badge: 'Reputation',
    description:
      'Build your credibility on PairUp. View student feedback, 5-star ratings, testimonials, and earn verified mentor status to rank higher in search results.',
    tags: ['5-Star Ratings', 'Client Testimonials', 'Verified Status'],
    role: 'mentor',
  },
  {
    id: 'sidebar-fold-mentor',
    target: '[data-tour="sidebar-toggle"]',
    title: 'Quick Sidebar Fold (Ctrl+B)',
    badge: 'Productivity',
    description:
      'Use the sidebar toggle or press Ctrl+B to collapse or expand the navigation panel for an uncluttered working environment.',
    tags: ['Shortcut: Ctrl+B', 'Responsive Layout'],
    role: 'mentor',
  },
  {
    id: 'mentor-user-menu',
    target: '[data-tour="user-menu"]',
    title: 'Online Toggle & Support Desk',
    badge: 'Status & Help',
    description:
      'Toggle your live status between Available and Offline anytime from the account menu. Switch roles to learner mode, manage your payout details, and submit support inquiries directly to our team.',
    tags: ['Available / Offline', 'Payout Settings', '24/7 Support'],
    role: 'mentor',
  },
];

export function TourProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const getEffectiveRole = useCallback(
    (preferredRole) => {
      if (preferredRole === 'mentor' || preferredRole === 'learner') return preferredRole;
      if (user?.role === 'mentor') return 'mentor';
      if (user?.role === 'learner') return 'learner';
      return location.pathname.startsWith('/mentor') ? 'mentor' : 'learner';
    },
    [user?.role, location.pathname]
  );

  const [tourRole, setTourRole] = useState(() => getEffectiveRole());

  // Track if user has seen tour
  const [tourSeen, setTourSeen] = useState(() => {
    try {
      return localStorage.getItem('pairup_tour_completed') === 'true';
    } catch {
      return false;
    }
  });

  // Automatically adapt default role based on authenticated user or URL
  useEffect(() => {
    if (!isTourActive) {
      setTourRole(getEffectiveRole());
    }
  }, [getEffectiveRole, isTourActive]);

  const steps = tourRole === 'mentor' ? MENTOR_TOUR_STEPS : LEARNER_TOUR_STEPS;
  const currentStep = steps[currentStepIndex] || steps[0];

  const startTour = useCallback(
    (preferredRole) => {
      const roleToUse = getEffectiveRole(preferredRole);
      setTourRole(roleToUse);
      setCurrentStepIndex(0);
      setIsTourActive(true);
    },
    [getEffectiveRole]
  );

  const endTour = useCallback((markAsSeen = true) => {
    setIsTourActive(false);
    if (markAsSeen) {
      setTourSeen(true);
      try {
        localStorage.setItem('pairup_tour_completed', 'true');
      } catch {}
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev < steps.length - 1) return prev + 1;
      endTour(true);
      return prev;
    });
  }, [steps.length, endTour]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback(
    (index) => {
      if (index >= 0 && index < steps.length) {
        setCurrentStepIndex(index);
      }
    },
    [steps.length]
  );

  const switchRole = useCallback((newRole) => {
    setTourRole(newRole);
    setCurrentStepIndex(0);
  }, []);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem('pairup_tour_completed');
      localStorage.removeItem('pairup_tour_banner_dismissed');
    } catch {}
    setTourSeen(false);
    startTour();
  }, [startTour]);

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStepIndex,
        currentStep,
        totalSteps: steps.length,
        tourRole,
        steps,
        tourSeen,
        startTour,
        endTour,
        nextStep,
        prevStep,
        goToStep,
        switchRole,
        resetTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
