// Small fetch wrapper for the Express API.
// The JWT is kept per browser tab (sessionStorage), so you can be signed in as a customer
// in one tab and as kitchen staff in another — handy for demos.

const BASE = `${import.meta.env.VITE_API_URL || ''}/api`;
const TOKEN_KEY = 'saffron-table:token';
const GUEST_ORDERS_KEY = 'saffron-table:guest-orders';

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
};

/** Access tokens for orders placed as a guest on this device. */
const guestTokens = () => {
  try { return JSON.parse(localStorage.getItem(GUEST_ORDERS_KEY)) || {}; } catch { return {}; }
};
export const getGuestToken = (orderId) => guestTokens()[orderId] || null;
export const saveGuestToken = (orderId, token) => {
  if (!token) return;
  try { localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify({ ...guestTokens(), [orderId]: token })); } catch { /* ignore */ }
};

export async function api(path, { method = 'GET', body, form, headers = {} } = {}) {
  const h = { ...headers };
  const token = getToken();
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers: h, body: payload });
  } catch {
    const err = new Error("Can't reach the server. Make sure the backend is running.");
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Fetch one order — includes the guest access token if this device placed it. */
export const fetchOrder = (id) => {
  const token = getGuestToken(id);
  return api(`/orders/${encodeURIComponent(id)}`, { headers: token ? { 'x-order-token': token } : {} });
};

export const verifyPayment = (orderId, sessionId) =>
  api(`/payments/verify?order=${encodeURIComponent(orderId)}&session_id=${encodeURIComponent(sessionId)}`);
