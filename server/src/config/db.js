import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: 'Z',
});

export async function testConnection() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
}

/**
 * Runs `work(conn)` inside a transaction.
 * If anything throws, every query is rolled back.
 */
export async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release(); // always return the connection to the pool
  }
}