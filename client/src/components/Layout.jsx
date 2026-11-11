import { Outlet } from 'react-router';
import Navbar from './Navbar.jsx';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        Built with React, Node.js, Express, MySQL &amp; Redis
      </footer>
    </div>
  );
}
