import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ISSUER = 'travel-platform';

// Short-lived JWT holding the user id (sub) and role
export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.jwt.accessSecret, {
    subject: String(user.id),
    expiresIn: env.jwt.accessExpiresIn,
    issuer: ISSUER,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token) {
  // Pinning the algorithm blocks "alg: none" style attacks
  return jwt.verify(token, env.jwt.accessSecret, {
    issuer: ISSUER,
    algorithms: ['HS256'],
  });
}

// Refresh token = 96 random hex characters (not a JWT)
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

// Only the SHA-256 hash is stored in the DB (64 hex chars = CHAR(64))
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}