import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Banknote, Bike, CreditCard, Loader2, Lock, ShieldCheck, Smartphone, Store, Tag, Utensils, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { DAY_KEYS, formatAddress, formatCurrency, formatTime12, pad } from '../utils/format.js';
import { calcTotals, describeLine } from '../utils/pricing.js';
import { Field, Modal, PageHeader, VegMark } from '../components/ui.jsx';

const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function scheduleOptions(hours) {
  const now = new Date();
  const h = hours[DAY_KEYS[now.getDay()]];
  if (!h || h.closed) return [];
  const [ch, cm] = h.close.split(':').map(Number);
  const [oh, om] = h.open.split(':').map(Number);
  const start = Math.max(oh * 60 + om + 30, Math.ceil((now.getHours() * 60 + now.getMinutes() + 45) / 15) * 15);
  const end = ch * 60 + cm - 30;
  const out = [];
  for (let t = start; t <= end; t += 15) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  return out;
}

export default function Checkout() {
  const { cart, settings, user, placeOrder, addAddress, validatePromo } = useApp();
  const navigate = useNavigate();

  const enabledTypes = [
    settings.services.delivery && { id: 'delivery', label: 'Delivery', icon: Bike, note: '35–45 min' },
    settings.services.pickup && { id: 'pickup', label: 'Pickup', icon: Store, note: 'Ready in ~20 min' },
    settings.services.dineIn && { id: 'dine-in', label: 'Dine-In', icon: Utensils, note: 'Order from your table' },
  ].filter(Boolean);

  const saved = user?.addresses || [];
  const [type, setType] = useState(enabledTypes[0]?.id || 'pickup');
  const [contact, setContact] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '' });
  const [addressId, setAddressId] = useState(saved[0]?.id || 'new');
  const [addr, setAddr] = useState({ label: 'Home', line1: '', area: '', city: 'New Delhi', pincode: '', landmark: '' });
  const [saveAddr, setSaveAddr] = useState(true);
  const [table, setTable] = useState('');
  const [timing, setTiming] = useState('asap');
  const [time, setTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [payment, setPayment] = useState('card');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoMsg, setPromoMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState('');
  const [applying, setApplying] = useState(false);

  const slots = useMemo(() => scheduleOptions(settings.hours), [settings.hours]);
  const totals = calcTotals(cart, { type, settings, promo });

  if (processing === 'done') return null;
  if (cart.length === 0 && !processing) return <Navigate to="/menu" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: '/checkout', message: 'Please sign in to place your order.' }} />;
  if (user.role !== 'customer') {
    return (
      <div className="container narrow">
        <div className="card access-denied">
          <h1>Online ordering is for customers</h1>
          <p className="muted">Staff accounts can't place online orders. Use the Front of House screen to add dine-in orders.</p>
          <Link to="/" className="btn btn-primary">Back to home</Link>
        </div>
      </div>
    );
  }

  const applyPromo = async () => {
    setApplying(true);
    try {
      const p = await validatePromo(promoInput.trim(), totals.subtotal);
      setPromo(p);
      setPromoMsg({ tone: 'success', text: `${p.code} applied — ${p.description}.` });
    } catch (e) {
      setPromo(null);
      setPromoMsg({ tone: 'error', text: e.message });
    } finally {
      setApplying(false);
    }
  };

  const validate = () => {
    const e = {};
    if (contact.name.trim().length < 2) e.name = 'Please enter your name.';
    if (!PHONE_RE.test(contact.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number.';
    if (type === 'delivery') {
      if (totals.subtotal < settings.minDeliveryOrder) e.type = `Minimum order for delivery is ${formatCurrency(settings.minDeliveryOrder)}.`;
      if (addressId === 'new') {
        if (!addr.line1.trim()) e.line1 = 'House / flat and street are required.';
        if (!addr.area.trim()) e.area = 'Area is required.';
        if (!/^\d{6}$/.test(addr.pincode.trim())) e.pincode = 'Enter a 6-digit PIN code.';
      }
    }
    if (type === 'dine-in' && !table.trim()) e.table = 'Enter the table number shown on your table.';
    if (timing === 'later' && !time) e.time = 'Choose a time.';
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(() => document.querySelector('.has-error input, .has-error select, .form-error')?.focus?.(), 0);
    }
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;
    let address = null;
    if (type === 'delivery') {
      if (addressId === 'new') address = { ...addr };
      else {
        const { id, ...rest } = saved.find((a) => a.id === addressId);
        address = rest;
      }
    }
    setProcessing(true);
    try {
      const { order, checkoutUrl } = await placeOrder({
        type, address, table: type === 'dine-in' ? table.trim().toUpperCase() : null,
        customer: { name: contact.name.trim(), phone: contact.phone.trim(), email: contact.email.trim() },
        scheduledFor: timing === 'later' ? time : null,
        instructions: instructions.trim(), paymentMethod: payment, promoCode: promo?.code || null,
      });
      if (type === 'delivery' && addressId === 'new' && user && saveAddr) addAddress(address);
      if (checkoutUrl) { window.location.assign(checkoutUrl); return; } // real Stripe Checkout
      const go = () => {
        setProcessing('done');
        navigate(`/order/${order.id}`, { replace: true, state: { justPlaced: true } });
      };
      if (payment === 'cash') go();
      else setTimeout(go, 1200); // demo payment (no Stripe key configured)
    } catch (e) {
      setProcessing(false);
      setFormError(e.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const clearError = (key) => setErrors((er) => (er[key] ? { ...er, [key]: undefined } : er));
  const set = (setter) => (e) => {
    const { name, value } = e.target;
    setter((s) => ({ ...s, [name]: value }));
    clearError(name);
  };
  const cashLabel = type === 'delivery' ? 'Cash on delivery' : type === 'pickup' ? 'Pay at pickup' : 'Pay at the table';

  return (
    <div className="container">
      <PageHeader title="Checkout" subtitle={`Signed in as ${user.email}`} />
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}
      <form className="two-col" onSubmit={submit} noValidate>
        <div className="checkout-steps">
          {/* 1. Order type */}
          <section className="card">
            <h2 className="card-title"><span className="step-num">1</span> How would you like your order?</h2>
            <div className="radio-cards">
              {enabledTypes.map((t) => (
                <label key={t.id} className={`radio-card ${type === t.id ? 'active' : ''}`}>
                  <input type="radio" name="type" value={t.id} checked={type === t.id} onChange={() => { setType(t.id); clearError('type'); }} />
                  <t.icon size={22} />
                  <strong>{t.label}</strong>
                  <span className="muted small">{t.note}</span>
                </label>
              ))}
            </div>
            {errors.type && <div className="field-error form-error" role="alert" tabIndex={-1}>{errors.type}</div>}
          </section>

          {/* 2. Contact */}
          <section className="card">
            <h2 className="card-title"><span className="step-num">2</span> Contact details</h2>
            <div className="form-grid">
              <Field label="Full name" htmlFor="c-name" error={errors.name} required>
                <input id="c-name" name="name" value={contact.name} onChange={set(setContact)} autoComplete="name" />
              </Field>
              <Field label="Mobile number" htmlFor="c-phone" error={errors.phone} required hint="We'll text you order updates">
                <input id="c-phone" name="phone" type="tel" value={contact.phone} onChange={set(setContact)} autoComplete="tel" placeholder="98765 43210" />
              </Field>
              <Field label="Email" htmlFor="c-email">
                <input id="c-email" name="email" type="email" value={contact.email} autoComplete="email" readOnly />
              </Field>
            </div>
          </section>

          {/* 3. Address / table */}
          {type === 'delivery' && (
            <section className="card">
              <h2 className="card-title"><span className="step-num">3</span> Delivery address</h2>
              {saved.length > 0 && (
                <div className="address-options">
                  {saved.map((a) => (
                    <label key={a.id} className={`radio-row ${addressId === a.id ? 'active' : ''}`}>
                      <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                      <span><strong>{a.label}</strong><br /><span className="muted small">{formatAddress(a)}</span></span>
                    </label>
                  ))}
                  <label className={`radio-row ${addressId === 'new' ? 'active' : ''}`}>
                    <input type="radio" name="address" checked={addressId === 'new'} onChange={() => setAddressId('new')} />
                    <span><strong>Use a new address</strong></span>
                  </label>
                </div>
              )}
              {addressId === 'new' && (
                <div className="form-grid">
                  <Field label="House / flat, street" htmlFor="a-line1" error={errors.line1} required>
                    <input id="a-line1" name="line1" value={addr.line1} onChange={set(setAddr)} autoComplete="address-line1" />
                  </Field>
                  <Field label="Area / locality" htmlFor="a-area" error={errors.area} required>
                    <input id="a-area" name="area" value={addr.area} onChange={set(setAddr)} autoComplete="address-line2" />
                  </Field>
                  <Field label="City" htmlFor="a-city">
                    <input id="a-city" name="city" value={addr.city} onChange={set(setAddr)} autoComplete="address-level2" />
                  </Field>
                  <Field label="PIN code" htmlFor="a-pin" error={errors.pincode} required>
                    <input id="a-pin" name="pincode" inputMode="numeric" maxLength={6} value={addr.pincode} onChange={set(setAddr)} autoComplete="postal-code" />
                  </Field>
                  <Field label="Landmark (optional)" htmlFor="a-landmark">
                    <input id="a-landmark" name="landmark" value={addr.landmark} onChange={set(setAddr)} />
                  </Field>
                  {user && (
                    <Field label="Save as" htmlFor="a-label">
                      <select id="a-label" name="label" value={addr.label} onChange={set(setAddr)}>
                        <option>Home</option><option>Work</option><option>Other</option>
                      </select>
                    </Field>
                  )}
                </div>
              )}
              {addressId === 'new' && user && (
                <label className="check-row"><input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /> Save this address for next time</label>
              )}
              <p className="muted small">We deliver within 8 km of our Connaught Place kitchen.</p>
            </section>
          )}
          {type === 'dine-in' && (
            <section className="card">
              <h2 className="card-title"><span className="step-num">3</span> Your table</h2>
              <Field label="Table number" htmlFor="table" error={errors.table} required hint="You'll find it on the card on your table, e.g. T5">
                <input id="table" value={table} onChange={(e) => { setTable(e.target.value); clearError('table'); }} placeholder="T5" maxLength={4} />
              </Field>
            </section>
          )}

          {/* 4. Timing + notes */}
          {type !== 'dine-in' && (
            <section className="card">
              <h2 className="card-title"><span className="step-num">{type === 'delivery' ? 4 : 3}</span> When?</h2>
              <div className="radio-inline">
                <label className={`radio-row ${timing === 'asap' ? 'active' : ''}`}>
                  <input type="radio" checked={timing === 'asap'} onChange={() => setTiming('asap')} /> As soon as possible
                </label>
                <label className={`radio-row ${timing === 'later' ? 'active' : ''} ${slots.length ? '' : 'disabled'}`}>
                  <input type="radio" checked={timing === 'later'} onChange={() => setTiming('later')} disabled={!slots.length} /> Schedule for later today
                </label>
              </div>
              {timing === 'later' && (
                <Field label={`${type === 'delivery' ? 'Delivery' : 'Pickup'} time`} htmlFor="time" error={errors.time}>
                  <select id="time" value={time} onChange={(e) => { setTime(e.target.value); clearError('time'); }}>
                    <option value="">Select a time</option>
                    {slots.map((s) => <option key={s} value={s}>{formatTime12(s)}</option>)}
                  </select>
                </Field>
              )}
            </section>
          )}

          <section className="card">
            <h2 className="card-title">Special instructions <span className="muted small">(optional)</span></h2>
            <textarea
              rows={3} maxLength={300} value={instructions} onChange={(e) => setInstructions(e.target.value)}
              placeholder="Allergies, delivery directions, cutlery needed…" aria-label="Special instructions"
            />
          </section>

          {/* Payment */}
          <section className="card">
            <h2 className="card-title"><Lock size={18} /> Payment</h2>
            <div className="radio-cards">
              <label className={`radio-card ${payment === 'card' ? 'active' : ''}`}>
                <input type="radio" name="pay" checked={payment === 'card'} onChange={() => setPayment('card')} />
                <CreditCard size={22} /><strong>Card</strong><span className="muted small">Visa, Mastercard, RuPay</span>
              </label>
              <label className={`radio-card ${payment === 'upi' ? 'active' : ''}`}>
                <input type="radio" name="pay" checked={payment === 'upi'} onChange={() => setPayment('upi')} />
                <Smartphone size={22} /><strong>UPI</strong><span className="muted small">GPay, PhonePe, Paytm</span>
              </label>
              {settings.cashPayments && (
                <label className={`radio-card ${payment === 'cash' ? 'active' : ''}`}>
                  <input type="radio" name="pay" checked={payment === 'cash'} onChange={() => setPayment('cash')} />
                  <Banknote size={22} /><strong>{cashLabel}</strong><span className="muted small">Pay when you receive</span>
                </label>
              )}
            </div>
            {payment !== 'cash' && (
              <p className="secure-note">
                <ShieldCheck size={16} />
                {settings.stripeEnabled
                  ? 'You’ll be redirected to Stripe’s secure page to pay. Your card details never touch our servers.'
                  : 'Demo mode: payment is simulated — no real card is charged. (Add a Stripe test key to enable real checkout.)'}
              </p>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside className="card summary-card sticky">
          <h2 className="card-title">Your order</h2>
          <ul className="summary-items">
            {cart.map((l) => (
              <li key={l.key}>
                <span><VegMark veg={l.veg} /> {l.qty}× {l.name}{describeLine(l) && <span className="muted small"> · {describeLine(l)}</span>}</span>
                <span>{formatCurrency(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <Link to="/cart" className="link-btn small">Edit cart</Link>

          <div className="promo-box">
            <label htmlFor="promo" className="sr-only">Promo code</label>
            <Tag size={16} />
            <input
              id="promo" placeholder="Promo code" value={promoInput} disabled={!!promo}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } }}
            />
            {promo
              ? <button type="button" className="icon-btn" onClick={() => { setPromo(null); setPromoInput(''); setPromoMsg(null); }} aria-label="Remove promo code"><X size={16} /></button>
              : <button type="button" className="btn btn-ghost btn-sm" onClick={applyPromo} disabled={!promoInput || applying}>{applying ? '…' : 'Apply'}</button>}
          </div>
          {promoMsg && <p className={`promo-msg ${promoMsg.tone}`}>{promoMsg.text}</p>}
          {!promo && <p className="muted small">Try <code>WELCOME10</code> or <code>FLAT75</code></p>}

          <dl className="bill">
            <div><dt>Subtotal</dt><dd>{formatCurrency(totals.subtotal)}</dd></div>
            {totals.discount > 0 && <div className="bill-discount"><dt>Discount ({promo.code})</dt><dd>−{formatCurrency(totals.discount)}</dd></div>}
            <div><dt>GST ({settings.taxRate}%)</dt><dd>{formatCurrency(totals.tax)}</dd></div>
            {type === 'delivery' && <div><dt>Delivery fee</dt><dd>{totals.fee ? formatCurrency(totals.fee) : 'Free'}</dd></div>}
            <div className="bill-total"><dt>Total</dt><dd>{formatCurrency(totals.total)}</dd></div>
          </dl>
          {formError && <div className="alert alert-error small" role="alert">{formError}</div>}
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={!!processing}>
            {payment === 'cash' ? 'Place order' : 'Pay'} · {formatCurrency(totals.total)}
          </button>
          <p className="muted small center">By placing your order you agree to our terms and cancellation policy.</p>
        </aside>
      </form>

      <Modal open={processing === true} onClose={() => {}} size="sm">
        <div className="processing">
          <Loader2 size={36} className="spin" />
          <h3>{payment === 'cash' ? 'Placing your order…' : 'Processing secure payment…'}</h3>
          <p className="muted small">Please don’t close this window.</p>
        </div>
      </Modal>
    </div>
  );
}
