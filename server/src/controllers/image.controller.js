import { imageService } from '../services/image.service.js';
import { invalidateNamespace } from '../utils/cache.js';

export const imageController = {
  async upload(req, res) {
    const data = await imageService.upload(req.validated.params.id, req.files);
    await invalidateNamespace('destinations');
    res.status(201).json({ success: true, data });
  },

  async remove(req, res) {
    await imageService.remove(req.validated.params.id, req.validated.params.imageId);
    await invalidateNamespace('destinations');
    res.status(204).send();
  },
};