import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { topRatedQuerySchema, topReviewersQuerySchema } from '../validators/report.validator.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/top-rated', validate({ query: topRatedQuerySchema }), reportController.topRated);
router.get('/country-stats', reportController.countryStats);
router.get('/best-per-country', reportController.bestPerCountry);
router.get('/top-reviewers', validate({ query: topReviewersQuerySchema }), reportController.topReviewers);
router.get('/bookings', reportController.bookingStats);

export default router;
