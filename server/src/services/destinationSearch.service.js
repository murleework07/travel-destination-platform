import {
  destinationSearchRepository as repo,
  SORT_OPTIONS,
} from '../repositories/destinationSearch.repository.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { ApiError } from '../utils/ApiError.js';

// "goa beach" -> "+goa* +beach*" (every word required, prefix match)
// Removes MySQL boolean operators so users can't inject search syntax
function toBooleanQuery(q) {
  const words = q
    .replace(/[+\-><()~*"@]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3) // InnoDB ignores words shorter than 3 chars by default
    .slice(0, 8);
  return words.length ? words.map((w) => `+${w}*`).join(' ') : null;
}

// Escape LIKE wildcards so "%" typed by a user is treated as a normal character
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

export const destinationSearchService = {
  async search(query) {
    const { q, sort, limit } = query;

    let cursor = null;
    if (query.cursor) {
      cursor = decodeCursor(query.cursor);
      if (cursor.s !== sort) {
        throw ApiError.badRequest('Cursor does not match the current sort order');
      }
    }

    const fullText = q ? toBooleanQuery(q) : null;
    const namePrefix = q && !fullText ? escapeLike(q) : null;

    const rows = await repo.search({
      fullText,
      namePrefix,
      country: query.country,
      categories: query.category,
      minRating: query.minRating,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort,
      limit,
      cursor,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items.at(-1);

    const nextCursor = hasMore
      ? encodeCursor({ s: sort, v: last[SORT_OPTIONS[sort].field], id: last.id })
      : null;

    return { items, meta: { limit, sort, hasMore, nextCursor } };
  },
};