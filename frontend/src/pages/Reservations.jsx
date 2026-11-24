import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Accessibility, CalendarCheck, CalendarDays, Clock, Info, Phone, Users } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { IMAGES } from '../data/constants.js';
import { addDays, formatDateKey, formatTime12, toDateKey } from '../utils/format.js';
import { Field, Img, PageHeader } from '../components/ui.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/;

export default function Reservations() {
  const { settings, getAvailability, createReservation, user } = useApp();
  const rules = settings.reservation;
  const today = toDateKey();
  const maxDate = toDateKey(addDays(new Date(), rules.bookingWindowDays));

  const [date, setDate] = useState(today);
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState('');
  const [form, setForm] = useState({
    name: user?.role === 'customer' ? user.name : '',
    email: user?.role === 'customer' ? user.email : '',
    phone: user?.role === 'customer' ? user.phone : '',
    occasion: '', requests: '', accessibility: false,
  });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const autoAdvanced = useRef(false);

  // Live availability from the server (bookings that overlap can't exceed seat capacity).
  const loadSlots = () => {
    let cancelled = false;
    setSlotsLoading(true);
    getAvailability(date, guests)
      .then((r) => {
        if (cancelled) return;
        // Once today's last seating has passed, jump to tomorrow automatically.
        if (!autoAdvanced.current && date === today && r.slots.length && r.slots.every((s) => s.past)) {
          autoAdvanced.current = true;
          setDate(toDateKey(addDays(new Date(), 1)));
          return;
        }
        setSlots(r.slots);
      })
      .catch(() => !cancelled && setSlots([]))
      .finally(() => !cancelled && setSlotsLoading(false));
    return () => { cancelled = true; };
  };
  useEffect(loadSlots, [date, guests]); // eslint-disable-line react-hooks/exhaustive-deps

  const anyAvailable = slots.some((s) => s.available);
  const allPast = slots.length > 0 && slots.every((s) => s.past);

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setErrors((er) => (er[name] ? { ...er, [name]: undefined } : er));
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!date || date < today || date > maxDate) err.date = `Choose a date within the next ${rules.bookingWindowDays} days.`;
    if (!time) err.time = 'Please pick an available time.';
    else if (!slots.find((s) => s.time === time)?.available) err.time = 'That time is no longer available — please choose another.';
    if (form.name.trim().length < 2) err.name = 'Please enter your name.';
    if (!EMAIL_RE.test(form.email.trim())) err.email = 'Enter a valid email address.';
    if (!PHONE_RE.test(form.phone.trim())) err.phone = 'Enter a valid 10-digit mobile number.';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      const r = await createReservation({
        date, time, guests: Number(guests), name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        occasion: form.occasion, requests: form.requests.trim(), accessibility: form.accessibility,
      });
      setDone(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors({ form: err.message });
      if (err.status === 409) { setTime(''); loadSlots(); }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="container narrow">
        <div className="card confirm-card">
          <div className="confirm-icon"><CalendarCheck size={36} /></div>
          <h1>Reservation requested!</h1>
          <p className="muted">Reference <strong>{done.id}</strong>. We’ll confirm by email and SMS shortly.</p>
          <dl className="confirm-details">
            <div><dt>Date</dt><dd>{formatDateKey(done.date, true)}</dd></div>
            <div><dt>Time</dt><dd>{formatTime12(done.time)}</dd></div>
            <div><dt>Guests</dt><dd>{done.guests}</dd></div>
            <div><dt>Name</dt><dd>{done.name}</dd></div>
            {done.requests && <div><dt>Requests</dt><dd>{done.requests}</dd></div>}
          </dl>
          <div className="btn-row center">
            {user?.role === 'customer'
              ? <Link to="/account?tab=reservations" className="btn btn-primary">View my reservations</Link>
              : <Link to="/menu" className="btn btn-primary">Browse the menu</Link>}
            <button className="btn btn-ghost" onClick={() => { setDone(null); setTime(''); }}>Make another booking</button>
          </div>
        </div>
      </div>
    );
  }

  const partySizes = Array.from({ length: rules.maxParty }, (_, i) => i + 1);

  return (
    <div className="container">
      <PageHeader eyebrow="Dine with us" title="Book a table" subtitle="Pick a date, party size and time — available slots update instantly." />
      <div className="two-col reverse-mobile">
        <form className="card form-card" onSubmit={submit} noValidate>
          <div className="form-grid">
            <Field label="Date" htmlFor="r-date" error={errors.date} required>
              <input id="r-date" type="date" min={today} max={maxDate} value={date} onChange={(e) => { setDate(e.target.value); setTime(''); }} />
            </Field>
            <Field label="Guests" htmlFor="r-guests" required hint={`Larger group? Call us on ${settings.phone}`}>
              <select id="r-guests" value={guests} onChange={(e) => { setGuests(Number(e.target.value)); setTime(''); }}>
                {partySizes.map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
              </select>
            </Field>
          </div>

          <fieldset className={`slot-fieldset ${errors.time ? 'has-error' : ''}`}>
            <legend>Available times for {date ? formatDateKey(date) : '—'}</legend>
            {slotsLoading && slots.length === 0 ? (
              <p className="muted small">Checking availability…</p>
            ) : slots.length === 0 ? (
              <p className="alert alert-info">No bookings are available on this day. Please choose another date.</p>
            ) : (
              <>
                <div className="slot-grid">
                  {slots.map((s) => (
                    <button
                      type="button" key={s.time} disabled={!s.available}
                      className={`slot ${time === s.time ? 'active' : ''}`}
                      onClick={() => { setTime(s.time); setErrors((er) => ({ ...er, time: undefined })); }}
                      aria-pressed={time === s.time}
                      title={s.past ? 'Too late to book' : s.available ? `${s.remaining} seats left` : 'Fully booked'}
                    >
                      {s.label}
                      {!s.past && !s.available && <small>Full</small>}
                      {s.available && s.remaining <= 10 && <small>Few left</small>}
                    </button>
                  ))}
                </div>
                {allPast && <p className="alert alert-info">Online bookings for today have closed. Please choose another date.</p>}
                {!anyAvailable && !allPast && <p className="alert alert-info">No tables left for {guests} on this date. Try another day or a smaller party.</p>}
              </>
            )}
            {errors.time && <div className="field-error" role="alert">{errors.time}</div>}
          </fieldset>

          <div className="form-grid">
            <Field label="Full name" htmlFor="r-name" error={errors.name} required>
              <input id="r-name" name="name" value={form.name} onChange={set} autoComplete="name" />
            </Field>
            <Field label="Mobile number" htmlFor="r-phone" error={errors.phone} required>
              <input id="r-phone" name="phone" type="tel" value={form.phone} onChange={set} autoComplete="tel" placeholder="98765 43210" />
            </Field>
            <Field label="Email" htmlFor="r-email" error={errors.email} required>
              <input id="r-email" name="email" type="email" value={form.email} onChange={set} autoComplete="email" />
            </Field>
            <Field label="Occasion (optional)" htmlFor="r-occasion">
              <select id="r-occasion" name="occasion" value={form.occasion} onChange={set}>
                <option value="">None</option><option>Birthday</option><option>Anniversary</option><option>Business</option><option>Date night</option>
              </select>
            </Field>
          </div>
          <Field label="Special requests (optional)" htmlFor="r-requests">
            <textarea id="r-requests" name="requests" rows={3} maxLength={300} value={form.requests} onChange={set} placeholder="High chair, seating preference, dietary needs…" />
          </Field>
          <label className="check-row">
            <input type="checkbox" name="accessibility" checked={form.accessibility} onChange={set} />
            <Accessibility size={16} /> I need step-free access or other accessibility support
          </label>

          {errors.form && <div className="alert alert-error" role="alert">{errors.form}</div>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            Request reservation{time ? ` · ${formatTime12(time)}` : ''}
          </button>
        </form>

        <aside className="stack">
          <Img src={IMAGES.dining} alt="Our dining room set for dinner" className="side-img" />
          <div className="card">
            <h2 className="card-title"><Info size={18} /> Good to know</h2>
            <ul className="info-list">
              <li><Clock size={16} /> Tables are held for 15 minutes after your booking time.</li>
              <li><Users size={16} /> Parties of up to {rules.maxParty} can book online.</li>
              <li><CalendarDays size={16} /> Book up to {rules.bookingWindowDays} days ahead. Free cancellation up to 2 hours before.</li>
              <li><Phone size={16} /> Running late or need help? Call {settings.phone}.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
