import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { loginLimiter, registerLimiter, refreshLimiter } from '../middlewares/rateLimit.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/register', registerLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;