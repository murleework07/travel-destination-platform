import { reviewService } from '../services/review.service.js';
import { withCache, invalidateNamespace } from '../utils/cache.js';

const NS = 'destinations';

export const reviewController = {
  async listForDestination(req, res) {
    const { items, meta } = await reviewService.listForDestination(
      req.validated.params.slug,
      req.validated.query
    );
    res.json({ success: true, data: items, meta });
  },

  async ratingSummary(req, res) {
    const { slug } = req.validated.params;
    const data = await withCache(
      res,
      { namespace: NS, key: `rating:${slug}`, ttl: 300 },
      () => reviewService.ratingSummary(slug)
    );
    res.json({ success: true, data });
  },

  async create(req, res) {
    const data = await reviewService.create(req.user.id, req.validated.params.id, req.validated.body);
    await invalidateNamespace(NS);
    res.status(201).json({ success: true, data });
  },

  async update(req, res) {
    const data = await reviewService.update(req.user, req.validated.params.id, req.validated.body);
    await invalidateNamespace(NS);
    res.json({ success: true, data });
  },

  async remove(req, res) {
    await reviewService.remove(req.user, req.validated.params.id);
    await invalidateNamespace(NS);
    res.status(204).send();
  },
};