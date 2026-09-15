import { apiFetch } from '../http';

export const reviewApi = {
  getReviews: () =>
    apiFetch('/api/reviews', { auth: true }),

  getMyReviews: () =>
    apiFetch('/api/reviews/mine', { auth: true }),

  createReview: (data) =>
    apiFetch('/api/reviews', { method: 'POST', auth: true, body: data }),
};
