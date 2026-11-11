import { pool } from '../config/db.js';

const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

// Each sort option: DB column, direction, and the response field used to build the cursor
export const SORT_OPTIONS = {
  newest:  { column: 'd.created_at',   dir: 'DESC', field: 'createdAt', isDate: true },
  rating:  { column: 'd.avg_rating',   dir: 'DESC', field: 'avgRating' },
  popular: { column: 'd.review_count', dir: 'DESC', field: 'reviewCount' },
  name:    { column: 'd.name',         dir: 'ASC',  field: 'name' },
};

export const destinationSearchRepository = {
  async search({ fullText, namePrefix, country, categories, minRating, minPrice, maxPrice, sort, limit, cursor }) {
    const where = ['d.deleted_at IS NULL'];
    const params = [];

    // 1. Text search: FULLTEXT index for real words, prefix LIKE for very short input
    if (fullText) {
      where.push('MATCH(d.name, d.description) AGAINST (? IN BOOLEAN MODE)');
      params.push(fullText);
    } else if (namePrefix) {
      where.push('d.name LIKE ?');
      params.push(`${namePrefix}%`); // prefix LIKE can use idx_dest_name; '%x%' cannot
    }

    // 2. Country (ISO code)
    if (country) {
      where.push('c.iso_code = ?');
      params.push(country);
    }

    // 3. Categories: destination has ANY of the given categories
    if (categories?.length) {
      where.push(`EXISTS (
        SELECT 1 FROM destination_categories dc
        JOIN categories cat ON cat.id = dc.category_id
        WHERE dc.destination_id = d.id AND cat.slug IN (?)
      )`);
      params.push(categories);
    }

    // 4. Minimum rating
    if (minRating !== undefined) {
      where.push('d.avg_rating >= ?');
      params.push(minRating);
    }

    // 5. Price: at least one active package in the range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.push(`EXISTS (
        SELECT 1 FROM packages p
        WHERE p.destination_id = d.id AND p.is_active = TRUE
          AND p.price BETWEEN ? AND ?
      )`);
      params.push(minPrice ?? 0, maxPrice ?? 99999999);
    }

    // 6. Keyset pagination: continue AFTER the last item of the previous page
    const s = SORT_OPTIONS[sort];
    const op = s.dir === 'DESC' ? '<' : '>';
    if (cursor) {
      const value = s.isDate ? new Date(cursor.v) : cursor.v;
      where.push(`(${s.column} ${op} ? OR (${s.column} = ? AND d.id ${op} ?))`);
      params.push(value, value, cursor.id);
    }

    params.push(limit + 1); // fetch ONE extra row to know if there is a next page

    // Column names come only from SORT_OPTIONS (a fixed whitelist), never from user input
    const [rows] = await pool.query(
      `SELECT
         d.id, d.name, d.slug, d.city,
         d.avg_rating   AS avgRating,
         d.review_count AS reviewCount,
         d.created_at   AS createdAt,
         c.name         AS country,
         c.iso_code     AS countryCode,
         (SELECT MIN(p.price) FROM packages p
           WHERE p.destination_id = d.id AND p.is_active = TRUE) AS startingPrice,
         (SELECT di.url FROM destination_images di
           WHERE di.destination_id = d.id
           ORDER BY di.is_primary DESC, di.id LIMIT 1) AS coverImage,
         COALESCE(
           (SELECT JSON_ARRAYAGG(cat.name)
              FROM destination_categories dc
              JOIN categories cat ON cat.id = dc.category_id
             WHERE dc.destination_id = d.id),
           JSON_ARRAY()
         ) AS categories
       FROM destinations d
       JOIN countries c ON c.id = d.country_id
       WHERE ${where.join(' AND ')}
       ORDER BY ${s.column} ${s.dir}, d.id ${s.dir}
       LIMIT ?`,
      params
    );

    return rows.map((r) => ({ ...r, categories: parseJson(r.categories) }));
  },
};