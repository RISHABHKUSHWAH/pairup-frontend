import { apiFetch } from '../http';

export const cmsApi = {
  getPage: (slug) =>
    apiFetch(`/api/pages/${slug}`),

  submitContact: (data) =>
    apiFetch('/api/contact', { method: 'POST', body: data }),
};
