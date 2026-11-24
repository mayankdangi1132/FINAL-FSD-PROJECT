import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Info, ShoppingBag, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/format.js';
import { calcTotals, describeLine } from '../utils/pricing.js';
import { EmptyState, Img, PageHeader, QtyStepper, VegMark } from '../components/ui.jsx';

export default function Cart() {
  const { cart, cartCount, updateQty, removeFromCart, clearCart, settings, user } = useApp();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="container narrow">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          text="Add a few dishes from our menu to get started."
          action={<Link to="/menu" className="btn btn-primary">Browse the menu</Link>}
        />
      </div>
    );
  }

  const { subtotal, tax } = calcTotals(cart, { type: 'pickup', settings, promo: null });

  return (
    <div className="container">
      <PageHeader title="Your cart" subtitle={`${cartCount} item${cartCount === 1 ? '' : 's'} ready for checkout`} />
      <div className="two-col">
        <div className="card">
          <ul className="cart-list">
            {cart.map((l) => (
              <li key={l.key} className="cart-line">
                <Img src={l.image} alt={l.name} className="cart-thumb" />
                <div className="cart-line-main">
                  <div className="cart-line-name"><VegMark veg={l.veg} /> {l.name}</div>
                  {describeLine(l) && <div className="muted small">{describeLine(l)}</div>}
                  {l.note && <div className="oi-note">“{l.note}”</div>}
                  <div className="muted small">{formatCurrency(l.price)} each</div>
                </div>
                <QtyStepper value={l.qty} min={0} onChange={(q) => updateQty(l.key, q)} size="sm" />
                <div className="cart-line-price">{formatCurrency(l.price * l.qty)}</div>
                <button className="icon-btn danger" onClick={() => removeFromCart(l.key)} aria-label={`Remove ${l.name}`}><Trash2 size={18} /></button>
              </li>
            ))}
          </ul>
          <div className="cart-actions">
            <Link to="/menu" className="btn btn-ghost"><ArrowLeft size={16} /> Add more items</Link>
            <button className="link-btn danger" onClick={clearCart}>Clear cart</button>
          </div>
        </div>

        <aside className="card summary-card">
          <h2 className="card-title">Order summary</h2>
          <dl className="bill">
            <div><dt>Subtotal</dt><dd>{formatCurrency(subtotal)}</dd></div>
            <div><dt>Estimated GST ({settings.taxRate}%)</dt><dd>{formatCurrency(tax)}</dd></div>
            <div><dt>Delivery fee</dt><dd className="muted">At checkout</dd></div>
            <div className="bill-total"><dt>Estimated total</dt><dd>{formatCurrency(subtotal + tax)}</dd></div>
          </dl>
          {settings.services.delivery && subtotal < settings.freeDeliveryAbove && (
            <p className="hint-box"><Info size={16} /> Add {formatCurrency(settings.freeDeliveryAbove - subtotal)} more for free delivery.</p>
          )}
          <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate('/checkout')}>
            Proceed to checkout <ArrowRight size={18} />
          </button>
          {!user && (
            <p className="muted small center">
              {settings.guestCheckout ? 'You can check out as a guest, or ' : 'Please '}
              <Link to="/login" state={{ from: '/checkout' }}>sign in</Link> to save your order history.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
