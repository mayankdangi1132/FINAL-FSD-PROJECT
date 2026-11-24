import { useState } from 'react';
import { Ban, CalendarDays, Download, IndianRupee, Receipt, Star, TrendingUp, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { addDays, formatCurrency, isSameDay, toDateKey } from '../../utils/format.js';
import { ORDER_TYPES, PAYMENT_METHODS } from '../../utils/status.js';
import { BarChart, HBars, PageHeader, StatCard } from '../../components/ui.jsx';

export default function AdminReports() {
  const { orders, reservations, menu, toast } = useApp();
  const [days, setDays] = useState(7);
  const now = new Date();
  const since = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -(days - 1));
  const sinceKey = toDateKey(since);

  const inRange = orders.filter((o) => new Date(o.createdAt) >= since);
  const valid = inRange.filter((o) => o.status !== 'cancelled');
  const cancelled = inRange.length - valid.length;
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const rated = valid.filter((o) => o.rating);
  const avgRating = rated.length ? rated.reduce((s, o) => s + o.rating.stars, 0) / rated.length : 0;
  const resInRange = reservations.filter((r) => r.date >= sinceKey && r.date <= toDateKey(now));
  const guests = resInRange.filter((r) => ['completed', 'seated'].includes(r.status)).reduce((s, r) => s + r.guests, 0);

  const dayList = Array.from({ length: days }, (_, i) => addDays(since, i));
  const labelFor = (d) => (days <= 7 ? d.toLocaleDateString('en-IN', { weekday: 'short' }) : `${d.getDate()}/${d.getMonth() + 1}`);
  const revenueByDay = dayList.map((d) => ({ label: labelFor(d), value: valid.filter((o) => isSameDay(o.createdAt, d)).reduce((s, o) => s + o.total, 0) }));
  const ordersByDay = dayList.map((d) => ({ label: labelFor(d), value: inRange.filter((o) => isSameDay(o.createdAt, d)).length }));
  const resByDay = dayList.map((d) => ({ label: labelFor(d), value: resInRange.filter((r) => r.date === toDateKey(d) && r.status !== 'cancelled').length }));

  const byType = Object.entries(ORDER_TYPES).map(([k, label]) => ({ label, value: valid.filter((o) => o.type === k).length }));
  const byPayment = Object.entries(PAYMENT_METHODS).map(([k, label]) => ({ label, value: valid.filter((o) => o.payment.method === k).length, tone: 'blue' }));

  const itemStats = {};
  valid.forEach((o) => o.items.forEach((l) => {
    const s = itemStats[l.itemId] || (itemStats[l.itemId] = { name: l.name, qty: 0, revenue: 0 });
    s.qty += l.qty;
    s.revenue += l.qty * l.price;
  }));
  const topItems = Object.entries(itemStats).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8);

  const exportCsv = () => {
    const header = ['Order', 'Date', 'Customer', 'Type', 'Status', 'Payment', 'Subtotal', 'Discount', 'Tax', 'Fee', 'Total'];
    const rows = inRange.map((o) => [o.id, new Date(o.createdAt).toISOString(), o.customer.name, o.type, o.status, o.payment.method, o.subtotal, o.discount, o.tax, o.fee, o.total]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `orders-last-${days}-days.csv` });
    a.click();
    URL.revokeObjectURL(url);
    toast('Report downloaded');
  };

  const k = (v) => (v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Sales, order volume and reservation activity."
        actions={(
          <>
            <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button className="btn btn-ghost" onClick={exportCsv}><Download size={16} /> Export CSV</button>
          </>
        )}
      />
      <div className="stat-grid six">
        <StatCard icon={IndianRupee} label="Revenue" value={formatCurrency(revenue)} />
        <StatCard icon={Receipt} label="Orders" value={valid.length} tone="blue" />
        <StatCard icon={TrendingUp} label="Avg. order value" value={formatCurrency(valid.length ? revenue / valid.length : 0)} tone="green" />
        <StatCard icon={Ban} label="Cancellation rate" value={`${inRange.length ? Math.round((cancelled / inRange.length) * 100) : 0}%`} sub={`${cancelled} cancelled`} tone="red" />
        <StatCard icon={CalendarDays} label="Reservations" value={resInRange.filter((r) => r.status !== 'cancelled').length} sub={`${guests} guests seated`} tone="purple" />
        <StatCard icon={Star} label="Avg. rating" value={avgRating ? avgRating.toFixed(1) : '—'} sub={`${rated.length} reviews`} tone="amber" />
      </div>

      <section className="card">
        <h2 className="card-title">Daily revenue</h2>
        <BarChart data={revenueByDay} format={k} height={220} />
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Order volume per day</h2>
          <BarChart data={ordersByDay} height={170} />
        </section>
        <section className="card">
          <h2 className="card-title">Reservations per day</h2>
          <BarChart data={resByDay} height={170} />
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Orders by type</h2>
          <HBars data={byType} />
          <h2 className="card-title spaced">Payment methods</h2>
          <HBars data={byPayment} />
        </section>
        <section className="card">
          <h2 className="card-title"><Users size={18} /> Top items by revenue</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Item</th><th>Qty sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {topItems.map(([id, s]) => (
                  <tr key={id}><td>{s.name}{!menu.some((m) => m.id === id) && <span className="muted small"> (removed)</span>}</td><td>{s.qty}</td><td>{formatCurrency(s.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
