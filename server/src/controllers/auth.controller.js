import { authService } from '../services/auth.service.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_PATH = '/api/v1/auth'; // the cookie is only sent to auth routes

function refreshCookieOptions() {
  return {
    httpOnly: true,                       // JavaScript can't read it (XSS protection)
    secure: env.nodeEnv === 'production', // HTTPS only in production
    sameSite: 'strict',                   // not sent from other sites (CSRF protection)
    path: COOKIE_PATH,
    maxAge: env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  };
}

function sendAuthResponse(res, status, { user, accessToken, refreshToken }) {
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.status(status).json({ success: true, data: { user, accessToken } });
}

export const authController = {
  async register(req, res) {
    const result = await authService.register(req.validated.body);
    sendAuthResponse(res, 201, result);
  },

  async login(req, res) {
    const result = await authService.login(req.validated.body);
    sendAuthResponse(res, 200, result);
  },

  async refresh(req, res) {
    try {
      const result = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
      sendAuthResponse(res, 200, result);
    } catch (err) {
      res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH }); // remove the bad cookie
      throw err;
    }
  },

  async logout(req, res) {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
    res.status(204).send();
  },

  async me(req, res) {
    const user = await authService.me(req.user.id);
    res.json({ success: true, data: user });
  },
};