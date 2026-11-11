import { describe, it, expect } from 'vitest';
import { slugify } from '../../src/utils/slugify.js';
import { encodeCursor, decodeCursor } from '../../src/utils/cursor.js';
import { searchQuerySchema } from '../../src/validators/destination.validator.js';
import { registerSchema } from '../../src/validators/auth.validator.js';

describe('slugify', () => {
  it.each([
    ['Kerala Backwaters', 'kerala-backwaters'],
    ['  Café   de Flore!! ', 'cafe-de-flore'],
    ['Taj_Mahal -- Agra', 'taj-mahal-agra'],
    ['***', ''],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('cursor', () => {
  it('round-trips data', () => {
    const data = { s: 'rating', v: 4.5, id: 12 };
    expect(decodeCursor(encodeCursor(data))).toEqual(data);
  });

  it('rejects garbage with a 400 error', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('validators', () => {
  it('splits and normalizes categories, applies defaults', () => {
    const parsed = searchQuerySchema.parse({ category: 'Beach, NATURE', country: 'in' });
    expect(parsed).toMatchObject({ category: ['beach', 'nature'], country: 'IN', sort: 'newest', limit: 10 });
  });

  it('rejects minPrice greater than maxPrice', () => {
    expect(searchQuerySchema.safeParse({ minPrice: '500', maxPrice: '100' }).success).toBe(false);
  });

  it('normalizes email and enforces password rules', () => {
    expect(registerSchema.parse({ name: 'Ann', email: '  ANN@Test.COM ', password: 'abcd1234' }).email)
      .toBe('ann@test.com');
    expect(registerSchema.safeParse({ name: 'Ann', email: 'a@b.co', password: 'abcdefgh' }).success).toBe(false);
  });
});
