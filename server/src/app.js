import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { openApiSpec } from './docs/openapi.js';
import { UPLOAD_DIR } from './middlewares/upload.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { globalLimiter } from './middlewares/rateLimit.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Behind a load balancer in production, trust X-Forwarded-For so req.ip is the real client
if (env.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by'); // don't advertise "Express"

// ---------- Global middlewares ----------
app.use(requestLogger); // first, so every request gets an id + log line
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    exposedHeaders: ['X-Cache', 'X-Request-Id', 'RateLimit-Remaining', 'Retry-After'],
  })
);
app.use(compression());

// Static uploaded images (cached by browsers for 7 days)
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: false }));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// ---------- API docs ----------
app.get('/api/docs.json', (req, res) => res.json(openApiSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'Travel Platform API',
  swaggerOptions: { persistAuthorization: true },
}));

// ---------- API routes ----------
app.use('/api/v1', globalLimiter, routes);

// ---------- Error handling (must be LAST) ----------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;