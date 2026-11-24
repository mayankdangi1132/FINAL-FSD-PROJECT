import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LayoutDashboard, LogOut, Menu as MenuIcon, Search, ShoppingBag, UtensilsCrossed, X } from 'lucide-react';
import { homeFor, useApp } from '../context/AppContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { initials, timeAgo } from '../utils/format.js';
import { ROLE_LABELS } from '../utils/status.js';

const LINKS = [
  ['/', 'Home'],
  ['/menu', 'Menu'],
  ['/reservations', 'Reservations'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
];

export default function Navbar() {
  const { user, cartCount, notifications, markNotificationsRead, logout, settings } = useApp();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null); // 'bell' | 'user' | null
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); setPanel(null); }, [location.pathname]);

  const mine = user ? notifications.filter((n) => n.userId === user.id) : [];
  const unread = mine.filter((n) => !n.read).length;

  const openBell = () => {
    setPanel(panel === 'bell' ? null : 'bell');
    if (unread) markNotificationsRead();
  };

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label={`${settings.name} home`}>
          <span className="brand-mark"><UtensilsCrossed size={18} /></span>
          <span>{settings.name}</span>
        </Link>

        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
          <Link to="/track" className="nav-mobile-only">Track an order</Link>
          <Link to="/menu" className="btn btn-primary btn-sm nav-cta">Order Online</Link>
        </nav>

        <div className="nav-actions">
          <ThemeToggle />
          {user?.role === 'customer' && (
            <div className="dropdown">
              <button className="icon-btn" onClick={openBell} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={panel === 'bell'}>
                <Bell size={20} />
                {unread > 0 && <span className="count">{unread}</span>}
              </button>
              {panel === 'bell' && (
                <div className="dropdown-panel notif-panel">
                  <div className="dropdown-title">Notifications</div>
                  {mine.length === 0 && <p className="muted small pad">You're all caught up.</p>}
                  {mine.slice(0, 6).map((n) => (
                    <button
                      key={n.id} className="notif-item"
                      onClick={() => navigate(n.orderId ? `/order/${n.orderId}` : '/account?tab=reservations')}
                    >
                      <span className={`dot ${n.read ? '' : 'unread'}`} />
                      <span>
                        <span className="notif-text">{n.text}</span>
                        <span className="muted small">{timeAgo(n.at)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link to="/cart" className="icon-btn" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="count">{cartCount}</span>}
          </Link>

          {user ? (
            <div className="dropdown">
              <button className="user-btn" onClick={() => setPanel(panel === 'user' ? null : 'user')} aria-expanded={panel === 'user'}>
                <span className="avatar">{initials(user.name)}</span>
                <span className="user-name">{user.name.split(' ')[0]}</span>
                <ChevronDown size={16} />
              </button>
              {panel === 'user' && (
                <div className="dropdown-panel">
                  <div className="dropdown-user">
                    <strong>{user.name}</strong>
                    <span className="muted small">{ROLE_LABELS[user.role]}</span>
                  </div>
                  <Link to={homeFor(user.role)} className="dropdown-item"><LayoutDashboard size={16} /> {user.role === 'customer' ? 'My account' : 'Dashboard'}</Link>
                  <Link to="/track" className="dropdown-item"><Search size={16} /> Track an order</Link>
                  <button className="dropdown-item" onClick={() => { logout(); navigate('/'); }}><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm signin-btn">Sign in</Link>
          )}

          <button className="icon-btn nav-toggle" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation" aria-expanded={open}>
            {open ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>
      {panel && <div className="dropdown-backdrop" onClick={() => setPanel(null)} aria-hidden="true" />}
    </header>
  );
}
