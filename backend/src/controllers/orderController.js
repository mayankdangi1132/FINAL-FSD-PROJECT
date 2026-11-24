// Orders: checkout, tracking, kitchen / front-of-house status updates, cancellations, refunds, ratings.
import crypto from 'crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { isStaff } from '../middleware/auth.js';
import { MenuItem, Order, Promotion, Table, nextSeq } from '../models/index.js';
import { addDays, formatCurrency } from '../utils/format.js';
import { digits, getSettings, getStripe, logActivity, notify, PHONE_RE } from '../utils/helpers.js';
import { ApiError } from '../utils/http.js';
import { calcTotals, unitPrice } from '../utils/pricing.js';
import { ACTIVE_STATUSES, ORDER_TYPES, canSetStatus, statusLabel } from '../utils/status.js';
import { env } from '../config/env.js';

const KITCHEN_STATUSES = ['placed', 'confirmed', 'preparing', 'ready'];

// ---------- validation ----------
const itemInput = z.object({
  itemId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(50),
  selections: z.record(z.string(), z.string()).optional().default({}),
  addOns: z.array(z.string()).max(20).optional().default([]),
  note: z.string().trim().max(140).optional().default(''),
});
const addressInput = z.object({
  label: z.string().trim().max(20).optional().default('Home'),
  line1: z.string().trim().min(1, 'House / flat and street are required.').max(120),
  area: z.string().trim().min(1, 'Area is required.').max(80),
  city: z.string().trim().max(60).optional().default(''),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code.'),
  landmark: z.string().trim().max(80).optional().default(''),
});

