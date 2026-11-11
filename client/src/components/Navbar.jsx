import { Link, NavLink, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `text-sm font-medium ${isActive ? 'text-teal-700' : 'text-slate-600 hover:text-slate-900'}`;

export default function Navbar() {
  const { user, status, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-teal-700">
          🌍 Wanderly
        </Link>

        <div className="flex items-center gap-5">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/explore" className={linkClass}>Explore</NavLink>
          {user && <NavLink to="/bookings" className={linkClass}>My Bookings</NavLink>}
          {isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}

          {status === 'loading' ? null : user ? (
            <>
              <span className="hidden text-sm text-slate-600 md:inline">
                Hi, <strong>{user.name.split(' ')[0]}</strong>
                {isAdmin && (
                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    ADMIN
                  </span>
                )}
              </span>
              <button onClick={handleLogout} className="btn-outline">Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>Login</NavLink>
              <Link to="/register" className="btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
