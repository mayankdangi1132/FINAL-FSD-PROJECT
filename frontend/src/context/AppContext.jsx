/* eslint-disable react-refresh/only-export-components */
// Central app state, backed by the Express API.
//
// - Public data (settings, categories, menu) loads on start-up.
// - After sign-in, each role loads only the data it is allowed to see
//   (the API enforces this too) and refreshes it every few seconds, so dashboards
//   and order tracking update live.
// - The cart stays in the browser (localStorage) until checkout.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, getGuestToken, getToken, saveGuestToken, setToken } from '../api.js';
import { itemCount } from '../utils/pricing.js';
import { statusLabel } from '../utils/status.js';

const CART_KEY = 'saffron-table:cart';
const POLL_MS = 5000;
const EMPTY = {
  orders: [], reservations: [], tables: [], waitlist: [], users: [], customerCount: 0,
  promos: [], activity: [], notifications: [],
};

const AppContext = createContext(null);

const readCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
};

export const homeFor = (role) =>
  ({ admin: '/admin', kitchen: '/kitchen', foh: '/foh', customer: '/account' })[role] || '/';

/** Which API endpoints each role loads into the context. */
const ROLE_DATA = {
  customer: { orders: '/orders/my', reservations: '/reservations/my', notifications: '/notifications' },
  kitchen: { orders: '/orders' },
  foh: { orders: '/orders', reservations: '/reservations', tables: '/tables', waitlist: '/waitlist' },
  admin: {
    orders: '/orders', reservations: '/reservations', tables: '/tables', waitlist: '/waitlist',
    staff: '/staff', promos: '/promotions', activity: '/activity',
  },
};

