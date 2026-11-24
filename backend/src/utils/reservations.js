import { DAY_KEYS, dateKeyToDate, formatTime12, pad, toDateKey } from './format.js';

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Time slots for a date, with availability.
 * A booking occupies seats for `durationMinutes`, so two bookings overlap when their
 * start times are closer than that. A slot is available only if the seats already
 * booked in overlapping slots + this party size stay within capacity.
 */
export function slotsFor(dateKey, guests, settings, reservations, ignoreId = null) {
  if (!dateKey) return [];
  const date = dateKeyToDate(dateKey);
  const hours = settings.hours[DAY_KEYS[date.getDay()]];
  if (!hours || hours.closed) return [];

  const { slotMinutes, capacity, durationMinutes } = settings.reservation;
  const start = toMinutes(hours.open);
  const lastSeating = toMinutes(hours.close) - 60;
  const now = new Date();
  const isToday = dateKey === toDateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const sameDay = reservations.filter(
    (r) => r.date === dateKey && r.id !== ignoreId && !['cancelled', 'completed'].includes(r.status),
  );

  const slots = [];
  for (let t = start; t <= lastSeating; t += slotMinutes) {
    const time = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
    const booked = sameDay
      .filter((r) => Math.abs(toMinutes(r.time) - t) < durationMinutes)
      .reduce((sum, r) => sum + r.guests, 0);
    const remaining = Math.max(0, capacity - booked);
    const past = isToday && t < nowMin + 30; // need at least 30 minutes' notice
    slots.push({
      time,
      label: formatTime12(time),
      remaining,
      past,
      available: !past && remaining >= guests,
    });
  }
  return slots;
}

export const isUpcomingReservation = (r) => {
  const today = toDateKey();
  return ['pending', 'confirmed'].includes(r.status) && r.date >= today;
};

export const sortByDateTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);
