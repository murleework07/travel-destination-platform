import { Router } from 'express';
import { metaRepository } from '../repositories/meta.repository.js';
import { withCache } from '../utils/cache.js';

const router = Router();

// Options for the Explore filters. Same cache namespace as destinations,
// so counts refresh automatically when destinations change.
router.get('/filters', async (req, res) => {
  const data = await withCache(
    res,
    { namespace: 'destinations', key: 'meta:filters', ttl: 3600 },
    async () => {
      const [countries, categories] = await Promise.all([
        metaRepository.countries(),
        metaRepository.categories(),
      ]);
      return { countries, categories };
    }
  );
  res.json({ success: true, data });
});

export default router;
