import { Router } from 'express';
import { destinationController } from '../controllers/destination.controller.js';
import { reviewController } from '../controllers/review.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import {
  createDestinationSchema,
  updateDestinationSchema,
  idParamSchema,
  slugParamSchema,
  searchQuerySchema,
} from '../validators/destination.validator.js';
import { createReviewSchema, reviewListQuerySchema } from '../validators/review.validator.js';

const router = Router();
const adminOnly = [authenticate, authorize('admin')];

// ---------- Public ----------
router.get('/', validate({ query: searchQuerySchema }), destinationController.list);
router.get('/:slug', validate({ params: slugParamSchema }), destinationController.getBySlug);
router.get(
  '/:slug/reviews',
  validate({ params: slugParamSchema, query: reviewListQuerySchema }),
  reviewController.listForDestination
);
router.get(
  '/:slug/rating-summary',
  validate({ params: slugParamSchema }),
  reviewController.ratingSummary
);

// ---------- Logged-in users ----------
router.post(
  '/:id/reviews',
  authenticate,
  validate({ params: idParamSchema, body: createReviewSchema }),
  reviewController.create
);

// ---------- Admin only ----------
router.post('/', ...adminOnly, validate({ body: createDestinationSchema }), destinationController.create);
router.patch(
  '/:id',
  ...adminOnly,
  validate({ params: idParamSchema, body: updateDestinationSchema }),
  destinationController.update
);
router.delete('/:id', ...adminOnly, validate({ params: idParamSchema }), destinationController.remove);

export default router;