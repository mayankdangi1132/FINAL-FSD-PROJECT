import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Bike, CheckCircle2, Info, Loader2, Lock, MapPin, Phone, Receipt, RotateCcw, Star, Store, Utensils } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { fetchOrder, verifyPayment } from '../api.js';
import { formatAddress, formatDateTime, formatTime12 } from '../utils/format.js';
import { ORDER_TYPES, PAYMENT_METHODS, statusMessage } from '../utils/status.js';
import { BillSummary, OrderItems, OrderStepper, RateOrderModal } from '../components/OrderBits.jsx';
import { ConfirmDialog, EmptyState, OrderStatusBadge, PaymentBadge, Stars } from '../components/ui.jsx';
import { useReorder } from './customer/useReorder.js';

const TYPE_ICON = { delivery: Bike, pickup: Store, 'dine-in': Utensils };
const REFRESH_MS = 5000;

export default function OrderTracking() {
  const { id } = useParams();
  const { state } = useLocation();
  const [params, setParams] = useSearchParams();
  const { user, settings, cancelOrder } = useApp();
  const reorder = useReorder();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rating, setRating] = useState(null);
  const [paymentNote, setPaymentNote] = useState(params.get('payment') === 'cancelled' ? 'Payment was cancelled. Your order is saved — you can pay at pickup/delivery or contact us.' : '');

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrder(id));
      setError(null);
    } catch (e) {
      setError({ status: e.status, message: e.message, requiresLogin: e.data?.requiresLogin });
    }
  }, [id]);

  useEffect(() => { setOrder(null); setError(null); load(); }, [load]);

  // Returning from Stripe Checkout: confirm the payment with the server.
  useEffect(() => {
    const sessionId = params.get('session_id');
    if (!sessionId) return;
    verifyPayment(id, sessionId)
      .then((r) => setPaymentNote(r.paid ? 'Payment received — thank you!' : 'We are still confirming your payment.'))
      .catch((e) => setPaymentNote(e.message))
      .finally(() => { setParams({}, { replace: true }); load(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live tracking: refresh while the order is in progress.
  const done = order && ['completed', 'cancelled'].includes(order.status);
  useEffect(() => {
    if (!order || done) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [order, done, load]);

  if (error?.status === 403) {
    return (
      <div className="container narrow">
        <EmptyState
          icon={Lock} title="This order is private"
          text="Sign in with the account that placed this order to view it."
          action={<Link to="/login" state={{ from: `/order/${id}` }} className="btn btn-primary">Sign in</Link>}
        />
      </div>
    );
  }
  if (error) {
    return (
      <div className="container narrow">
        <EmptyState icon={Receipt} title={error.status === 404 ? 'Order not found' : 'Could not load this order'} text={error.status === 404 ? `We couldn't find order #${id}.` : error.message}
          action={<Link to="/track" className="btn btn-primary">See my orders</Link>} />
      </div>
    );
  }
  if (!order) {
    return <div className="container narrow center-page center"><Loader2 className="spin" size={28} /><p className="muted">Loading your order…</p></div>;
  }

  const TypeIcon = TYPE_ICON[order.type];
  const isStaff = user && user.role !== 'customer';
  const isOwner = user && order.userId === user.id;
  const isGuestOrder = !order.userId && !isStaff;
  const canCancel = order.status === 'placed' && (isOwner || isGuestOrder);

  const doCancel = async () => {
    if (await cancelOrder(order.id, 'Cancelled by customer')) load();
  };

  return (
    <div className="container track-page">
      {state?.justPlaced && (
        <div className="success-banner">
          <CheckCircle2 size={22} />
          <div>
            <strong>Thank you, {order.customer.name.split(' ')[0]}! Your order has been placed.</strong>
            <span>Keep this page open to follow your order. Order number: #{order.id}</span>
          </div>
        </div>
      )}
      {paymentNote && <div className="alert alert-info">{paymentNote}</div>}

      <div className="track-head card">
        <div className="track-head-top">
          <div>
            <div className="eyebrow">Order #{order.id}</div>
            <h1 className="track-title">{statusMessage(order)}</h1>
            <p className="muted small">Placed {formatDateTime(order.createdAt)} · <TypeIcon size={14} className="inline-icon" /> {ORDER_TYPES[order.type]}
              {order.scheduledFor && <> · Scheduled for {formatTime12(order.scheduledFor)}</>}
            </p>
          </div>
          <OrderStatusBadge status={order.status} type={order.type} />
        </div>
        <OrderStepper order={order} />
        {!done && (
          <p className="live-note"><span className="live-dot" /> This page updates automatically as the restaurant updates your order.</p>
        )}
      </div>

      <div className="two-col">
        <div className="card">
          <h2 className="card-title">Items</h2>
          <OrderItems items={order.items} showPrices={!isStaff || user.role !== 'kitchen'} />
          {order.instructions && (
            <div className="hint-box"><Info size={16} /> <span><strong>Your instructions:</strong> {order.instructions}</span></div>
          )}
          {order.rating && (
            <div className="rating-box">
              <strong>Your feedback</strong> <Stars value={order.rating.stars} />
              {order.rating.comment && <p className="muted">“{order.rating.comment}”</p>}
            </div>
          )}
        </div>

        <aside className="stack">
          <div className="card">
            <h2 className="card-title">{order.type === 'delivery' ? 'Delivering to' : order.type === 'pickup' ? 'Pickup from' : 'Table'}</h2>
            <p className="info-line">
              {order.type === 'delivery' && <><MapPin size={16} /> {formatAddress(order.address)}</>}
              {order.type === 'pickup' && <><Store size={16} /> {settings.name}, {settings.address}</>}
              {order.type === 'dine-in' && <><Utensils size={16} /> Table {order.table}</>}
            </p>
            {order.customer.phone && <p className="info-line muted small"><Phone size={16} /> {order.customer.name} · {order.customer.phone}</p>}
          </div>
          {order.total != null && (
            <div className="card">
              <h2 className="card-title">Bill</h2>
              <BillSummary order={order} />
              <div className="pay-line">
                <span>{PAYMENT_METHODS[order.payment.method]}</span>
                <PaymentBadge status={order.payment.status} />
              </div>
            </div>
          )}
          <div className="card actions-card">
            {canCancel && <button className="btn btn-danger-ghost btn-block" onClick={() => setConfirmCancel(true)}>Cancel order</button>}
            {order.status === 'completed' && isOwner && !order.rating && (
              <button className="btn btn-primary btn-block" onClick={() => setRating(order)}><Star size={16} /> Rate this order</button>
            )}
            {isOwner && done && <button className="btn btn-ghost btn-block" onClick={() => reorder(order)}><RotateCcw size={16} /> Order again</button>}
            {isOwner && <Link to="/account?tab=orders" className="btn btn-ghost btn-block">All my orders</Link>}
            {isGuestOrder && !user && <Link to="/register" className="btn btn-ghost btn-block">Create an account to save orders</Link>}
            {!canCancel && !done && <p className="muted small center">Need to change something? Call us on {settings.phone}.</p>}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this order?"
        message={order.payment.status === 'paid' ? 'Your payment will be refunded to the original payment method within 5–7 working days.' : 'Your order will be cancelled and you will not be charged.'}
        confirmLabel="Yes, cancel order" onConfirm={doCancel}
      />
      <RateOrderModal order={rating} onClose={() => setRating(null)} onDone={load} />
    </div>
  );
}
