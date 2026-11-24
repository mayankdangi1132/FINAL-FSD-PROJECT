import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, Phone, UtensilsCrossed } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { DAY_NAMES, formatTime12 } from '../utils/format.js';

export default function Footer() {
  const { settings } = useApp();
  const days = Object.entries(settings.hours);
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link to="/" className="brand brand-light">
            <span className="brand-mark"><UtensilsCrossed size={18} /></span>
            <span>{settings.name}</span>
          </Link>
          <p className="footer-text">{settings.tagline}. Fresh ingredients, honest cooking and warm hospitality since 2015.</p>
        </div>

        <div>
          <h4>Explore</h4>
          <ul className="footer-links">
            <li><Link to="/menu">Menu</Link></li>
            <li><Link to="/menu">Order Online</Link></li>
            <li><Link to="/reservations">Book a Table</Link></li>
            <li><Link to="/track">Track Your Order</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/login">Staff Login</Link></li>
          </ul>
        </div>

        <div>
          <h4>Opening hours</h4>
          <ul className="footer-hours">
            {days.map(([key, h]) => (
              <li key={key}>
                <span>{DAY_NAMES[key].slice(0, 3)}</span>
                <span>{h.closed ? 'Closed' : `${formatTime12(h.open)} – ${formatTime12(h.close)}`}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4>Contact</h4>
          <ul className="footer-contact">
            <li><MapPin size={16} /> {settings.address}</li>
            <li><Phone size={16} /> <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>{settings.phone}</a></li>
            <li><Mail size={16} /> <a href={`mailto:${settings.email}`}>{settings.email}</a></li>
            <li><Clock size={16} /> Kitchen closes 30 min before closing</li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {settings.name}. All rights reserved.</span>
        <span>Built with MongoDB · Express · React · Node.js</span>
      </div>
    </footer>
  );
}
