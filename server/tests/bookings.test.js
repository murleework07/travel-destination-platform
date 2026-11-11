import { describe, it, expect, beforeAll } from 'vitest';
import { api, pool, createUser } from './helpers.js';

let alice, bob, aliceBookingId;
const PACKAGE_ID = 1;   // Goa Beach Escape, ₹15,999
const DEPARTURE_ID = 1; // 20 seats
const PRICE = 15999;

beforeAll(async () => {
  [alice, bob] = await Promise.all([createUser({ name: 'Alice' }), createUser({ name: 'Bob' })]);
});

const seatsLeft = async (departureId = DEPARTURE_ID) => {
  const res = await api().get(`/api/v1/packages/${PACKAGE_ID}`);
  return res.body.data.departures.find((d) => d.id === departureId).seatsLeft;
};

describe('Bookings', () => {
  it('books seats with a server-calculated price', async () => {
    const res = await api().post('/api/v1/bookings').set(alice.auth).send({ departureId: DEPARTURE_ID, seats: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ seats: 2, totalAmount: PRICE * 2, status: 'CONFIRMED' });
    aliceBookingId = res.body.data.id;
    expect(await seatsLeft()).toBe(18);
  });

  it('is idempotent: same Idempotency-Key returns the same booking, seats taken once', async () => {
    const key = `test-key-${Date.now()}`;
    const send = () =>
      api().post('/api/v1/bookings').set(alice.auth).set('Idempotency-Key', key).send({ departureId: DEPARTURE_ID, seats: 1 });

    const first = await send();
    const retry = await send();

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(await seatsLeft()).toBe(17);
  });

  it('validates input', async () => {
    expect((await api().post('/api/v1/bookings').set(alice.auth).send({ departureId: DEPARTURE_ID, seats: 0 })).status).toBe(400);
    expect((await api().post('/api/v1/bookings').set(alice.auth).send({ departureId: 99999, seats: 1 })).status).toBe(404);
    expect((await api().post('/api/v1/bookings').send({ departureId: DEPARTURE_ID, seats: 1 })).status).toBe(401);
  });

  it('hides other users\' bookings with 404 (IDOR protection)', async () => {
    expect((await api().get(`/api/v1/bookings/${aliceBookingId}`).set(bob.auth)).status).toBe(404);
    expect((await api().get(`/api/v1/bookings/${aliceBookingId}`).set(alice.auth)).status).toBe(200);
  });

  it('cancelling releases seats; cancelling twice is a 409', async () => {
    const before = await seatsLeft();
    const res = await api().post(`/api/v1/bookings/${aliceBookingId}/cancel`).set(alice.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
    expect(await seatsLeft()).toBe(before + 2);

    expect((await api().post(`/api/v1/bookings/${aliceBookingId}/cancel`).set(alice.auth)).status).toBe(409);
  });

  it('never overbooks: 25 simultaneous requests for 5 seats sell exactly 5', async () => {
    const DEP = 2;
    await pool.query('DELETE FROM bookings WHERE departure_id = ?', [DEP]);
    await pool.query('UPDATE package_departures SET total_seats = 5, booked_seats = 0 WHERE id = ?', [DEP]);

    const results = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        api().post('/api/v1/bookings').set((i % 2 ? alice : bob).auth).send({ departureId: DEP, seats: 1 })
      )
    );

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(statuses.filter((s) => s === 409)).toHaveLength(20);

    const [[dep]] = await pool.query('SELECT booked_seats FROM package_departures WHERE id = ?', [DEP]);
    const [[{ sold }]] = await pool.query(
      "SELECT COALESCE(SUM(seats), 0) AS sold FROM bookings WHERE departure_id = ? AND status = 'CONFIRMED'",
      [DEP]
    );
    expect(dep.booked_seats).toBe(5);
    expect(Number(sold)).toBe(5);
  });
});
