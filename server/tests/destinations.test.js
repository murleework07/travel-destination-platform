import { describe, it, expect, beforeAll } from 'vitest';
import { api, pool, createUser } from './helpers.js';

let admin;
let user;

beforeAll(async () => {
  admin = await createUser({ role: 'admin' });
  user = await createUser();
});

const newDestination = {
  name: 'Test Valley',
  description: 'A quiet valley used only by the automated test suite.',
  countryId: 1,
  city: 'Testpur',
  categoryIds: [2, 6],
};

describe('Destinations: search', () => {
  it('lists destinations with cursor metadata', async () => {
    const res = await api().get('/api/v1/destinations?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toMatchObject({ limit: 5, hasMore: true });
    expect(res.body.meta.nextCursor).toBeTypeOf('string');
  });

  it('full-text search finds beach destinations', async () => {
    const res = await api().get('/api/v1/destinations?q=beach');
    const slugs = res.body.data.map((d) => d.slug);
    expect(slugs).toEqual(expect.arrayContaining(['goa', 'bali']));
  });

  it('combines country and category filters', async () => {
    const res = await api().get('/api/v1/destinations?country=IN&category=mountain');
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((d) => d.countryCode === 'IN')).toBe(true);
    expect(res.body.data.map((d) => d.slug)).toContain('manali');
  });

  it('cursor pagination visits every destination exactly once', async () => {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM destinations WHERE deleted_at IS NULL');
    const seen = [];
    let cursor;

    do {
      const res = await api()
        .get('/api/v1/destinations')
        .query({ sort: 'name', limit: 3, ...(cursor && { cursor }) });
      expect(res.status).toBe(200);
      seen.push(...res.body.data.map((d) => d.id));
      cursor = res.body.meta.nextCursor;
    } while (cursor);

    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total); // no duplicates
  });

  it.each([
    ['limit=500', 'limit too large'],
    ['sort=price', 'unknown sort'],
    ['cursor=garbage', 'invalid cursor'],
    ['minPrice=500&maxPrice=100', 'min > max'],
  ])('rejects %s (%s) with 400', async (query) => {
    const res = await api().get(`/api/v1/destinations?${query}`);
    expect(res.status).toBe(400);
  });
});

describe('Destinations: details', () => {
  it('returns a destination with country, categories and packages', async () => {
    const res = await api().get('/api/v1/destinations/goa');
    expect(res.status).toBe(200);
    expect(res.body.data.country.isoCode).toBe('IN');
    expect(res.body.data.categories.length).toBeGreaterThan(0);
    expect(res.body.data.packages.length).toBeGreaterThan(0);
  });

  it('returns 404 for an unknown slug', async () => {
    expect((await api().get('/api/v1/destinations/atlantis')).status).toBe(404);
  });
});

describe('Destinations: admin writes (RBAC)', () => {
  it('requires authentication (401) and the admin role (403)', async () => {
    expect((await api().post('/api/v1/destinations').send(newDestination)).status).toBe(401);
    expect((await api().post('/api/v1/destinations').set(user.auth).send(newDestination)).status).toBe(403);
  });

  it('lets an admin create, generating unique slugs', async () => {
    const first = await api().post('/api/v1/destinations').set(admin.auth).send(newDestination);
    expect(first.status).toBe(201);
    expect(first.body.data.slug).toBe('test-valley');
    expect(first.headers.location).toBe('/api/v1/destinations/test-valley');

    const second = await api().post('/api/v1/destinations').set(admin.auth).send(newDestination);
    expect(second.body.data.slug).toBe('test-valley-2');
  });

  it('validates input and references', async () => {
    const invalid = await api().post('/api/v1/destinations').set(admin.auth).send({ name: 'X' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.details.length).toBeGreaterThan(1);

    const badCountry = await api().post('/api/v1/destinations').set(admin.auth).send({ ...newDestination, countryId: 999 });
    expect(badCountry.status).toBe(400);
    expect(badCountry.body.message).toMatch(/country/i);
  });

  it('updates partially and soft-deletes', async () => {
    const created = await api().post('/api/v1/destinations').set(admin.auth).send({ ...newDestination, name: 'Delete Me Valley' });
    const { id, slug } = created.body.data;

    const patched = await api().patch(`/api/v1/destinations/${id}`).set(admin.auth).send({ bestTimeToVisit: 'Always' });
    expect(patched.status).toBe(200);
    expect(patched.body.data.bestTimeToVisit).toBe('Always');
    expect(patched.body.data.name).toBe('Delete Me Valley'); // untouched

    expect((await api().delete(`/api/v1/destinations/${id}`).set(admin.auth)).status).toBe(204);
    expect((await api().get(`/api/v1/destinations/${slug}`)).status).toBe(404);

    const [[row]] = await pool.query('SELECT deleted_at FROM destinations WHERE id = ?', [id]);
    expect(row.deleted_at).not.toBeNull(); // row still exists (soft delete)
  });
});
