import { api } from './client.js';

export const bookingsApi = {
  // Same Idempotency-Key = server returns the original booking instead of creating another
  create: (body, idempotencyKey) =>
    api
      .post('/bookings', body, { headers: { 'Idempotency-Key': idempotencyKey } })
      .then((r) => r.data.data),
  mine: (status) => api.get('/bookings/me', { params: { status } }).then((r) => r.data.data),
  cancel: (id) => api.post(`/bookings/${id}/cancel`).then((r) => r.data.data),
};
