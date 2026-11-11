import { destinationService } from '../services/destination.service.js';
import { destinationSearchService } from '../services/destinationSearch.service.js';
import { withCache, invalidateNamespace, hashKey } from '../utils/cache.js';

const NS = 'destinations';

export const destinationController = {
  // Cached 60s; key = hash of all validated query params
  async list(req, res) {
    const query = req.validated.query;
    const result = await withCache(
      res,
      { namespace: NS, key: `search:${hashKey(query)}`, ttl: 60 },
      () => destinationSearchService.search(query)
    );
    res.json({ success: true, data: result.items, meta: result.meta });
  },

  // Cached 5 min
  async getBySlug(req, res) {
    const { slug } = req.validated.params;
    const data = await withCache(
      res,
      { namespace: NS, key: `detail:${slug}`, ttl: 300 },
      () => destinationService.getBySlug(slug)
    );
    res.json({ success: true, data });
  },

  async create(req, res) {
    const data = await destinationService.create(req.validated.body, req.user?.id);
    await invalidateNamespace(NS);
    res
      .status(201)
      .location(`/api/v1/destinations/${data.slug}`)
      .json({ success: true, data });
  },

  async update(req, res) {
    const data = await destinationService.update(req.validated.params.id, req.validated.body);
    await invalidateNamespace(NS);
    res.json({ success: true, data });
  },

  async remove(req, res) {
    await destinationService.remove(req.validated.params.id);
    await invalidateNamespace(NS);
    res.status(204).send();
  },
};