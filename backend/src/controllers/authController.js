import { z } from 'zod';
import { signToken } from '../middleware/auth.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/http.js';
import { PHONE_RE } from '../utils/helpers.js';

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(120);
const phone = z.string().trim().regex(PHONE_RE, 'Enter a valid 10-digit mobile number.');
export const password = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72)
  .regex(/[a-zA-Z]/, 'Password must include a letter.')
  .regex(/\d/, 'Password must include a number.');

export const schemas = {
  register: z.object({ name: z.string().trim().min(2, 'Please enter your full name.').max(80), email, phone, password }),
  login: z.object({ email, password: z.string().min(1, 'Please enter your password.') }),
  updateMe: z.object({ name: z.string().trim().min(2, 'Please enter your name.').max(80).optional(), phone: phone.optional() }),
  address: z.object({
    label: z.string().trim().max(20).optional().default('Home'),
    line1: z.string().trim().min(1, 'House / flat and street are required.').max(120),
    area: z.string().trim().min(1, 'Area is required.').max(80),
    city: z.string().trim().max(60).optional().default(''),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code.'),
    landmark: z.string().trim().max(80).optional().default(''),
  }),
};

// POST /api/auth/register — public sign-up is for customers only
export async function register(req, res) {
  const { name, email: mail, phone: tel, password: pw } = req.body;
  if (await User.exists({ email: mail })) throw new ApiError(409, 'An account with this email already exists.');
  const user = await User.create({ name, email: mail, phone: tel, password: pw, role: 'customer' });
  res.status(201).json({ token: signToken(user), user });
}

// POST /api/auth/login
export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.checkPassword(req.body.password))) throw new ApiError(401, 'Incorrect email or password.');
  if (!user.active) throw new ApiError(403, 'This account has been deactivated. Please contact the manager.');
  res.json({ token: signToken(user), user });
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ user: req.user });
}

// PATCH /api/auth/me
export async function updateMe(req, res) {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ user: req.user });
}

// POST /api/auth/me/addresses
export async function addAddress(req, res) {
  if ((req.user.addresses || []).length >= 10) throw new ApiError(400, 'You can save up to 10 addresses.');
  req.user.addresses.push(req.body);
  await req.user.save();
  res.status(201).json({ user: req.user });
}

// DELETE /api/auth/me/addresses/:addressId
export async function removeAddress(req, res) {
  req.user.addresses.pull({ _id: req.params.addressId });
  await req.user.save();
  res.json({ user: req.user });
}
