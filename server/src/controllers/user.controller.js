import { userService } from '../services/user.service.js';

export const userController = {
  async list(req, res) {
    const { items, meta } = await userService.list(req.validated.query);
    res.json({ success: true, data: items, meta });
  },

  async changeRole(req, res) {
    const data = await userService.changeRole({
      actorId: req.user.id,
      targetId: req.validated.params.id,
      role: req.validated.body.role,
    });
    res.json({ success: true, data });
  },
};