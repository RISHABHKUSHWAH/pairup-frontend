import { apiFetch } from '../http';

export const learnerApi = {
  getLearner: (id) => apiFetch(`/api/learners/${id}`, { auth: true }),
  getLearnerStats: (id) => apiFetch(`/api/learners/${id}`, { auth: true }),
};
