import { pool } from '../config/db.js';

export const metaRepository = {
  // LEFT JOIN so countries/categories with 0 destinations still appear
  async countries() {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.iso_code AS isoCode, COUNT(d.id) AS destinationCount
         FROM countries c
         LEFT JOIN destinations d ON d.country_id = c.id AND d.deleted_at IS NULL
        GROUP BY c.id, c.name, c.iso_code
        ORDER BY c.name`
    );
    return rows;
  },

  async categories() {
    const [rows] = await pool.query(
      `SELECT cat.id, cat.name, cat.slug, COUNT(d.id) AS destinationCount
         FROM categories cat
         LEFT JOIN destination_categories dc ON dc.category_id = cat.id
         LEFT JOIN destinations d ON d.id = dc.destination_id AND d.deleted_at IS NULL
        GROUP BY cat.id, cat.name, cat.slug
        ORDER BY cat.name`
    );
    return rows;
  },
};
