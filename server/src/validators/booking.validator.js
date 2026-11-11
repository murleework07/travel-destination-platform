import { z } from 'zod';

export const createBookingSchema = z.object({
  departureId: z.number().int().positive(),
  seats: z.number().int().min(1).max(10),
});

export const myBookingsQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
});

// Client-generated unique id, e.g. crypto.randomUUID()
export const idempotencyKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/, 'Idempotency-Key must be 8-64 letters, digits, - or _');