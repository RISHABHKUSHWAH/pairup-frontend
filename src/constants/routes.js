/**
 * Application Route Paths
 */
export const ROUTES = Object.freeze({
  // Public
  HOME: '/',
  LOGIN: '/login',
  BECOME_MENTOR: '/become-a-mentor',
  MENTOR_PROFILE: (id = ':id') => `/mentor/${id}`,
  HELP: '/help',
  CONTACT: '/contact',
  PRIVACY: '/privacy',
  TERMS: '/terms',

  // Interactive / Realtime
  CHAT: '/chat',
  SESSION_ROOM: (id = ':id') => `/session/${id}`,
  CONTRACT_DETAIL: (id = ':id') => `/contracts/${id}`,

  // Learner Portal
  LEARNER: {
    DASHBOARD: '/learner/dashboard',
    EXPLORE: '/learner/explore',
    POST_PROBLEM: '/learner/post-problem',
    MY_PROBLEMS: '/learner/my-problems',
    CONTRACTS: '/learner/contracts',
    SESSIONS: '/learner/sessions',
    PAYMENTS: '/learner/payments',
    REVIEWS: '/learner/reviews',
    FAVORITES: '/learner/favorites',
    HISTORY: '/learner/history',
    PROFILE: '/learner/profile',
    SETTINGS: '/learner/settings',
    NOTIFICATIONS: '/learner/notifications',
  },

  // Mentor Portal
  MENTOR: {
    DASHBOARD: '/mentor/dashboard',
    REQUESTS: '/mentor/problem-requests',
    PROPOSALS: '/mentor/my-proposals',
    CONTRACTS: '/mentor/contracts',
    PROFILE: '/mentor/profile',
    SESSIONS: '/mentor/sessions',
    CALENDAR: '/mentor/calendar',
    EARNINGS: '/mentor/earnings',
    TRANSACTIONS: '/mentor/transactions',
    BILLINGS: '/mentor/billings',
    REPORTS: '/mentor/reports',
    TAXES: '/mentor/taxes',
    AVAILABILITY: '/mentor/availability',
    REVIEWS: '/mentor/reviews',
    PROFILE_EDIT: '/mentor/profile/edit',
    SETTINGS: '/mentor/settings',
    NOTIFICATIONS: '/mentor/notifications',
  },

  // Admin Portal
  ADMIN: {
    OVERVIEW: '/admin',
    USERS: '/admin/users',
    MENTORS: '/admin/mentors',
    VERIFICATION: '/admin/verification',
    DISPUTES: '/admin/disputes',
    PAYOUTS: '/admin/payouts',
    COMMISSIONS: '/admin/commissions',
    REFUNDS: '/admin/refunds',
    CONTRACTS: '/admin/contracts',
    SESSIONS: '/admin/sessions',

    PAYMENTS: '/admin/payments',
    PROBLEMS: '/admin/problems',
    REVIEWS: '/admin/reviews',
    REPORTS: '/admin/reports',
    NOTIFICATIONS: '/admin/notifications',
    SETTINGS: '/admin/settings',
    AUDIT_LOGS: '/admin/audit-logs',
    CONTENT: '/admin/content',
  },

  // Superadmin
  SUPERADMIN: '/superadmin',
});
