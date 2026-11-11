import { api } from './client.js';

const data = (r) => r.data.data;

export const adminApi = {
  // Reports
  bookingStats: () => api.get('/reports/bookings').then(data),
  countryStats: () => api.get('/reports/country-stats').then(data),
  topRated: (params) => api.get('/reports/top-rated', { params }).then(data),
  bestPerCountry: () => api.get('/reports/best-per-country').then(data),
  topReviewers: (params) => api.get('/reports/top-reviewers', { params }).then(data),

  // Destinations
  createDestination: (body) => api.post('/destinations', body).then(data),
  updateDestination: (id, body) => api.patch(`/destinations/${id}`, body).then(data),
  deleteDestination: (id) => api.delete(`/destinations/${id}`),

  // Images (multipart/form-data, field name "images")
  uploadImages: (id, files) => {
    const form = new FormData();
    for (const file of files) form.append('images', file);
    return api.post(`/destinations/${id}/images`, form).then(data);
  },
  deleteImage: (id, imageId) => api.delete(`/destinations/${id}/images/${imageId}`),

  // Users
  users: (params) => api.get('/users', { params }).then((r) => r.data), // { data, meta }
  changeRole: (id, role) => api.patch(`/users/${id}/role`, { role }).then(data),
};