export function AppProvider({ children }) {
  const [boot, setBoot] = useState({ status: 'loading', error: null });
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [user, setUser] = useState(null);
  const [data, setData] = useState(EMPTY);
  const [cart, setCart] = useState(readCart);
  const [toasts, setToasts] = useState([]);

  const userRef = useRef(null);
  userRef.current = user;
  const sessionGen = useRef(0); // ignores late responses from a previous login

  // ---------- helpers ----------
  const toast = useCallback((message, tone = 'success') => {
    const id = `${Date.now()}${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const endSession = useCallback((message) => {
    setToken(null);
    sessionGen.current += 1;
    userRef.current = null;
    setUser(null);
    setData(EMPTY);
    if (message) toast(message, 'error');
  }, [toast]);

  const loadPublic = useCallback(async () => {
    const [s, c, m] = await Promise.all([
      api('/settings'),
      api('/categories'),
      api(userRef.current?.role === 'admin' ? '/menu/all' : '/menu'),
    ]);
    setSettings(s);
    setCategories(c);
    setMenu(m);
  }, []);

  const loadRoleData = useCallback(async (u = userRef.current) => {
    if (!u) { setData(EMPTY); return; }
    const gen = sessionGen.current;
    const entries = await Promise.all(Object.entries(ROLE_DATA[u.role] || {}).map(async ([key, path]) => {
      try { return [key, await api(path)]; } catch (e) { return [key, e]; }
    }));
    if (gen !== sessionGen.current) return;
    if (entries.some(([, v]) => v instanceof Error && v.status === 401)) {
      endSession('Your session has expired. Please sign in again.');
      return;
    }
    setData((prev) => {
      const next = { ...prev };
      entries.forEach(([key, value]) => {
        if (value instanceof Error) return;
        if (key === 'staff') { next.users = value.staff; next.customerCount = value.customerCount; } else next[key] = value;
      });
      return next;
    });
  }, [endSession]);

  // ---------- start-up ----------
  useEffect(() => {
    (async () => {
      try {
        if (getToken()) {
          try {
            const { user: u } = await api('/auth/me');
            userRef.current = u;
            setUser(u);
          } catch { setToken(null); }
        }
        await loadPublic();
        await loadRoleData();
        setBoot({ status: 'ready', error: null });
      } catch (e) {
        setBoot({ status: 'error', error: e.message });
      }
    })();
  }, [loadPublic, loadRoleData]);

  // Live updates: refresh role data every few seconds, the menu every 30 s.
  useEffect(() => {
    if (!user) return undefined;
    const id = setInterval(() => { if (document.visibilityState === 'visible') loadRoleData(); }, POLL_MS);
    return () => clearInterval(id);
  }, [user, loadRoleData]);
  useEffect(() => {
    if (boot.status !== 'ready') return undefined;
    const id = setInterval(() => { if (document.visibilityState === 'visible') loadPublic().catch(() => {}); }, 30000);
    return () => clearInterval(id);
  }, [boot.status, loadPublic]);

  // Cart persistence (shared by all tabs).
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* ignore */ }
  }, [cart]);
  useEffect(() => {
    const onStorage = (e) => { if (e.key === CART_KEY) setCart(readCart()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** Runs an API call, shows a toast, refreshes data. Returns the result, or null on error. */
  const run = async (fn, { success, refresh = true, refreshMenu = false } = {}) => {
    try {
      const result = await fn();
      if (success) toast(typeof success === 'function' ? success(result) : success);
      if (refresh) await loadRoleData();
      if (refreshMenu) await loadPublic();
      return result ?? true;
    } catch (e) {
      if (e.status === 401) endSession('Your session has expired. Please sign in again.');
      else toast(e.message, 'error');
      return null;
    }
  };

  // ---------- auth (POST /api/auth/login, /register) ----------
  const startSession = async (token, u) => {
    setToken(token);
    sessionGen.current += 1;
    userRef.current = u;
    setUser(u);
    await loadRoleData(u);
    if (u.role === 'admin') loadPublic().catch(() => {});
  };

  const login = async (email, password) => {
    try {
      const { token, user: u } = await api('/auth/login', { method: 'POST', body: { email, password } });
      await startSession(token, u);
      return { user: u };
    } catch (e) {
      return { error: e.message };
    }
  };

  const register = async ({ name, email, phone, password }) => {
    try {
      const { token, user: u } = await api('/auth/register', { method: 'POST', body: { name, email, phone, password } });
      await startSession(token, u);
      return { user: u };
    } catch (e) {
      return { error: e.message, field: e.data?.errors?.[0]?.field };
    }
  };

  const logout = () => {
    const wasAdmin = userRef.current?.role === 'admin';
    endSession();
    if (wasAdmin) loadPublic().catch(() => {});
  };

  const updateProfile = (patch) => run(async () => {
    const { user: u } = await api('/auth/me', { method: 'PATCH', body: patch });
    setUser(u);
    return u;
  }, { refresh: false });

  const addAddress = (address) => run(async () => {
    const { user: u } = await api('/auth/me/addresses', { method: 'POST', body: address });
    setUser(u);
    return u;
  }, { refresh: false });

  const removeAddress = (addressId) => run(async () => {
    const { user: u } = await api(`/auth/me/addresses/${addressId}`, { method: 'DELETE' });
    setUser(u);
    return u;
  }, { refresh: false });

  // ---------- cart (browser only) ----------
  const addToCart = (line) => {
    const key = [line.itemId, JSON.stringify(line.selections || {}), (line.addOns || []).join('|'), line.note || ''].join('~');
    setCart((c) => {
      const existing = c.find((l) => l.key === key);
      return existing ? c.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l)) : [...c, { ...line, key }];
    });
  };
  const updateQty = (key, qty) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, qty } : l))));
  const removeFromCart = (key) => setCart((c) => c.filter((l) => l.key !== key));
  const clearCart = () => setCart([]);

  // ---------- orders ----------
  /** POST /api/orders — the server re-prices everything. Throws on error (checkout shows it). */
  const placeOrder = async (payload) => {
    const items = cart.map((l) => ({ itemId: l.itemId, qty: l.qty, selections: l.selections, addOns: l.addOns, note: l.note }));
    const res = await api('/orders', { method: 'POST', body: { ...payload, items } });
    saveGuestToken(res.order.id, res.accessToken);
    setCart([]);
    loadRoleData();
    loadPublic().catch(() => {});
    return res;
  };

  const validatePromo = (code, subtotal) => api('/promotions/validate', { method: 'POST', body: { code, subtotal } });

  const lookupOrder = async (orderId, phone) => {
    const res = await api('/orders/lookup', { method: 'POST', body: { orderId, phone } });
    saveGuestToken(res.order.id, res.accessToken);
    return res.order;
  };

  const updateOrderStatus = (id, to, note = '') => run(
    () => api(`/orders/${id}/status`, { method: 'PATCH', body: { status: to, note } }),
    { success: (o) => `Order #${id} → ${statusLabel(to, o.type)}` },
  );

  const cancelOrder = (id, reason = '') => {
    const token = getGuestToken(id);
    return run(
      () => api(`/orders/${id}/cancel`, { method: 'POST', body: { reason }, headers: token ? { 'x-order-token': token } : {} }),
      { success: `Order #${id} cancelled` },
    );
  };

  const refundOrder = (id) => run(() => api(`/orders/${id}/refund`, { method: 'POST' }), { success: 'Refund issued' });
  const rateOrder = (id, stars, comment) => run(
    () => api(`/orders/${id}/rate`, { method: 'POST', body: { stars, comment } }),
    { success: 'Thanks for your feedback!' },
  );

  const createStaffOrder = ({ table, items, instructions = '' }) => run(
    () => api('/orders/staff', {
      method: 'POST',
      body: { table, instructions, items: items.map((l) => ({ itemId: l.itemId, qty: l.qty, selections: l.selections, addOns: l.addOns, note: l.note })) },
    }),
    { success: (o) => `Order #${o.id} sent to the kitchen`, refreshMenu: true },
  );

  // ---------- reservations ----------
  const getAvailability = (date, guests) => api(`/reservations/availability?date=${date}&guests=${guests}`);

  /** Throws on error so the form can show the message. */
  const createReservation = async (form) => {
    const r = await api('/reservations', { method: 'POST', body: form });
    loadRoleData();
    return r;
  };

  const updateReservation = (id, patch) => run(
    () => api(`/reservations/${id}`, { method: 'PATCH', body: patch }),
    { success: patch.status ? `Reservation ${id} ${patch.status}` : `Reservation ${id} updated` },
  );

  // ---------- tables & waitlist ----------
  const setTableStatus = (id, status) => run(() => api(`/tables/${id}`, { method: 'PATCH', body: { status } }), { success: `Table ${id} marked ${status}` });
  const addToWaitlist = (entry) => run(() => api('/waitlist', { method: 'POST', body: entry }), { success: `${entry.name} added to the waitlist` });
  const removeFromWaitlist = (id) => run(() => api(`/waitlist/${id}`, { method: 'DELETE' }));
  const seatFromWaitlist = (id, tableId) => run(() => api(`/waitlist/${id}/seat`, { method: 'POST', body: { tableId } }), { success: `Seated at ${tableId}` });

  // ---------- menu & categories (admin) ----------
  const saveMenuItem = (item) => run(
    () => (item.id
      ? api(`/menu/${item.id}`, { method: 'PUT', body: item })
      : api('/menu', { method: 'POST', body: item })),
    { success: item.id ? 'Menu item updated' : 'Menu item added', refreshMenu: true },
  );
  const patchMenuItem = (id, patch) => run(() => api(`/menu/${id}`, { method: 'PATCH', body: patch }), { refreshMenu: true });
  const deleteMenuItem = (id) => run(() => api(`/menu/${id}`, { method: 'DELETE' }), { success: 'Item removed (past orders are unaffected)', refreshMenu: true });

  const uploadImage = async (file) => {
    const form = new FormData();
    form.append('image', file);
    try {
      const { url } = await api('/uploads', { method: 'POST', form });
      return url;
    } catch (e) {
      toast(e.message, 'error');
      return null;
    }
  };

  const saveCategory = (cat) => {
    const exists = categories.some((c) => c.id === cat.id);
    const body = { name: cat.name, subcategories: cat.subcategories };
    return run(
      () => (exists ? api(`/categories/${cat.id}`, { method: 'PUT', body }) : api('/categories', { method: 'POST', body })),
      { success: exists ? 'Category updated' : 'Category added', refreshMenu: true, refresh: false },
    );
  };
  const deleteCategory = (id) => run(() => api(`/categories/${id}`, { method: 'DELETE' }), { success: 'Category removed', refreshMenu: true, refresh: false });

  // ---------- staff & promotions (admin) ----------
  const withError = async (fn, success) => {
    try {
      const result = await fn();
      toast(success);
      await loadRoleData();
      return { ok: true, result };
    } catch (e) {
      return { error: e.message };
    }
  };
  const saveStaff = (m) => withError(
    () => (m.id
      ? api(`/staff/${m.id}`, { method: 'PUT', body: { name: m.name, email: m.email, phone: m.phone, role: m.role } })
      : api('/staff', { method: 'POST', body: m })),
    m.id ? 'Staff member updated' : `Account created for ${m.email}`,
  );
  const toggleStaffActive = (id) => run(() => api(`/staff/${id}/toggle`, { method: 'PATCH' }), { success: (u) => `${u.name} ${u.active ? 'reactivated' : 'deactivated'}` });

  const savePromo = (p) => {
    const body = { code: p.code, description: p.description, type: p.type, value: p.value, minOrder: p.minOrder, maxDiscount: p.maxDiscount, active: p.active };
    return withError(
      () => (p.id ? api(`/promotions/${p.id}`, { method: 'PUT', body }) : api('/promotions', { method: 'POST', body })),
      `Promotion ${p.code} saved`,
    );
  };
  const togglePromo = (id) => run(() => api(`/promotions/${id}/toggle`, { method: 'PATCH' }));
  const deletePromo = (id) => run(() => api(`/promotions/${id}`, { method: 'DELETE' }), { success: 'Promotion deleted' });

  // ---------- settings ----------
  const updateSettings = (s) => run(async () => {
    const { stripeEnabled, ...body } = s;
    const saved = await api('/settings', { method: 'PUT', body });
    setSettings(saved);
    return saved;
  }, { success: 'Settings saved' });

  const resetDemo = async () => {
    const ok = await run(() => api('/admin/reset-demo', { method: 'POST' }), { success: 'Demo data has been reset', refreshMenu: true });
    if (!ok) return null;
    const s = await api('/settings');
    setSettings(s);
    return s;
  };

  const markNotificationsRead = () => {
    setData((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }));
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  };

  const value = {
    boot,
    settings,
    categories,
    menu,
    user,
    ...data,
    cart,
    cartCount: itemCount(cart),
    toasts,
    toast,
    refresh: loadRoleData,
    login, register, logout, updateProfile, addAddress, removeAddress,
    addToCart, updateQty, removeFromCart, clearCart,
    placeOrder, validatePromo, lookupOrder, updateOrderStatus, cancelOrder, refundOrder, rateOrder, createStaffOrder,
    getAvailability, createReservation, updateReservation,
    setTableStatus, addToWaitlist, removeFromWaitlist, seatFromWaitlist,
    saveMenuItem, patchMenuItem, deleteMenuItem, uploadImage, saveCategory, deleteCategory,
    saveStaff, toggleStaffActive, savePromo, togglePromo, deletePromo,
    updateSettings, resetDemo, markNotificationsRead,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
