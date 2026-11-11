import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/config/db.js';

export const api = () => request(app);
export { pool };

let counter = 0;
export const PASSWORD = 'Travel123';

// Creates a fresh user (optionally admin) and returns its token + auth header
export async function createUser({ role = 'user', name = 'Test User' } = {}) {
  const email = `user${Date.now()}_${++counter}@test.com`;
  const res = await api().post('/api/v1/auth/register').send({ name, email, password: PASSWORD });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);

  const id = res.body.data.user.id;
  let token = res.body.data.accessToken;

  if (role === 'admin') {
    await pool.query("UPDATE users SET role = 'admin' WHERE id = ?", [id]);
    const login = await api().post('/api/v1/auth/login').send({ email, password: PASSWORD });
    token = login.body.data.accessToken; // new token carries role=admin
  }

  return { id, email, token, auth: { Authorization: `Bearer ${token}` } };
}

// "refreshToken=abc123" from a response's Set-Cookie header
export function refreshCookieOf(res) {
  const cookie = (res.headers['set-cookie'] || []).find((c) => c.startsWith('refreshToken='));
  return cookie?.split(';')[0];
}
