import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/destination.validator.js';
import { listUsersQuerySchema, updateRoleSchema } from '../validators/user.validator.js';

const router = Router();

// Every route in this file is admin-only
router.use(authenticate, authorize('admin'));

router.get('/', validate({ query: listUsersQuerySchema }), userController.list);
router.patch(
  '/:id/role',
  validate({ params: idParamSchema, body: updateRoleSchema }),
  userController.changeRole
);

export default router;