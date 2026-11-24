// Menu items, categories, image uploads and restaurant settings.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { Category, MenuItem, Setting } from '../models/index.js';
import { getSettings, getStripe, logActivity } from '../utils/helpers.js';
import { ApiError } from '../utils/http.js';
import { formatCurrency } from '../utils/format.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// ---------- validation ----------
const choice = z.object({ label: z.string().trim().min(1).max(40), price: z.coerce.number().min(-10000).max(10000) });
const imageUrl = z.string().trim().max(500)
  .refine((v) => v === '' || v.startsWith('/uploads/') || /^https?:\/\//.test(v), 'Image must be an uploaded file or an http(s) URL.');

export const schemas = {
  item: z.object({
    name: z.string().trim().min(2, 'Name is required.').max(80),
    description: z.string().trim().min(10, 'Add a short description (10+ characters).').max(300),
    category: z.string().trim().min(1, 'Choose a category.'),
    subcategory: z.string().trim().max(40).optional().default(''),
    price: z.coerce.number().positive('Enter a price greater than 0.').max(100000),
    image: imageUrl.optional().default(''),
    veg: z.boolean(),
    dietary: z.array(z.enum(['vegetarian', 'vegan', 'gluten-free'])).optional().default([]),
    allergens: z.array(z.string().trim().max(30)).max(15).optional().default([]),
    options: z.array(z.object({ name: z.string().trim().min(1).max(40), choices: z.array(choice).min(1).max(10) })).max(6).optional().default([]),
    addOns: z.array(choice).max(15).optional().default([]),
    available: z.boolean().optional().default(true),
    hidden: z.boolean().optional().default(false),
    featured: z.boolean().optional().default(false),
    special: z.boolean().optional().default(false),
    stock: z.number().int().min(0).nullable().optional().default(null),
    prepTime: z.coerce.number().int().min(1).max(240),
  }),
  patch: z.object({
    available: z.boolean().optional(),
    hidden: z.boolean().optional(),
    featured: z.boolean().optional(),
    special: z.boolean().optional(),
    stock: z.number().int().min(0).nullable().optional(),
  }),
  category: z.object({
    name: z.string().trim().min(1, 'Enter a category name.').max(40),
    subcategories: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  }),
  settings: (() => {
    const time = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM time format.');
    const day = z.object({ open: time, close: time, closed: z.boolean() });
    return z.object({
      name: z.string().trim().min(1, 'Restaurant name is required.').max(60),
      tagline: z.string().trim().max(120),
      phone: z.string().trim().max(30),
      email: z.string().trim().max(120),
      address: z.string().trim().max(200),
      locations: z.array(z.object({
        id: z.string(), name: z.string().max(80), address: z.string().max(200), phone: z.string().max(30), services: z.array(z.string()),
      })).max(10),
      hours: z.object({ mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day }),
      services: z.object({ delivery: z.boolean(), pickup: z.boolean(), dineIn: z.boolean() }),
      guestCheckout: z.boolean(),
      cashPayments: z.boolean(),
      taxRate: z.number().min(0).max(28),
      deliveryFee: z.number().min(0),
      freeDeliveryAbove: z.number().min(0),
      minDeliveryOrder: z.number().min(0),
      reservation: z.object({
        slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
        maxParty: z.number().int().min(1).max(50),
        bookingWindowDays: z.number().int().min(1).max(180),
        capacity: z.number().int().min(1).max(1000),
        durationMinutes: z.number().int().min(30).max(300),
      }),
    })
      .refine((s) => s.services.delivery || s.services.pickup || s.services.dineIn, 'Enable at least one service.')
      .refine((s) => Object.values(s.hours).every((h) => h.closed || h.open < h.close), 'Closing time must be after opening time.')
      .refine((s) => s.reservation.maxParty <= s.reservation.capacity, 'Max party size cannot exceed seat capacity.');
  })(),
};

// ---------- menu ----------
// GET /api/menu (public — hidden items excluded)
export async function listMenu(req, res) {
  res.json(await MenuItem.find({ hidden: false }).sort({ createdAt: 1, _id: 1 }));
}

// GET /api/menu/all (admin)
export async function listAllMenu(req, res) {
  res.json(await MenuItem.find().sort({ createdAt: 1, _id: 1 }));
}

async function assertCategory(id) {
  if (!(await Category.exists({ _id: id }))) throw new ApiError(400, 'That category does not exist.');
}

// POST /api/menu (admin)
export async function createMenuItem(req, res) {
  await assertCategory(req.body.category);
  const item = await MenuItem.create(req.body);
  await logActivity(req, `Added menu item "${item.name}"`);
  res.status(201).json(item);
}

// PUT /api/menu/:id (admin) — price changes only affect new orders (orders store their own prices)
export async function updateMenuItem(req, res) {
  await assertCategory(req.body.category);
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Menu item not found.');
  const oldPrice = item.price;
  item.set(req.body);
  await item.save();
  await logActivity(req, oldPrice !== item.price
    ? `Updated "${item.name}" (price ${formatCurrency(oldPrice)} → ${formatCurrency(item.price)})`
    : `Updated menu item "${item.name}"`);
  res.json(item);
}

// PATCH /api/menu/:id (admin) — quick toggles: available, featured, special, hidden, stock
export async function patchMenuItem(req, res) {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Menu item not found.');
  const patch = { ...req.body };
  if (patch.available === true && item.stock === 0 && patch.stock === undefined) patch.stock = null;
  item.set(patch);
  await item.save();
  const words = Object.entries(req.body).map(([k, v]) => {
    if (k === 'available') return v ? 'marked available' : 'marked unavailable';
    if (k === 'hidden') return v ? 'hidden from menu' : 'shown on menu';
    if (k === 'featured') return v ? 'featured' : 'unfeatured';
    if (k === 'special') return v ? "set as today's special" : 'removed from specials';
    return `stock set to ${v ?? 'unlimited'}`;
  });
  await logActivity(req, `"${item.name}" ${words.join(', ')}`);
  res.json(item);
}

// DELETE /api/menu/:id (admin)
export async function deleteMenuItem(req, res) {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, 'Menu item not found.');
  await logActivity(req, `Removed menu item "${item.name}"`);
  res.json({ ok: true });
}

