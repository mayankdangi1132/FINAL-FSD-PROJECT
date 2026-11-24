import { useState } from 'react';
import { Pencil, Percent, Plus, Tag, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency } from '../../utils/format.js';
import { ConfirmDialog, EmptyState, Field, Modal, PageHeader, Toggle } from '../../components/ui.jsx';

const EMPTY = { code: '', description: '', type: 'percent', value: 10, minOrder: 0, maxDiscount: '', active: true };

export default function AdminPromotions() {
  const { promos, togglePromo, deletePromo } = useApp();
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  return (
    <>
      <PageHeader
        title="Promotions & discounts"
        subtitle="Create promo codes customers can apply at checkout."
        actions={<button className="btn btn-primary" onClick={() => setEditing(EMPTY)}><Plus size={16} /> New promotion</button>}
      />
      {promos.length === 0 ? <EmptyState icon={Tag} title="No promotions yet" text="Create your first promo code." /> : (
        <div className="promo-grid">
          {promos.map((p) => (
            <div key={p.id} className={`card promo-card ${p.active ? '' : 'is-off'}`}>
              <div className="promo-top">
                <span className="promo-code"><Tag size={14} /> {p.code}</span>
                <Toggle id={`promo-${p.id}`} checked={p.active} onChange={() => togglePromo(p.id)} label={p.active ? 'Active' : 'Paused'} />
              </div>
              <div className="promo-value">
                {p.type === 'percent' ? <><Percent size={20} /> {p.value}% off</> : <>{formatCurrency(p.value)} off</>}
              </div>
              <p className="muted">{p.description}</p>
              <ul className="promo-rules muted small">
                <li>Minimum order: {p.minOrder ? formatCurrency(p.minOrder) : 'None'}</li>
                {p.type === 'percent' && <li>Max discount: {p.maxDiscount ? formatCurrency(p.maxDiscount) : 'No cap'}</li>}
                <li>Used {p.uses || 0} times</li>
              </ul>
              <div className="btn-row">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...p, maxDiscount: p.maxDiscount ?? '' })}><Pencil size={14} /> Edit</button>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => setToDelete(p)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <PromoEditor initial={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)} title={`Delete ${toDelete?.code}?`}
        message="Customers will no longer be able to use this code. Orders that already used it are unaffected."
        confirmLabel="Delete promotion" onConfirm={() => deletePromo(toDelete.id)}
      />
    </>
  );
}

function PromoEditor({ initial, onClose }) {
  const { savePromo } = useApp();
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    const err = {};
    const code = f.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,15}$/.test(code)) err.code = '4–15 letters or numbers, no spaces.';
    if (!(Number(f.value) > 0)) err.value = 'Enter a value greater than 0.';
    if (f.type === 'percent' && Number(f.value) > 100) err.value = 'Percentage cannot exceed 100.';
    if (f.description.trim().length < 5) err.description = 'Add a short description for customers.';
    setErrors(err);
    if (Object.keys(err).length) return;
    const res = await savePromo({
      ...f, code, description: f.description.trim(), value: Number(f.value), minOrder: Number(f.minOrder) || 0,
      maxDiscount: f.type === 'percent' && f.maxDiscount !== '' ? Number(f.maxDiscount) : null,
    });
    if (res.error) setErrors({ code: res.error });
    else onClose();
  };

  return (
    <Modal
      open onClose={onClose} title={initial.id ? `Edit ${initial.code}` : 'New promotion'}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save promotion</button></>}
    >
      <div className="form-grid">
        <Field label="Promo code" htmlFor="p-code" error={errors.code} required>
          <input id="p-code" value={f.code} onChange={(e) => setF((s) => ({ ...s, code: e.target.value.toUpperCase() }))} placeholder="SUMMER15" />
        </Field>
        <Field label="Discount type" htmlFor="p-type">
          <select id="p-type" value={f.type} onChange={set('type')}>
            <option value="percent">Percentage (%)</option>
            <option value="flat">Flat amount (₹)</option>
          </select>
        </Field>
        <Field label={f.type === 'percent' ? 'Discount (%)' : 'Discount (₹)'} htmlFor="p-value" error={errors.value} required>
          <input id="p-value" type="number" min="1" value={f.value} onChange={set('value')} />
        </Field>
        <Field label="Minimum order (₹)" htmlFor="p-min"><input id="p-min" type="number" min="0" value={f.minOrder} onChange={set('minOrder')} /></Field>
        {f.type === 'percent' && (
          <Field label="Maximum discount (₹)" htmlFor="p-max" hint="Leave empty for no cap"><input id="p-max" type="number" min="0" value={f.maxDiscount} onChange={set('maxDiscount')} /></Field>
        )}
      </div>
      <Field label="Description shown to customers" htmlFor="p-desc" error={errors.description} required>
        <input id="p-desc" value={f.description} onChange={set('description')} placeholder="15% off all orders this summer" />
      </Field>
      <Toggle id="p-active" checked={f.active} onChange={(v) => setF((s) => ({ ...s, active: v }))} label="Active" />
    </Modal>
  );
}
