import { api } from './client.js';

export const packagesApi = {
  get: (id) => api.get(`/packages/${id}`).then((r) => r.data.data),
};
