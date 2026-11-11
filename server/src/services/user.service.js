import { userRepository as userRepo } from '../repositories/user.repository.js';
import { refreshTokenRepository as tokenRepo } from '../repositories/refreshToken.repository.js';
import { ApiError } from '../utils/ApiError.js';

export const userService = {
  async list({ page, limit }) {
    const offset = (page - 1) * limit;
    const [items, total] = await Promise.all([
      userRepo.findAll({ limit, offset }),
      userRepo.countAll(),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async changeRole({ actorId, targetId, role }) {
    // Prevents the last admin from accidentally locking everyone out
    if (actorId === targetId && role !== 'admin') {
      throw ApiError.badRequest('You cannot remove your own admin role');
    }

    const affected = await userRepo.updateRole(targetId, role);
    if (affected === 0) {
      throw ApiError.notFound(`User with id ${targetId} not found`);
    }

    // Force the user to log in again so their new role is in a fresh token
    await tokenRepo.revokeAllForUser(targetId);

    return userRepo.findById(targetId);
  },
};