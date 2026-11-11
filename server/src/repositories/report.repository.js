import { pool } from '../config/db.js';

export const reportRepository = {
  /**
   * Bayesian (weighted) rating, like IMDb's Top 250 formula:
   *   WR = (v / (v + m)) * R + (m / (v + m)) * C
   */
  async topRated({ minVotes, limit }) {
    const [rows] = await pool.query(
      `WITH global_stats AS (
         SELECT AVG(rating) AS C FROM reviews
       )
       SELECT d.id, d.name, d.slug,
              d.avg_rating   AS avgRating,
              d.review_count AS reviewCount,
              ROUND(
                (d.review_count / (d.review_count + ?)) * d.avg_rating
                + (? / (d.review_count + ?)) * g.C,
              3) AS weightedRating
         FROM destinations d
        CROSS JOIN global_stats g
        WHERE d.deleted_at IS NULL AND d.review_count > 0
        ORDER BY weightedRating DESC, d.review_count DESC
        LIMIT ?`,
      [minVotes, minVotes, minVotes, limit]
    );
    return rows;
  },

  // LEFT JOIN keeps countries with zero destinations/reviews in the report
  async countryStats() {
    const [rows] = await pool.query(
      `SELECT c.name AS country,
              c.iso_code AS isoCode,
              COUNT(DISTINCT d.id) AS destinations,
              COUNT(r.id) AS totalReviews,
              COALESCE(ROUND(AVG(r.rating), 2), 0) AS avgRating
         FROM countries c
         LEFT JOIN destinations d ON d.country_id = c.id AND d.deleted_at IS NULL
         LEFT JOIN reviews r      ON r.destination_id = d.id
        GROUP BY c.id, c.name, c.iso_code
        ORDER BY totalReviews DESC, country ASC`
    );
    return rows;
  },

  // Window function: rank destinations INSIDE each country, keep the #1 of each
  async bestPerCountry() {
    const [rows] = await pool.query(
      `SELECT country, name, slug, avgRating, reviewCount
         FROM (
           SELECT c.name AS country, d.name, d.slug,
                  d.avg_rating AS avgRating, d.review_count AS reviewCount,
                  ROW_NUMBER() OVER (
                    PARTITION BY d.country_id
                    ORDER BY d.avg_rating DESC, d.review_count DESC
                  ) AS rankInCountry
             FROM destinations d
             JOIN countries c ON c.id = d.country_id
            WHERE d.deleted_at IS NULL
         ) AS ranked
        WHERE rankInCountry = 1
        ORDER BY avgRating DESC`
    );
    return rows;
  },

  // GROUP BY + HAVING: filter on an aggregate
  async topReviewers({ minReviews, limit }) {
    const [rows] = await pool.query(
      `SELECT u.id, u.name,
              COUNT(r.id) AS reviewCount,
              ROUND(AVG(r.rating), 2) AS avgRatingGiven,
              MAX(r.created_at) AS lastReviewAt
         FROM users u
         JOIN reviews r ON r.user_id = u.id
        GROUP BY u.id, u.name
       HAVING COUNT(r.id) >= ?
        ORDER BY reviewCount DESC, lastReviewAt DESC
        LIMIT ?`,
      [minReviews, limit]
    );
    return rows;
  },

  // Business KPIs: conditional aggregation (SUM(CASE ...)) in one pass over bookings
  async bookingStats() {
    const [[summary]] = await pool.query(
      `SELECT COUNT(*) AS totalBookings,
              COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN total_amount END), 0) AS revenue,
              COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN seats END), 0) AS seatsSold,
              COALESCE(SUM(status = 'CANCELLED'), 0) AS cancelled
         FROM bookings`
    );

    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
              COUNT(*) AS bookings,
              COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN total_amount END), 0) AS revenue
         FROM bookings
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month`
    );

    const [topPackages] = await pool.query(
      `SELECT p.id, p.title, dest.name AS destination,
              SUM(b.seats) AS seatsSold,
              SUM(b.total_amount) AS revenue
         FROM bookings b
         JOIN package_departures d ON d.id = b.departure_id
         JOIN packages p           ON p.id = d.package_id
         JOIN destinations dest    ON dest.id = p.destination_id
        WHERE b.status = 'CONFIRMED'
        GROUP BY p.id, p.title, dest.name
        ORDER BY revenue DESC
        LIMIT 5`
    );

    return { summary, monthly, topPackages };
  },
};
