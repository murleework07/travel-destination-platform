import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';

// Protects a route: requires "Authorization: Bearer <accessToken>"
export function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Access token missing'));
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    next(ApiError.unauthorized(message));
  }
}