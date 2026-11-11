/**
 * Fires many simultaneous booking requests at a departure with few seats.
 * ⚠️ TEST ONLY: resets the chosen departure and deletes its bookings.
 * Requires: the server running (npm run dev) and the seed users (password Travel123).
 */
import { parseArgs } from 'node:util';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

const { values } = parseArgs({
  options: {
    departure: { type: 'string', default: '5' },
    seats: { type: 'string', default: '5' },
    requests: { type: 'string', default: '50' },
  },
});

const departureId = Number(values.departure);
const totalSeats = Number(values.seats);
const requestCount = Number(values.requests);
const BASE = `http://localhost:${env.port}/api/v1`;
const USERS = [
  'murlee@test.com', 'asha@test.com', 'rahul@test.com',
  'priya@test.com', 'arjun@test.com', 'neha@test.com',
];

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Travel123' }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email} (status ${res.status})`);
  return (await res.json()).data.accessToken;
}

async function main() {
  console.log(`\n🧪 Load test: ${requestCount} requests for ${totalSeats} seats (departure ${departureId})\n`);

  // Reset the departure for a clean test
  await pool.query('DELETE FROM bookings WHERE departure_id = ?', [departureId]);
  await pool.query(
    'UPDATE package_departures SET total_seats = ?, booked_seats = 0 WHERE id = ?',
    [totalSeats, departureId]
  );

  const tokens = await Promise.all(USERS.map(login));

  // Fire ALL requests at the same time
  const started = performance.now();
  const statuses = await Promise.all(
    Array.from({ length: requestCount }, (_, i) =>
      fetch(`${BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens[i % tokens.length]}`,
        },
        body: JSON.stringify({ departureId, seats: 1 }),
      }).then((res) => res.status)
    )
  );
  const elapsed = Math.round(performance.now() - started);

  const counts = statuses.reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {});

  const [[departure]] = await pool.query(
    'SELECT total_seats AS total, booked_seats AS booked FROM package_departures WHERE id = ?',
    [departureId]
  );
  const [[{ confirmedSeats }]] = await pool.query(
    "SELECT COALESCE(SUM(seats), 0) AS confirmedSeats FROM bookings WHERE departure_id = ? AND status = 'CONFIRMED'",
    [departureId]
  );

  console.log('HTTP results     :', counts, `(${elapsed} ms)`);
  console.log('Seats in DB      :', `${departure.booked} booked / ${departure.total} total`);
  console.log('Confirmed seats  :', Number(confirmedSeats));

  const pass =
    (counts[201] || 0) === totalSeats &&
    departure.booked === totalSeats &&
    Number(confirmedSeats) === totalSeats;

  console.log(pass ? '\n✅ PASS: exactly the available seats were sold, no overbooking\n'
                   : '\n❌ FAIL: numbers do not match\n');
}

main()
  .catch((err) => {
    console.error('❌', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());