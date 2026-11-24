import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, ClipboardList, IndianRupee, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { addDays, formatClock, formatCurrency, formatDateKey, formatTime12, isSameDay, toDateKey } from '../../utils/format.js';
import { isUpcomingReservation, sortByDateTime } from '../../utils/reservations.js';
import { ACTIVE_STATUSES, ORDER_STATUS, ORDER_TYPES, statusLabel } from '../../utils/status.js';
import { BarChart, HBars, Img, OrderStatusBadge, PageHeader, ResStatusBadge, StatCard } from '../../components/ui.jsx';
import { OrderDetailModal } from './shared.jsx';

export default function AdminOverview() {
  const { orders, reservations, menu, user, patchMenuItem } = useApp();
  const [openOrder, setOpenOrder] = useState(null);
  const now = new Date();

  const valid = orders.filter((o) => o.status !== 'cancelled');
  const todayOrders = orders.filter((o) => isSameDay(o.createdAt, now));
  const todaySales = todayOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const weekAgo = addDays(now, -7);
  const week = valid.filter((o) => new Date(o.createdAt) >= weekAgo);
  const avg = week.length ? week.reduce((s, o) => s + o.total, 0) / week.length : 0;
  const upcoming = reservations.filter(isUpcomingReservation).sort(sortByDateTime);
  const todaysRes = reservations.filter((r) => r.date === toDateKey() && r.status !== 'cancelled');
  const cancelledToday = todayOrders.filter((o) => o.status === 'cancelled').length;

  const salesData = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(now, i - 6);
    const total = valid.filter((o) => isSameDay(o.createdAt, day)).reduce((s, o) => s + o.total, 0);
    return { label: i === 6 ? 'Today' : day.toLocaleDateString('en-IN', { weekday: 'short' }), value: total };
  });

  const statusCounts = ['placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'served'].map((s) => ({
    label: statusLabel(s, 'pickup').replace(' for Pickup', ''), value: active.filter((o) => o.status === s).length, tone: ORDER_STATUS[s].tone,
  }));

  const monthAgo = addDays(now, -30);
  const qtyById = {};
  valid.filter((o) => new Date(o.createdAt) >= monthAgo).forEach((o) => o.items.forEach((l) => { qtyById[l.itemId] = (qtyById[l.itemId] || 0) + l.qty; }));
  const popular = Object.entries(qtyById).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, qty]) => ({ item: menu.find((m) => m.id === id), qty })).filter((p) => p.item);
  const lowStock = menu.filter((m) => !m.hidden && (!m.available || (m.stock != null && m.stock <= 5)));

  return (
    <>
      <PageHeader
        title={`Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, ${user.name.split(' ')[0]}`}
        subtitle={`Here's what's happening at the restaurant today, ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.`}
      />

      <div className="stat-grid">
        <StatCard icon={IndianRupee} label="Today's sales" value={formatCurrency(todaySales)} sub={`${todayOrders.length - cancelledToday} orders`} />
        <StatCard icon={ClipboardList} label="Active orders" value={active.length} sub={`${cancelledToday} cancelled today`} tone="amber" />
        <StatCard icon={TrendingUp} label="Avg. order value (7d)" value={formatCurrency(avg)} sub={`${week.length} orders this week`} tone="green" />
        <StatCard icon={CalendarDays} label="Upcoming reservations" value={upcoming.length} sub={`${todaysRes.reduce((s, r) => s + r.guests, 0)} guests booked today`} tone="blue" />
      </div>

      <div className="grid-2-1">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Sales — last 7 days</h2>
            <Link to="/admin/reports" className="link-btn">Full report</Link>
          </div>
          <BarChart data={salesData} format={(v) => `₹${(v / 1000).toFixed(1)}k`} />
        </section>
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Live order pipeline</h2>
            <Link to="/kitchen" className="link-btn">Kitchen view</Link>
          </div>
          <HBars data={statusCounts} />
        </section>
      </div>

      <div className="grid-2-1">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Recent orders</h2>
            <Link to="/admin/orders" className="link-btn">All orders</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {orders.slice(0, 8).map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => setOpenOrder(o.id)}>
                    <td><strong>#{o.id}</strong><div className="muted small">{formatClock(o.createdAt)}</div></td>
                    <td>{o.customer.name}</td>
                    <td>{ORDER_TYPES[o.type]}</td>
                    <td>{formatCurrency(o.total)}</td>
                    <td><OrderStatusBadge status={o.status} type={o.type} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Upcoming reservations</h2>
            <Link to="/admin/reservations" className="link-btn">Manage</Link>
          </div>
          {upcoming.slice(0, 6).map((r) => (
            <div key={r.id} className="res-row compact">
              <div className="res-date"><strong>{r.date === toDateKey() ? 'Today' : formatDateKey(r.date)}</strong><span>{formatTime12(r.time)}</span></div>
              <div className="res-main">{r.name}<div className="muted small">{r.guests} guests{r.table ? ` · ${r.table}` : ''}</div></div>
              <ResStatusBadge status={r.status} />
            </div>
          ))}
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Most popular (30 days)</h2>
          <ol className="rank-list">
            {popular.map(({ item, qty }, i) => (
              <li key={item.id}>
                <span className="rank">{i + 1}</span>
                <Img src={item.image} alt="" className="rank-img" />
                <span className="rank-name">{item.name}</span>
                <span className="muted small">{qty} sold</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <div className="card-head">
            <h2 className="card-title"><AlertTriangle size={18} className="text-amber" /> Low availability</h2>
            <Link to="/admin/menu" className="link-btn">Manage menu</Link>
          </div>
          {lowStock.length === 0 && <p className="muted">Everything is in stock.</p>}
          {lowStock.map((m) => (
            <div key={m.id} className="low-row">
              <span>{m.name}</span>
              {m.available
                ? <span className="badge badge-amber">{m.stock} left</span>
                : <span className="badge badge-red">Unavailable</span>}
              {!m.available && (
                <button className="btn btn-ghost btn-sm" onClick={() => patchMenuItem(m.id, { available: true, stock: m.stock === 0 ? 20 : m.stock }, `Marked "${m.name}" as available`)}>
                  Restock
                </button>
              )}
            </div>
          ))}
        </section>
      </div>

      {openOrder && <OrderDetailModal orderId={openOrder} onClose={() => setOpenOrder(null)} />}
    </>
  );
}
