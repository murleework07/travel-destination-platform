import bcrypt from 'bcryptjs';
import { userRepository as userRepo } from '../repositories/user.repository.js';
import { refreshTokenRepository as tokenRepo } from '../repositories/refreshToken.repository.js';
import { withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from '../utils/tokens.js';

const BCRYPT_ROUNDS = 12;

// Used when the email doesn't exist, so login takes the same time either way
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

const toPublicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

async function issueTokens(user, conn) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);

  await tokenRepo.create({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt }, conn);

  return { accessToken, refreshToken };
}

export const authService = {
  async register({ name, email, password }) {
    if (await userRepo.findByEmail(email)) {
      throw ApiError.conflict('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = await userRepo.create({ name, email, passwordHash });

    const user = { id, name, email, role: 'user' };
    const tokens = await issueTokens(user);
    return { user, ...tokens };
  },

  async login({ email, password }) {
    const user = await userRepo.findByEmail(email);
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordOk) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async refresh(rawToken) {
    if (!rawToken) throw ApiError.unauthorized('Refresh token missing');

    const stored = await tokenRepo.findByHash(hashToken(rawToken));
    if (!stored) throw ApiError.unauthorized('Invalid refresh token');

    // Reuse detection: a revoked token used again = probably stolen
    if (stored.revokedAt) {
      await tokenRepo.revokeAllForUser(stored.userId);
      throw ApiError.unauthorized('Refresh token reuse detected. Please log in again.');
    }

    if (new Date(stored.expiresAt) < new Date()) {
      throw ApiError.unauthorized('Refresh token expired. Please log in again.');
    }

    const user = await userRepo.findById(stored.userId);
    if (!user) throw ApiError.unauthorized('User no longer exists');

    // Rotation: revoke the old token and issue a new one, atomically
    return withTransaction(async (conn) => {
      const revoked = await tokenRepo.revoke(stored.id, conn);
      if (revoked === 0) {
        throw ApiError.unauthorized('Refresh token already used');
      }
      const tokens = await issueTokens(user, conn);
      return { user: toPublicUser(user), ...tokens };
    });
  },

  async logout(rawToken) {
    if (!rawToken) return;
    const stored = await tokenRepo.findByHash(hashToken(rawToken));
    if (stored) await tokenRepo.revoke(stored.id);
  },

  async me(userId) {
    const user = await userRepo.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },
};