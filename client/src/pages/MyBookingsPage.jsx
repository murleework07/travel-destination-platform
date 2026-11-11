import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { bookingsApi } from '../api/bookings.js';
import { getErrorMessage } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import { formatDate, formatPrice } from '../utils/format.js';

const TABS = [['', 'All'], ['CONFIRMED', 'Confirmed'], ['CANCELLED', 'Cancelled']];
const BADGE = {
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-200 text-slate-600',
  PENDING: 'bg-amber-100 text-amber-800',
};

export default function MyBookingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');

  const { data: bookings, isLoading, isError, error } = useQuery({
    queryKey: ['bookings', status],
    queryFn: () => bookingsApi.mine(status || undefined),
  });

  const cancel = useMutation({
    mutationFn: (id) => bookingsApi.cancel(id),
    onSuccess: () => {
      toast.success('Booking cancelled, seats released');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['package'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">My bookings</h1>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map(([value, label]) => (
            <button
              key={label}
              onClick={() => setStatus(value)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                status === value ? 'bg-white font-medium shadow-sm' : 'text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <Spinner />}
      {isError && <p className="text-red-600">{getErrorMessage(error)}</p>}

      {bookings?.length === 0 && (
        <div className="card p-10 text-center text-slate-500">
          No bookings here yet.{' '}
          <Link to="/explore" className="font-medium text-teal-700">Find a trip →</Link>
        </div>
      )}

      <ul className="space-y-4">
        {bookings?.map((b) => (
          <li key={b.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <Link to={`/destinations/${b.destinationSlug}`} className="text-lg font-semibold hover:text-teal-700">
                {b.destinationName}
              </Link>
              <p className="text-sm text-slate-600">{b.packageTitle}</p>
              <p className="mt-1 text-sm text-slate-500">
                📅 {formatDate(b.departureDate)} · 👥 {b.seats} · Booking #{b.id}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-lg font-bold">{formatPrice(b.totalAmount)}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[b.status]}`}>
                {b.status}
              </span>
              {b.status === 'CONFIRMED' && b.isUpcoming && (
                <button
                  onClick={() => window.confirm('Cancel this booking?') && cancel.mutate(b.id)}
                  disabled={cancel.isPending}
                  className="btn-outline text-red-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
