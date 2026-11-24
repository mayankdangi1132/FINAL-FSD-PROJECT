import { useState } from 'react';
import { Info, RotateCcw, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { DAY_NAMES } from '../../utils/format.js';
import { ConfirmDialog, Field, PageHeader, Toggle } from '../../components/ui.jsx';

export default function AdminSettings() {
  const { settings, updateSettings, resetDemo } = useApp();
  const [s, setS] = useState(structuredClone(settings));
  const [errors, setErrors] = useState({});
  const [confirmReset, setConfirmReset] = useState(false);

  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value }));
  const setNum = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value === '' ? '' : Number(e.target.value) }));
  const setRes = (k) => (e) => setS((x) => ({ ...x, reservation: { ...x.reservation, [k]: Number(e.target.value) } }));
  const setHour = (day, k, v) => setS((x) => ({ ...x, hours: { ...x.hours, [day]: { ...x.hours[day], [k]: v } } }));
  const setService = (k, v) => setS((x) => ({ ...x, services: { ...x.services, [k]: v } }));

  const save = (e) => {
    e.preventDefault();
    const err = {};
    if (!s.name.trim()) err.name = 'Restaurant name is required.';
    if (!(s.taxRate >= 0 && s.taxRate <= 28)) err.taxRate = 'Tax must be between 0 and 28%.';
    if (!(s.deliveryFee >= 0)) err.deliveryFee = 'Enter 0 or more.';
    if (!s.services.delivery && !s.services.pickup && !s.services.dineIn) err.services = 'Enable at least one service.';
    Object.entries(s.hours).forEach(([d, h]) => { if (!h.closed && h.open >= h.close) err[`h-${d}`] = 'Closing must be after opening.'; });
    if (!(s.reservation.maxParty >= 1 && s.reservation.maxParty <= s.reservation.capacity)) err.maxParty = 'Must be between 1 and seat capacity.';
    setErrors(err);
    if (Object.keys(err).length) return;
    updateSettings(s);
  };

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title="Restaurant settings"
        subtitle="Business details, hours, services, fees and reservation rules."
        actions={<button className="btn btn-primary"><Save size={16} /> Save settings</button>}
      />

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Restaurant details</h2>
          <Field label="Restaurant name" htmlFor="st-name" error={errors.name}><input id="st-name" value={s.name} onChange={set('name')} /></Field>
          <Field label="Tagline" htmlFor="st-tag"><input id="st-tag" value={s.tagline} onChange={set('tagline')} /></Field>
          <div className="form-grid">
            <Field label="Phone" htmlFor="st-phone"><input id="st-phone" value={s.phone} onChange={set('phone')} /></Field>
            <Field label="Email" htmlFor="st-email"><input id="st-email" value={s.email} onChange={set('email')} /></Field>
          </div>
          <Field label="Main address" htmlFor="st-addr"><textarea id="st-addr" rows={2} value={s.address} onChange={set('address')} /></Field>
        </section>

        <section className="card">
          <h2 className="card-title">Opening hours</h2>
          <div className="hours-editor">
            {Object.entries(s.hours).map(([day, h]) => (
              <div key={day} className={`hours-row ${errors[`h-${day}`] ? 'has-error' : ''}`}>
                <span className="hours-day">{DAY_NAMES[day]}</span>
                <input type="time" value={h.open} disabled={h.closed} onChange={(e) => setHour(day, 'open', e.target.value)} aria-label={`${DAY_NAMES[day]} opening time`} />
                <span className="muted">to</span>
                <input type="time" value={h.close} disabled={h.closed} onChange={(e) => setHour(day, 'close', e.target.value)} aria-label={`${DAY_NAMES[day]} closing time`} />
                <label className="check-row small"><input type="checkbox" checked={h.closed} onChange={(e) => setHour(day, 'closed', e.target.checked)} /> Closed</label>
                {errors[`h-${day}`] && <span className="field-error">{errors[`h-${day}`]}</span>}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Services & checkout</h2>
          <div className="toggle-list">
            <Toggle id="sv-del" checked={s.services.delivery} onChange={(v) => setService('delivery', v)} label="Delivery" />
            <Toggle id="sv-pick" checked={s.services.pickup} onChange={(v) => setService('pickup', v)} label="Pickup" />
            <Toggle id="sv-dine" checked={s.services.dineIn} onChange={(v) => setService('dineIn', v)} label="Dine-in ordering" />
            <Toggle id="sv-cash" checked={s.cashPayments} onChange={(v) => setS((x) => ({ ...x, cashPayments: v }))} label="Accept cash on delivery / pickup" />
          </div>
          {errors.services && <div className="field-error">{errors.services}</div>}
          <p className="hint-box"><Info size={16} /> Customers must sign in to order or book a table. Each account can hold up to 3 upcoming bookings and 3 unconfirmed orders, which stops spam and bot bookings.</p>
          <h3 className="sub-title">Fees & taxes</h3>
          <div className="form-grid">
            <Field label="GST (%)" htmlFor="st-tax" error={errors.taxRate}><input id="st-tax" type="number" min="0" value={s.taxRate} onChange={setNum('taxRate')} /></Field>
            <Field label="Delivery fee (₹)" htmlFor="st-fee" error={errors.deliveryFee}><input id="st-fee" type="number" min="0" value={s.deliveryFee} onChange={setNum('deliveryFee')} /></Field>
            <Field label="Free delivery above (₹)" htmlFor="st-free"><input id="st-free" type="number" min="0" value={s.freeDeliveryAbove} onChange={setNum('freeDeliveryAbove')} /></Field>
            <Field label="Minimum delivery order (₹)" htmlFor="st-min"><input id="st-min" type="number" min="0" value={s.minDeliveryOrder} onChange={setNum('minDeliveryOrder')} /></Field>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Reservation rules</h2>
          <div className="form-grid">
            <Field label="Time slot interval" htmlFor="rs-slot">
              <select id="rs-slot" value={s.reservation.slotMinutes} onChange={setRes('slotMinutes')}>
                <option value={15}>Every 15 minutes</option><option value={30}>Every 30 minutes</option><option value={60}>Every hour</option>
              </select>
            </Field>
            <Field label="Max party size online" htmlFor="rs-party" error={errors.maxParty}><input id="rs-party" type="number" min="1" value={s.reservation.maxParty} onChange={setRes('maxParty')} /></Field>
            <Field label="Booking window (days ahead)" htmlFor="rs-window"><input id="rs-window" type="number" min="1" max="180" value={s.reservation.bookingWindowDays} onChange={setRes('bookingWindowDays')} /></Field>
            <Field label="Seat capacity per sitting" htmlFor="rs-cap" hint="Overlapping bookings can't exceed this"><input id="rs-cap" type="number" min="1" value={s.reservation.capacity} onChange={setRes('capacity')} /></Field>
            <Field label="Average sitting length (min)" htmlFor="rs-dur"><input id="rs-dur" type="number" min="30" step="15" value={s.reservation.durationMinutes} onChange={setRes('durationMinutes')} /></Field>
          </div>
        </section>
      </div>

      <section className="card danger-zone">
        <div>
          <h2 className="card-title">Demo data</h2>
          <p className="muted small">Restore the original sample menu, orders and reservations. Useful before a presentation.</p>
        </div>
        <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> Reset demo data</button>
      </section>

      <ConfirmDialog
        open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all demo data?"
        message="All orders, reservations, accounts, menu edits and settings in the database will be replaced with the original sample data."
        confirmLabel="Reset data" onConfirm={async () => { const fresh = await resetDemo(); if (fresh) setS(structuredClone(fresh)); }}
      />
    </form>
  );
}
