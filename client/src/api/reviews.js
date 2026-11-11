import { api } from './client.js';

export const reviewsApi = {
  create: (destinationId, body) =>
    api.post(`/destinations/${destinationId}/reviews`, body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/reviews/${id}`, body).then((r) => r.data.data),
  remove: (id) => api.delete(`/reviews/${id}`),
};