// ---------- categories ----------
export async function listCategories(req, res) {
  res.json(await Category.find().sort({ sortOrder: 1 }));
}

export async function createCategory(req, res) {
  const id = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!id) throw new ApiError(400, 'Enter a category name.');
  if (await Category.exists({ _id: id })) throw new ApiError(409, 'That category already exists.');
  const count = await Category.countDocuments();
  const cat = await Category.create({ _id: id, ...req.body, sortOrder: count });
  await logActivity(req, `Added category "${cat.name}"`);
  res.status(201).json(cat);
}

export async function updateCategory(req, res) {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cat) throw new ApiError(404, 'Category not found.');
  await logActivity(req, `Updated category "${cat.name}"`);
  res.json(cat);
}

export async function deleteCategory(req, res) {
  if (await MenuItem.exists({ category: req.params.id })) throw new ApiError(409, 'Move or delete the items in this category first.');
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) throw new ApiError(404, 'Category not found.');
  await logActivity(req, `Removed category "${cat.name}"`);
  res.json({ ok: true });
}

// ---------- image uploads ----------
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'Please upload a JPG, PNG, WEBP or GIF image.'));
  },
}).single('image');

if (env.cloudinaryEnabled) {
  cloudinary.config({ cloud_name: env.cloudinary.cloudName, api_key: env.cloudinary.apiKey, api_secret: env.cloudinary.apiSecret });
}

// POST /api/uploads (admin) — Cloudinary if configured, otherwise backend/uploads
export async function uploadImage(req, res) {
  if (!req.file) throw new ApiError(400, 'Choose an image to upload.');
  if (env.cloudinaryEnabled) {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'saffron-table' }, (err, out) => (err ? reject(err) : resolve(out)))
        .end(req.file.buffer);
    });
    return res.status(201).json({ url: result.secure_url });
  }
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[req.file.mimetype];
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOADS_DIR, name), req.file.buffer);
  return res.status(201).json({ url: `/uploads/${name}` });
}

// ---------- settings ----------
// GET /api/settings (public)
export async function getPublicSettings(req, res) {
  const settings = await getSettings();
  res.json({ ...settings, stripeEnabled: Boolean(getStripe()) });
}

// PUT /api/settings (admin)
export async function updateSettings(req, res) {
  await Setting.findByIdAndUpdate('main', { value: req.body }, { upsert: true });
  await logActivity(req, 'Updated restaurant settings');
  res.json({ ...(await getSettings()), stripeEnabled: Boolean(getStripe()) });
}
