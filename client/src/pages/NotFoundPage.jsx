import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="py-24 text-center">
      <p className="text-6xl font-bold text-teal-600">404</p>
      <p className="mt-2 text-slate-600">This page doesn't exist.</p>
      <Link to="/" className="btn-primary mt-6">Go home</Link>
    </div>
  );
}
