import { api } from './client.js';

export const authApi = {
  login: (body) => api.post('/auth/login', body).then((r) => r.data.data),
  register: (body) => api.post('/auth/register', body).then((r) => r.data.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me').then((r) => r.data.data),
};
