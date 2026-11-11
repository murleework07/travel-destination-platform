import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/destination.validator.js';
import { createBookingSchema, myBookingsQuerySchema } from '../validators/booking.validator.js';

const router = Router();

router.use(authenticate); // every booking route needs login

router.post('/', validate({ body: createBookingSchema }), bookingController.create);
router.get('/me', validate({ query: myBookingsQuerySchema }), bookingController.listMine); // before /:id
router.get('/:id', validate({ params: idParamSchema }), bookingController.getById);
router.post('/:id/cancel', validate({ params: idParamSchema }), bookingController.cancel);

export default router;