import crypto from 'node:crypto';
import { redis, isRedisReady } from '../config/redis.js';

const warn = (err) => console.warn('⚠️  Cache error:', err.message);

// Stable short hash of an object (e.g. validated query params)
export const hashKey = (value) =>
  crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 16);

// Random +0-10% on TTLs so many keys don't expire at the same second (cache stampede)
const withJitter = (ttl) => ttl + Math.floor(Math.random() * ttl * 0.1);

async function getVersion(namespace) {
  if (!isRedisReady()) return '0';
  try {
    return (await redis.get(`cache:version:${namespace}`)) ?? '0';
  } catch (err) {
    warn(err);
    return '0';
  }
}

/**
 * Cache-aside: try Redis first; on a miss run `loader`, store the result, return it.
 * Sets the X-Cache header (HIT/MISS) so you can see it working.
 */
export async function withCache(res, { namespace, key, ttl }, loader) {
  const version = await getVersion(namespace);
  const fullKey = `${namespace}:v${version}:${key}`;

  if (isRedisReady()) {
    try {
      const cached = await redis.get(fullKey);
      if (cached !== null) {
        res.set('X-Cache', 'HIT');
        return JSON.parse(cached);
      }
    } catch (err) {
      warn(err);
    }
  }

  const data = await loader(); // errors (e.g. 404) are NOT cached

  if (isRedisReady()) {
    redis.set(fullKey, JSON.stringify(data), 'EX', withJitter(ttl)).catch(warn); // don't wait
  }
  res.set('X-Cache', 'MISS');
  return data;
}

// O(1) invalidation of EVERYTHING in a namespace
export async function invalidateNamespace(namespace) {
  if (!isRedisReady()) return;
  try {
    await redis.incr(`cache:version:${namespace}`);
  } catch (err) {
    warn(err);
  }
}