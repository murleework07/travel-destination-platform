import { describe, it, expect } from 'vitest';
import { api, pool, PASSWORD, refreshCookieOf } from './helpers.js';

const email = `auth_${Date.now()}@test.com`;

describe('Auth', () => {
  it('registers a user and sets a secure httpOnly refresh cookie', async () => {
    const res = await api().post('/api/v1/auth/register').send({ name: 'Auth Tester', email, password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.user).toMatchObject({ email, role: 'user' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('stores only a bcrypt hash, never the plain password', async () => {
    const [[row]] = await pool.query('SELECT password_hash FROM users WHERE email = ?', [email]);
    expect(row.password_hash).toMatch(/^\$2[aby]\$12\$/);
    expect(row.password_hash).not.toContain(PASSWORD);
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await api().post('/api/v1/auth/register').send({ name: 'Again', email, password: PASSWORD });
    expect(res.status).toBe(409);
  });

  it('rejects a weak password with field-level details', async () => {
    const res = await api().post('/api/v1/auth/register').send({ name: 'Weak', email: 'weak@test.com', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'password')).toBe(true);
  });

  it('gives the same error for wrong password and unknown email (no user enumeration)', async () => {
    const wrongPassword = await api().post('/api/v1/auth/login').send({ email, password: 'Wrong1234' });
    const unknownEmail = await api().post('/api/v1/auth/login').send({ email: 'ghost@test.com', password: 'Wrong1234' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('protects /me: 401 without token, 401 with tampered token, 200 with valid token', async () => {
    const login = await api().post('/api/v1/auth/login').send({ email, password: PASSWORD });
    const token = login.body.data.accessToken;

    expect((await api().get('/api/v1/auth/me')).status).toBe(401);

    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    const bad = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${tampered}`);
    expect(bad.status).toBe(401);

    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
  });

  it('rotates refresh tokens and revokes ALL sessions when an old token is reused', async () => {
    const login = await api().post('/api/v1/auth/login').send({ email, password: PASSWORD });
    const oldCookie = refreshCookieOf(login);

    const first = await api().post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    expect(first.status).toBe(200);
    const newCookie = refreshCookieOf(first);
    expect(newCookie).not.toBe(oldCookie);

    // Attacker replays the old (already used) token
    const replay = await api().post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    expect(replay.status).toBe(401);
    expect(replay.body.message).toMatch(/reuse/i);

    // Even the legitimate new token is now revoked
    const afterTheft = await api().post('/api/v1/auth/refresh').set('Cookie', newCookie);
    expect(afterTheft.status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const login = await api().post('/api/v1/auth/login').send({ email, password: PASSWORD });
    const cookie = refreshCookieOf(login);

    expect((await api().post('/api/v1/auth/logout').set('Cookie', cookie)).status).toBe(204);
    expect((await api().post('/api/v1/auth/refresh').set('Cookie', cookie)).status).toBe(401);
  });
});
