import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { destinationsApi } from '../api/destinations.js';
import { reviewsApi } from '../api/reviews.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { invalidateDestination } from '../utils/invalidate.js';
import Spinner from '../components/Spinner.jsx';
import Stars from '../components/Stars.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import { formatDate, formatPrice } from '../utils/format.js';

export default function DestinationPage() {
  const { slug } = useParams();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);

  const destination = useQuery({
    queryKey: ['destination', slug],
    queryFn: () => destinationsApi.getBySlug(slug),
  });
  const summary = useQuery({
    queryKey: ['rating-summary', slug],
    queryFn: () => destinationsApi.ratingSummary(slug),
  });
  const reviews = useInfiniteQuery({
    queryKey: ['reviews', slug],
    queryFn: ({ pageParam }) =>
      destinationsApi.reviews(slug, { limit: 5, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
  });

  const deleteReview = useMutation({
    mutationFn: (id) => reviewsApi.remove(id),
    onSuccess: () => {
      toast.success('Review deleted');
      invalidateDestination(queryClient, slug);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (destination.isLoading) return <Spinner />;
  if (destination.isError) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-red-600">{getErrorMessage(destination.error)}</p>
        <Link to="/explore" className="btn-outline mt-4">Back to explore</Link>
      </div>
    );
  }

  const d = destination.data;
  const images = [...d.images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const reviewItems = reviews.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <article className="space-y-10">
      <header>
        <p className="text-sm text-slate-500">{d.city}, {d.country.name}</p>
        <h1 className="text-4xl font-bold text-slate-900">{d.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <Stars value={d.avgRating} />
          <span className="text-sm text-slate-600">
            {d.avgRating.toFixed(1)} · {d.reviewCount} reviews
          </span>
        </div>
      </header>

      {images.length > 0 && (
        <section className="space-y-3">
          <img
            src={images[activeImage]?.url}
            alt={d.name}
            className="aspect-[16/7] w-full rounded-2xl object-cover"
          />
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={img.id} onClick={() => setActiveImage(i)} className="shrink-0">
                  <img
                    src={img.url}
                    alt=""
                    className={`h-16 w-24 rounded-lg object-cover ${
                      i === activeImage ? 'ring-2 ring-teal-600' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-2 text-xl font-semibold">About</h2>
            <p className="leading-relaxed text-slate-700">{d.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Best time to visit</dt>
                <dd className="font-medium">{d.bestTimeToVisit || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Categories</dt>
                <dd className="font-medium">{d.categories.map((c) => c.name).join(', ')}</dd>
              </div>
            </dl>
          </section>

          <section className="card space-y-4 p-6">
            <h2 className="text-xl font-semibold">Reviews</h2>
            <ReviewForm destinationId={d.id} slug={slug} />

            {reviews.isLoading && <Spinner />}
            {!reviews.isLoading && reviewItems.length === 0 && (
              <p className="text-slate-500">No reviews yet. Be the first!</p>
            )}

            <ul className="divide-y divide-slate-100">
              {reviewItems.map((r) => {
                const canDelete = user && (Number(r.author.id) === Number(user.id) || isAdmin);
                return (
                  <li key={r.id} className="py-4">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{r.author.name}</strong>
                      <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span>
                    </div>
                    <Stars value={r.rating} size="text-sm" />
                    {r.comment && <p className="mt-1 text-sm text-slate-700">{r.comment}</p>}
                    {canDelete && (
                      <button
                        onClick={() => window.confirm('Delete this review?') && deleteReview.mutate(r.id)}
                        className="mt-1 text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {reviews.hasNextPage && (
              <button
                onClick={() => reviews.fetchNextPage()}
                disabled={reviews.isFetchingNextPage}
                className="btn-outline w-full"
              >
                {reviews.isFetchingNextPage ? 'Loading...' : 'Load more reviews'}
              </button>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-3 text-lg font-semibold">Packages</h2>
            {d.packages.length === 0 && <p className="text-sm text-slate-500">No packages yet.</p>}
            <ul className="space-y-3">
              {d.packages.map((p) => (
                <li key={p.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-slate-500">{p.durationDays} days</p>
                  <p className="mt-1 text-lg font-bold text-teal-700">{formatPrice(p.price)}</p>
                  <Link to={`/packages/${p.id}`} className="btn-primary mt-3 w-full">
                    View dates &amp; book
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {summary.data && (
            <section className="card p-6">
              <h2 className="mb-3 text-lg font-semibold">Rating breakdown</h2>
              <div className="space-y-2">
                {summary.data.distribution.map((row) => (
                  <div key={row.star} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-slate-600">{row.star}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-amber-400" style={{ width: `${row.percent}%` }} />
                    </div>
                    <span className="w-8 text-right text-slate-500">{row.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
