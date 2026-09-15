import { authApi } from './auth';
import { mentorApi } from './mentors';
import { problemApi } from './problems';
import { bookingApi } from './bookings';
import { chatApi } from './chat';
import { reviewApi } from './reviews';
import { paymentApi } from './payments';
import { cmsApi } from './cms';
import { adminApi } from './admin';
import { superadminApi } from './superadmin';
import { notificationsApi } from './notifications';
import { contractsApi } from './contracts';

export {
  authApi,
  mentorApi,
  problemApi,
  bookingApi,
  chatApi,
  reviewApi,
  paymentApi,
  cmsApi,
  adminApi,
  superadminApi,
  notificationsApi,
  contractsApi,
};

/**
 * Unified API Client with all domains combined for complete backward compatibility.
 */
export const api = {
  ...authApi,
  ...mentorApi,
  ...problemApi,
  ...bookingApi,
  ...chatApi,
  ...reviewApi,
  ...paymentApi,
  ...cmsApi,
  ...adminApi,
  ...superadminApi,
  ...notificationsApi,
  ...contractsApi,
};
