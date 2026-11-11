import { bookingService } from '../services/booking.service.js';
import { idempotencyKeySchema } from '../validators/booking.validator.js';
import { ApiError } from '../utils/ApiError.js';

function readIdempotencyKey(req) {
  const key = req.get('Idempotency-Key');
  if (!key) return null;
  const result = idempotencyKeySchema.safeParse(key);
  if (!result.success) {
    throw ApiError.badRequest(result.error.issues[0].message);
  }
  return result.data;
}

export const bookingController = {
  async create(req, res) {
    const idempotencyKey = readIdempotencyKey(req);
    const { booking, replayed } = await bookingService.create(req.user, req.validated.body, idempotencyKey);

    if (replayed) res.set('Idempotent-Replayed', 'true');
    res.status(replayed ? 200 : 201).json({ success: true, data: booking });
  },

  async listMine(req, res) {
    const data = await bookingService.listMine(req.user.id, req.validated.query.status);
    res.json({ success: true, data });
  },

  async getById(req, res) {
    const data = await bookingService.getById(req.user, req.validated.params.id);
    res.json({ success: true, data });
  },

  async cancel(req, res) {
    const data = await bookingService.cancel(req.user, req.validated.params.id);
    res.json({ success: true, data });
  },
};