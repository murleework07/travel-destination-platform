import { describe, it, expect } from 'vitest';
import { api } from './helpers.js';

describe('Health & platform', () => {
  it('reports database up (cache down in tests = degraded but 200)', async () => {
    const res = await api().get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ database: 'up', cache: 'down', status: 'degraded' });
  });

  it('returns JSON 404 with a request id for unknown routes', async () => {
    const res = await api().get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.requestId).toBeTypeOf('string');
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
  });

  it('sets security headers and hides the framework', async () => {
    const res = await api().get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid JSON/i);
  });
});
