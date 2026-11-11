import { z } from 'zod';

const uniqueIds = (ids) => [...new Set(ids)];

export const createDestinationSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().min(20).max(5000),
  countryId: z.number().int().positive(),
  city: z.string().trim().min(2).max(100),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  bestTimeToVisit: z.string().trim().max(100).optional(),
  categoryIds: z.array(z.number().int().positive()).min(1).max(5).transform(uniqueIds),
  images: z
    .array(
      z.object({
        url: z.string().url().max(500),
        isPrimary: z.boolean().optional(),
      })
    )
    .max(10)
    .optional(),
});

// PATCH: every field optional, but at least one required. Images are managed separately (Step 12)
export const updateDestinationSchema = createDestinationSchema
  .omit({ images: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const slugParamSchema = z.object({
  slug: z.string().max(170).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ---------- Search (Step 8) ----------
export const SORT_VALUES = ['newest', 'rating', 'popular', 'name'];

export const searchQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    country: z.string().trim().toUpperCase().length(2, 'Use a 2-letter ISO code like IN').optional(),
    category: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) =>
        value
          ? value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 5)
          : undefined
      ),
    minRating: z.coerce.number().min(0).max(5).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().positive().optional(),
    sort: z.enum(SORT_VALUES).default('newest'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    cursor: z.string().max(500).optional(),
  })
  .refine(
    (d) => d.minPrice === undefined || d.maxPrice === undefined || d.minPrice <= d.maxPrice,
    { message: 'minPrice must be less than or equal to maxPrice', path: ['minPrice'] }
  );