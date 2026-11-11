import app from './app.js';
import { env } from './config/env.js';
import { pool, testConnection } from './config/db.js';
import { redis, connectRedis } from './config/redis.js';
import { logger } from './utils/logger.js';

async function start() {
  // MySQL is REQUIRED: stop if unavailable
  try {
    await testConnection();
    logger.info('✅ MySQL connected');
  } catch (err) {
    logger.fatal({ err }, '❌ MySQL connection failed');
    process.exit(1);
  }

  // Redis is OPTIONAL: continue without it if unavailable
  await connectRedis();

  const server = app.listen(env.port, () => {
    logger.info(`🚀 Server running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`📘 API docs: http://localhost:${env.port}/api/docs`);
  });

  let shuttingDown = false;
  const shutdown = (signal, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully...`);

    // Force exit if connections don't close within 10 seconds
    setTimeout(() => process.exit(1), 10_000).unref();

    server.close(async () => {
      await pool.end().catch(() => {});
      redis.disconnect();
      process.exit(exitCode);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // A bug that escaped every try/catch: log it, then restart cleanly
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    shutdown('uncaughtException', 1);
  });
}

start();