export const schemas = {
  create: z.object({
    type: z.enum(['delivery', 'pickup', 'dine-in']),
    customer: z.object({
      name: z.string().trim().min(2, 'Please enter your name.').max(80),
      phone: z.string().trim().regex(PHONE_RE, 'Enter a valid 10-digit mobile number.'),
      email: z.union([z.string().trim().email('Enter a valid email address.').max(120), z.literal('')]).optional().default(''),
    }),
    address: addressInput.nullish(),
    table: z.string().trim().max(5).nullish(),
    scheduledFor: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
    instructions: z.string().trim().max(300).optional().default(''),
    items: z.array(itemInput).min(1, 'Your cart is empty.').max(40),
    paymentMethod: z.enum(['card', 'upi', 'cash']),
    promoCode: z.string().trim().max(20).nullish(),
  }),
  staffOrder: z.object({
    table: z.string().trim().min(1, 'Choose a table.').max(5),
    items: z.array(itemInput).min(1, 'Add at least one item.').max(40),
    instructions: z.string().trim().max(300).optional().default(''),
  }),
  status: z.object({
    status: z.enum(['placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'served', 'completed']),
    note: z.string().trim().max(200).optional().default(''),
  }),
  cancel: z.object({ reason: z.string().trim().max(200).optional().default('') }),
  rate: z.object({ stars: z.number().int().min(1).max(5), comment: z.string().trim().max(300).optional().default('') }),
  lookup: z.object({ orderId: z.string().trim().min(1).max(12), phone: z.string().trim().min(6).max(20) }),
};

// ---------- helpers ----------
/** Re-prices the cart from the database — the client's prices are never trusted. */
async function priceItems(inputs) {
  const ids = [...new Set(inputs.map((i) => i.itemId))].filter((id) => mongoose.isValidObjectId(id));
  const docs = await MenuItem.find({ _id: { $in: ids } });
  const byId = new Map(docs.map((d) => [d.id, d]));
  const lines = [];
  const qtyById = {};

  for (const input of inputs) {
    const item = byId.get(input.itemId);
    if (!item || item.hidden) throw new ApiError(400, 'One of the items in your cart is no longer on the menu. Please remove it and try again.');
    if (!item.available) throw new ApiError(400, `${item.name} is not available right now.`);
    const selections = {};
    for (const group of item.options) {
      const wanted = input.selections?.[group.name];
      selections[group.name] = (group.choices.find((c) => c.label === wanted) || group.choices[0]).label;
    }
    const addOns = (input.addOns || []).filter((label) => item.addOns.some((a) => a.label === label));
    qtyById[item.id] = (qtyById[item.id] || 0) + input.qty;
    lines.push({
      itemId: item.id, name: item.name, veg: item.veg, price: unitPrice(item, selections, addOns),
      qty: input.qty, selections, addOns, note: input.note || '',
    });
  }
  for (const [id, qty] of Object.entries(qtyById)) {
    const item = byId.get(id);
    if (item.stock != null && item.stock < qty) {
      throw new ApiError(400, item.stock === 0 ? `${item.name} has sold out.` : `Only ${item.stock} × ${item.name} left today.`);
    }
  }
  return { lines, qtyById };
}

async function decrementStock(qtyById) {
  await Promise.all(Object.entries(qtyById).map(([id, qty]) =>
    MenuItem.updateOne({ _id: id, stock: { $ne: null } }, { $inc: { stock: -qty } })));
  await MenuItem.updateMany({ stock: { $lte: 0 } }, { $set: { stock: 0, available: false } });
}

const findOrder = async (id, withToken = false) => {
  if (!/^\d{1,9}$/.test(String(id))) throw new ApiError(404, 'Order not found.');
  const query = Order.findOne({ orderNumber: Number(id) });
  const order = await (withToken ? query.select('+accessToken') : query);
  if (!order) throw new ApiError(404, 'Order not found.');
  return order;
};

const tokenMatches = (req, order) => {
  const given = req.get('x-order-token') || '';
  if (!given || !order.accessToken || given.length !== order.accessToken.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(order.accessToken));
};
const isOwner = (req, order) => Boolean(req.user && order.userId && order.userId.equals(req.user._id));

/** What the kitchen sees: items and notes only — no prices or customer contact details. */
const kitchenView = (order) => {
  const o = order.toJSON();
  return {
    id: o.id, no: o.no, type: o.type, table: o.table, scheduledFor: o.scheduledFor, instructions: o.instructions,
    status: o.status, history: o.history, createdAt: o.createdAt,
    customer: { name: (o.customer?.name || '').split(' ')[0] },
    items: o.items.map(({ price, ...line }) => line),
  };
};

// ---------- handlers ----------
// POST /api/orders — guests or signed-in customers
export async function createOrder(req, res) {
  const body = req.body;
  const settings = await getSettings();
  const serviceKey = { delivery: 'delivery', pickup: 'pickup', 'dine-in': 'dineIn' }[body.type];

  if (req.user && req.user.role !== 'customer') throw new ApiError(403, 'Staff accounts cannot place online orders. Use the front-of-house screen instead.');
  if (!req.user && !settings.guestCheckout) throw new ApiError(401, 'Please sign in to place an order.');
  if (!req.user && !body.customer.email) throw new ApiError(400, 'Enter a valid email so we can send your receipt.');
  if (!settings.services[serviceKey]) throw new ApiError(400, `${ORDER_TYPES[body.type]} is not available right now.`);
  if (body.paymentMethod === 'cash' && !settings.cashPayments) throw new ApiError(400, 'Cash payments are not accepted right now.');

  const { lines, qtyById } = await priceItems(body.items);

  let address = null;
  let table = null;
  if (body.type === 'delivery') {
    if (!body.address) throw new ApiError(400, 'Delivery address is required.');
    address = body.address;
  }
  if (body.type === 'dine-in') {
    const code = (body.table || '').toUpperCase();
    if (!code || !(await Table.exists({ _id: code }))) throw new ApiError(400, `Table "${body.table || ''}" doesn't exist. Check the card on your table.`);
    table = code;
  }

  let promo = null;
  if (body.promoCode) {
    promo = await Promotion.findOne({ code: body.promoCode.toUpperCase(), active: true });
    if (!promo) throw new ApiError(400, 'This promo code is invalid or has expired.');
  }
  const totals = calcTotals(lines, { type: body.type, settings, promo });
  if (promo && !totals.discount) throw new ApiError(400, `Add ${formatCurrency(promo.minOrder - totals.subtotal)} more to use ${promo.code}.`);
  if (body.type === 'delivery' && totals.subtotal < settings.minDeliveryOrder) {
    throw new ApiError(400, `Minimum order for delivery is ${formatCurrency(settings.minDeliveryOrder)}.`);
  }

  const online = body.paymentMethod !== 'cash';
  const stripe = online ? getStripe() : null;
  const orderNumber = await nextSeq('order', 1000);

  // Real Stripe Checkout when a key is configured; otherwise online payment is simulated as paid.
  let session = null;
  if (stripe) {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: { currency: 'inr', unit_amount: Math.round(totals.total * 100), product_data: { name: `${settings.name} order #${orderNumber}` } },
      }],
      customer_email: body.customer.email || undefined,
      metadata: { orderNumber: String(orderNumber) },
      success_url: `${env.clientUrl}/order/${orderNumber}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientUrl}/order/${orderNumber}?payment=cancelled`,
    });
  }

  const now = new Date();
  const order = await Order.create({
    orderNumber,
    userId: req.user?._id || null,
    customer: body.customer,
    type: body.type,
    address,
    table,
    scheduledFor: body.type === 'dine-in' ? null : body.scheduledFor || null,
    instructions: body.instructions,
    items: lines,
    ...totals,
    promoCode: totals.discount ? promo.code : null,
    payment: { method: body.paymentMethod, status: online && !stripe ? 'paid' : 'pending', sessionId: session?.id || null },
    status: 'placed',
    history: [{ status: 'placed', at: now, by: body.customer.name }],
    accessToken: crypto.randomBytes(18).toString('hex'),
    createdAt: now,
  });

  await decrementStock(qtyById);
  if (totals.discount) await Promotion.updateOne({ _id: promo._id }, { $inc: { uses: 1 } });
  await logActivity(req, `Order #${orderNumber} placed (${body.type}, ${formatCurrency(order.total)})`, body.customer.name);
  await notify(order.userId, `Order #${orderNumber} was placed`, orderNumber);

  res.status(201).json({ order, accessToken: order.accessToken, checkoutUrl: session?.url || null });
}

