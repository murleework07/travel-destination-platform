import { pool } from '../config/db.js';

const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

export const packageRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.description,
              p.duration_days AS durationDays, p.price,
              JSON_OBJECT('id', dest.id, 'name', dest.name, 'slug', dest.slug) AS destination,
              COALESCE(
                (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                          'id', d.id,
                          'departureDate', DATE_FORMAT(d.departure_date, '%Y-%m-%d'),
                          'totalSeats', d.total_seats,
                          'seatsLeft', d.total_seats - d.booked_seats))
                   FROM package_departures d
                  WHERE d.package_id = p.id AND d.departure_date > CURDATE()),
                JSON_ARRAY()
              ) AS departures
         FROM packages p
         JOIN destinations dest ON dest.id = p.destination_id
        WHERE p.id = ? AND p.is_active = TRUE AND dest.deleted_at IS NULL
        LIMIT 1`,
      [id]
    );

    const row = rows[0];
    if (!row) return null;

    const departures = parseJson(row.departures).sort((a, b) =>
      a.departureDate.localeCompare(b.departureDate)
    );
    return { ...row, destination: parseJson(row.destination), departures };
  },
};