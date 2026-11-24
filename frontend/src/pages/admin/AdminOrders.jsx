import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, formatDateTime, toDateKey } from '../../utils/format.js';
import { itemsSummary } from '../../utils/pricing.js';
import { ACTIVE_STATUSES, ORDER_STATUS, ORDER_TYPES, PAYMENT_METHODS } from '../../utils/status.js';
import { EmptyState, OrderStatusBadge, PageHeader, PaymentBadge, Tabs } from '../../components/ui.jsx';
import { OrderDetailModal } from './shared.jsx';

const PAGE = 15;

export default function AdminOrders() {
  const { orders } = useApp();
  const [view, setView] = useState('active');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase().replace('#', '');
    return orders.filter((o) =>
      (view === 'all' || (view === 'active' ? ACTIVE_STATUSES.includes(o.status) : !ACTIVE_STATUSES.includes(o.status)))
      && (status === 'all' || o.status === status)
      && (type === 'all' || o.type === type)
      && (!date || toDateKey(new Date(o.createdAt)) === date)
      && (!term || o.id.includes(term) || o.customer.name.toLowerCase().includes(term) || (o.customer.phone || '').replace(/\s/g, '').includes(term.replace(/\s/g, ''))));
  }, [orders, view, q, status, type, date]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE, current * PAGE + PAGE);
  const reset = (fn) => (e) => { fn(e.target.value); setPage(0); };
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

  return (
    <>
      <PageHeader title="Orders" subtitle="Search, filter and manage every order across delivery, pickup and dine-in." />
      <Tabs
        value={view} onChange={(v) => { setView(v); setStatus('all'); setPage(0); }}
        tabs={[{ id: 'active', label: 'Active', count: activeCount }, { id: 'past', label: 'Completed & cancelled' }, { id: 'all', label: 'All orders', count: orders.length }]}
      />
      <div className="card">
        <div className="filter-bar">
          <div className="search-box sm">
            <Search size={16} />
            <input type="search" placeholder="Order #, name or phone" value={q} onChange={reset(setQ)} aria-label="Search orders" />
          </div>
          <select className="select" value={status} onChange={reset(setStatus)} aria-label="Status">
            <option value="all">All statuses</option>
            {Object.entries(ORDER_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <select className="select" value={type} onChange={reset(setType)} aria-label="Order type">
            <option value="all">All types</option>
            {Object.entries(ORDER_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input type="date" className="select" value={date} onChange={reset(setDate)} aria-label="Order date" max={toDateKey()} />
          {(q || status !== 'all' || type !== 'all' || date) && (
            <button className="link-btn" onClick={() => { setQ(''); setStatus('all'); setType('all'); setDate(''); setPage(0); }}>Clear</button>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Search} title="No orders found" text="Try different filters." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Order</th><th>Placed</th><th>Customer</th><th>Type</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => setOpen(o.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(o.id)}>
                    <td><strong>#{o.id}</strong></td>
                    <td className="nowrap">{formatDateTime(o.createdAt)}</td>
                    <td>{o.customer.name}<div className="muted small">{o.customer.phone}</div></td>
                    <td>{ORDER_TYPES[o.type]}{o.table ? <div className="muted small">{o.table}</div> : null}</td>
                    <td className="cell-wrap muted small">{itemsSummary(o.items, 2)}</td>
                    <td><strong>{formatCurrency(o.total)}</strong></td>
                    <td><PaymentBadge status={o.payment.status} /><div className="muted small">{PAYMENT_METHODS[o.payment.method]}</div></td>
                    <td><OrderStatusBadge status={o.status} type={o.type} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span className="muted small">Showing {filtered.length ? current * PAGE + 1 : 0}–{Math.min(filtered.length, (current + 1) * PAGE)} of {filtered.length}</span>
          <div className="btn-row">
            <button className="btn btn-ghost btn-sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span className="small">Page {current + 1} of {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
      {open && <OrderDetailModal orderId={open} onClose={() => setOpen(null)} />}
    </>
  );
}
