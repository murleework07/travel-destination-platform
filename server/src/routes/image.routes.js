import { Router } from 'express';
import { z } from 'zod';
import { imageController } from '../controllers/image.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { uploadImages } from '../middlewares/upload.js';

// mergeParams: read :id from the parent path /destinations/:id/images
const router = Router({ mergeParams: true });

const idParams = z.object({ id: z.coerce.number().int().positive() });
const imageParams = idParams.extend({ imageId: z.coerce.number().int().positive() });

router.use(authenticate, authorize('admin')); // check permission BEFORE accepting files

router.post('/', uploadImages, validate({ params: idParams }), imageController.upload);
router.delete('/:imageId', validate({ params: imageParams }), imageController.remove);

export default router;