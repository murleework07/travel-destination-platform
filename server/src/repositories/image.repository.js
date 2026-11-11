import { pool } from '../config/db.js';

export const imageRepository = {
  async destinationExists(id) {
    const [rows] = await pool.query(
      'SELECT 1 FROM destinations WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows.length > 0;
  },

  async hasPrimary(destinationId, conn = pool) {
    const [rows] = await conn.query(
      'SELECT 1 FROM destination_images WHERE destination_id = ? AND is_primary = TRUE LIMIT 1',
      [destinationId]);
    return rows.length > 0;
  },

  async insertMany(destinationId, images, conn = pool) {
    await conn.query(
      'INSERT INTO destination_images (destination_id, url, public_id, is_primary) VALUES ?',
      [images.map((img) => [destinationId, img.url, img.fileName, img.isPrimary])]);
  },

  async listByDestination(destinationId) {
    const [rows] = await pool.query(
      `SELECT id, url, is_primary AS isPrimary FROM destination_images
        WHERE destination_id = ? ORDER BY is_primary DESC, id`, [destinationId]);
    return rows.map((r) => ({ ...r, isPrimary: Boolean(r.isPrimary) }));
  },

  async findById(imageId, destinationId) {
    const [rows] = await pool.query(
      `SELECT id, public_id AS fileName, is_primary AS isPrimary
         FROM destination_images WHERE id = ? AND destination_id = ?`, [imageId, destinationId]);
    return rows[0] || null;
  },

  async delete(imageId, conn = pool) {
    await conn.query('DELETE FROM destination_images WHERE id = ?', [imageId]);
  },

  // Promote the oldest remaining image to primary
  async promoteFirst(destinationId, conn = pool) {
    await conn.query(
      `UPDATE destination_images SET is_primary = TRUE
        WHERE destination_id = ? ORDER BY id LIMIT 1`, [destinationId]);
  },
};