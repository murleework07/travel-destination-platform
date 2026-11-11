import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { destinationsApi } from '../api/destinations.js';
import { getErrorMessage } from '../api/client.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';
import DestinationCard from '../components/DestinationCard.jsx';
import Spinner from '../components/Spinner.jsx';

const SORTS = [['newest', 'Newest'], ['rating', 'Top rated'], ['popular', 'Most reviewed'], ['name', 'Name A–Z']];
const RATINGS = [['', 'Any rating'], ['3', '3★ & up'], ['4', '4★ & up'], ['4.5', '4.5★ & up']];
const PRICES = [['', 'Any price'], ['20000', 'Under ₹20,000'], ['50000', 'Under ₹50,000'], ['100000', 'Under ₹1,00,000']];
const FILTER_KEYS = ['q', 'country', 'category', 'minRating', 'maxPrice', 'sort'];

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [qInput, setQInput] = useState(searchParams.get('q') ?? '');
  const debouncedQ = useDebounce(qInput, 400);

  // The URL is the single source of truth for filters (shareable, back button works)
  const filters = useMemo(() => {
    const f = {};
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) f[key] = value;
    }
    return f;
  }, [searchParams]);

  const setParam = useCallback(
    (key, value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Push the debounced text into the URL (and therefore into the query)
  useEffect(() => {
    setParam('q', debouncedQ.trim());
  }, [debouncedQ, setParam]);

  const { data: meta } = useQuery({
    queryKey: ['filters'],
    queryFn: destinationsApi.filters,
    staleTime: 10 * 60_000,
  });

  const query = useInfiniteQuery({
    queryKey: ['explore', filters],
    queryFn: ({ pageParam }) =>
      destinationsApi.search({ ...filters, limit: 12, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => (lastPage.meta.hasMore ? lastPage.meta.nextCursor : undefined),
    placeholderData: keepPreviousData, // keep old results visible while new filters load
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const sentinelRef = useInfiniteScroll(loadMore, Boolean(hasNextPage));

  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  const selectedCategories = filters.category ? filters.category.split(',') : [];

  const toggleCategory = (slug) => {
    const set = new Set(selectedCategories);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    setParam('category', [...set].join(','));
  };

  const clearAll = () => {
    setQInput('');
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      {/* ---------- Filters ---------- */}
      <aside className="card h-fit space-y-5 p-5 lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Filters</h2>
          <button onClick={clearAll} className="text-sm text-teal-700 hover:underline">Clear all</button>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Search</span>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="beach, temple, Goa..."
            className="input"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Country</span>
          <select value={filters.country ?? ''} onChange={(e) => setParam('country', e.target.value)} className="input">
            <option value="">All countries</option>
            {meta?.countries.map((c) => (
              <option key={c.id} value={c.isoCode}>
                {c.name} ({c.destinationCount})
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium">Categories</span>
          <div className="flex flex-wrap gap-2">
            {meta?.categories.map((c) => {
              const active = selectedCategories.includes(c.slug);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCategory(c.slug)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Rating</span>
          <select value={filters.minRating ?? ''} onChange={(e) => setParam('minRating', e.target.value)} className="input">
            {RATINGS.map(([value, label]) => <option key={label} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Budget</span>
          <select value={filters.maxPrice ?? ''} onChange={(e) => setParam('maxPrice', e.target.value)} className="input">
            {PRICES.map(([value, label]) => <option key={label} value={value}>{label}</option>)}
          </select>
        </label>
      </aside>

      {/* ---------- Results ---------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Explore destinations</h1>
          <select
            value={filters.sort ?? 'newest'}
            onChange={(e) => setParam('sort', e.target.value === 'newest' ? '' : e.target.value)}
            className="input w-auto"
          >
            {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {query.isLoading && <Spinner />}
        {query.isError && <p className="text-red-600">{getErrorMessage(query.error)}</p>}

        {!query.isLoading && items.length === 0 && !query.isError && (
          <div className="card p-10 text-center text-slate-500">
            No destinations match these filters.{' '}
            <button onClick={clearAll} className="font-medium text-teal-700">Clear filters</button>
          </div>
        )}

        <div className={`grid gap-6 sm:grid-cols-2 xl:grid-cols-3 ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
          {items.map((d) => <DestinationCard key={d.id} destination={d} />)}
        </div>

        {/* Invisible marker: when it scrolls into view, the next page loads */}
        <div ref={sentinelRef} />
        {isFetchingNextPage && <Spinner label="Loading more..." />}
        {!hasNextPage && items.length > 0 && (
          <p className="py-6 text-center text-sm text-slate-400">You've reached the end ✨</p>
        )}
      </section>
    </div>
  );
}
