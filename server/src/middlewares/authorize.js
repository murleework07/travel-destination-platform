import { ApiError } from '../utils/ApiError.js';

/**
 * Usage: router.post('/', authenticate, authorize('admin'), handler)
 * Must run AFTER authenticate (which sets req.user).
 */
export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};