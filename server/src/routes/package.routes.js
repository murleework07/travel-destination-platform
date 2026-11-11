import { Router } from 'express';
import { packageController } from '../controllers/package.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/destination.validator.js';

const router = Router();

router.get('/:id', validate({ params: idParamSchema }), packageController.getById);

export default router;