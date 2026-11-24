// Fills MongoDB with the demo restaurant: menu, staff, customers, 30 days of orders,
// reservations, tables, promotions and settings. Wipes existing data first.
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  Activity, Category, Counter, MenuItem, Notification, Order, Promotion, Reservation, Setting, Table, User, Waitlist,
} from '../models/index.js';
import { createSeedState, DEMO_PASSWORD } from './demoData.js';

// Fixed ObjectIds so demo logins and carts keep working after a reset.
const USER_IDS = {
  'u-admin': '650000000000000000000001',
  'u-chef': '650000000000000000000002',
  'u-chef2': '650000000000000000000003',
  'u-foh': '650000000000000000000004',
  'u-foh2': '650000000000000000000005',
  'u-cust': '650000000000000000000006',
};
const menuId = (seedId) => `66000000000000000000${seedId.slice(1).padStart(4, '0')}`;
const userId = (seedId) => (seedId ? USER_IDS[seedId] : null);
const without = (obj, ...keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

export async function seedDatabase() {
  const s = createSeedState();
  const models = [User, Category, MenuItem, Order, Reservation, Promotion, Table, Waitlist, Setting, Activity, Notification, Counter];
  await Promise.all(models.map((M) => M.deleteMany({})));

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.insertMany(s.users.map((u) => ({
    ...without(u, 'id'),
    _id: userId(u.id),
    password,
    addresses: (u.addresses || []).map((a) => without(a, 'id')),
  })));

  await Category.insertMany(s.categories.map((c, i) => ({ ...without(c, 'id'), _id: c.id, sortOrder: i })));
  await MenuItem.insertMany(s.menu.map((m) => ({ ...without(m, 'id'), _id: menuId(m.id) })));

  await Order.insertMany(s.orders.map((o) => ({
    ...without(o, 'id', 'no'),
    orderNumber: o.no,
    userId: userId(o.userId),
    address: o.address ? without(o.address, 'id') : null,
    items: o.items.map((l) => ({ ...l, itemId: menuId(l.itemId) })),
    history: o.history.map((h) => ({ ...h, at: new Date(h.at) })),
    rating: o.rating ? { ...o.rating, at: new Date(o.rating.at) } : null,
    accessToken: crypto.randomBytes(18).toString('hex'),
    createdAt: new Date(o.createdAt),
  })));

  await Reservation.insertMany(s.reservations.map((r) => ({
    ...without(r, 'id'),
    code: r.id,
    userId: userId(r.userId),
    createdAt: new Date(r.createdAt),
  })));

  await Promotion.insertMany(s.promos.map((p) => without(p, 'id')));
  await Table.insertMany(s.tables.map((t, i) => ({ ...without(t, 'id'), _id: t.id, sortOrder: i })));
  await Waitlist.insertMany(s.waitlist.map((w) => ({ ...without(w, 'id'), addedAt: new Date(w.addedAt) })));
  await Setting.create({ _id: 'main', value: s.settings });
  await Activity.insertMany(s.activity.map((a) => ({ ...without(a, 'id'), at: new Date(a.at) })));
  await Notification.insertMany(s.notifications.map((n) => ({ ...without(n, 'id'), userId: userId(n.userId), at: new Date(n.at) })));
  await Counter.insertMany([
    { _id: 'order', seq: s.nextOrderNo - 1 },
    { _id: 'reservation', seq: s.nextResNo - 1 },
  ]);

  return { orders: s.orders.length, reservations: s.reservations.length, menu: s.menu.length, users: s.users.length };
}
