import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Field, PageHeader } from '../components/ui.jsx';

export default function TrackOrder() {
  const { lookupOrder, user } = useApp();
  const navigate = useNavigate();
  const [orderNo, setOrderNo] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const order = await lookupOrder(orderNo.trim(), phone.trim());
      navigate(`/order/${order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <PageHeader title="Track your order" subtitle="Enter your order number and the mobile number used to place it." />
      <form className="card form-card" onSubmit={submit} noValidate>
        <Field label="Order number" htmlFor="t-order" hint="e.g. 1234 — it's in your confirmation message">
          <input id="t-order" value={orderNo} onChange={(e) => { setOrderNo(e.target.value); setError(''); }} placeholder="#1234" required />
        </Field>
        <Field label="Mobile number" htmlFor="t-phone">
          <input id="t-phone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(''); }} placeholder="98765 43210" required />
        </Field>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={!orderNo || !phone || busy}><Search size={16} /> Track order</button>
        {user?.role === 'customer'
          ? <p className="muted small center">Signed in? See all your orders in <Link to="/account?tab=orders">My account</Link>.</p>
          : <p className="muted small center">Have an account? <Link to="/login" state={{ from: '/account?tab=orders' }}>Sign in</Link> to see all your orders.</p>}
      </form>
    </div>
  );
}
