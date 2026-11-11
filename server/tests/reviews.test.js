import { describe, it, expect, beforeAll } from 'vitest';
import { api, pool, createUser } from './helpers.js';

const TAJ = { id: 3, slug: 'taj-mahal' }; // seeded with no reviews
let admin, alice, bob, aliceReviewId, bobReviewId;

beforeAll(async () => {
  [admin, alice, bob] = await Promise.all([
    createUser({ role: 'admin' }),
    createUser({ name: 'Alice' }),
    createUser({ name: 'Bob' }),
  ]);
});

const destination = async () => (await api().get(`/api/v1/destinations/${TAJ.slug}`)).body.data;

describe('Reviews', () => {
  it('recalculates avg_rating and review_count on create', async () => {
    const a = await api().post(`/api/v1/destinations/${TAJ.id}/reviews`).set(alice.auth).send({ rating: 5, comment: 'Stunning' });
    const b = await api().post(`/api/v1/destinations/${TAJ.id}/reviews`).set(bob.auth).send({ rating: 2 });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    aliceReviewId = a.body.data.id;
    bobReviewId = b.body.data.id;

    expect(await destination()).toMatchObject({ avgRating: 3.5, reviewCount: 2 });
  });

  it('allows only one review per user per destination (409)', async () => {
    const res = await api().post(`/api/v1/destinations/${TAJ.id}/reviews`).set(alice.auth).send({ rating: 4 });
    expect(res.status).toBe(409);
  });

  it('validates the rating range', async () => {
    const res = await api().post(`/api/v1/destinations/${TAJ.id}/reviews`).set(admin.auth).send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it('only the author can edit a review', async () => {
    expect((await api().patch(`/api/v1/reviews/${aliceReviewId}`).set(bob.auth).send({ rating: 1 })).status).toBe(403);

    const ok = await api().patch(`/api/v1/reviews/${aliceReviewId}`).set(alice.auth).send({ rating: 3 });
    expect(ok.status).toBe(200);
    expect((await destination()).avgRating).toBe(2.5);
  });

  it('an admin can moderate (delete) any review', async () => {
    expect((await api().delete(`/api/v1/reviews/${bobReviewId}`).set(alice.auth)).status).toBe(403);
    expect((await api().delete(`/api/v1/reviews/${bobReviewId}`).set(admin.auth)).status).toBe(204);
    expect(await destination()).toMatchObject({ avgRating: 3, reviewCount: 1 });
  });

  it('rating summary always has 5 buckets', async () => {
    const res = await api().get(`/api/v1/destinations/${TAJ.slug}/rating-summary`);
    expect(res.body.data.distribution.map((r) => r.star)).toEqual([5, 4, 3, 2, 1]);
    expect(res.body.data.total).toBe(1);
  });

  it('stays consistent when many users review at the same moment (row lock)', async () => {
    const users = [];
    for (let i = 0; i < 5; i++) users.push(await createUser());
    const BALI = 4;

    const results = await Promise.all(
      users.map((u, i) => api().post(`/api/v1/destinations/${BALI}/reviews`).set(u.auth).send({ rating: (i % 5) + 1 }))
    );
    expect(results.every((r) => r.status === 201)).toBe(true);

    const [[stored]] = await pool.query('SELECT avg_rating, review_count FROM destinations WHERE id = ?', [BALI]);
    const [[actual]] = await pool.query('SELECT ROUND(AVG(rating), 2) AS avg, COUNT(*) AS cnt FROM reviews WHERE destination_id = ?', [BALI]);
    expect(stored.review_count).toBe(actual.cnt);
    expect(Number(stored.avg_rating)).toBe(Number(actual.avg));
  });
});
