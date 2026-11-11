-- =====================================================
-- Travel Destination Platform - Database Schema
-- WARNING: This file DROPS and recreates all tables.
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS bookings, package_departures, packages, wishlists, reviews,
  destination_images, destination_categories, destinations, categories,
  countries, refresh_tokens, users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token_hash (token_hash),
  KEY idx_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE countries (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  iso_code   CHAR(2) NOT NULL,
  continent  VARCHAR(50) NOT NULL,
  UNIQUE KEY uq_country_name (name),
  UNIQUE KEY uq_country_iso (iso_code)
) ENGINE=InnoDB;

CREATE TABLE categories (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(50) NOT NULL,
  slug  VARCHAR(60) NOT NULL,
  UNIQUE KEY uq_category_name (name),
  UNIQUE KEY uq_category_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE destinations (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name               VARCHAR(150) NOT NULL,
  slug               VARCHAR(170) NOT NULL,
  description        TEXT NOT NULL,
  country_id         INT UNSIGNED NOT NULL,
  city               VARCHAR(100) NOT NULL,
  latitude           DECIMAL(9,6) NULL,
  longitude          DECIMAL(9,6) NULL,
  best_time_to_visit VARCHAR(100) NULL,
  avg_rating         DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count       INT UNSIGNED NOT NULL DEFAULT 0,
  created_by         BIGINT UNSIGNED NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at         DATETIME NULL,
  UNIQUE KEY uq_destination_slug (slug),
  KEY idx_dest_country (country_id),
  KEY idx_dest_rating (avg_rating),
  KEY idx_dest_created (created_at),
  KEY idx_dest_reviews (review_count),
  KEY idx_dest_name (name),
  FULLTEXT KEY ft_dest_search (name, description),
  CONSTRAINT fk_dest_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dest_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_dest_rating CHECK (avg_rating BETWEEN 0 AND 5)
) ENGINE=InnoDB;

CREATE TABLE destination_categories (
  destination_id BIGINT UNSIGNED NOT NULL,
  category_id    INT UNSIGNED NOT NULL,
  PRIMARY KEY (destination_id, category_id),
  KEY idx_dc_category (category_id),
  CONSTRAINT fk_dc_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  CONSTRAINT fk_dc_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE destination_images (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  destination_id BIGINT UNSIGNED NOT NULL,
  url            VARCHAR(500) NOT NULL,
  public_id      VARCHAR(255) NULL,
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_img_dest (destination_id),
  CONSTRAINT fk_img_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL,
  destination_id BIGINT UNSIGNED NOT NULL,
  rating         TINYINT UNSIGNED NOT NULL,
  comment        TEXT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review_user_dest (user_id, destination_id),
  KEY idx_review_dest_created (destination_id, created_at),
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE wishlists (
  user_id        BIGINT UNSIGNED NOT NULL,
  destination_id BIGINT UNSIGNED NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, destination_id),
  KEY idx_wish_dest (destination_id),
  CONSTRAINT fk_wish_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wish_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE packages (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  destination_id BIGINT UNSIGNED NOT NULL,
  title          VARCHAR(150) NOT NULL,
  description    TEXT NULL,
  duration_days  SMALLINT UNSIGNED NOT NULL,
  price          DECIMAL(10,2) NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pkg_dest (destination_id),
  KEY idx_pkg_price (price),
  CONSTRAINT fk_pkg_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  CONSTRAINT chk_pkg_price CHECK (price > 0),
  CONSTRAINT chk_pkg_days CHECK (duration_days > 0)
) ENGINE=InnoDB;

CREATE TABLE package_departures (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  package_id     BIGINT UNSIGNED NOT NULL,
  departure_date DATE NOT NULL,
  total_seats    SMALLINT UNSIGNED NOT NULL,
  booked_seats   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_pkg_date (package_id, departure_date),
  CONSTRAINT fk_dep_pkg FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  CONSTRAINT chk_seats CHECK (booked_seats <= total_seats)
) ENGINE=InnoDB;

CREATE TABLE bookings (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  departure_id    BIGINT UNSIGNED NOT NULL,
  seats           SMALLINT UNSIGNED NOT NULL,
  total_amount    DECIMAL(12,2) NOT NULL,
  status          ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  idempotency_key VARCHAR(64) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_booking_user (user_id, created_at),
  KEY idx_booking_departure (departure_id),
  UNIQUE KEY uq_booking_idem (user_id, idempotency_key),
  CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_dep FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE RESTRICT,
  CONSTRAINT chk_booking_seats CHECK (seats > 0)
) ENGINE=InnoDB;
