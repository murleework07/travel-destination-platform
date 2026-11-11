import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={onSubmit} className="card space-y-4 p-8">
        <h1 className="text-2xl font-bold">Log in</h1>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email"
            value={form.email} onChange={onChange} className="input" />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" required autoComplete="current-password"
            value={form.password} onChange={onChange} className="input" />
        </label>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Logging in...' : 'Log in'}
        </button>

        <p className="text-center text-sm text-slate-600">
          No account? <Link to="/register" className="font-medium text-teal-700">Sign up</Link>
        </p>
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Demo: <code>murlee@test.com</code> / <code>Travel123</code> · Admin: <code>admin@travel.com</code> / <code>Admin1234</code>
        </p>
      </form>
    </div>
  );
}
