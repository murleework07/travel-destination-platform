import { Router } from 'express';
import { reviewController } from '../controllers/review.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/destination.validator.js';
import { updateReviewSchema } from '../validators/review.validator.js';

const router = Router();

router.patch(
  '/:id',
  authenticate,
  validate({ params: idParamSchema, body: updateReviewSchema }),
  reviewController.update
);
router.delete('/:id', authenticate, validate({ params: idParamSchema }), reviewController.remove);

export default router;