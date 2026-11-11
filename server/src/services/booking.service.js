import { bookingRepository as repo } from '../repositories/booking.repository.js';
import { withTransaction } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const canAccess = (actor, booking) => booking.userId === actor.id || actor.role === 'admin';

// Same idempotency key = same booking returned, no second booking created
async function findReplay(userId, idempotencyKey) {
  if (!idempotencyKey) return null;
  const existing = await repo.findByIdempotencyKey(userId, idempotencyKey);
  return existing ? repo.findById(existing.id) : null;
}

export const bookingService = {
  async create(actor, { departureId, seats }, idempotencyKey) {
    // 1. Retry or double-click? Return the original booking
    const replay = await findReplay(actor.id, idempotencyKey);
    if (replay) return { booking: replay, replayed: true };

    try {
      const bookingId = await withTransaction(async (conn) => {
        // 2. LOCK the departure row: concurrent bookings for this date wait here
        const departure = await repo.lockDeparture(departureId, conn);
        if (!departure) throw ApiError.notFound(`Departure with id ${departureId} not found`);
        if (!departure.isActive) throw ApiError.badRequest('This package is no longer available');
        if (!departure.isUpcoming) throw ApiError.badRequest('This departure date has already passed');

        // 3. Check seats while holding the lock (safe: nobody else can change it now)
        const seatsLeft = departure.totalSeats - departure.bookedSeats;
        if (seats > seatsLeft) {
          throw ApiError.conflict(
            seatsLeft === 0 ? 'This departure is sold out' : `Only ${seatsLeft} seat(s) left`
          );
        }

        // 4. Reserve seats + create booking (price ALWAYS calculated on the server)
        await repo.incrementSeats(departureId, seats, conn);
        const totalAmount = (Math.round(departure.price * 100) * seats) / 100;

        return repo.create({ userId: actor.id, departureId, seats, totalAmount, idempotencyKey }, conn);
      });

      return { booking: await repo.findById(bookingId), replayed: false };
    } catch (err) {
      // Two identical requests raced: the UNIQUE key let only one through
      if (err.code === 'ER_DUP_ENTRY' && idempotencyKey) {
        const replayAfterRace = await findReplay(actor.id, idempotencyKey);
        if (replayAfterRace) return { booking: replayAfterRace, replayed: true };
      }
      throw err;
    }
  },

  async getById(actor, id) {
    const booking = await repo.findById(id);
    // 404 (not 403) so other users can't even discover that this booking id exists
    if (!booking || !canAccess(actor, booking)) {
      throw ApiError.notFound(`Booking with id ${id} not found`);
    }
    return booking;
  },

  async listMine(userId, status) {
    return repo.listByUser(userId, status);
  },

  async cancel(actor, id) {
    const booking = await this.getById(actor, id);

    if (!booking.isUpcoming) {
      throw ApiError.badRequest('Cannot cancel a booking for a past departure');
    }

    await withTransaction(async (conn) => {
      // Same lock order as create(): departure first, then booking -> avoids deadlocks
      await repo.lockDeparture(booking.departureId, conn);
      const locked = await repo.lockBooking(id, conn);

      if (locked.status === 'CANCELLED') {
        throw ApiError.conflict('Booking is already cancelled');
      }

      await repo.cancel(id, conn);
      await repo.decrementSeats(booking.departureId, locked.seats, conn); // release seats
    });

    return repo.findById(id);
  },
};