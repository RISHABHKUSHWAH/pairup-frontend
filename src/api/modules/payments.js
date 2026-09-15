import { apiFetch } from '../http';

export const paymentApi = {
  getMyPayments: () =>
    apiFetch('/api/payments/mine', { auth: true }),
};
