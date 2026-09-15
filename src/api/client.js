/**
 * PairUp Client API Facade (Backward-Compatible)
 * 
 * Re-exports modularized HTTP client, domain-specific API endpoints,
 * scoped storage managers, and display formatters.
 * 
 * For modular imports in new components:
 * - import { api, TokenStorage } from '@/api';
 * - import { authApi, mentorApi } from '@/api/modules';
 * - import { learnerProfile, mentorProfileSettings } from '@/api/storage';
 * - import { initials, stars, formatCurrency } from '@/utils';
 * - import { ROLES, ROUTES } from '@/constants';
 */

export * from './index';
