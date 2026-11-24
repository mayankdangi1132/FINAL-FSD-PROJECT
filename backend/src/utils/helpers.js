import Stripe from 'stripe';
import { env } from '../config/env.js';
import { Activity, Notification, Setting } from '../models/index.js';
import { DEFAULT_SETTINGS } from '../seed/demoData.js';

/** Restaurant settings (one document), merged over the defaults. */
export async function getSettings() {
  const doc = await Setting.findById('main').lean();
  const value = doc?.value || {};
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    ...value,
    services: { ...DEFAULT_SETTINGS.services, ...(value.services || {}) },
    reservation: { ...DEFAULT_SETTINGS.reservation, ...(value.reservation || {}) },
    hours: { ...DEFAULT_SETTINGS.hours, ...(value.hours || {}) },
  };
}

/** Audit log for important admin and order-status changes. */
export async function logActivity(req, text, by) {
  await Activity.create({ text, by: by || req.user?.name || 'Guest', userId: req.user?._id || null });
}

/** In-app notification for a customer (shown under the bell icon). */
export async function notify(userId, text, orderId = null) {
  if (!userId) return;
  await Notification.create({ userId, text, orderId: orderId != null ? String(orderId) : null });
}

let stripe = null;
export function getStripe() {
  if (!env.stripeKey) return null;
  if (!stripe) stripe = new Stripe(env.stripeKey);
  return stripe;
}

export const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/;
export const digits = (s = '') => String(s).replace(/\D/g, '').slice(-10);
