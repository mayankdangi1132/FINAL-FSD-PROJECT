import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { formatClock, formatCurrency } from '../utils/format.js';
import { describeLine } from '../utils/pricing.js';
import { flowFor, statusLabel } from '../utils/status.js';
import { Field, Modal, StarInput, VegMark } from './ui.jsx';

/** Horizontal progress tracker for an order. */
export function OrderStepper({ order }) {
  const flow = flowFor(order.type);
  const reached = Object.fromEntries(order.history.map((h) => [h.status, h.at]));
  const current = flow.indexOf(order.status);

  if (order.status === 'cancelled') {
    return (
      <div className="stepper-cancelled">
        <X size={18} /> Cancelled {reached.cancelled && `at ${formatClock(reached.cancelled)}`}
      </div>
    );
  }
  return (
    <ol className="stepper">
      {flow.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={s} className={`step step-${state}`}>
            <span className="step-dot">{i < current || (i === current && s === 'completed') ? <Check size={14} /> : i + 1}</span>
            <span className="step-label">{statusLabel(s, order.type)}</span>
            {reached[s] && <span className="step-time">{formatClock(reached[s])}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Itemised list with optional prices. */
export function OrderItems({ items, showPrices = true }) {
  return (
    <ul className="order-items">
      {items.map((l, i) => (
        <li key={i}>
          <span className="oi-qty">{l.qty}×</span>
          <div className="oi-main">
            <div className="oi-name"><VegMark veg={l.veg} /> {l.name}</div>
            {describeLine(l) && <div className="muted small">{describeLine(l)}</div>}
            {l.note && <div className="oi-note">“{l.note}”</div>}
          </div>
          {showPrices && <span className="oi-price">{formatCurrency(l.price * l.qty)}</span>}
        </li>
      ))}
    </ul>
  );
}

export function BillSummary({ order, compact = false }) {
  return (
    <dl className={`bill ${compact ? 'bill-compact' : ''}`}>
      <div><dt>Subtotal</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
      {order.discount > 0 && <div className="bill-discount"><dt>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</dt><dd>−{formatCurrency(order.discount)}</dd></div>}
      <div><dt>Taxes (GST)</dt><dd>{formatCurrency(order.tax)}</dd></div>
      {order.type === 'delivery' && <div><dt>Delivery fee</dt><dd>{order.fee ? formatCurrency(order.fee) : 'Free'}</dd></div>}
      <div className="bill-total"><dt>Total</dt><dd>{formatCurrency(order.total)}</dd></div>
    </dl>
  );
}

export function RateOrderModal({ order, onClose, onDone }) {
  const { rateOrder } = useApp();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  if (!order) return null;
  const submit = async () => {
    if (!stars) { setError('Please choose a star rating.'); return; }
    const ok = await rateOrder(order.id, stars, comment.trim());
    if (ok) { onDone?.(); onClose(); }
  };
  return (
    <Modal
      open={!!order} onClose={onClose} title={`Rate order #${order.id}`} size="sm"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Submit feedback</button></>}
    >
      <p className="muted">How was your food and service?</p>
      <StarInput value={stars} onChange={(v) => { setStars(v); setError(''); }} />
      {error && <div className="field-error" role="alert">{error}</div>}
      <Field label="Comments (optional)" htmlFor="rate-comment">
        <textarea id="rate-comment" rows={3} maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us what you liked or what we can improve" />
      </Field>
    </Modal>
  );
}
