-- =====================================================
-- Sample data for development. Clears tables first.
-- =====================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE bookings;
TRUNCATE TABLE package_departures;
TRUNCATE TABLE packages;
TRUNCATE TABLE wishlists;
TRUNCATE TABLE reviews;
TRUNCATE TABLE destination_images;
TRUNCATE TABLE destination_categories;
TRUNCATE TABLE destinations;
TRUNCATE TABLE categories;
TRUNCATE TABLE countries;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO countries (id, name, iso_code, continent) VALUES
  (1, 'India', 'IN', 'Asia'),
  (2, 'Indonesia', 'ID', 'Asia'),
  (3, 'France', 'FR', 'Europe'),
  (4, 'Japan', 'JP', 'Asia'),
  (5, 'Switzerland', 'CH', 'Europe'),
  (6, 'United Arab Emirates', 'AE', 'Asia');

INSERT INTO categories (id, name, slug) VALUES
  (1, 'Beach', 'beach'),
  (2, 'Mountain', 'mountain'),
  (3, 'Heritage', 'heritage'),
  (4, 'Adventure', 'adventure'),
  (5, 'City', 'city'),
  (6, 'Nature', 'nature');

INSERT INTO destinations
  (id, name, slug, description, country_id, city, latitude, longitude, best_time_to_visit) VALUES
  (1, 'Goa', 'goa',
   'Golden beaches, Portuguese heritage, seafood shacks and vibrant nightlife on the Arabian Sea coast.',
   1, 'Panaji', 15.299300, 74.124000, 'November to February'),
  (2, 'Manali', 'manali',
   'Snow-capped Himalayan peaks, paragliding in Solang Valley and the road trip to Rohtang Pass.',
   1, 'Manali', 32.243200, 77.189200, 'October to June'),
  (3, 'Taj Mahal', 'taj-mahal',
   'The white marble mausoleum in Agra, a UNESCO World Heritage Site and one of the wonders of the world.',
   1, 'Agra', 27.175100, 78.042100, 'October to March'),
  (4, 'Bali', 'bali',
   'Tropical island of rice terraces, temples, surfing beaches and lush jungle waterfalls.',
   2, 'Denpasar', -8.340500, 115.092000, 'April to October'),
  (5, 'Paris', 'paris',
   'The city of lights with the Eiffel Tower, the Louvre museum, cafes and riverside walks on the Seine.',
   3, 'Paris', 48.856600, 2.352200, 'April to June'),
  (6, 'Kyoto', 'kyoto',
   'Ancient temples, Shinto shrines, bamboo forests and cherry blossom season in the old capital of Japan.',
   4, 'Kyoto', 35.011600, 135.768100, 'March to May'),
  (7, 'Interlaken', 'interlaken',
   'Adventure hub of the Swiss Alps between two lakes, famous for skydiving, hiking and Jungfrau views.',
   5, 'Interlaken', 46.686300, 7.863200, 'June to September'),
  (8, 'Dubai', 'dubai',
   'Futuristic city with the Burj Khalifa, desert safaris, luxury shopping and modern beaches.',
   6, 'Dubai', 25.204800, 55.270800, 'November to March');

INSERT INTO destination_categories (destination_id, category_id) VALUES
  (1, 1), (1, 6),
  (2, 2), (2, 4),
  (3, 3),
  (4, 1), (4, 6),
  (5, 5), (5, 3),
  (6, 3), (6, 5),
  (7, 2), (7, 4),
  (8, 5), (8, 4);

INSERT INTO destination_images (destination_id, url, is_primary) VALUES
  (1, 'https://picsum.photos/seed/goa/800/600', TRUE),
  (1, 'https://picsum.photos/seed/goa2/800/600', FALSE),
  (2, 'https://picsum.photos/seed/manali/800/600', TRUE),
  (3, 'https://picsum.photos/seed/tajmahal/800/600', TRUE),
  (4, 'https://picsum.photos/seed/bali/800/600', TRUE),
  (5, 'https://picsum.photos/seed/paris/800/600', TRUE),
  (6, 'https://picsum.photos/seed/kyoto/800/600', TRUE),
  (7, 'https://picsum.photos/seed/interlaken/800/600', TRUE),
  (8, 'https://picsum.photos/seed/dubai/800/600', TRUE);

INSERT INTO packages (id, destination_id, title, description, duration_days, price) VALUES
  (1, 1, 'Goa Beach Escape', 'Beach resort stay with North and South Goa tours.', 4, 15999.00),
  (2, 2, 'Manali Snow Adventure', 'Solang Valley, Rohtang Pass and river rafting.', 6, 24999.00),
  (3, 4, 'Bali Island Explorer', 'Ubud rice terraces, temples and a beach villa.', 5, 54999.00),
  (4, 5, 'Paris Classic', 'Eiffel Tower, Louvre and a Seine river cruise.', 7, 149999.00);

INSERT INTO package_departures (package_id, departure_date, total_seats) VALUES
  (1, '2026-12-20', 20),
  (1, '2027-01-15', 20),
  (2, '2027-01-10', 15),
  (3, '2027-02-05', 12),
  (4, '2027-04-12', 10);