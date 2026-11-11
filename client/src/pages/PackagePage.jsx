import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { packagesApi } from '../api/packages.js';
import { bookingsApi } from '../api/bookings.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDate, formatPrice } from '../utils/format.js';

export default function PackagePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [departureId, setDepartureId] = useState(null);
  const [seats, setSeats] = useState(1);
  // One key per booking attempt: retries / double clicks reuse it, so only ONE booking is created
  const idempotencyKey = useRef(crypto.randomUUID());

  const { data: pkg, isLoading, isError, error } = useQuery({
    queryKey: ['package', id],
    queryFn: () => packagesApi.get(id),
  });

  const booking = useMutation({
    mutationFn: () => bookingsApi.create({ departureId, seats }, idempotencyKey.current),
    onSuccess: () => {
      idempotencyKey.current = crypto.randomUUID(); // next booking gets a fresh key
      toast.success('Booking confirmed! 🎉');
      queryClient.invalidateQueries({ queryKey: ['package', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate('/bookings');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err)); // e.g. "Only 2 seat(s) left"
      queryClient.invalidateQueries({ queryKey: ['package', id] }); // show fresh seat counts
    },
  });

  if (isLoading) return <Spinner />;
  if (isError) return <p className="py-16 text-center text-red-600">{getErrorMessage(error)}</p>;

  const departure = pkg.departures.find((dep) => dep.id === departureId);
  const maxSeats = departure ? Math.min(10, departure.seatsLeft) : 1;
  const total = pkg.price * seats;

  const selectDeparture = (dep) => {
    setDepartureId(dep.id);
    setSeats(1);
    idempotencyKey.current = crypto.randomUUID();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="space-y-6 lg:col-span-2">
        <div>
          <Link to={`/destinations/${pkg.destination.slug}`} className="text-sm text-teal-700 hover:underline">
            ← {pkg.destination.name}
          </Link>
          <h1 className="mt-1 text-3xl font-bold">{pkg.title}</h1>
          <p className="mt-2 text-slate-600">{pkg.description}</p>
          <p className="mt-2 text-sm text-slate-500">{pkg.durationDays} days · {formatPrice(pkg.price)} per person</p>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">1. Choose a departure date</h2>
          {pkg.departures.length === 0 && <p className="text-slate-500">No upcoming departures.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {pkg.departures.map((dep) => {
              const soldOut = dep.seatsLeft === 0;
              const selected = dep.id === departureId;
              return (
                <button
                  key={dep.id}
                  disabled={soldOut}
                  onClick={() => selectDeparture(dep)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-200' : 'border-slate-200 bg-white hover:border-teal-400'
                  } ${soldOut ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <p className="font-semibold">{formatDate(dep.departureDate)}</p>
                  <p className={`text-sm ${dep.seatsLeft <= 3 ? 'text-red-600' : 'text-slate-500'}`}>
                    {soldOut ? 'Sold out' : `${dep.seatsLeft} of ${dep.totalSeats} seats left`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-20">
        <h2 className="text-lg font-semibold">2. Seats &amp; payment</h2>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Travellers</span>
          <select
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            disabled={!departure}
            className="input"
          >
            {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-slate-600">Total</span>
          <span className="text-2xl font-bold text-teal-700">{formatPrice(total)}</span>
        </div>

        {user ? (
          <button
            onClick={() => booking.mutate()}
            disabled={!departure || booking.isPending}
            className="btn-primary w-full py-3"
          >
            {booking.isPending ? 'Booking...' : departure ? 'Confirm booking' : 'Select a date first'}
          </button>
        ) : (
          <Link to="/login" state={{ from: location }} className="btn-primary w-full py-3">
            Log in to book
          </Link>
        )}
        <p className="text-xs text-slate-400">Final price is calculated by the server.</p>
      </aside>
    </div>
  );
}
