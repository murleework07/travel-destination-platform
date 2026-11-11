import { redis, isRedisReady } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

// Runs atomically inside Redis: increment, set expiry on first hit, return [count, ttl]
const INCR_WITH_EXPIRY = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return { current, redis.call('TTL', KEYS[1]) }
`;

/**
 * Fixed-window rate limiter backed by Redis (works across multiple server instances).
 * @param name              - limiter name (part of the Redis key)
 * @param windowSec         - window length in seconds
 * @param max               - max requests per window
 * @param keyGenerator      - who to count (default: client IP)
 * @param countOnlyFailures - successful responses don't count (good for login)
 */
export function rateLimit({ name, windowSec, max, keyGenerator, countOnlyFailures = false, message }) {
  return async (req, res, next) => {
    if (!isRedisReady()) return next(); // fail OPEN: availability over strictness

    const id = keyGenerator ? keyGenerator(req) : req.ip;
    const key = `rl:${name}:${id}`;

    try {
      const [count, ttl] = await redis.eval(INCR_WITH_EXPIRY, 1, key, windowSec);
      const resetIn = Math.max(ttl, 0);

      res.set('RateLimit-Limit', String(max));
      res.set('RateLimit-Remaining', String(Math.max(0, max - count)));
      res.set('RateLimit-Reset', String(resetIn));

      if (count > max) {
        res.set('Retry-After', String(Math.max(resetIn, 1)));
        return next(new ApiError(429, message || 'Too many requests, please try again later'));
      }

      if (countOnlyFailures) {
        // After the response is sent: give the attempt back if it succeeded
        res.on('finish', () => {
          if (res.statusCode < 400) redis.decr(key).catch(() => {});
        });
      }

      next();
    } catch (err) {
      console.warn('⚠️  Rate limiter error:', err.message);
      next();
    }
  };
}

// ---------- Ready-made limiters ----------

// Every API request: 1000 per 15 minutes per IP
export const globalLimiter = rateLimit({ name: 'global', windowSec: 15 * 60, max: 1000 });

// Login: 5 FAILED attempts per 15 minutes per IP + email (stops password guessing)
export const loginLimiter = rateLimit({
  name: 'login',
  windowSec: 15 * 60,
  max: 5,
  countOnlyFailures: true,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  message: 'Too many failed login attempts. Try again in 15 minutes.',
});

// Register: 10 accounts per hour per IP (stops fake account spam)
export const registerLimiter = rateLimit({
  name: 'register',
  windowSec: 60 * 60,
  max: 10,
  message: 'Too many accounts created from this IP. Try again later.',
});

// Refresh: 30 per 15 minutes per IP
export const refreshLimiter = rateLimit({ name: 'refresh', windowSec: 15 * 60, max: 30 });