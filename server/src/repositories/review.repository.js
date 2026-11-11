import { pool } from '../config/db.js';

const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

export const reviewRepository = {
  // Locks the destination row until the transaction ends.
  // Other review writes for the SAME destination wait; other destinations are unaffected.
  async lockDestination(destinationId, conn) {
    const [rows] = await conn.query(
      'SELECT id FROM destinations WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
      [destinationId]
    );
    return rows[0] || null;
  },

  async findDestinationIdBySlug(slug) {
    const [rows] = await pool.query(
      'SELECT id FROM destinations WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
      [slug]
    );
    return rows[0]?.id ?? null;
  },

  async findById(id, conn = pool) {
    const [rows] = await conn.query(
      `SELECT r.id, r.user_id AS userId, r.destination_id AS destinationId,
              r.rating, r.comment, r.created_at AS createdAt, r.updated_at AS updatedAt
         FROM reviews r WHERE r.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ userId, destinationId, rating, comment }, conn) {
    const [result] = await conn.query(
      'INSERT INTO reviews (user_id, destination_id, rating, comment) VALUES (?, ?, ?, ?)',
      [userId, destinationId, rating, comment ?? null]
    );
    return result.insertId;
  },

  async update(id, { rating, comment }, conn) {
    const sets = [];
    const values = [];
    if (rating !== undefined) { sets.push('rating = ?'); values.push(rating); }
    if (comment !== undefined) { sets.push('comment = ?'); values.push(comment); }
    if (sets.length === 0) return 0;

    values.push(id);
    const [result] = await conn.query(`UPDATE reviews SET ${sets.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  },

  async delete(id, conn) {
    const [result] = await conn.query('DELETE FROM reviews WHERE id = ?', [id]);
    return result.affectedRows;
  },

  // Recalculate from the source of truth (accurate, no rounding drift)
  async recalculateDestinationRating(destinationId, conn) {
    await conn.query(
      `UPDATE destinations SET
         avg_rating   = (SELECT COALESCE(ROUND(AVG(r.rating), 2), 0)
                           FROM reviews r WHERE r.destination_id = ?),
         review_count = (SELECT COUNT(*) FROM reviews r WHERE r.destination_id = ?)
       WHERE id = ?`,
      [destinationId, destinationId, destinationId]
    );
  },

  // Newest first, keyset pagination; uses index (destination_id, created_at)
  async listByDestination({ destinationId, limit, cursor }) {
    const params = [destinationId];
    let cursorSql = '';
    if (cursor) {
      cursorSql = 'AND (r.created_at < ? OR (r.created_at = ? AND r.id < ?))';
      const createdAt = new Date(cursor.v);
      params.push(createdAt, createdAt, cursor.id);
    }
    params.push(limit + 1);

    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment,
              r.created_at AS createdAt, r.updated_at AS updatedAt,
              JSON_OBJECT('id', u.id, 'name', u.name) AS author
         FROM reviews r
         JOIN users u ON u.id = r.user_id
        WHERE r.destination_id = ? ${cursorSql}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ?`,
      params
    );
    return rows.map((r) => ({ ...r, author: parseJson(r.author) }));
  },

  // Always returns 5 rows (5★..1★), even for stars with 0 reviews: derived table + LEFT JOIN
  async ratingDistribution(destinationId) {
    const [rows] = await pool.query(
      `SELECT s.star, COUNT(r.id) AS count
         FROM (SELECT 5 AS star UNION ALL SELECT 4 UNION ALL SELECT 3
               UNION ALL SELECT 2 UNION ALL SELECT 1) AS s
         LEFT JOIN reviews r
           ON r.rating = s.star AND r.destination_id = ?
        GROUP BY s.star
        ORDER BY s.star DESC`,
      [destinationId]
    );
    return rows;
  },
};