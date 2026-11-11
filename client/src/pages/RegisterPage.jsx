import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Same rules as the backend (backend still validates; this is just faster feedback)
  const passwordOk = form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      toast.success('Account created!');
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={onSubmit} className="card space-y-4 p-8">
        <h1 className="text-2xl font-bold">Create account</h1>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <label className="block space-y-1">
          <span className="text-sm font-medium">Name</span>
          <input name="name" required minLength={2} autoComplete="name"
            value={form.name} onChange={onChange} className="input" />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email"
            value={form.email} onChange={onChange} className="input" />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" required autoComplete="new-password"
            value={form.password} onChange={onChange} className="input" />
          <span className={`text-xs ${form.password && !passwordOk ? 'text-red-600' : 'text-slate-500'}`}>
            At least 8 characters, with a letter and a number
          </span>
        </label>

        <button type="submit" disabled={submitting || !passwordOk} className="btn-primary w-full">
          {submitting ? 'Creating...' : 'Sign up'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-medium text-teal-700">Log in</Link>
        </p>
      </form>
    </div>
  );
}
