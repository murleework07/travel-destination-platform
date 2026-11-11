import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from './Spinner.jsx';

// <ProtectedRoute>              → any logged-in user
// <ProtectedRoute role="admin"> → admins only
export default function ProtectedRoute({ children, role }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner label="Checking session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
