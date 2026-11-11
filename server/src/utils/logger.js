import pino from 'pino';
import { env } from '../config/env.js';

const isDev = env.nodeEnv === 'development';

export const logger = pino({
  // silent in tests, debug in development, info in production
  level: env.nodeEnv === 'test' ? 'silent' : isDev ? 'debug' : 'info',
  // Never write secrets to logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
    ],
    censor: '[REDACTED]',
  },
  // Colorful logs in development; raw JSON in production (for log tools)
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      }
    : undefined,
});