// POST /api/orders/staff — front-of-house creates a dine-in order for a table
export async function createStaffOrder(req, res) {
  const settings = await getSettings();
  const table = req.body.table.toUpperCase();
  if (!(await Table.exists({ _id: table }))) throw new ApiError(400, 'That table does not exist.');
  const { lines, qtyById } = await priceItems(req.body.items);
  const totals = calcTotals(lines, { type: 'dine-in', settings, promo: null });
  const orderNumber = await nextSeq('order', 1000);
  const now = new Date();
  const by = req.user.name;
  const order = await Order.create({
    orderNumber, customer: { name: `Table ${table}`, phone: '', email: '' }, type: 'dine-in', table,
    instructions: req.body.instructions, items: lines, ...totals,
    payment: { method: 'pay-at-table', status: 'pending' }, status: 'confirmed', source: 'staff',
    history: [{ status: 'placed', at: now, by }, { status: 'confirmed', at: now, by }],
    accessToken: crypto.randomBytes(18).toString('hex'), createdAt: now,
  });
  await decrementStock(qtyById);
  await Table.updateOne({ _id: table }, { status: 'occupied' });
  await logActivity(req, `Dine-in order #${orderNumber} created for table ${table}`);
  res.status(201).json(order);
}

// GET /api/orders/my — customer's own orders
export async function listMyOrders(req, res) {
  res.json(await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100));
}

// GET /api/orders — staff; each role sees only what it needs
export async function listOrders(req, res) {
  const { role } = req.user;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  let filter;
  if (role === 'kitchen') filter = { status: { $in: KITCHEN_STATUSES } };
  else if (role === 'foh') filter = { $or: [{ status: { $in: ACTIVE_STATUSES } }, { createdAt: { $gte: startOfToday } }] };
  else filter = { $or: [{ status: { $in: ACTIVE_STATUSES } }, { createdAt: { $gte: addDays(startOfToday, -31) } }] };
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(role === 'admin' ? 3000 : 300);
  res.json(role === 'kitchen' ? orders.map(kitchenView) : orders);
}

// GET /api/orders/:id — owner, staff, or a guest holding the order's access token
export async function getOrder(req, res) {
  const order = await findOrder(req.params.id, true);
  if (req.user?.role === 'kitchen') return res.json(kitchenView(order));
  if (isStaff(req.user) || isOwner(req, order) || (!order.userId && tokenMatches(req, order))) return res.json(order);
  throw new ApiError(403, 'This order is private.', { requiresLogin: Boolean(order.userId) });
}

// POST /api/orders/lookup — guests find their order with order number + phone
export async function lookupOrder(req, res) {
  const order = await Order.findOne({ orderNumber: Number(req.body.orderId.replace(/\D/g, '')) || -1 }).select('+accessToken');
  if (!order || !order.customer?.phone || digits(order.customer.phone) !== digits(req.body.phone)) {
    throw new ApiError(404, "We couldn't find an order with that number and phone. Please check and try again.");
  }
  res.json({ order, accessToken: order.accessToken });
}

