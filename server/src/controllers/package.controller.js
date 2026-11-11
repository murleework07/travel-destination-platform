import { packageService } from '../services/package.service.js';

export const packageController = {
  async getById(req, res) {
    const data = await packageService.getById(req.validated.params.id);
    res.json({ success: true, data });
  },
};