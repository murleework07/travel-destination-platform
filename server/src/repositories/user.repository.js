import { pool } from '../config/db.js';

export const userRepository = {
  // Includes the password hash; only used for login
  async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, password_hash AS passwordHash
         FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  // Safe public fields only
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, created_at AS createdAt
         FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, email, passwordHash }) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );
    return result.insertId;
  },

  async findAll({ limit, offset }) {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, created_at AS createdAt
         FROM users
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  },

  async countAll() {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
    return total;
  },

  async updateRole(id, role) {
    const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return result.affectedRows;
  },
};