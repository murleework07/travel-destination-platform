import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export const updateReviewSchema = createReviewSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide rating or comment to update',
  });

export const reviewListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().max(500).optional(),
});