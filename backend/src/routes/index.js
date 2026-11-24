// Every API endpoint, with its access rule. Mounted at /api.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authorize, optionalAuth, protect } from '../middleware/auth.js';
import { asyncHandler as h, validate } from '../utils/http.js';
import * as auth from '../controllers/authController.js';
import * as menu from '../controllers/menuController.js';
import * as orders from '../controllers/orderController.js';
import * as res from '../controllers/reservationController.js';
import * as admin from '../controllers/adminController.js';
import { z } from 'zod';

const router = Router();
const ADMIN = authorize('admin');
const FRONT = authorize('admin', 'foh');
const STAFF = authorize('admin', 'kitchen', 'foh');
const CUSTOMER = authorize('customer');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please wait a few minutes and try again.' } });

router.get('/health', (req, response) => response.json({ ok: true, time: new Date().toISOString() }));

// ---------- auth ----------
router.post('/auth/register', authLimiter, validate(auth.schemas.register), h(auth.register));
router.post('/auth/login', authLimiter, validate(auth.schemas.login), h(auth.login));
router.get('/auth/me', protect, h(auth.me));
router.patch('/auth/me', protect, validate(auth.schemas.updateMe), h(auth.updateMe));
router.post('/auth/me/addresses', protect, CUSTOMER, validate(auth.schemas.address), h(auth.addAddress));
router.delete('/auth/me/addresses/:addressId', protect, CUSTOMER, h(auth.removeAddress));

// ---------- settings, categories, menu, uploads ----------
router.get('/settings', h(menu.getPublicSettings));
router.put('/settings', protect, ADMIN, validate(menu.schemas.settings), h(menu.updateSettings));

router.get('/categories', h(menu.listCategories));
router.post('/categories', protect, ADMIN, validate(menu.schemas.category), h(menu.createCategory));
router.put('/categories/:id', protect, ADMIN, validate(menu.schemas.category), h(menu.updateCategory));
router.delete('/categories/:id', protect, ADMIN, h(menu.deleteCategory));

router.get('/menu', h(menu.listMenu));
router.get('/menu/all', protect, ADMIN, h(menu.listAllMenu));
router.post('/menu', protect, ADMIN, validate(menu.schemas.item), h(menu.createMenuItem));
router.put('/menu/:id', protect, ADMIN, validate(menu.schemas.item), h(menu.updateMenuItem));
router.patch('/menu/:id', protect, ADMIN, validate(menu.schemas.patch), h(menu.patchMenuItem));
router.delete('/menu/:id', protect, ADMIN, h(menu.deleteMenuItem));

router.post('/uploads', protect, ADMIN, menu.uploadMiddleware, h(menu.uploadImage));

// ---------- orders & payments ----------
router.post('/orders', optionalAuth, validate(orders.schemas.create), h(orders.createOrder));
router.post('/orders/lookup', authLimiter, validate(orders.schemas.lookup), h(orders.lookupOrder));
router.post('/orders/staff', protect, FRONT, validate(orders.schemas.staffOrder), h(orders.createStaffOrder));
router.get('/orders/my', protect, CUSTOMER, h(orders.listMyOrders));
router.get('/orders', protect, STAFF, h(orders.listOrders));
router.get('/orders/:id', optionalAuth, h(orders.getOrder));
router.patch('/orders/:id/status', protect, STAFF, validate(orders.schemas.status), h(orders.updateOrderStatus));
router.post('/orders/:id/cancel', optionalAuth, validate(orders.schemas.cancel), h(orders.cancelOrder));
router.post('/orders/:id/refund', protect, ADMIN, h(orders.refundOrder));
router.post('/orders/:id/rate', protect, CUSTOMER, validate(orders.schemas.rate), h(orders.rateOrder));
router.get('/payments/verify', validate(z.object({ order: z.string(), session_id: z.string() }), 'query'), h(orders.verifyPayment));

// ---------- reservations, tables, waitlist ----------
router.get('/reservations/availability', validate(res.schemas.availability, 'query'), h(res.availability));
router.post('/reservations', optionalAuth, validate(res.schemas.create), h(res.createReservation));
router.get('/reservations/my', protect, CUSTOMER, h(res.listMyReservations));
router.get('/reservations', protect, FRONT, h(res.listReservations));
router.patch('/reservations/:code', protect, validate(res.schemas.update), h(res.updateReservation));

router.get('/tables', protect, FRONT, h(res.listTables));
router.patch('/tables/:id', protect, FRONT, validate(res.schemas.tableStatus), h(res.updateTable));
router.get('/waitlist', protect, FRONT, h(res.listWaitlist));
router.post('/waitlist', protect, FRONT, validate(res.schemas.waitlist), h(res.addToWaitlist));
router.delete('/waitlist/:id', protect, FRONT, h(res.removeFromWaitlist));
router.post('/waitlist/:id/seat', protect, FRONT, validate(res.schemas.seat), h(res.seatFromWaitlist));

// ---------- promotions ----------
router.post('/promotions/validate', validate(admin.schemas.validatePromo), h(admin.validatePromo));
router.get('/promotions', protect, ADMIN, h(admin.listPromos));
router.post('/promotions', protect, ADMIN, validate(admin.schemas.promo), h(admin.createPromo));
router.put('/promotions/:id', protect, ADMIN, validate(admin.schemas.promo), h(admin.updatePromo));
router.patch('/promotions/:id/toggle', protect, ADMIN, h(admin.togglePromo));
router.delete('/promotions/:id', protect, ADMIN, h(admin.deletePromo));

// ---------- staff, activity, notifications, admin ----------
router.get('/staff', protect, ADMIN, h(admin.listStaff));
router.post('/staff', protect, ADMIN, validate(admin.schemas.staffCreate), h(admin.createStaff));
router.put('/staff/:id', protect, ADMIN, validate(admin.schemas.staffUpdate), h(admin.updateStaff));
router.patch('/staff/:id/toggle', protect, ADMIN, h(admin.toggleStaff));

router.get('/activity', protect, ADMIN, h(admin.listActivity));
router.get('/notifications', protect, h(admin.listNotifications));
router.post('/notifications/read-all', protect, h(admin.readAllNotifications));
router.post('/admin/reset-demo', protect, ADMIN, h(admin.resetDemo));

export default router;
