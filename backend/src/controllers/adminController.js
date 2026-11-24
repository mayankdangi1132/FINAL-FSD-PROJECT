// Promotions, staff accounts, activity log, notifications and demo reset.
import { z } from 'zod';
import { Activity, Notification, Promotion, User } from '../models/index.js';
import { seedDatabase } from '../seed/seedDatabase.js';
import { formatCurrency } from '../utils/format.js';
import { logActivity, PHONE_RE } from '../utils/helpers.js';
import { ApiError } from '../utils/http.js';
import { ROLE_LABELS } from '../utils/status.js';
import { password } from './authController.js';

export const schemas = {
  promo: z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,15}$/, 'Code must be 4–15 letters or numbers, no spaces.'),
    description: z.string().trim().min(5, 'Add a short description for customers.').max(120),
    type: z.enum(['percent', 'flat']),
    value: z.coerce.number().positive('Enter a value greater than 0.'),
    minOrder: z.coerce.number().min(0).optional().default(0),
    maxDiscount: z.coerce.number().min(0).nullable().optional().default(null),
    active: z.boolean().optional().default(true),
  }).refine((p) => p.type !== 'percent' || p.value <= 100, { message: 'Percentage cannot exceed 100.', path: ['value'] }),
  validatePromo: z.object({ code: z.string().trim().min(1).max(20), subtotal: z.coerce.number().min(0) }),
  staffCreate: z.object({
    name: z.string().trim().min(2, 'Name is required.').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email.'),
    phone: z.union([z.string().trim().regex(PHONE_RE, 'Enter a valid 10-digit mobile number.'), z.literal('')]).optional().default(''),
    role: z.enum(['admin', 'kitchen', 'foh']),
    password,
  }),
  staffUpdate: z.object({
    name: z.string().trim().min(2, 'Name is required.').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email.'),
    phone: z.union([z.string().trim().regex(PHONE_RE, 'Enter a valid 10-digit mobile number.'), z.literal('')]).optional().default(''),
    role: z.enum(['admin', 'kitchen', 'foh']),
  }),
};

// ---------- promotions ----------
export async function listPromos(req, res) {
  res.json(await Promotion.find().sort({ active: -1, code: 1 }));
}

export async function createPromo(req, res) {
  const promo = await Promotion.create(req.body);
  await logActivity(req, `Created promotion ${promo.code}`);
  res.status(201).json(promo);
}

export async function updatePromo(req, res) {
  const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!promo) throw new ApiError(404, 'Promotion not found.');
  await logActivity(req, `Updated promotion ${promo.code}`);
  res.json(promo);
}

export async function togglePromo(req, res) {
  const promo = await Promotion.findById(req.params.id);
  if (!promo) throw new ApiError(404, 'Promotion not found.');
  promo.active = !promo.active;
  await promo.save();
  await logActivity(req, `${promo.active ? 'Activated' : 'Paused'} promotion ${promo.code}`);
  res.json(promo);
}

export async function deletePromo(req, res) {
  const promo = await Promotion.findByIdAndDelete(req.params.id);
  if (!promo) throw new ApiError(404, 'Promotion not found.');
  await logActivity(req, `Deleted promotion ${promo.code}`);
  res.json({ ok: true });
}

// POST /api/promotions/validate (public) — checkout "Apply" button
export async function validatePromo(req, res) {
  const promo = await Promotion.findOne({ code: req.body.code.toUpperCase(), active: true });
  if (!promo) throw new ApiError(404, 'This code is invalid or has expired.');
  if (req.body.subtotal < promo.minOrder) {
    throw new ApiError(400, `Add ${formatCurrency(promo.minOrder - req.body.subtotal)} more to use ${promo.code}.`);
  }
  const { code, description, type, value, minOrder, maxDiscount, active } = promo;
  res.json({ code, description, type, value, minOrder, maxDiscount, active });
}

// ---------- staff (no public staff sign-up — only admins create staff) ----------
export async function listStaff(req, res) {
  const [staff, customerCount] = await Promise.all([
    User.find({ role: { $ne: 'customer' } }).sort({ role: 1, name: 1 }),
    User.countDocuments({ role: 'customer' }),
  ]);
  res.json({ staff, customerCount });
}

export async function createStaff(req, res) {
  if (await User.exists({ email: req.body.email })) throw new ApiError(409, 'Another account already uses this email.');
  const member = await User.create(req.body); // password is hashed by the model's pre-save hook
  await logActivity(req, `Added staff member ${member.name} (${ROLE_LABELS[member.role]})`);
  res.status(201).json(member);
}

export async function updateStaff(req, res) {
  const member = await User.findById(req.params.id);
  if (!member || member.role === 'customer') throw new ApiError(404, 'Staff member not found.');
  if (member.id === req.user.id && req.body.role !== member.role) throw new ApiError(400, 'You cannot change your own role.');
  if (await User.exists({ email: req.body.email, _id: { $ne: member._id } })) throw new ApiError(409, 'Another account already uses this email.');
  member.set(req.body);
  await member.save();
  await logActivity(req, `Updated staff member ${member.name} (${ROLE_LABELS[member.role]})`);
  res.json(member);
}

export async function toggleStaff(req, res) {
  const member = await User.findById(req.params.id);
  if (!member || member.role === 'customer') throw new ApiError(404, 'Staff member not found.');
  if (member.id === req.user.id) throw new ApiError(400, 'You cannot deactivate your own account.');
  member.active = !member.active;
  await member.save();
  await logActivity(req, `${member.active ? 'Reactivated' : 'Deactivated'} staff account ${member.name}`);
  res.json(member);
}

// ---------- activity & notifications ----------
export async function listActivity(req, res) {
  res.json(await Activity.find().sort({ at: -1 }).limit(200));
}

export async function listNotifications(req, res) {
  res.json(await Notification.find({ userId: req.user._id }).sort({ at: -1 }).limit(30));
}

export async function readAllNotifications(req, res) {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
}

// POST /api/admin/reset-demo — restores the sample data (handy before a presentation)
export async function resetDemo(req, res) {
  await seedDatabase();
  res.json({ ok: true });
}
