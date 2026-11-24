// Reservations (with capacity checks), tables and the walk-in waitlist.
import { z } from 'zod';
import { Reservation, Table, Waitlist, nextSeq } from '../models/index.js';
import { addDays, toDateKey } from '../utils/format.js';
import { getSettings, logActivity, notify, PHONE_RE } from '../utils/helpers.js';
import { ApiError } from '../utils/http.js';
import { slotsFor } from '../utils/reservations.js';

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.');

export const schemas = {
  availability: z.object({ date: dateKey, guests: z.coerce.number().int().min(1).max(50) }),
  create: z.object({
    date: dateKey,
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Please pick an available time.'),
    guests: z.coerce.number().int().min(1).max(50),
    name: z.string().trim().min(2, 'Please enter your name.').max(80),
    email: z.string().trim().email('Enter a valid email address.').max(120),
    phone: z.string().trim().regex(PHONE_RE, 'Enter a valid 10-digit mobile number.'),
    occasion: z.string().trim().max(30).optional().default(''),
    requests: z.string().trim().max(300).optional().default(''),
    accessibility: z.boolean().optional().default(false),
  }),
  update: z.object({
    status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled']).optional(),
    table: z.string().trim().max(5).nullable().optional(),
  }),
  tableStatus: z.object({ status: z.enum(['free', 'reserved', 'occupied', 'cleaning']) }),
  waitlist: z.object({
    name: z.string().trim().min(2, 'Enter a name.').max(80),
    guests: z.coerce.number().int().min(1).max(30),
    phone: z.string().trim().max(20).optional().default(''),
  }),
  seat: z.object({ tableId: z.string().trim().min(1).max(5) }),
};

const withinWindow = (date, settings) => {
  const today = toDateKey();
  return date >= today && date <= toDateKey(addDays(new Date(), settings.reservation.bookingWindowDays));
};

async function slotsForDate(date, guests, settings) {
  const sameDay = await Reservation.find({ date });
  return slotsFor(date, guests, settings, sameDay.map((r) => r.toJSON()));
}

// GET /api/reservations/availability?date=YYYY-MM-DD&guests=4 (public)
export async function availability(req, res) {
  const { date, guests } = req.validQuery;
  const settings = await getSettings();
  if (!withinWindow(date, settings)) return res.json({ slots: [], reason: 'outside-window' });
  if (guests > settings.reservation.maxParty) return res.json({ slots: [], reason: 'party-too-large' });
  return res.json({ slots: await slotsForDate(date, guests, settings) });
}

// POST /api/reservations (guests or customers)
export async function createReservation(req, res) {
  const body = req.body;
  const settings = await getSettings();
  if (req.user && req.user.role !== 'customer') throw new ApiError(403, 'Staff should add walk-ins from the front-of-house screen.');
  if (!withinWindow(body.date, settings)) throw new ApiError(400, `Choose a date within the next ${settings.reservation.bookingWindowDays} days.`);
  if (body.guests > settings.reservation.maxParty) throw new ApiError(400, `For more than ${settings.reservation.maxParty} guests, please call us.`);
  const slot = (await slotsForDate(body.date, body.guests, settings)).find((s) => s.time === body.time);
  if (!slot) throw new ApiError(400, 'Please pick one of the available times.');
  if (!slot.available) throw new ApiError(409, 'Sorry, that time was just booked. Please choose another.');

  const code = `R${await nextSeq('reservation', 2000)}`;
  const reservation = await Reservation.create({ ...body, code, userId: req.user?._id || null, status: 'pending' });
  await logActivity(req, `Reservation ${code} requested for ${body.guests} guests on ${body.date} at ${body.time}`, body.name);
  await notify(reservation.userId, `Reservation ${code} received — we'll confirm it shortly`);
  res.status(201).json(reservation);
}

// GET /api/reservations/my (customer)
export async function listMyReservations(req, res) {
  res.json(await Reservation.find({ userId: req.user._id }).sort({ date: -1, time: -1 }));
}

// GET /api/reservations (admin, front of house)
export async function listReservations(req, res) {
  const from = toDateKey(addDays(new Date(), -31));
  res.json(await Reservation.find({ date: { $gte: from } }).sort({ date: 1, time: 1 }));
}

