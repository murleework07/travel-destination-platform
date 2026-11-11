import { pool } from '../config/db.js';

export const refreshTokenRepository = {
  async create({ userId, tokenHash, expiresAt }, conn = pool) {
    await conn.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    );
  },

  async findByHash(tokenHash) {
    const [rows] = await pool.query(
      `SELECT id, user_id AS userId, expires_at AS expiresAt, revoked_at AS revokedAt
         FROM refresh_tokens WHERE token_hash = ? LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  // Returns 1 if revoked now, 0 if it was ALREADY revoked (atomic check)
  async revoke(id, conn = pool) {
    const [result] = await conn.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL',
      [id]
    );
    return result.affectedRows;
  },

  // Log the user out of ALL devices
  async revokeAllForUser(userId) {
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [userId]
    );
  },
};