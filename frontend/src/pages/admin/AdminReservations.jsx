import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, Search, Settings, UserCheck, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDateKey, formatTime12, toDateKey } from '../../utils/format.js';
import { sortByDateTime } from '../../utils/reservations.js';
import { RES_STATUS } from '../../utils/status.js';
import { EmptyState, PageHeader, ResStatusBadge, StatCard } from '../../components/ui.jsx';
import { AccessibilityFlag, ReservationActions, TableSelect } from './shared.jsx';

export default function AdminReservations() {
  const { reservations, settings } = useApp();
  const today = toDateKey();
  const [range, setRange] = useState('upcoming');
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  const list = reservations.filter((r) =>
    (range === 'upcoming' ? r.date >= today : range === 'past' ? r.date < today : r.date === date)
    && (status === 'all' || r.status === status)
    && (!q || r.name.toLowerCase().includes(q.toLowerCase()) || r.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || r.id.toLowerCase().includes(q.toLowerCase())))
    .sort(sortByDateTime);
  if (range === 'past') list.reverse();

  const todays = reservations.filter((r) => r.date === today && r.status !== 'cancelled');

  return (
    <>
      <PageHeader
        title="Reservations"
        subtitle={`Capacity ${settings.reservation.capacity} seats per ${settings.reservation.durationMinutes}-minute sitting · parties up to ${settings.reservation.maxParty}`}
        actions={<Link to="/admin/settings" className="btn btn-ghost"><Settings size={16} /> Booking rules</Link>}
      />
      <div className="stat-grid">
        <StatCard icon={CalendarDays} label="Bookings today" value={todays.length} />
        <StatCard icon={Users} label="Guests today" value={todays.reduce((s, r) => s + r.guests, 0)} tone="blue" />
        <StatCard icon={Clock} label="Awaiting confirmation" value={reservations.filter((r) => r.status === 'pending' && r.date >= today).length} tone="amber" />
        <StatCard icon={UserCheck} label="Seated now" value={reservations.filter((r) => r.status === 'seated').length} tone="green" />
      </div>
      <div className="card">
        <div className="filter-bar">
          <select className="select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
            <option value="upcoming">Today & upcoming</option>
            <option value="day">Specific date</option>
            <option value="past">Past</option>
          </select>
          {range === 'day' && <input type="date" className="select" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />}
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="all">All statuses</option>
            {Object.entries(RES_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <div className="search-box sm"><Search size={16} /><input type="search" placeholder="Name, phone or ref" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search reservations" /></div>
        </div>
        {list.length === 0 ? <EmptyState icon={CalendarDays} title="No reservations" text="Nothing matches these filters." /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Ref</th><th>Date & time</th><th>Guest</th><th>Party</th><th>Requests</th><th>Table</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.id}</strong></td>
                    <td className="nowrap">{r.date === today ? 'Today' : formatDateKey(r.date)}<div className="muted small">{formatTime12(r.time)}</div></td>
                    <td>{r.name}<div className="muted small">{r.phone}</div></td>
                    <td>{r.guests}</td>
                    <td className="cell-wrap small">
                      {r.occasion && <span className="badge badge-purple">{r.occasion}</span>} <AccessibilityFlag r={r} />
                      {r.requests && <div className="muted">{r.requests}</div>}
                    </td>
                    <td><TableSelect r={r} /></td>
                    <td><ResStatusBadge status={r.status} /></td>
                    <td><ReservationActions r={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
