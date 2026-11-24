// Order and reservation status definitions + role-based rules.

export const ORDER_TYPES = {
  delivery: 'Delivery',
  pickup: 'Pickup',
  'dine-in': 'Dine-In',
};

export const ORDER_STATUS = {
  placed: { label: 'Placed', tone: 'blue' },
  confirmed: { label: 'Confirmed', tone: 'indigo' },
  preparing: { label: 'Preparing', tone: 'amber' },
  ready: { label: 'Ready', tone: 'teal' },
  'out-for-delivery': { label: 'Out for Delivery', tone: 'purple' },
  served: { label: 'Served', tone: 'teal' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

export const ACTIVE_STATUSES = ['placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'served'];

export function statusLabel(status, type) {
  if (status === 'ready') {
    if (type === 'pickup') return 'Ready for Pickup';
    if (type === 'delivery') return 'Ready for Dispatch';
    return 'Ready to Serve';
  }
  return ORDER_STATUS[status]?.label || status;
}

/** The ordered list of statuses an order of this type moves through. */
export function flowFor(type) {
  if (type === 'delivery') return ['placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'completed'];
  if (type === 'dine-in') return ['placed', 'confirmed', 'preparing', 'ready', 'served', 'completed'];
  return ['placed', 'confirmed', 'preparing', 'ready', 'completed'];
}

export function nextStatus(order) {
  const flow = flowFor(order.type);
  const i = flow.indexOf(order.status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

export const STATUS_MESSAGES = {
  placed: 'We have received your order and will confirm it shortly.',
  confirmed: 'Your order is confirmed and has been sent to the kitchen.',
  preparing: 'Our chefs are preparing your food.',
  ready: {
    pickup: 'Your order is ready! Please collect it from the counter.',
    delivery: 'Your order is packed and waiting for a delivery partner.',
    'dine-in': 'Your food is ready and will be served shortly.',
  },
  'out-for-delivery': 'Your order is on its way.',
  served: 'Enjoy your meal!',
  completed: 'Order completed. Thank you for dining with us!',
  cancelled: 'This order was cancelled.',
};

export const statusMessage = (order) => {
  const m = STATUS_MESSAGES[order.status];
  return typeof m === 'object' ? m[order.type] : m;
};

export const PAYMENT_METHODS = {
  card: 'Card',
  upi: 'UPI',
  cash: 'Cash',
  'pay-at-table': 'Pay at table',
};

export const PAYMENT_STATUS = {
  paid: { label: 'Paid', tone: 'green' },
  pending: { label: 'Pending', tone: 'amber' },
  refunded: { label: 'Refunded', tone: 'gray' },
  void: { label: 'Not charged', tone: 'gray' },
};

export const RES_STATUS = {
  pending: { label: 'Pending', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'blue' },
  seated: { label: 'Seated', tone: 'purple' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

export const TABLE_STATUS = {
  free: { label: 'Free', tone: 'green' },
  reserved: { label: 'Reserved', tone: 'blue' },
  occupied: { label: 'Occupied', tone: 'amber' },
  cleaning: { label: 'Cleaning', tone: 'gray' },
};

export const ROLE_LABELS = {
  admin: 'Admin / Manager',
  kitchen: 'Kitchen Staff',
  foh: 'Front of House',
  customer: 'Customer',
};

/**
 * Which order-status changes each role may make.
 * (The Express API enforces the same rules — this keeps the UI honest.)
 */
export function canSetStatus(role, order, to) {
  if (!role || !order) return false;
  if (role === 'admin') return true;
  const from = order.status;
  if (role === 'kitchen') {
    return (
      (from === 'placed' && to === 'confirmed') ||
      (from === 'confirmed' && to === 'preparing') ||
      (from === 'preparing' && to === 'ready')
    );
  }
  if (role === 'foh') {
    if (from === 'placed' && to === 'confirmed') return true;
    if (order.type === 'dine-in') {
      return (from === 'ready' && to === 'served') || (from === 'served' && to === 'completed');
    }
    if (order.type === 'pickup') return from === 'ready' && to === 'completed';
    if (order.type === 'delivery') {
      return (from === 'ready' && to === 'out-for-delivery') || (from === 'out-for-delivery' && to === 'completed');
    }
  }
  return false;
}