// PATCH /api/reservations/:code — staff manage; customers may only cancel their own (≥ 2 hours ahead)
export async function updateReservation(req, res) {
  const r = await Reservation.findOne({ code: req.params.code });
  if (!r) throw new ApiError(404, 'Reservation not found.');
  const body = req.body;
  const staff = ['admin', 'foh'].includes(req.user.role);

  if (!staff) {
    const ownsIt = r.userId && r.userId.equals(req.user._id);
    if (!ownsIt || body.status !== 'cancelled' || 'table' in body) throw new ApiError(403, 'You can only cancel your own reservations.');
    if (!['pending', 'confirmed'].includes(r.status)) throw new ApiError(400, 'This reservation can no longer be cancelled.');
    const [h, m] = r.time.split(':').map(Number);
    const start = new Date(`${r.date}T00:00:00`);
    start.setHours(h, m, 0, 0);
    if (start - Date.now() < 2 * 60 * 60 * 1000) throw new ApiError(400, 'Reservations can be cancelled online up to 2 hours before. Please call us.');
  }

  if (body.table) {
    const table = await Table.findById(body.table);
    if (!table) throw new ApiError(400, 'That table does not exist.');
    if (table.seats < r.guests) throw new ApiError(400, `Table ${table.id} only seats ${table.seats}.`);
  }

  // Keep the floor plan in sync with the reservation.
  const oldTable = r.table;
  const newTable = 'table' in body ? body.table : r.table;
  const newStatus = body.status || r.status;
  if (oldTable && oldTable !== newTable) await Table.updateOne({ _id: oldTable, status: 'reserved' }, { status: 'free' });
  if (newTable) {
    if (newStatus === 'seated') await Table.updateOne({ _id: newTable }, { status: 'occupied' });
    else if (newStatus === 'completed') await Table.updateOne({ _id: newTable }, { status: 'cleaning' });
    else if (newStatus === 'cancelled') await Table.updateOne({ _id: newTable, status: 'reserved' }, { status: 'free' });
    else if (r.date === toDateKey()) await Table.updateOne({ _id: newTable, status: 'free' }, { status: 'reserved' });
  }

  const changes = [];
  if (body.status && body.status !== r.status) changes.push(`status → ${body.status}`);
  if ('table' in body && body.table !== r.table) changes.push(body.table ? `table → ${body.table}` : 'table cleared');
  if (body.status) r.status = body.status;
  if ('table' in body) r.table = body.table || null;
  await r.save();

  await logActivity(req, `Reservation ${r.code} (${r.name}): ${changes.join(', ') || 'updated'}`);
  if (body.status && ['confirmed', 'cancelled'].includes(body.status)) {
    await notify(r.userId, `Your reservation ${r.code} on ${r.date} at ${r.time} was ${body.status}`);
  }
  res.json(r);
}

// ---------- tables ----------
export async function listTables(req, res) {
  res.json(await Table.find().sort({ sortOrder: 1 }));
}

export async function updateTable(req, res) {
  const table = await Table.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!table) throw new ApiError(404, 'Table not found.');
  await logActivity(req, `Table ${table.id} marked ${table.status}`);
  res.json(table);
}

// ---------- waitlist ----------
export async function listWaitlist(req, res) {
  res.json(await Waitlist.find().sort({ addedAt: 1 }));
}

export async function addToWaitlist(req, res) {
  const entry = await Waitlist.create(req.body);
  await logActivity(req, `Added ${entry.name} (${entry.guests}) to the waitlist`);
  res.status(201).json(entry);
}

export async function removeFromWaitlist(req, res) {
  await Waitlist.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}

export async function seatFromWaitlist(req, res) {
  const entry = await Waitlist.findById(req.params.id);
  if (!entry) throw new ApiError(404, 'Waitlist entry not found.');
  const table = await Table.findById(req.body.tableId);
  if (!table) throw new ApiError(400, 'That table does not exist.');
  if (table.seats < entry.guests) throw new ApiError(400, `Table ${table.id} only seats ${table.seats}.`);
  table.status = 'occupied';
  await table.save();
  await entry.deleteOne();
  await logActivity(req, `Seated walk-in ${entry.name} (${entry.guests}) at ${table.id}`);
  res.json({ ok: true });
}
