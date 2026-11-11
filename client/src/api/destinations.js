import { api } from './client.js';

export const destinationsApi = {
  // returns { data: [...], meta: { nextCursor, hasMore } }
  search: (params) => api.get('/destinations', { params }).then((r) => r.data),
  getBySlug: (slug) => api.get(`/destinations/${slug}`).then((r) => r.data.data),
  ratingSummary: (slug) => api.get(`/destinations/${slug}/rating-summary`).then((r) => r.data.data),
  reviews: (slug, params) => api.get(`/destinations/${slug}/reviews`, { params }).then((r) => r.data),
  filters: () => api.get('/meta/filters').then((r) => r.data.data),
};
