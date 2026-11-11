import { ApiError } from '../utils/ApiError.js';

/**
 * Usage: validate({ params: schema, query: schema, body: schema })
 * Clean, typed data is stored in req.validated.
 */
export const validate = (schemas) => (req, res, next) => {
  req.validated = {};

  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;

    const result = schemas[part].safeParse(req[part] ?? {});

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || part,
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    req.validated[part] = result.data;
  }

  next();
};