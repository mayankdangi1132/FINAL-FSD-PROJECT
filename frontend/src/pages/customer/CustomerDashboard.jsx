import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, MapPin, MessageSquare, Plus, Receipt, RotateCcw, ShoppingBag, Star, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatAddress, formatCurrency, formatDate, formatDateKey, formatDateTime, formatTime12, toDateKey } from '../../utils/format.js';
import { itemsSummary } from '../../utils/pricing.js';
import { isUpcomingReservation, sortByDateTime } from '../../utils/reservations.js';
import { ACTIVE_STATUSES, ORDER_TYPES, flowFor } from '../../utils/status.js';
import { RateOrderModal } from '../../components/OrderBits.jsx';
import {
  ConfirmDialog, EmptyState, Field, Modal, OrderStatusBadge, ResStatusBadge, StatCard, Stars, Tabs,
} from '../../components/ui.jsx';
import { useReorder } from './useReorder.js';

const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/;

export default function CustomerDashboard() {
  const { user, orders, reservations } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t });

  const myOrders = orders.filter((o) => o.userId === user.id);
  const myRes = reservations.filter((r) => r.userId === user.id);
  const active = myOrders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const upcoming = myRes.filter(isUpcomingReservation).sort(sortByDateTime);
  const reviews = myOrders.filter((o) => o.rating);

  return (
    <div className="container account-page">
      <div className="account-head">
        <div>
          <div className="eyebrow">My account</div>
          <h1>Welcome back, {user.name.split(' ')[0]}</h1>
        </div>
        <div className="btn-row">
          <Link to="/menu" className="btn btn-primary"><ShoppingBag size={16} /> Order food</Link>
          <Link to="/reservations" className="btn btn-ghost"><CalendarDays size={16} /> Book a table</Link>
        </div>
      </div>

      <Tabs
        value={tab} onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'orders', label: 'Orders', count: myOrders.length },
          { id: 'reservations', label: 'Reservations', count: upcoming.length || null },
          { id: 'profile', label: 'Profile & addresses' },
          { id: 'reviews', label: 'My reviews', count: reviews.length || null },
        ]}
      />

      {tab === 'overview' && <Overview active={active} upcoming={upcoming} myOrders={myOrders} setTab={setTab} />}
      {tab === 'orders' && <OrdersTab orders={myOrders} />}
      {tab === 'reservations' && <ReservationsTab reservations={myRes} />}
      {tab === 'profile' && <ProfileTab />}
      {tab === 'reviews' && <ReviewsTab reviews={reviews} />}
    </div>
  );
}

function Overview({ active, upcoming, myOrders, setTab }) {
  const { user } = useApp();
  const spent = myOrders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.total, 0);
  return (
    <div className="stack-lg">
      <div className="stat-grid">
        <StatCard icon={Receipt} label="Orders placed" value={myOrders.length} />
        <StatCard icon={ShoppingBag} label="Active orders" value={active.length} tone="amber" />
        <StatCard icon={CalendarDays} label="Upcoming bookings" value={upcoming.length} tone="blue" />
        <StatCard icon={MapPin} label="Saved addresses" value={(user.addresses || []).length} tone="green" sub={`${formatCurrency(spent)} spent with us`} />
      </div>

      <section className="card">
        <div className="card-head"><h2 className="card-title">Current orders</h2></div>
        {active.length === 0 ? (
          <p className="muted">No orders in progress. <Link to="/menu">Hungry?</Link></p>
        ) : active.map((o) => {
          const flow = flowFor(o.type);
          const pct = ((flow.indexOf(o.status) + 1) / flow.length) * 100;
          return (
            <Link key={o.id} to={`/order/${o.id}`} className="active-order">
              <div className="active-order-top">
                <strong>Order #{o.id}</strong>
                <OrderStatusBadge status={o.status} type={o.type} />
              </div>
              <div className="muted small">{ORDER_TYPES[o.type]} · {itemsSummary(o.items, 2)} · {formatCurrency(o.total)}</div>
              <div className="progress"><div style={{ width: `${pct}%` }} /></div>
              <span className="link-like small">Track order →</span>
            </Link>
          );
        })}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Upcoming reservations</h2>
          <button className="link-btn" onClick={() => setTab('reservations')}>View all</button>
        </div>
        {upcoming.length === 0 ? (
          <p className="muted">No upcoming bookings. <Link to="/reservations">Book a table</Link></p>
        ) : upcoming.slice(0, 3).map((r) => (
          <div key={r.id} className="res-row">
            <div className="res-date"><strong>{formatDateKey(r.date)}</strong><span>{formatTime12(r.time)}</span></div>
            <div className="res-main">{r.guests} guests{r.occasion ? ` · ${r.occasion}` : ''}<div className="muted small">Ref {r.id}</div></div>
            <ResStatusBadge status={r.status} />
          </div>
        ))}
      </section>
    </div>
  );
}

