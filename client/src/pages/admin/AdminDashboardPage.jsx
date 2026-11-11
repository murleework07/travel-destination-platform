import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { adminApi } from '../../api/admin.js';
import { getErrorMessage } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import Stars from '../../components/Stars.jsx';
import { formatPrice } from '../../utils/format.js';

function StatCard({ label, value, hint }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="mb-3 text-xs text-slate-400">{subtitle}</p>}
      {children}
    </section>
  );
}

export default function AdminDashboardPage() {
  const bookings = useQuery({ queryKey: ['report', 'bookings'], queryFn: adminApi.bookingStats });
  const countries = useQuery({ queryKey: ['report', 'countries'], queryFn: adminApi.countryStats });
  const topRated = useQuery({ queryKey: ['report', 'top-rated'], queryFn: () => adminApi.topRated({ minVotes: 3, limit: 5 }) });
  const best = useQuery({ queryKey: ['report', 'best'], queryFn: adminApi.bestPerCountry });
  const reviewers = useQuery({ queryKey: ['report', 'reviewers'], queryFn: () => adminApi.topReviewers({ minReviews: 1, limit: 5 }) });

  if (bookings.isLoading || countries.isLoading) return <Spinner />;
  if (bookings.isError) return <p className="text-red-600">{getErrorMessage(bookings.error)}</p>;

  const { summary, monthly, topPackages } = bookings.data;
  const totalDestinations = countries.data?.reduce((sum, c) => sum + c.destinations, 0) ?? 0;
  const totalReviews = countries.data?.reduce((sum, c) => sum + c.totalReviews, 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (confirmed)" value={formatPrice(summary.revenue)} />
        <StatCard label="Bookings" value={summary.totalBookings} hint={`${summary.cancelled} cancelled`} />
        <StatCard label="Seats sold" value={summary.seatsSold} />
        <StatCard label="Destinations · Reviews" value={`${totalDestinations} · ${totalReviews}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Revenue by month" subtitle="Last 12 months · GROUP BY DATE_FORMAT(created_at)">
          {monthly.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No bookings yet</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => formatPrice(v)} />
                  <Bar dataKey="revenue" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Reviews by country" subtitle="LEFT JOIN + GROUP BY (countries with 0 reviews included)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countries.data} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="isoCode" fontSize={12} width={30} />
                <Tooltip labelFormatter={(iso) => countries.data.find((c) => c.isoCode === iso)?.country} />
                <Bar dataKey="totalReviews" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Top rated (weighted)" subtitle="Bayesian average · min 3 votes">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr><th className="py-2">Destination</th><th>Avg</th><th>Reviews</th><th>Score</th></tr>
            </thead>
            <tbody>
              {topRated.data?.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="py-2"><Link to={`/destinations/${d.slug}`} className="hover:text-teal-700">{d.name}</Link></td>
                  <td><Stars value={d.avgRating} size="text-xs" /></td>
                  <td>{d.reviewCount}</td>
                  <td className="font-semibold">{d.weightedRating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Top packages by revenue" subtitle="3-table JOIN + GROUP BY">
          {topPackages.length === 0 && <p className="text-sm text-slate-400">No confirmed bookings yet</p>}
          <ul className="space-y-2 text-sm">
            {topPackages.map((p) => (
              <li key={p.id} className="flex justify-between border-t border-slate-100 pt-2">
                <span>{p.title} <span className="text-slate-400">· {p.destination}</span></span>
                <span className="font-semibold">{formatPrice(p.revenue)} <span className="font-normal text-slate-400">({p.seatsSold} seats)</span></span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Best destination per country" subtitle="ROW_NUMBER() OVER (PARTITION BY country)">
          <ul className="space-y-2 text-sm">
            {best.data?.map((b) => (
              <li key={b.slug} className="flex justify-between border-t border-slate-100 pt-2">
                <span><span className="text-slate-400">{b.country}:</span> {b.name}</span>
                <span>{b.avgRating.toFixed(2)} ★</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Most active reviewers" subtitle="GROUP BY + HAVING">
          <ul className="space-y-2 text-sm">
            {reviewers.data?.map((r) => (
              <li key={r.id} className="flex justify-between border-t border-slate-100 pt-2">
                <span>{r.name}</span>
                <span>{r.reviewCount} reviews · avg {r.avgRatingGiven} ★</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
