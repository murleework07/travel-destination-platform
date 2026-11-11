import { reviewRepository as repo } from '../repositories/review.repository.js';
import { withTransaction } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';

const CURSOR_KIND = 'reviews';

async function getReviewOr404(id) {
  const review = await repo.findById(id);
  if (!review) throw ApiError.notFound(`Review with id ${id} not found`);
  return review;
}

async function getDestinationIdOr404(slug) {
  const id = await repo.findDestinationIdBySlug(slug);
  if (!id) throw ApiError.notFound(`Destination '${slug}' not found`);
  return id;
}

export const reviewService = {
  async create(userId, destinationId, input) {
    return withTransaction(async (conn) => {
      const destination = await repo.lockDestination(destinationId, conn);
      if (!destination) throw ApiError.notFound(`Destination with id ${destinationId} not found`);

      let reviewId;
      try {
        reviewId = await repo.create({ userId, destinationId, ...input }, conn);
      } catch (err) {
        // The UNIQUE (user_id, destination_id) constraint enforces one review per user
        if (err.code === 'ER_DUP_ENTRY') {
          throw ApiError.conflict('You have already reviewed this destination');
        }
        throw err;
      }

      await repo.recalculateDestinationRating(destinationId, conn);
      return repo.findById(reviewId, conn);
    });
  },

  async update(actor, reviewId, input) {
    const review = await getReviewOr404(reviewId);

    // OWNERSHIP check: even admins can't rewrite someone else's words
    if (review.userId !== actor.id) {
      throw ApiError.forbidden('You can only edit your own review');
    }

    return withTransaction(async (conn) => {
      await repo.lockDestination(review.destinationId, conn);
      await repo.update(reviewId, input, conn);
      await repo.recalculateDestinationRating(review.destinationId, conn);
      return repo.findById(reviewId, conn);
    });
  },

  async remove(actor, reviewId) {
    const review = await getReviewOr404(reviewId);

    // Author can delete their own; admin can delete any (moderation)
    if (review.userId !== actor.id && actor.role !== 'admin') {
      throw ApiError.forbidden('You can only delete your own review');
    }

    await withTransaction(async (conn) => {
      await repo.lockDestination(review.destinationId, conn);
      await repo.delete(reviewId, conn);
      await repo.recalculateDestinationRating(review.destinationId, conn);
    });
  },

  async listForDestination(slug, { limit, cursor: rawCursor }) {
    const destinationId = await getDestinationIdOr404(slug);

    let cursor = null;
    if (rawCursor) {
      cursor = decodeCursor(rawCursor);
      if (cursor.s !== CURSOR_KIND) throw ApiError.badRequest('Invalid cursor');
    }

    const rows = await repo.listByDestination({ destinationId, limit, cursor });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items.at(-1);

    return {
      items,
      meta: {
        limit,
        hasMore,
        nextCursor: hasMore ? encodeCursor({ s: CURSOR_KIND, v: last.createdAt, id: last.id }) : null,
      },
    };
  },

  async ratingSummary(slug) {
    const destinationId = await getDestinationIdOr404(slug);
    const distribution = await repo.ratingDistribution(destinationId);

    const total = distribution.reduce((sum, row) => sum + row.count, 0);
    const average = total
      ? Number((distribution.reduce((sum, row) => sum + row.star * row.count, 0) / total).toFixed(2))
      : 0;

    return {
      average,
      total,
      distribution: distribution.map((row) => ({
        star: row.star,
        count: row.count,
        percent: total ? Math.round((row.count / total) * 100) : 0,
      })),
    };
  },
};