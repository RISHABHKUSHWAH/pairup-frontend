/**
 * Application User Roles
 */
export const ROLES = Object.freeze({
  LEARNER: 'learner',
  MENTOR: 'mentor',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.LEARNER]: 'Learner',
  [ROLES.MENTOR]: 'Mentor',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPERADMIN]: 'Superadmin',
});
