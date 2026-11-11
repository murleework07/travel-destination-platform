import { pool } from '../config/db.js';

// Shared SELECT for booking details (booking -> departure -> package -> destination)
const BOOKING_DETAILS_SQL = `
  SELECT b.id, b.user_id AS userId, b.seats,
         b.total_amount AS totalAmount, b.status,
         b.created_at AS createdAt,
         b.departure_id AS departureId,
         DATE_FORMAT(d.departure_date, '%Y-%m-%d') AS departureDate,
         (d.departure_date > CURDATE()) AS isUpcoming,
         p.id AS packageId, p.title AS packageTitle,
         dest.name AS destinationName, dest.slug AS destinationSlug
    FROM bookings b
    JOIN package_departures d ON d.id = b.departure_id
    JOIN packages p           ON p.id = d.package_id
    JOIN destinations dest    ON dest.id = p.destination_id`;

const toBooking = (row) => (row ? { ...row, isUpcoming: Boolean(row.isUpcoming) } : null);

export const bookingRepository = {
  /**
   * Locks ONLY the departure row (FOR UPDATE OF d), not the package row,
   * so other dates of the same package can still be booked in parallel.
   */
  async lockDeparture(departureId, conn) {
    const [rows] = await conn.query(
      `SELECT d.id, d.total_seats AS totalSeats, d.booked_seats AS bookedSeats,
              (d.departure_date > CURDATE()) AS isUpcoming,
              p.price, p.is_active AS isActive
         FROM package_departures d
         JOIN packages p ON p.id = d.package_id
        WHERE d.id = ?
        FOR UPDATE OF d`,
      [departureId]
    );
    const row = rows[0];
    return row ? { ...row, isUpcoming: Boolean(row.isUpcoming), isActive: Boolean(row.isActive) } : null;
  },

  async lockBooking(id, conn) {
    const [rows] = await conn.query(
      'SELECT id, user_id AS userId, seats, status FROM bookings WHERE id = ? FOR UPDATE',
      [id]
    );
    return rows[0] || null;
  },

  async incrementSeats(departureId, seats, conn) {
    await conn.query(
      'UPDATE package_departures SET booked_seats = booked_seats + ? WHERE id = ?',
      [seats, departureId]
    );
  },

  async decrementSeats(departureId, seats, conn) {
    await conn.query(
      'UPDATE package_departures SET booked_seats = booked_seats - ? WHERE id = ?',
      [seats, departureId]
    );
  },

  async create({ userId, departureId, seats, totalAmount, idempotencyKey }, conn) {
    const [result] = await conn.query(
      `INSERT INTO bookings (user_id, departure_id, seats, total_amount, status, idempotency_key)
       VALUES (?, ?, ?, ?, 'CONFIRMED', ?)`,
      [userId, departureId, seats, totalAmount, idempotencyKey ?? null]
    );
    return result.insertId;
  },

  async cancel(id, conn) {
    await conn.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", [id]);
  },

  async findByIdempotencyKey(userId, key) {
    const [rows] = await pool.query(
      'SELECT id FROM bookings WHERE user_id = ? AND idempotency_key = ? LIMIT 1',
      [userId, key]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(`${BOOKING_DETAILS_SQL} WHERE b.id = ? LIMIT 1`, [id]);
    return toBooking(rows[0]);
  },

  async listByUser(userId, status) {
    const params = [userId];
    let statusSql = '';
    if (status) {
      statusSql = 'AND b.status = ?';
      params.push(status);
    }
    const [rows] = await pool.query(
      `${BOOKING_DETAILS_SQL}
        WHERE b.user_id = ? ${statusSql}
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT 50`,
      params
    );
    return rows.map(toBooking);
  },
};