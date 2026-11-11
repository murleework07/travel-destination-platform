import { NavLink, Outlet } from 'react-router';

const LINKS = [
  ['/admin', '📊 Dashboard', true],
  ['/admin/destinations', '🗺️ Destinations', false],
  ['/admin/users', '👥 Users', false],
];

export default function AdminLayout() {
  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      <nav className="card h-fit space-y-1 p-3 lg:sticky lg:top-20">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</p>
        {LINKS.map(([to, label, end]) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
