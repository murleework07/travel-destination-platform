import { useState } from 'react';
import { Link } from 'react-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { destinationsApi } from '../../api/destinations.js';
import { adminApi } from '../../api/admin.js';
import { getErrorMessage } from '../../api/client.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { invalidateDestinations } from '../../utils/invalidate.js';
import Spinner from '../../components/Spinner.jsx';
import { formatPrice } from '../../utils/format.js';

export default function AdminDestinationsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q.trim(), 400);

  const list = useInfiniteQuery({
    queryKey: ['admin-destinations', debouncedQ],
    queryFn: ({ pageParam }) =>
      destinationsApi.search({
        sort: 'newest',
        limit: 20,
        ...(debouncedQ && { q: debouncedQ }),
        ...(pageParam && { cursor: pageParam }),
      }),
    initialPageParam: null,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
  });

  const remove = useMutation({
    mutationFn: (id) => adminApi.deleteDestination(id),
    onSuccess: () => {
      toast.success('Destination deleted (soft delete)');
      invalidateDestinations(queryClient);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Destinations</h1>
        <Link to="/admin/destinations/new" className="btn-primary">+ New destination</Link>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or description..." className="input max-w-sm" />

      {list.isLoading && <Spinner />}
      {list.isError && <p className="text-red-600">{getErrorMessage(list.error)}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link to={`/destinations/${d.slug}`} className="font-medium hover:text-teal-700">{d.name}</Link>
                  <p className="text-xs text-slate-400">{d.city} · #{d.id}</p>
                </td>
                <td className="px-4 py-3">{d.country}</td>
                <td className="px-4 py-3">{d.avgRating.toFixed(1)} ★ ({d.reviewCount})</td>
                <td className="px-4 py-3">{formatPrice(d.startingPrice)}</td>
                <td className="space-x-2 px-4 py-3 text-right">
                  <Link to={`/admin/destinations/${d.slug}/edit`} className="btn-outline">Edit</Link>
                  <button
                    onClick={() => window.confirm(`Delete "${d.name}"?`) && remove.mutate(d.id)}
                    className="btn-outline text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.isLoading && rows.length === 0 && <p className="p-6 text-center text-slate-500">No destinations found.</p>}
      </div>

      {list.hasNextPage && (
        <button onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage} className="btn-outline w-full">
          {list.isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
