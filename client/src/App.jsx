import { Routes, Route } from 'react-router';
import Layout from './components/Layout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import DestinationPage from './pages/DestinationPage.jsx';
import PackagePage from './pages/PackagePage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminDestinationsPage from './pages/admin/AdminDestinationsPage.jsx';
import DestinationFormPage from './pages/admin/DestinationFormPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="destinations/:slug" element={<DestinationPage />} />
        <Route path="packages/:id" element={<PackagePage />} />
        <Route
          path="bookings"
          element={
            <ProtectedRoute>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin area: frontend guard here, backend authorize('admin') on every API call */}
        <Route
          path="admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="destinations" element={<AdminDestinationsPage />} />
          <Route path="destinations/new" element={<DestinationFormPage />} />
          <Route path="destinations/:slug/edit" element={<DestinationFormPage />} />
          <Route path="users" element={<AdminUsersPage />} />
        </Route>

        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
