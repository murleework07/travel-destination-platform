import { z } from 'zod';

export const topRatedQuerySchema = z.object({
  minVotes: z.coerce.number().int().min(1).max(100).default(3),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const topReviewersQuerySchema = z.object({
  minReviews: z.coerce.number().int().min(1).max(1000).default(2),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});