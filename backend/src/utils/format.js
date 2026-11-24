// Small formatting helpers shared across the app.

export const pad = (n) => String(n).padStart(2, '0');

/** Local calendar date as "YYYY-MM-DD". */
export const toDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const dateKeyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_NAMES = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

export const formatCurrency = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** "19:30" -> "7:30 PM" */
export const formatTime12 = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateKey = (key, withYear = false) =>
  dateKeyToDate(key).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
  });

export const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });

export const formatClock = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const minutesSince = (value) => Math.max(0, Math.floor((Date.now() - new Date(value)) / 60000));

export function timeAgo(value) {
  const m = minutesSince(value);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

export const isSameDay = (a, b) => toDateKey(new Date(a)) === toDateKey(new Date(b));

export const formatAddress = (a) =>
  a ? [a.line1, a.area, a.city, a.pincode].filter(Boolean).join(', ') : '';

export const firstName = (name = '') => name.split(' ')[0];

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

/** Is the restaurant open right now, according to settings.hours? */
export function openStatus(hours, now = new Date()) {
  const today = hours[DAY_KEYS[now.getDay()]];
  if (!today || today.closed) return { open: false, today };
  const mins = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = today.open.split(':').map(Number);
  const [ch, cm] = today.close.split(':').map(Number);
  return { open: mins >= oh * 60 + om && mins < ch * 60 + cm, today };
}
