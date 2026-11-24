import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookOpen, CalendarDays, ChefHat, ClipboardList, ExternalLink, History, LayoutDashboard,
  LogOut, Menu as MenuIcon, Settings, ShieldAlert, Tag, Users, UtensilsCrossed, X, Armchair,
} from 'lucide-react';
import { homeFor, useApp } from '../context/AppContext.jsx';
import { initials } from '../utils/format.js';
import { ROLE_LABELS } from '../utils/status.js';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ThemeToggle from './ThemeToggle.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

export function PublicLayout() {
  return (
    <>
      <ScrollToTop />
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main" className="public-main"><Outlet /></main>
      <Footer />
    </>
  );
}

const NAV = {
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    { to: '/admin/reservations', label: 'Reservations', icon: CalendarDays },
    { to: '/admin/menu', label: 'Menu', icon: BookOpen },
    { to: '/admin/promotions', label: 'Promotions', icon: Tag },
    { to: '/admin/staff', label: 'Staff', icon: Users },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/activity', label: 'Activity Log', icon: History },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { divider: 'Operations' },
    { to: '/kitchen', label: 'Kitchen Display', icon: ChefHat },
    { to: '/foh', label: 'Front of House', icon: Armchair },
  ],
  kitchen: [{ to: '/kitchen', label: 'Kitchen Display', icon: ChefHat }],
  foh: [{ to: '/foh', label: 'Front of House', icon: Armchair }],
};

export function DashboardLayout() {
  const { user, logout, settings } = useApp();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); }, [pathname]);
  const items = NAV[user.role] || [];

  return (
    <div className="dash">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <Link to="/" className="brand brand-light">
            <span className="brand-mark"><UtensilsCrossed size={18} /></span>
            <span>{settings.name}</span>
          </Link>
          <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="sidebar-role">{ROLE_LABELS[user.role]}</div>
        <nav className="sidebar-nav" aria-label="Dashboard">
          {items.map((item) => (item.divider
            ? <div className="sidebar-divider" key={item.divider}>{item.divider}</div>
            : (
              <NavLink key={item.to} to={item.to} end={item.end}>
                <item.icon size={18} /> {item.label}
              </NavLink>
            )))}
        </nav>
        <div className="sidebar-foot">
          <Link to="/" className="sidebar-link"><ExternalLink size={16} /> View website</Link>
          <button className="sidebar-link" onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="dash-main">
        <header className="dash-topbar">
          <button className="icon-btn dash-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><MenuIcon size={22} /></button>
          <div className="dash-topbar-spacer" />
          <ThemeToggle />
          <div className="dash-user">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <span className="muted small">{ROLE_LABELS[user.role]}</span>
            </div>
          </div>
        </header>
        <main className="dash-content" id="main">
          <ScrollToTop />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Route guard — redirects to sign-in, or shows "access denied" for the wrong role. */
export function RequireRole({ roles, children }) {
  const { user } = useApp();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search, message: 'Please sign in to continue.' }} />;
  }
  if (!roles.includes(user.role)) {
    return (
      <div className="container narrow center-page">
        <div className="card access-denied">
          <ShieldAlert size={40} />
          <h1>Access denied</h1>
          <p className="muted">Your account ({ROLE_LABELS[user.role]}) doesn't have permission to view this page.</p>
          <Link to={homeFor(user.role)} className="btn btn-primary">Go to my dashboard</Link>
        </div>
      </div>
    );
  }
  return children;
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>{t.message}</div>
      ))}
    </div>
  );
}
