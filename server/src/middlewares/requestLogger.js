import pinoHttp from 'pino-http';
import crypto from 'node:crypto';
import { logger } from '../utils/logger.js';

// Accept the caller's X-Request-Id only if it looks safe (prevents log injection)
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res, time) =>
    `${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(time)}ms`,
  customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: { ignore: (req) => req.url === '/api/v1/health' }, // don't spam health checks
});