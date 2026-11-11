-- =====================================================
-- Sample users + reviews for testing (safe to re-run)
-- All test users have the password: Travel123
-- =====================================================

INSERT IGNORE INTO users (name, email, password_hash)
SELECT v.name, v.email, src.password_hash
  FROM (SELECT 'Asha Rao' AS name, 'asha@test.com' AS email
        UNION ALL SELECT 'Rahul Mehta', 'rahul@test.com'
        UNION ALL SELECT 'Priya Nair', 'priya@test.com'
        UNION ALL SELECT 'Arjun Singh', 'arjun@test.com'
        UNION ALL SELECT 'Neha Kapoor', 'neha@test.com') AS v
 CROSS JOIN (SELECT password_hash FROM users WHERE email = 'murlee@test.com') AS src;

-- Each test user reviews most destinations; ratings 2..5, deterministic
INSERT IGNORE INTO reviews (user_id, destination_id, rating, comment)
SELECT u.id,
       d.id,
       2 + ((u.id * 7 + d.id * 3) % 4),
       CONCAT('Visited ', d.name, '. Shared by ', u.name, '.')
  FROM users u
 CROSS JOIN destinations d
 WHERE u.email IN ('asha@test.com', 'rahul@test.com', 'priya@test.com',
                   'arjun@test.com', 'neha@test.com')
   AND d.deleted_at IS NULL
   AND (u.id + d.id) % 4 <> 0;

-- Recalculate denormalized columns for ALL destinations in one statement
UPDATE destinations d
   SET avg_rating   = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.destination_id = d.id), 0),
       review_count = (SELECT COUNT(*) FROM reviews r WHERE r.destination_id = d.id);