function OrdersTab({ orders }) {
  const reorder = useReorder();
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState('all');
  const [rating, setRating] = useState(null);

  const cutoff = { all: 0, 7: Date.now() - 7 * 86400000, 30: Date.now() - 30 * 86400000 }[range];
  const list = orders.filter((o) =>
    (status === 'all' || (status === 'active' ? ACTIVE_STATUSES.includes(o.status) : o.status === status))
    && new Date(o.createdAt) >= cutoff);

  return (
    <div className="card">
      <div className="filter-bar">
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Filter by date">
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
        <span className="muted small">{list.length} order{list.length === 1 ? '' : 's'}</span>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={Receipt} title="No orders found" text="Try changing the filters." />
      ) : (
        <ul className="history-list">
          {list.map((o) => (
            <li key={o.id} className="history-item">
              <div className="history-main">
                <div className="history-top">
                  <strong>#{o.id}</strong>
                  <span className="muted small">{formatDateTime(o.createdAt)} · {ORDER_TYPES[o.type]}</span>
                  <OrderStatusBadge status={o.status} type={o.type} />
                </div>
                <div className="muted small">{itemsSummary(o.items)}</div>
                {o.rating && <Stars value={o.rating.stars} size={14} />}
              </div>
              <div className="history-side">
                <strong>{formatCurrency(o.total)}</strong>
                <div className="btn-row">
                  <Link to={`/order/${o.id}`} className="btn btn-ghost btn-sm">Details</Link>
                  {['completed', 'cancelled'].includes(o.status) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => reorder(o)}><RotateCcw size={14} /> Reorder</button>
                  )}
                  {o.status === 'completed' && !o.rating && (
                    <button className="btn btn-primary btn-sm" onClick={() => setRating(o)}><Star size={14} /> Rate</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <RateOrderModal order={rating} onClose={() => setRating(null)} />
    </div>
  );
}

function ReservationsTab({ reservations }) {
  const { updateReservation } = useApp();
  const [cancel, setCancel] = useState(null);
  const today = toDateKey();
  const upcoming = reservations.filter(isUpcomingReservation).sort(sortByDateTime);
  const past = reservations.filter((r) => !isUpcomingReservation(r)).sort(sortByDateTime).reverse();

  const canCancel = (r) => {
    if (r.date > today) return true;
    const [h, m] = r.time.split(':').map(Number);
    const now = new Date();
    return h * 60 + m - (now.getHours() * 60 + now.getMinutes()) >= 120;
  };

  const Row = ({ r, showCancel }) => (
    <div className="res-row">
      <div className="res-date"><strong>{formatDateKey(r.date)}</strong><span>{formatTime12(r.time)}</span></div>
      <div className="res-main">
        {r.guests} guests{r.occasion ? ` · ${r.occasion}` : ''}{r.table ? ` · Table ${r.table}` : ''}
        <div className="muted small">Ref {r.id}{r.requests ? ` · “${r.requests}”` : ''}</div>
      </div>
      <ResStatusBadge status={r.status} />
      {showCancel && (canCancel(r)
        ? <button className="btn btn-danger-ghost btn-sm" onClick={() => setCancel(r)}>Cancel</button>
        : <span className="muted small">Call to cancel</span>)}
    </div>
  );

  return (
    <div className="stack-lg">
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Upcoming</h2>
          <Link to="/reservations" className="btn btn-primary btn-sm"><Plus size={14} /> New booking</Link>
        </div>
        {upcoming.length === 0 ? <p className="muted">No upcoming reservations.</p> : upcoming.map((r) => <Row key={r.id} r={r} showCancel />)}
        <p className="muted small">Free cancellation up to 2 hours before your booking.</p>
      </section>
      <section className="card">
        <h2 className="card-title">Past & cancelled</h2>
        {past.length === 0 ? <p className="muted">Nothing here yet.</p> : past.map((r) => <Row key={r.id} r={r} />)}
      </section>
      <ConfirmDialog
        open={!!cancel} onClose={() => setCancel(null)} title="Cancel reservation?"
        message={cancel ? `Your table for ${cancel.guests} on ${formatDateKey(cancel.date)} at ${formatTime12(cancel.time)} will be released.` : ''}
        confirmLabel="Cancel reservation" onConfirm={() => updateReservation(cancel.id, { status: 'cancelled' })}
      />
    </div>
  );
}

function ProfileTab() {
  const { user, updateProfile, addAddress, removeAddress, toast } = useApp();
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone });
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [addr, setAddr] = useState({ label: 'Home', line1: '', area: '', city: 'New Delhi', pincode: '', landmark: '' });
  const [addrErr, setAddrErr] = useState({});

  const saveProfile = async (e) => {
    e.preventDefault();
    const err = {};
    if (profile.name.trim().length < 2) err.name = 'Please enter your name.';
    if (!PHONE_RE.test(profile.phone.trim())) err.phone = 'Enter a valid 10-digit mobile number.';
    setErrors(err);
    if (Object.keys(err).length) return;
    if (await updateProfile({ name: profile.name.trim(), phone: profile.phone.trim() })) toast('Profile updated');
  };

  const saveAddress = async () => {
    const err = {};
    if (!addr.line1.trim()) err.line1 = 'Required';
    if (!addr.area.trim()) err.area = 'Required';
    if (!/^\d{6}$/.test(addr.pincode)) err.pincode = 'Enter a 6-digit PIN code';
    setAddrErr(err);
    if (Object.keys(err).length) return;
    if (!(await addAddress(addr))) return;
    toast('Address saved');
    setAdding(false);
    setAddr({ label: 'Home', line1: '', area: '', city: 'New Delhi', pincode: '', landmark: '' });
  };
  const setA = (k) => (e) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  return (
    <div className="two-col even">
      <form className="card form-card" onSubmit={saveProfile} noValidate>
        <h2 className="card-title">Contact details</h2>
        <Field label="Full name" htmlFor="p-name" error={errors.name}><input id="p-name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></Field>
        <Field label="Email" htmlFor="p-email" hint="Contact support to change your email"><input id="p-email" value={user.email} readOnly /></Field>
        <Field label="Mobile number" htmlFor="p-phone" error={errors.phone}><input id="p-phone" type="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></Field>
        <button className="btn btn-primary">Save changes</button>
      </form>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Saved addresses</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> Add address</button>
        </div>
        {(user.addresses || []).length === 0 && <p className="muted">No saved addresses yet.</p>}
        {(user.addresses || []).map((a) => (
          <div key={a.id} className="address-row">
            <MapPin size={18} />
            <div><strong>{a.label}</strong><div className="muted small">{formatAddress(a)}{a.landmark ? ` (${a.landmark})` : ''}</div></div>
            <button className="icon-btn danger" onClick={() => removeAddress(a.id)} aria-label={`Remove ${a.label} address`}><Trash2 size={16} /></button>
          </div>
        ))}
      </section>

      <Modal
        open={adding} onClose={() => setAdding(false)} title="Add address"
        footer={<><button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" onClick={saveAddress}>Save address</button></>}
      >
        <div className="form-grid">
          <Field label="Label" htmlFor="na-label"><select id="na-label" value={addr.label} onChange={setA('label')}><option>Home</option><option>Work</option><option>Other</option></select></Field>
          <Field label="House / flat, street" htmlFor="na-line1" error={addrErr.line1}><input id="na-line1" value={addr.line1} onChange={setA('line1')} /></Field>
          <Field label="Area" htmlFor="na-area" error={addrErr.area}><input id="na-area" value={addr.area} onChange={setA('area')} /></Field>
          <Field label="City" htmlFor="na-city"><input id="na-city" value={addr.city} onChange={setA('city')} /></Field>
          <Field label="PIN code" htmlFor="na-pin" error={addrErr.pincode}><input id="na-pin" inputMode="numeric" maxLength={6} value={addr.pincode} onChange={setA('pincode')} /></Field>
          <Field label="Landmark" htmlFor="na-landmark"><input id="na-landmark" value={addr.landmark} onChange={setA('landmark')} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function ReviewsTab({ reviews }) {
  if (!reviews.length) {
    return <EmptyState icon={MessageSquare} title="No reviews yet" text="After an order is completed you can rate it from your order history." />;
  }
  return (
    <div className="review-grid">
      {reviews.map((o) => (
        <div key={o.id} className="card review-card">
          <div className="review-top"><Stars value={o.rating.stars} /><span className="muted small">{formatDate(o.rating.at)}</span></div>
          {o.rating.comment ? <p>“{o.rating.comment}”</p> : <p className="muted">No comment</p>}
          <Link to={`/order/${o.id}`} className="muted small">Order #{o.id} · {itemsSummary(o.items, 2)}</Link>
        </div>
      ))}
    </div>
  );
}
