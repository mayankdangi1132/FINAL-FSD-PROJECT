import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bike, CalendarDays, ChefHat, Clock, Leaf, MapPin, Quote, Star, Store, Utensils } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { IMAGES } from '../data/constants.js';
import { DAY_NAMES, formatCurrency, formatTime12, openStatus } from '../utils/format.js';
import { ItemModal, MenuItemCard } from '../components/MenuItem.jsx';
import { Img, Stars } from '../components/ui.jsx';

const TESTIMONIALS = [
  { name: 'Ananya D.', text: 'The butter chicken is unreal and delivery is always on time. Our Friday night go-to!', stars: 5 },
  { name: 'Karan S.', text: 'Booked a table for my parents’ anniversary — the staff made it really special.', stars: 5 },
  { name: 'Meera I.', text: 'Love that I can filter vegan and gluten-free dishes. The Buddha bowl is a must-try.', stars: 4 },
];

export default function Home() {
  const { menu, settings } = useApp();
  const [selected, setSelected] = useState(null);
  const visible = menu.filter((m) => !m.hidden);
  const featured = visible.filter((m) => m.featured).slice(0, 4);
  const specials = visible.filter((m) => m.special);
  const { open, today } = openStatus(settings.hours);

  const services = [
    { key: 'delivery', on: settings.services.delivery, icon: Bike, title: 'Delivery',
      text: `Hot food at your door in about 40 minutes. Free delivery above ${formatCurrency(settings.freeDeliveryAbove)}.` },
    { key: 'pickup', on: settings.services.pickup, icon: Store, title: 'Pickup',
      text: 'Order ahead and skip the queue — most orders are ready in 20 minutes.' },
    { key: 'dineIn', on: settings.services.dineIn, icon: Utensils, title: 'Dine-In',
      text: `Reserve a table for up to ${settings.reservation.maxParty} guests, or walk in and join the waitlist.` },
  ];

  return (
    <>
      {/* Hero */}
      <section className="hero" style={{ backgroundImage: `url(${IMAGES.hero})` }}>
        <div className="hero-overlay" />
        <div className="container hero-content">
          <span className="hero-eyebrow"><Leaf size={14} /> {settings.tagline}</span>
          <h1>Fresh flavours,<br />served your way.</h1>
          <p>Explore our seasonal menu, order online for delivery or pickup, or book a table and let us take care of the rest.</p>
          <div className="hero-actions">
            <Link to="/menu" className="btn btn-primary btn-lg">Order Online <ArrowRight size={18} /></Link>
            <Link to="/reservations" className="btn btn-light btn-lg"><CalendarDays size={18} /> Book a Table</Link>
          </div>
          <div className="hero-meta">
            <span><Star size={16} fill="currentColor" /> 4.8 · 2,300+ reviews</span>
            <span className={`open-pill ${open ? 'is-open' : ''}`}>
              <Clock size={14} />
              {today?.closed ? 'Closed today' : `${open ? 'Open now' : 'Closed now'} · ${formatTime12(today.open)} – ${formatTime12(today.close)}`}
            </span>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="container services">
        {services.map((s) => (
          <div key={s.key} className={`service-card ${s.on ? '' : 'is-off'}`}>
            <div className="service-icon"><s.icon size={22} /></div>
            <div>
              <h3>{s.title} {!s.on && <span className="badge badge-gray">Unavailable</span>}</h3>
              <p className="muted">{s.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Featured */}
      <section className="section container">
        <div className="section-head">
          <div>
            <div className="eyebrow">Chef’s picks</div>
            <h2>Featured dishes</h2>
          </div>
          <Link to="/menu" className="btn btn-ghost">View full menu <ArrowRight size={16} /></Link>
        </div>
        <div className="menu-grid">
          {featured.map((item) => <MenuItemCard key={item.id} item={item} onOpen={setSelected} />)}
        </div>
      </section>

      {/* Specials */}
      {specials.length > 0 && (
        <section className="section specials-band">
          <div className="container specials">
            <div className="specials-text">
              <div className="eyebrow">Only today</div>
              <h2>Today’s specials</h2>
              <p className="muted">Freshly made in small batches — once they’re gone, they’re gone.</p>
            </div>
            <div className="specials-list">
              {specials.map((item) => (
                <button key={item.id} className="special-item" onClick={() => setSelected(item)}>
                  <Img src={item.image} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong>
                    <span className="muted small">{item.description.slice(0, 70)}…</span>
                    <span className="price">{formatCurrency(item.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About */}
      <section className="section container about-split">
        <Img src={IMAGES.interior} alt="Inside the Saffron Table dining room" className="about-img" />
        <div>
          <div className="eyebrow">Our story</div>
          <h2>A neighbourhood kitchen with big flavours</h2>
          <p className="muted">
            {settings.name} started as a 12-table family restaurant in 2015. Today we serve classic North Indian
            dishes next to wood-fired pizzas and fresh bowls — all cooked from scratch with ingredients from local farms.
          </p>
          <div className="about-stats">
            <div><strong>10+</strong><span>years serving</span></div>
            <div><strong>{visible.length}</strong><span>dishes on the menu</span></div>
            <div><strong>4.8★</strong><span>average rating</span></div>
          </div>
          <Link to="/about" className="btn btn-ghost">Read more about us <ArrowRight size={16} /></Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials-band">
        <div className="container">
          <div className="section-head center">
            <div>
              <div className="eyebrow">Reviews</div>
              <h2>What our guests say</h2>
            </div>
          </div>
          <div className="testimonials">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="testimonial">
                <Quote size={22} className="quote-icon" />
                <blockquote>{t.text}</blockquote>
                <figcaption><Stars value={t.stars} size={14} /> <span>{t.name}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Visit */}
      <section className="section container visit">
        <div className="card visit-card">
          <h3><Clock size={18} /> Opening hours</h3>
          <ul className="hours-list">
            {Object.entries(settings.hours).map(([k, h]) => (
              <li key={k}>
                <span>{DAY_NAMES[k]}</span>
                <span>{h.closed ? 'Closed' : `${formatTime12(h.open)} – ${formatTime12(h.close)}`}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card visit-card">
          <h3><MapPin size={18} /> Our locations</h3>
          {settings.locations.map((l) => (
            <div key={l.id} className="location">
              <strong>{l.name}</strong>
              <span className="muted small">{l.address}</span>
              <div className="chip-row">{l.services.map((s) => <span key={s} className="chip chip-sm">{s}</span>)}</div>
            </div>
          ))}
        </div>
        <div className="card visit-card cta-card">
          <ChefHat size={32} />
          <h3>Hungry already?</h3>
          <p>Order online in under a minute, or reserve your table for tonight.</p>
          <Link to="/menu" className="btn btn-primary btn-block">Start your order</Link>
          <Link to="/reservations" className="btn btn-light btn-block">Book a table</Link>
        </div>
      </section>

      <ItemModal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}
