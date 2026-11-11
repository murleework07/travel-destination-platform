import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { destinationsApi } from '../api/destinations.js';
import { getErrorMessage } from '../api/client.js';
import DestinationCard from '../components/DestinationCard.jsx';
import Spinner from '../components/Spinner.jsx';

const QUICK_CATEGORIES = [
  ['beach', '🏖️ Beaches'],
  ['mountain', '🏔️ Mountains'],
  ['heritage', '🏛️ Heritage'],
  ['adventure', '🪂 Adventure'],
];

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['destinations', 'top-rated'],
    queryFn: () => destinationsApi.search({ sort: 'rating', limit: 8 }),
  });

  const onSearch = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : '/explore');
  };

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-700 px-8 py-16 text-white">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Discover your next adventure
        </h1>
        <p className="mt-4 max-w-xl text-teal-50">
          Beaches, mountains and heritage sites, rated by real travellers. Book seats in seconds.
        </p>

        <form onSubmit={onSearch} className="mt-8 flex max-w-xl gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search beaches, temples, Goa..."
            className="w-full rounded-lg px-4 py-3 text-slate-900 outline-none"
            style={{ background: 'white' }}
          />
          <button type="submit" className="btn-primary bg-slate-900 px-6 hover:bg-slate-800">
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_CATEGORIES.map(([slug, label]) => (
            <Link
              key={slug}
              to={`/explore?category=${slug}`}
              className="rounded-full bg-white/15 px-3 py-1 text-sm hover:bg-white/25"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Top rated destinations</h2>
          <Link to="/explore?sort=rating" className="text-sm font-medium text-teal-700">
            See all →
          </Link>
        </div>

        {isLoading && <Spinner />}
        {isError && <p className="text-red-600">{getErrorMessage(error)}</p>}

        {data && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.data.map((d) => (
              <DestinationCard key={d.id} destination={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
