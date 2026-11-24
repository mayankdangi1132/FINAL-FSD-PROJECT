import { useEffect, useState } from 'react';
import { AlertTriangle, Bike, CalendarClock, ChefHat, Clock, Flame, Store, Utensils } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatClock, formatTime12, minutesSince } from '../../utils/format.js';
import { describeLine } from '../../utils/pricing.js';
import { ORDER_TYPES, statusLabel } from '../../utils/status.js';
import { EmptyState, VegMark } from '../../components/ui.jsx';

const TYPE_ICON = { delivery: Bike, pickup: Store, 'dine-in': Utensils };

const COLUMNS = [
  { id: 'new', title: 'New orders', statuses: ['placed', 'confirmed'], since: 'placed' },
  { id: 'preparing', title: 'Preparing', statuses: ['preparing'], since: 'preparing' },
  { id: 'ready', title: 'Ready / at the pass', statuses: ['ready'], since: 'ready' },
];

function useTick(ms = 30000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export default function KitchenDashboard() {
  const { orders, updateOrderStatus } = useApp();
  const [type, setType] = useState('all');
  useTick();

  const live = orders
    .filter((o) => ['placed', 'confirmed', 'preparing', 'ready'].includes(o.status) && (type === 'all' || o.type === type))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // oldest first

  const at = (o, status) => o.history.filter((h) => h.status === status).at(-1)?.at || o.createdAt;

  return (
    <div className="kds">
      <div className="kds-head">
        <div>
          <h1><ChefHat size={26} /> Kitchen display</h1>
          <p className="muted">Oldest orders first. Tap a button to move an order to the next stage.</p>
        </div>
        <div className="kds-controls">
          <div className="segmented" role="group" aria-label="Filter by order type">
            {['all', 'dine-in', 'pickup', 'delivery'].map((t) => (
              <button key={t} className={type === t ? 'active' : ''} onClick={() => setType(t)} aria-pressed={type === t}>
                {t === 'all' ? 'All' : ORDER_TYPES[t]}
              </button>
            ))}
          </div>
          <span className="kds-clock"><Clock size={16} /> {formatClock(new Date())}</span>
        </div>
      </div>

      <div className="kds-board">
        {COLUMNS.map((col) => {
          const list = live.filter((o) => col.statuses.includes(o.status));
          return (
            <section key={col.id} className={`kds-col kds-${col.id}`} aria-label={col.title}>
              <h2 className="kds-col-title">{col.title} <span className="kds-count">{list.length}</span></h2>
              {list.length === 0 && <EmptyState icon={ChefHat} title="Nothing here" text={col.id === 'new' ? 'New orders will appear automatically.' : ''} />}
              {list.map((o) => {
                const mins = minutesSince(at(o, col.since));
                const totalMins = minutesSince(o.createdAt);
                const urgency = col.id === 'ready' ? '' : totalMins >= 25 ? 'late' : totalMins >= 15 ? 'warn' : '';
                const TypeIcon = TYPE_ICON[o.type];
                return (
                  <article key={o.id} className={`ticket ${urgency}`}>
                    <header className="ticket-head">
                      <div>
                        <strong className="ticket-no">#{o.id}</strong>
                        <span className={`type-chip type-${o.type}`}><TypeIcon size={13} /> {ORDER_TYPES[o.type]}{o.table ? ` · ${o.table}` : ''}</span>
                      </div>
                      <span className={`ticket-time ${urgency}`} title={`Placed at ${formatClock(o.createdAt)}`}>
                        {urgency === 'late' && <AlertTriangle size={13} />} {mins} min
                      </span>
                    </header>
                    {o.scheduledFor && <div className="ticket-flag"><CalendarClock size={14} /> Scheduled for {formatTime12(o.scheduledFor)}</div>}
                    <ul className="ticket-items">
                      {o.items.map((l, i) => (
                        <li key={i}>
                          <span className="ticket-qty">{l.qty}</span>
                          <div>
                            <div className="ticket-name"><VegMark veg={l.veg} /> {l.name}</div>
                            {describeLine(l) && <div className="ticket-mods">{describeLine(l)}</div>}
                            {l.note && <div className="ticket-note">⚑ {l.note}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {o.instructions && <div className="ticket-instructions"><Flame size={14} /> {o.instructions}</div>}
                    <footer className="ticket-foot">
                      <span className="muted small">{o.customer.name.split(' ')[0]} · {statusLabel(o.status, o.type)}</span>
                      {o.status === 'placed' && <button className="btn btn-ghost btn-sm" onClick={() => updateOrderStatus(o.id, 'confirmed')}>Accept</button>}
                      {o.status === 'confirmed' && <button className="btn btn-primary btn-sm" onClick={() => updateOrderStatus(o.id, 'preparing')}>Start preparing</button>}
                      {o.status === 'preparing' && <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'ready')}>Mark ready</button>}
                      {o.status === 'ready' && <span className="muted small">{o.type === 'dine-in' ? 'Waiting for server' : o.type === 'pickup' ? 'Waiting for customer' : 'Waiting for rider'}</span>}
                    </footer>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
