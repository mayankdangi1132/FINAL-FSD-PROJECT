// Small reusable UI building blocks.
import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Star, UtensilsCrossed, X } from 'lucide-react';
import { ORDER_STATUS, PAYMENT_STATUS, RES_STATUS, TABLE_STATUS, statusLabel } from '../utils/status.js';

export function Badge({ tone = 'gray', children, className = '' }) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}

export function OrderStatusBadge({ status, type }) {
  return <Badge tone={ORDER_STATUS[status]?.tone}>{statusLabel(status, type)}</Badge>;
}
export function ResStatusBadge({ status }) {
  return <Badge tone={RES_STATUS[status]?.tone}>{RES_STATUS[status]?.label || status}</Badge>;
}
export function PaymentBadge({ status }) {
  return <Badge tone={PAYMENT_STATUS[status]?.tone}>{PAYMENT_STATUS[status]?.label || status}</Badge>;
}
export function TableBadge({ status }) {
  return <Badge tone={TABLE_STATUS[status]?.tone}>{TABLE_STATUS[status]?.label}</Badge>;
}

/** Indian-style veg / non-veg marker. */
export function VegMark({ veg }) {
  const label = veg ? 'Vegetarian' : 'Non-vegetarian';
  return <span className={`veg-mark ${veg ? 'veg' : 'nonveg'}`} title={label} role="img" aria-label={label} />;
}

/** Image with a graceful fallback if the URL fails (e.g. offline). */
export function Img({ src, alt, className = '', ...rest }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div className={`img-fallback ${className}`} role="img" aria-label={alt}>
        <UtensilsCrossed size={28} />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} {...rest} />;
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const el = ref.current?.querySelector('input, select, textarea, button:not(.modal-close)');
    el?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        {title && (
          <div className="modal-head">
            <h2>{title}</h2>
            <button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={(
        <>
          <button className="btn btn-ghost" onClick={onClose}>Go back</button>
          <button className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </button>
        </>
      )}
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}

export function EmptyState({ icon: Icon = UtensilsCrossed, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={28} /></div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 20, size = 'md' }) {
  return (
    <div className={`qty qty-${size}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity"><Minus size={14} /></button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity"><Plus size={14} /></button>
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
      {label && <span>{label}</span>}
    </label>
  );
}

export function Stars({ value, size = 16 }) {
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= value ? 'on' : ''} fill={n <= value ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-input" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button" key={n} role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}
          className={(hover || value) >= n ? 'on' : ''}
        >
          <Star size={28} fill={(hover || value) >= n ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  return (
    <div className="stat-card">
      {Icon && <div className={`stat-icon tone-${tone}`}><Icon size={20} /></div>}
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

/** Simple vertical bar chart made with CSS — no chart library needed. */
export function BarChart({ data, format = (v) => v, height = 180 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((d) => (
        <div className="bar-col" key={d.label} title={`${d.label}: ${format(d.value)}`}>
          <span className="bar-value">{d.value ? format(d.value) : ''}</span>
          <div className="bar" style={{ height: `${(d.value / max) * 100}%` }} aria-label={`${d.label}: ${format(d.value)}`} />
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal bars, e.g. orders by type. */
export function HBars({ data, format = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="hbars">
      {data.map((d) => (
        <div className="hbar-row" key={d.label}>
          <span className="hbar-label">{d.label}</span>
          <div className="hbar-track"><div className={`hbar-fill tone-${d.tone || 'brand'}`} style={{ width: `${(d.value / max) * 100}%` }} /></div>
          <span className="hbar-value">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor, required }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      {label && <label htmlFor={htmlFor}>{label}{required && <span className="req" aria-hidden="true"> *</span>}</label>}
      {children}
      {error ? <div className="field-error" role="alert">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? 'active' : ''} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
