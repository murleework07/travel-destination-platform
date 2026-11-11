import { Router } from 'express';
import { pool } from '../config/db.js';
import { isRedisReady } from '../config/redis.js';
import authRoutes from './auth.routes.js';
import destinationRoutes from './destination.routes.js';
import imageRoutes from './image.routes.js';
import userRoutes from './user.routes.js';
import reviewRoutes from './review.routes.js';
import reportRoutes from './report.routes.js';
import packageRoutes from './package.routes.js';
import bookingRoutes from './booking.routes.js';
import metaRoutes from './meta.routes.js';

const router = Router();

router.get('/health', async (req, res) => {
  let database = 'up';
  try {
    await pool.query('SELECT 1');
  } catch {
    database = 'down';
  }
  const cache = isRedisReady() ? 'up' : 'down';

  // MySQL down = unhealthy (503). Redis down = degraded but still serving (200).
  res.status(database === 'up' ? 200 : 503).json({
    status: database === 'down' ? 'down' : cache === 'down' ? 'degraded' : 'ok',
    database,
    cache,
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

router.use('/auth', authRoutes);
router.use('/meta', metaRoutes);
router.use('/destinations/:id/images', imageRoutes); // before /destinations
router.use('/destinations', destinationRoutes);
router.use('/users', userRoutes);
router.use('/reviews', reviewRoutes);
router.use('/reports', reportRoutes);
router.use('/packages', packageRoutes);
router.use('/bookings', bookingRoutes);

export default router;
