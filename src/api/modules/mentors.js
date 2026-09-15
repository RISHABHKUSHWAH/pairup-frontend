import { apiFetch } from '../http';

export const mentorApi = {
  getMentors: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.skill) qs.append('skill', params.skill);
    if (params.search) qs.append('search', params.search);
    if (params.online) qs.append('online', '1');
    if (params.sort) qs.append('sort', params.sort);
    const qStr = qs.toString();
    return apiFetch(`/api/mentors${qStr ? '?' + qStr : ''}`);
  },

  getMentor: (id) =>
    apiFetch(`/api/mentors/${id}`),

  updateOnlineStatus: (online) =>
    apiFetch('/api/mentors/me/online-status', { method: 'PUT', auth: true, body: { online } }),

  getMyMentorProfile: () =>
    apiFetch('/api/mentors/me', { auth: true }),

  updateMyMentorProfile: (data) =>
    apiFetch('/api/mentors/me', { method: 'PUT', auth: true, body: data }),

  applyMentor: (data) =>
    apiFetch('/api/mentors/apply', { method: 'POST', auth: true, body: data }),

  // Sections (Experience, Projects, Education, Certifications, Awards, Availability)
  addExperience: (data) =>
    apiFetch('/api/mentors/me/experience', { method: 'POST', auth: true, body: data }),

  deleteExperience: (id) =>
    apiFetch(`/api/mentors/me/experience/${id}`, { method: 'DELETE', auth: true }),

  addProject: (data) =>
    apiFetch('/api/mentors/me/projects', { method: 'POST', auth: true, body: data }),

  deleteProject: (id) =>
    apiFetch(`/api/mentors/me/projects/${id}`, { method: 'DELETE', auth: true }),

  addEducation: (data) =>
    apiFetch('/api/mentors/me/education', { method: 'POST', auth: true, body: data }),

  deleteEducation: (id) =>
    apiFetch(`/api/mentors/me/education/${id}`, { method: 'DELETE', auth: true }),

  addCertification: (data) =>
    apiFetch('/api/mentors/me/certifications', { method: 'POST', auth: true, body: data }),

  deleteCertification: (id) =>
    apiFetch(`/api/mentors/me/certifications/${id}`, { method: 'DELETE', auth: true }),

  addAward: (data) =>
    apiFetch('/api/mentors/me/awards', { method: 'POST', auth: true, body: data }),

  deleteAward: (id) =>
    apiFetch(`/api/mentors/me/awards/${id}`, { method: 'DELETE', auth: true }),

  getAvailability: () =>
    apiFetch('/api/mentors/me/availability', { auth: true }),

  setAvailability: (slots) =>
    apiFetch('/api/mentors/me/availability', { method: 'PUT', auth: true, body: { slots } }),
};
