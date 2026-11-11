import { Link } from 'react-router';
import Stars from './Stars.jsx';
import { formatPrice } from '../utils/format.js';

export default function DestinationCard({ destination: d }) {
  return (
    <Link
      to={`/destinations/${d.slug}`}
      className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden bg-slate-200">
        {d.coverImage && (
          <img
            src={d.coverImage}
            alt={d.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{d.name}</h3>
          {d.startingPrice != null && (
            <span className="whitespace-nowrap text-sm text-slate-500">
              from <strong className="text-slate-900">{formatPrice(d.startingPrice)}</strong>
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">{d.city}, {d.country}</p>
        <div className="flex items-center gap-2 text-sm">
          <Stars value={d.avgRating} size="text-sm" />
          <span className="text-slate-500">
            {d.avgRating.toFixed(1)} ({d.reviewCount})
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {d.categories.map((c) => (
            <span key={c} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
              {c}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
