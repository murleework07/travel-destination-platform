import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.redis.url, {
  lazyConnect: true,          // connect when we call connectRedis()
  enableOfflineQueue: false,  // if Redis is down, fail fast instead of queueing commands
  maxRetriesPerRequest: 1,
});

// Log state changes once (ioredis retries in the background and would spam logs)
let warned = false;
redis.on('ready', () => {
  warned = false;
  console.log('✅ Redis connected');
});
redis.on('error', (err) => {
  if (!warned) {
    console.warn('⚠️  Redis unavailable, running without cache/rate limits:', err.message);
    warned = true;
  }
});

export const isRedisReady = () => redis.status === 'ready';

export async function connectRedis() {
  try {
    await redis.connect();
  } catch {
    // Already logged by the 'error' handler. The app keeps running and ioredis keeps retrying.
  }
}