import { useState } from 'react';
import {
  Armchair, Bell, CalendarDays, Clock, HandPlatter, ListPlus, Plus, Search, Trash2, UserPlus, Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, formatTime12, timeAgo, toDateKey, addDays, formatDateKey } from '../../utils/format.js';
import { itemsSummary } from '../../utils/pricing.js';
import { sortByDateTime } from '../../utils/reservations.js';
import { ORDER_TYPES, TABLE_STATUS, statusLabel } from '../../utils/status.js';
import {
  EmptyState, Field, Modal, OrderStatusBadge, QtyStepper, ResStatusBadge, StatCard, TableBadge, VegMark,
} from '../../components/ui.jsx';
import { AccessibilityFlag, OrderDetailModal, ReservationActions, TableSelect } from '../admin/shared.jsx';

export default function FohDashboard() {
  const { reservations, tables, orders, waitlist, updateOrderStatus } = useApp();
  const [day, setDay] = useState('today');
  const [tableModal, setTableModal] = useState(null);
  const [newOrder, setNewOrder] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);

  const dateKey = day === 'today' ? toDateKey() : toDateKey(addDays(new Date(), 1));
  const dayRes = reservations.filter((r) => r.date === dateKey).sort(sortByDateTime);
  const todays = reservations.filter((r) => r.date === toDateKey() && r.status !== 'cancelled');
  const dineIn = orders.filter((o) => o.type === 'dine-in' && ['placed', 'confirmed', 'preparing', 'ready', 'served'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const handoff = orders.filter((o) => o.status === 'ready' && o.type !== 'dine-in');
  const outForDelivery = orders.filter((o) => o.status === 'out-for-delivery');
  const free = tables.filter((t) => t.status === 'free').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Front of house</h1>
          <p className="muted">Reservations, tables, the waitlist and dine-in service at a glance.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setNewOrder(true)}><Plus size={16} /> New dine-in order</button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon={CalendarDays} label="Bookings today" value={todays.length} sub={`${todays.reduce((s, r) => s + r.guests, 0)} guests`} />
        <StatCard icon={Users} label="Seated now" value={reservations.filter((r) => r.status === 'seated').length} tone="purple" />
        <StatCard icon={Armchair} label="Free tables" value={`${free} / ${tables.length}`} tone="green" />
        <StatCard icon={Bell} label="Ready to serve" value={dineIn.filter((o) => o.status === 'ready').length + handoff.length} sub="dine-in + handoffs" tone="amber" />
      </div>

      <div className="grid-2-1">
        {/* Floor plan */}
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Floor plan</h2>
            <div className="legend">
              {Object.entries(TABLE_STATUS).map(([k, s]) => <span key={k} className={`legend-item tone-${s.tone}`}>{s.label}</span>)}
            </div>
          </div>
          <div className="floor">
            {tables.map((t) => {
              const res = reservations.find((r) => r.table === t.id && r.date === toDateKey() && ['confirmed', 'seated', 'pending'].includes(r.status));
              const ord = dineIn.find((o) => o.table === t.id);
              return (
                <button key={t.id} className={`table-tile st-${t.status}`} onClick={() => setTableModal(t.id)} aria-label={`Table ${t.id}, ${t.seats} seats, ${t.status}`}>
                  <span className="tile-id">{t.id}</span>
                  <span className="tile-seats"><Users size={12} /> {t.seats}</span>
                  <span className="tile-info">
                    {ord ? statusLabel(ord.status, 'dine-in') : res ? `${res.name.split(' ')[0]} · ${formatTime12(res.time)}` : TABLE_STATUS[t.status].label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <Waitlist />
      </div>

      <div className="grid-2">
        {/* Dine-in orders */}
        <section className="card">
          <div className="card-head">
            <h2 className="card-title"><HandPlatter size={18} /> Dine-in orders</h2>
            <span className="muted small">{dineIn.length} open</span>
          </div>
          {dineIn.length === 0 && <p className="muted">No open dine-in orders.</p>}
          {dineIn.map((o) => (
            <div key={o.id} className={`service-row ${o.status === 'ready' ? 'highlight' : ''}`}>
              <button className="service-main link-plain" onClick={() => setOpenOrder(o.id)}>
                <strong>{o.table} · #{o.id}</strong>
                <span className="muted small">{itemsSummary(o.items, 2)} · {timeAgo(o.createdAt)}</span>
              </button>
              <OrderStatusBadge status={o.status} type={o.type} />
              {o.status === 'placed' && <button className="btn btn-ghost btn-sm" onClick={() => updateOrderStatus(o.id, 'confirmed')}>Confirm</button>}
              {o.status === 'ready' && <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'served')}>Mark served</button>}
              {o.status === 'served' && <button className="btn btn-primary btn-sm" onClick={() => updateOrderStatus(o.id, 'completed', 'Bill paid at table')}>Close bill · {formatCurrency(o.total)}</button>}
            </div>
          ))}
        </section>

        {/* Pickup / delivery handoff */}
        <section className="card">
          <div className="card-head">
            <h2 className="card-title"><Bell size={18} /> Ready for handoff</h2>
            <span className="muted small">Pickup & delivery</span>
          </div>
          {handoff.length === 0 && outForDelivery.length === 0 && <p className="muted">Nothing waiting at the counter.</p>}
          {handoff.map((o) => (
            <div key={o.id} className="service-row highlight">
              <button className="service-main link-plain" onClick={() => setOpenOrder(o.id)}>
                <strong>#{o.id} · {o.customer.name}</strong>
                <span className="muted small">{ORDER_TYPES[o.type]} · {itemsSummary(o.items, 2)}</span>
              </button>
              {o.type === 'pickup'
                ? <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'completed', 'Collected by customer')}>Handed over</button>
                : <button className="btn btn-primary btn-sm" onClick={() => updateOrderStatus(o.id, 'out-for-delivery')}>Dispatch</button>}
            </div>
          ))}
          {outForDelivery.map((o) => (
            <div key={o.id} className="service-row">
              <button className="service-main link-plain" onClick={() => setOpenOrder(o.id)}>
                <strong>#{o.id} · {o.customer.name}</strong>
                <span className="muted small">Out for delivery · {timeAgo(o.history.at(-1).at)}</span>
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => updateOrderStatus(o.id, 'completed', 'Delivered')}>Delivered</button>
            </div>
          ))}
        </section>
      </div>

      {/* Reservations */}
      <section className="card">
        <div className="card-head">
          <h2 className="card-title"><CalendarDays size={18} /> Reservations</h2>
          <div className="segmented" role="group" aria-label="Day">
            <button className={day === 'today' ? 'active' : ''} onClick={() => setDay('today')}>Today</button>
            <button className={day === 'tomorrow' ? 'active' : ''} onClick={() => setDay('tomorrow')}>Tomorrow</button>
          </div>
        </div>
        {dayRes.length === 0 ? <EmptyState icon={CalendarDays} title="No reservations" text={`Nothing booked for ${formatDateKey(dateKey)}.`} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Time</th><th>Guest</th><th>Party</th><th>Notes</th><th>Table</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {dayRes.map((r) => (
                  <tr key={r.id} className={r.status === 'cancelled' ? 'row-muted' : ''}>
                    <td><strong>{formatTime12(r.time)}</strong></td>
                    <td>{r.name}<div className="muted small">{r.phone}</div></td>
                    <td>{r.guests}</td>
                    <td className="cell-wrap small">{r.occasion && <span className="badge badge-purple">{r.occasion}</span>} <AccessibilityFlag r={r} />{r.requests && <div className="muted">{r.requests}</div>}</td>
                    <td><TableSelect r={r} /></td>
                    <td><ResStatusBadge status={r.status} /></td>
                    <td><ReservationActions r={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {tableModal && <TableModal id={tableModal} onClose={() => setTableModal(null)} />}
      {newOrder && <NewDineInOrder onClose={() => setNewOrder(false)} />}
      {openOrder && <OrderDetailModal orderId={openOrder} onClose={() => setOpenOrder(null)} />}
    </>
  );
}

function TableModal({ id, onClose }) {
  const { tables, setTableStatus } = useApp();
  const t = tables.find((x) => x.id === id);
  return (
    <Modal open onClose={onClose} title={`Table ${t.id}`} size="sm">
      <p className="muted">{t.seats} seats · {t.zone}</p>
      <p>Current status: <TableBadge status={t.status} /></p>
      <div className="pill-group">
        {Object.entries(TABLE_STATUS).map(([k, s]) => (
          <button key={k} className={`pill ${t.status === k ? 'active' : ''}`} onClick={() => { setTableStatus(t.id, k); onClose(); }}>{s.label}</button>
        ))}
      </div>
    </Modal>
  );
}

function Waitlist() {
  const { waitlist, tables, addToWaitlist, removeFromWaitlist, seatFromWaitlist } = useApp();
  const [form, setForm] = useState({ name: '', guests: 2, phone: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const freeTables = tables.filter((t) => t.status === 'free');

  const add = (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { setError('Enter a name.'); return; }
    addToWaitlist({ name: form.name.trim(), guests: Number(form.guests), phone: form.phone.trim() });
    setForm({ name: '', guests: 2, phone: '' });
    setError('');
    setAdding(false);
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title"><ListPlus size={18} /> Waitlist</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding((a) => !a)}><UserPlus size={14} /> Add walk-in</button>
      </div>
      {adding && (
        <form className="waitlist-form" onSubmit={add}>
          <Field label="Name" htmlFor="w-name" error={error}><input id="w-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <div className="form-grid">
            <Field label="Guests" htmlFor="w-guests"><input id="w-guests" type="number" min="1" max="20" value={form.guests} onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))} /></Field>
            <Field label="Phone" htmlFor="w-phone"><input id="w-phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
          </div>
          <button className="btn btn-primary btn-sm btn-block">Add to waitlist</button>
        </form>
      )}
      {waitlist.length === 0 && !adding && <p className="muted">No one waiting.</p>}
      {waitlist.map((w, i) => (
        <div key={w.id} className="wait-row">
          <span className="wait-pos">{i + 1}</span>
          <div className="wait-main">
            <strong>{w.name}</strong>
            <span className="muted small"><Users size={12} className="inline-icon" /> {w.guests} · <Clock size={12} className="inline-icon" /> {timeAgo(w.addedAt)}</span>
          </div>
          <select
            className="select select-sm" value="" aria-label={`Seat ${w.name}`}
            onChange={(e) => e.target.value && seatFromWaitlist(w.id, e.target.value)}
          >
            <option value="">Seat at…</option>
            {freeTables.map((t) => <option key={t.id} value={t.id} disabled={t.seats < w.guests}>{t.id} ({t.seats})</option>)}
          </select>
          <button className="icon-btn danger" onClick={() => removeFromWaitlist(w.id)} aria-label={`Remove ${w.name}`}><Trash2 size={16} /></button>
        </div>
      ))}
    </section>
  );
}

function NewDineInOrder({ onClose }) {
  const { tables, menu, createStaffOrder } = useApp();
  const [table, setTable] = useState(tables.find((t) => t.status === 'occupied')?.id || tables[0].id);
  const [q, setQ] = useState('');
  const [qty, setQty] = useState({});
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const available = menu.filter((m) => !m.hidden && m.available && (!q || m.name.toLowerCase().includes(q.toLowerCase())));
  const chosen = Object.entries(qty).filter(([, n]) => n > 0).map(([id, n]) => ({ item: menu.find((m) => m.id === id), n }));
  const total = chosen.reduce((s, c) => s + c.item.price * c.n, 0);

  const submit = async () => {
    if (!chosen.length) { setError('Add at least one item.'); return; }
    const items = chosen.map(({ item, n }) => {
      const selections = {};
      item.options.forEach((g) => { selections[g.name] = g.choices[0].label; });
      return { itemId: item.id, name: item.name, veg: item.veg, price: item.price, qty: n, selections, addOns: [], note: '' };
    });
    if (await createStaffOrder({ table, items, instructions: note.trim() })) onClose();
  };

  return (
    <Modal
      open onClose={onClose} title="New dine-in order" size="lg"
      footer={(
        <>
          <span className="muted">{chosen.reduce((s, c) => s + c.n, 0)} items · {formatCurrency(total)}</span>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Send to kitchen</button>
        </>
      )}
    >
      <div className="form-grid">
        <Field label="Table" htmlFor="no-table">
          <select id="no-table" value={table} onChange={(e) => setTable(e.target.value)}>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.seats} seats ({t.status})</option>)}
          </select>
        </Field>
        <Field label="Search menu" htmlFor="no-search">
          <div className="search-box sm"><Search size={16} /><input id="no-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. naan" /></div>
        </Field>
      </div>
      <div className="picker-list">
        {available.map((m) => (
          <div key={m.id} className="picker-row">
            <VegMark veg={m.veg} />
            <span className="picker-name">{m.name}{m.options.length > 0 && <span className="muted small"> · default options</span>}</span>
            <span className="muted">{formatCurrency(m.price)}</span>
            <QtyStepper value={qty[m.id] || 0} min={0} onChange={(n) => { setQty((s) => ({ ...s, [m.id]: Math.max(0, n) })); setError(''); }} size="sm" />
          </div>
        ))}
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
      <Field label="Notes for the kitchen" htmlFor="no-note">
        <input id="no-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergies, timing, etc." />
      </Field>
    </Modal>
  );
}
