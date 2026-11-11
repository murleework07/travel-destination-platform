import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Runs when no route matched
export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// One central place that turns every error into a clean JSON response
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body contains invalid JSON';
  }
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large';
  }
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Resource already exists';
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'A referenced record does not exist';
  }
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    statusCode = 409;
    message = 'Request conflicts with current data (constraint violated)';
  }
  if (err.name === 'MulterError') {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller'
      : err.code === 'LIMIT_FILE_COUNT' ? 'You can upload at most 5 images at once'
      : err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Use the field name "images" for files'
      : err.message;
  }

  if (statusCode >= 500) {
    (req.log ?? logger).error({ err }, 'Unexpected error');
  }

  const isProd = env.nodeEnv === 'production';

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && isProd ? 'Internal server error' : message,
    requestId: req.id, // user can quote this to support; you search logs for it
    ...(err.details && { details: err.details }),
    ...(!isProd && statusCode >= 500 && { stack: err.stack }),
  });
}