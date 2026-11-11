import { pool } from '../config/db.js';

const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

// Whitelist: API field name -> DB column (protects against SQL injection in UPDATE)
const UPDATABLE_COLUMNS = {
  name: 'name',
  description: 'description',
  countryId: 'country_id',
  city: 'city',
  latitude: 'latitude',
  longitude: 'longitude',
  bestTimeToVisit: 'best_time_to_visit',
};

export const destinationRepository = {
  // ---------- READ ----------
  async findAll({ limit, offset }) {
    const [rows] = await pool.query(
      `SELECT
         d.id, d.name, d.slug, d.city,
         d.avg_rating   AS avgRating,
         d.review_count AS reviewCount,
         c.name         AS country,
         (SELECT di.url FROM destination_images di
           WHERE di.destination_id = d.id
           ORDER BY di.is_primary DESC, di.id
           LIMIT 1) AS coverImage,
         COALESCE(
           (SELECT JSON_ARRAYAGG(cat.name)
              FROM destination_categories dc
              JOIN categories cat ON cat.id = dc.category_id
             WHERE dc.destination_id = d.id),
           JSON_ARRAY()
         ) AS categories
       FROM destinations d
       JOIN countries c ON c.id = d.country_id
       WHERE d.deleted_at IS NULL
       ORDER BY d.created_at DESC, d.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows.map((r) => ({ ...r, categories: parseJson(r.categories) }));
  },

  async countAll() {
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM destinations WHERE deleted_at IS NULL'
    );
    return total;
  },

  async findBySlug(slug) {
    const [rows] = await pool.query(
      `SELECT
         d.id, d.name, d.slug, d.description, d.city,
         d.latitude, d.longitude,
         d.best_time_to_visit AS bestTimeToVisit,
         d.avg_rating   AS avgRating,
         d.review_count AS reviewCount,
         d.created_at   AS createdAt,
         JSON_OBJECT('id', c.id, 'name', c.name, 'isoCode', c.iso_code) AS country,
         COALESCE(
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cat.id, 'name', cat.name, 'slug', cat.slug))
              FROM destination_categories dc
              JOIN categories cat ON cat.id = dc.category_id
             WHERE dc.destination_id = d.id),
           JSON_ARRAY()
         ) AS categories,
         COALESCE(
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', di.id, 'url', di.url, 'isPrimary', di.is_primary))
              FROM destination_images di
             WHERE di.destination_id = d.id),
           JSON_ARRAY()
         ) AS images,
         COALESCE(
           (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                     'id', p.id, 'title', p.title,
                     'durationDays', p.duration_days, 'price', p.price))
              FROM packages p
             WHERE p.destination_id = d.id AND p.is_active = TRUE),
           JSON_ARRAY()
         ) AS packages
       FROM destinations d
       JOIN countries c ON c.id = d.country_id
       WHERE d.slug = ? AND d.deleted_at IS NULL
       LIMIT 1`,
      [slug]
    );

    const row = rows[0];
    if (!row) return null;

    return {
      ...row,
      country: parseJson(row.country),
      categories: parseJson(row.categories),
      images: parseJson(row.images),
      packages: parseJson(row.packages),
    };
  },

  async findById(id, conn = pool) {
    const [rows] = await conn.query(
      'SELECT id, name, slug FROM destinations WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  // ---------- CHECKS ----------
  async slugExists(slug) {
    const [rows] = await pool.query('SELECT 1 FROM destinations WHERE slug = ? LIMIT 1', [slug]);
    return rows.length > 0;
  },

  async countryExists(id) {
    const [rows] = await pool.query('SELECT 1 FROM countries WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0;
  },

  async countExistingCategories(ids) {
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM categories WHERE id IN (?)',
      [ids]
    );
    return count;
  },

  // ---------- WRITE ----------
  async insert(data, conn = pool) {
    const [result] = await conn.query(
      `INSERT INTO destinations
         (name, slug, description, country_id, city, latitude, longitude, best_time_to_visit, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.slug,
        data.description,
        data.countryId,
        data.city,
        data.latitude ?? null,
        data.longitude ?? null,
        data.bestTimeToVisit ?? null,
        data.createdBy ?? null,
      ]
    );
    return result.insertId;
  },

  async update(id, data, conn = pool) {
    const sets = [];
    const values = [];

    for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
      if (data[field] !== undefined) {
        sets.push(`${column} = ?`);
        values.push(data[field]);
      }
    }
    if (sets.length === 0) return 0;

    values.push(id);
    const [result] = await conn.query(
      `UPDATE destinations SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      values
    );
    return result.affectedRows;
  },

  async replaceCategories(destinationId, categoryIds, conn = pool) {
    await conn.query('DELETE FROM destination_categories WHERE destination_id = ?', [destinationId]);
    if (categoryIds.length === 0) return;

    // Bulk insert: VALUES (1,2), (1,5), ... in ONE query
    await conn.query(
      'INSERT INTO destination_categories (destination_id, category_id) VALUES ?',
      [categoryIds.map((categoryId) => [destinationId, categoryId])]
    );
  },

  async insertImages(destinationId, images, conn = pool) {
    if (images.length === 0) return;
    await conn.query(
      'INSERT INTO destination_images (destination_id, url, is_primary) VALUES ?',
      [images.map((img) => [destinationId, img.url, img.isPrimary])]
    );
  },

  async softDelete(id) {
    const [result] = await pool.query(
      'UPDATE destinations SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return result.affectedRows;
  },
};