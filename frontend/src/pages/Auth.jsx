import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Armchair, ChefHat, Eye, EyeOff, LogIn, ShieldCheck, User, UserPlus } from 'lucide-react';
import { homeFor, useApp } from '../context/AppContext.jsx';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../data/constants.js';
import { Field } from '../components/ui.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/;
const ROLE_ICONS = { customer: User, admin: ShieldCheck, kitchen: ChefHat, foh: Armchair };

function PasswordInput({ id, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-with-btn">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} />
      <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function Login() {
  const { login, user } = useApp();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={state?.from || homeFor(user.role)} replace />;

  const go = (u) => {
    const target = state?.from && (u.role === 'customer' || !['/checkout', '/account'].some((p) => state.from.startsWith(p)))
      ? state.from : homeFor(u.role);
    navigate(target, { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setBusy(true);
    const res = await login(email.trim(), password);
    setBusy(false);
    if (res.error) setError(res.error);
    else go(res.user);
  };

  const demo = async (acct) => {
    setBusy(true);
    const res = await login(acct.email, DEMO_PASSWORD);
    setBusy(false);
    if (res.error) setError(res.error);
    else go(res.user);
  };

  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <div className="auth-head">
          <LogIn size={28} />
          <h1>Welcome back</h1>
          <p className="muted">Sign in to track orders, manage reservations and reorder favourites.</p>
        </div>
        {state?.message && <div className="alert alert-info">{state.message}</div>}
        <form onSubmit={submit} noValidate>
          <Field label="Email" htmlFor="l-email">
            <input id="l-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} autoComplete="email" />
          </Field>
          <Field label="Password" htmlFor="l-pass">
            <PasswordInput id="l-pass" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} autoComplete="current-password" />
          </Field>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="center muted small">New here? <Link to="/register" state={state}>Create a customer account</Link></p>
        <p className="center muted small">Restaurant staff accounts are created by the manager — there is no public staff sign-up.</p>

        <div className="demo-box">
          <div className="demo-title">Demo accounts <span className="muted small">(password: <code>{DEMO_PASSWORD}</code>)</span></div>
          <div className="demo-grid">
            {DEMO_ACCOUNTS.map((a) => {
              const Icon = ROLE_ICONS[a.role];
              return (
                <button key={a.role} type="button" className="demo-btn" onClick={() => demo(a)} disabled={busy} aria-label={`Sign in as ${a.label} (${a.email})`}>
                  <Icon size={18} />
                  <span><strong>{a.label}</strong><span className="muted small">{a.email}</span></span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { register, user } = useApp();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((er) => ({ ...er, [key]: undefined, form: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (form.name.trim().length < 2) err.name = 'Please enter your full name.';
    if (!EMAIL_RE.test(form.email.trim())) err.email = 'Enter a valid email address.';
    if (!PHONE_RE.test(form.phone.trim())) err.phone = 'Enter a valid 10-digit mobile number.';
    if (form.password.length < 8) err.password = 'Use at least 8 characters.';
    else if (!/\d/.test(form.password) || !/[a-zA-Z]/.test(form.password)) err.password = 'Include at least one letter and one number.';
    if (form.confirm !== form.password) err.confirm = 'Passwords do not match.';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    const res = await register({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
    setBusy(false);
    if (res.error) { setErrors({ [['name', 'phone', 'password'].includes(res.field) ? res.field : 'email']: res.error }); return; }
    navigate(state?.from || '/account', { replace: true });
  };

  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <div className="auth-head">
          <UserPlus size={28} />
          <h1>Create your account</h1>
          <p className="muted">Save addresses, track orders and reorder in one tap.</p>
        </div>
        <form onSubmit={submit} noValidate>
          <Field label="Full name" htmlFor="r-name" error={errors.name} required><input id="r-name" value={form.name} onChange={set('name')} autoComplete="name" /></Field>
          <Field label="Email" htmlFor="r-email" error={errors.email} required><input id="r-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="Mobile number" htmlFor="r-phone" error={errors.phone} required><input id="r-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="98765 43210" /></Field>
          <Field label="Password" htmlFor="r-pass" error={errors.password} hint="At least 8 characters with a letter and a number" required>
            <PasswordInput id="r-pass" value={form.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <Field label="Confirm password" htmlFor="r-confirm" error={errors.confirm} required>
            <PasswordInput id="r-confirm" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </Field>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="center muted small">Already have an account? <Link to="/login" state={state}>Sign in</Link></p>
      </div>
    </div>
  );
}
