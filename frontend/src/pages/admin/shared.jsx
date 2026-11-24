// Pieces shared between the admin and front-of-house dashboards.
import { useState } from 'react';
import { Accessibility, Ban, Info, MapPin, Phone, Undo2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatAddress, formatDateTime, formatTime12 } from '../../utils/format.js';
import { ORDER_TYPES, PAYMENT_METHODS, canSetStatus, flowFor, nextStatus, statusLabel } from '../../utils/status.js';
import { BillSummary, OrderItems, OrderStepper } from '../../components/OrderBits.jsx';
import { ConfirmDialog, Modal, OrderStatusBadge, PaymentBadge, Stars } from '../../components/ui.jsx';

/** Full order view with status controls (admin sees everything, other roles get limited actions). */
export function OrderDetailModal({ orderId, onClose }) {
  const { orders, user, updateOrderStatus, cancelOrder, refundOrder } = useApp();
  const [confirm, setConfirm] = useState(null);
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;

  const isAdmin = user.role === 'admin';
  const next = nextStatus(order);
  const done = ['completed', 'cancelled'].includes(order.status);
  const canRefund = isAdmin && order.payment.status === 'paid' && order.status === 'cancelled';

  return (
    <Modal open onClose={onClose} title={`Order #${order.id}`} size="lg">
      <div className="order-detail">
        <div className="order-detail-head">
          <div>
            <OrderStatusBadge status={order.status} type={order.type} />
            <span className="muted small"> {ORDER_TYPES[order.type]} · placed {formatDateTime(order.createdAt)}{order.source === 'staff' ? ' · by staff' : ''}</span>
          </div>
          {order.scheduledFor && <span className="badge badge-purple">Scheduled {formatTime12(order.scheduledFor)}</span>}
        </div>
        <OrderStepper order={order} />

        <div className="two-col even">
          <div>
            <h3 className="sub-title">Items</h3>
            <OrderItems items={order.items} />
            {order.instructions && <div className="hint-box warn"><Info size={16} /> {order.instructions}</div>}
          </div>
          <div className="stack">
            <div>
              <h3 className="sub-title">Customer</h3>
              <p><strong>{order.customer.name}</strong></p>
              {order.customer.phone && <p className="muted small"><Phone size={13} className="inline-icon" /> {order.customer.phone}</p>}
              {order.customer.email && <p className="muted small">{order.customer.email}</p>}
              {order.address && <p className="muted small"><MapPin size={13} className="inline-icon" /> {formatAddress(order.address)}</p>}
              {order.table && <p className="muted small">Table {order.table}</p>}
            </div>
            <div>
              <h3 className="sub-title">Payment</h3>
              <BillSummary order={order} compact />
              <div className="pay-line"><span>{PAYMENT_METHODS[order.payment.method]}</span><PaymentBadge status={order.payment.status} /></div>
            </div>
            {order.rating && (
              <div>
                <h3 className="sub-title">Customer feedback</h3>
                <Stars value={order.rating.stars} />
                {order.rating.comment && <p className="muted small">“{order.rating.comment}”</p>}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="sub-title">History</h3>
          <ul className="history-log">
            {order.history.map((h, i) => (
              <li key={i}>
                <span className="muted small">{formatDateTime(h.at)}</span>
                <span><strong>{statusLabel(h.status, order.type)}</strong> by {h.by}{h.note ? ` — ${h.note}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-detail-actions">
          {next && canSetStatus(user.role, order, next) && (
            <button className="btn btn-primary" onClick={() => updateOrderStatus(order.id, next)}>Mark as {statusLabel(next, order.type)}</button>
          )}
          {isAdmin && !done && (
            <select
              className="select" value="" aria-label="Set status"
              onChange={(e) => e.target.value && updateOrderStatus(order.id, e.target.value, 'Set manually by manager')}
            >
              <option value="">Set status…</option>
              {flowFor(order.type).filter((s) => s !== order.status).map((s) => <option key={s} value={s}>{statusLabel(s, order.type)}</option>)}
            </select>
          )}
          {isAdmin && !done && <button className="btn btn-danger-ghost" onClick={() => setConfirm('cancel')}><Ban size={16} /> Cancel order</button>}
          {canRefund && <button className="btn btn-ghost" onClick={() => setConfirm('refund')}><Undo2 size={16} /> Issue refund</button>}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'cancel'} onClose={() => setConfirm(null)} title={`Cancel order #${order.id}?`}
        message="The customer will be notified. If the order was paid online you can issue a refund afterwards."
        confirmLabel="Cancel order" onConfirm={() => cancelOrder(order.id, 'Cancelled by restaurant')}
      />
      <ConfirmDialog
        open={confirm === 'refund'} onClose={() => setConfirm(null)} title="Issue refund?" tone="primary"
        message={`Refund the full amount to the customer's ${PAYMENT_METHODS[order.payment.method]} via the payment provider.`}
        confirmLabel="Issue refund" onConfirm={() => refundOrder(order.id)}
      />
    </Modal>
  );
}

/** Action buttons for a reservation, based on its status. */
export function ReservationActions({ r, compact = false }) {
  const { updateReservation } = useApp();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cls = `btn btn-sm ${compact ? 'btn-ghost' : 'btn-ghost'}`;
  return (
    <div className="btn-row nowrap">
      {r.status === 'pending' && <button className="btn btn-primary btn-sm" onClick={() => updateReservation(r.id, { status: 'confirmed' })}>Confirm</button>}
      {['pending', 'confirmed'].includes(r.status) && <button className={cls} onClick={() => updateReservation(r.id, { status: 'seated' })}>Seat</button>}
      {r.status === 'seated' && <button className="btn btn-primary btn-sm" onClick={() => updateReservation(r.id, { status: 'completed' })}>Complete</button>}
      {['pending', 'confirmed'].includes(r.status) && <button className="btn btn-danger-ghost btn-sm" onClick={() => setConfirmCancel(true)}>Cancel</button>}
      <ConfirmDialog
        open={confirmCancel} onClose={() => setConfirmCancel(false)} title={`Cancel reservation ${r.id}?`}
        message={`${r.name}'s table for ${r.guests} will be released and they'll be notified.`}
        confirmLabel="Cancel reservation" onConfirm={() => updateReservation(r.id, { status: 'cancelled' })}
      />
    </div>
  );
}

/** Dropdown to assign a table to a reservation. Shows tables that fit the party. */
export function TableSelect({ r }) {
  const { tables, updateReservation } = useApp();
  const disabled = ['completed', 'cancelled'].includes(r.status);
  return (
    <select
      className="select select-sm" value={r.table || ''} disabled={disabled} aria-label={`Table for ${r.name}`}
      onChange={(e) => updateReservation(r.id, { table: e.target.value || null })}
    >
      <option value="">Unassigned</option>
      {tables.map((t) => (
        <option key={t.id} value={t.id} disabled={t.seats < r.guests}>
          {t.id} · {t.seats} seats{t.status !== 'free' && t.id !== r.table ? ` (${t.status})` : ''}
        </option>
      ))}
    </select>
  );
}

export const AccessibilityFlag = ({ r }) => (r.accessibility ? (
  <span className="badge badge-blue" title="Accessibility needs"><Accessibility size={12} /> Access</span>
) : null);