// PATCH /api/orders/:id/status — staff, limited by role (see canSetStatus)
export async function updateOrderStatus(req, res) {
  const order = await findOrder(req.params.id);
  const to = req.body.status;
  if (['completed', 'cancelled'].includes(order.status) && req.user.role !== 'admin') throw new ApiError(400, 'This order is already closed.');
  if (!canSetStatus(req.user.role, order, to)) throw new ApiError(403, 'Your role cannot make that status change.');

  order.status = to;
  order.history.push({ status: to, at: new Date(), by: req.user.name, ...(req.body.note ? { note: req.body.note } : {}) });
  if (to === 'completed' && order.payment.status === 'pending') order.payment.status = 'paid';
  await order.save();
  if (order.type === 'dine-in' && to === 'completed' && order.table) await Table.updateOne({ _id: order.table }, { status: 'cleaning' });

  const label = statusLabel(to, order.type);
  await logActivity(req, `Order #${order.orderNumber} → ${label}`);
  await notify(order.userId, `Order #${order.orderNumber}: ${label}`, order.orderNumber);
  res.json(req.user.role === 'kitchen' ? kitchenView(order) : order);
}

async function refundWithStripe(order) {
  const stripe = getStripe();
  if (stripe && order.payment.paymentIntent) await stripe.refunds.create({ payment_intent: order.payment.paymentIntent });
}

// POST /api/orders/:id/cancel — customer/guest while "placed", admin any time
export async function cancelOrder(req, res) {
  const order = await Order.findOne({ orderNumber: Number(req.params.id) || -1 }).select('+accessToken');
  if (!order) throw new ApiError(404, 'Order not found.');
  const isAdmin = req.user?.role === 'admin';
  const owns = isOwner(req, order) || (!order.userId && tokenMatches(req, order));
  if (!isAdmin && !owns) throw new ApiError(403, 'You cannot cancel this order.');
  if (['completed', 'cancelled'].includes(order.status)) throw new ApiError(400, 'This order is already closed.');
  if (!isAdmin && order.status !== 'placed') throw new ApiError(400, 'The kitchen has already accepted this order. Please call the restaurant to cancel.');

  order.status = 'cancelled';
  order.history.push({ status: 'cancelled', at: new Date(), by: req.user?.name || order.customer.name, note: req.body.reason });
  if (order.payment.status === 'pending') order.payment.status = 'void';
  else if (order.payment.status === 'paid' && !isAdmin) {
    await refundWithStripe(order);
    order.payment.status = 'refunded';
  }
  await order.save();
  await logActivity(req, `Order #${order.orderNumber} cancelled${req.body.reason ? ` — ${req.body.reason}` : ''}`, req.user?.name || order.customer.name);
  await notify(order.userId, `Order #${order.orderNumber} was cancelled`, order.orderNumber);
  res.json(order);
}

// POST /api/orders/:id/refund (admin)
export async function refundOrder(req, res) {
  const order = await Order.findOne({ orderNumber: Number(req.params.id) || -1 });
  if (!order) throw new ApiError(404, 'Order not found.');
  if (order.payment.status !== 'paid') throw new ApiError(400, 'Only paid orders can be refunded.');
  await refundWithStripe(order);
  order.payment.status = 'refunded';
  await order.save();
  await logActivity(req, `Refund issued for order #${order.orderNumber} (${formatCurrency(order.total)})`);
  await notify(order.userId, `A refund of ${formatCurrency(order.total)} for order #${order.orderNumber} has been issued`, order.orderNumber);
  res.json(order);
}

// POST /api/orders/:id/rate — customer feedback after completion
export async function rateOrder(req, res) {
  const order = await findOrder(req.params.id);
  if (!isOwner(req, order)) throw new ApiError(403, 'You can only rate your own orders.');
  if (order.status !== 'completed') throw new ApiError(400, 'You can rate an order once it is completed.');
  if (order.rating) throw new ApiError(400, 'You have already rated this order.');
  order.rating = { stars: req.body.stars, comment: req.body.comment, at: new Date() };
  await order.save();
  res.json(order);
}

// GET /api/payments/verify?order=&session_id= — confirms a Stripe Checkout payment
export async function verifyPayment(req, res) {
  const stripe = getStripe();
  if (!stripe) throw new ApiError(400, 'Online payments are not configured.');
  const order = await Order.findOne({ orderNumber: Number(req.query.order) || -1 });
  if (!order) throw new ApiError(404, 'Order not found.');
  const session = await stripe.checkout.sessions.retrieve(String(req.query.session_id || ''));
  if (session.metadata?.orderNumber !== String(order.orderNumber) || session.id !== order.payment.sessionId) {
    throw new ApiError(400, 'Payment does not match this order.');
  }
  if (session.payment_status === 'paid' && order.payment.status !== 'paid') {
    order.payment.status = 'paid';
    order.payment.paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    await order.save();
  }
  res.json({ paid: order.payment.status === 'paid' });
}
