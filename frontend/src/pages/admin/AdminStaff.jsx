import { useState } from 'react';
import { Info, Pencil, Plus, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { initials } from '../../utils/format.js';
import { ROLE_LABELS } from '../../utils/status.js';
import { Badge, Field, Modal, PageHeader } from '../../components/ui.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERMISSIONS = {
  admin: 'Full access: menu, orders, reservations, staff, promotions, reports and settings.',
  kitchen: 'Kitchen display only: sees order items and notes, updates preparation status. No prices or customer contact details.',
  foh: 'Reservations, tables, waitlist and dine-in orders. Cannot change menu, payments or settings.',
};

export default function AdminStaff() {
  const { users, customerCount, user: me, toggleStaffActive } = useApp();
  const [editing, setEditing] = useState(null);
  const staff = users.filter((u) => u.role !== 'customer');
  const customers = customerCount;

  return (
    <>
      <PageHeader
        title="Staff accounts"
        subtitle={`${staff.filter((s) => s.active).length} active staff · ${customers} registered customers`}
        actions={<button className="btn btn-primary" onClick={() => setEditing({ name: '', email: '', phone: '', role: 'kitchen', password: '' })}><Plus size={16} /> Add staff member</button>}
      />
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className={s.active ? '' : 'row-muted'}>
                  <td><div className="item-cell"><span className="avatar">{initials(s.name)}</span><strong>{s.name}</strong>{s.id === me.id && <Badge tone="gray">You</Badge>}</div></td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td><Badge tone={s.role === 'admin' ? 'purple' : s.role === 'kitchen' ? 'amber' : 'blue'}>{ROLE_LABELS[s.role]}</Badge></td>
                  <td>{s.active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Deactivated</Badge>}</td>
                  <td>
                    <div className="btn-row nowrap">
                      <button className="icon-btn" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Pencil size={16} /></button>
                      {s.id !== me.id && (
                        <button className={`btn btn-sm ${s.active ? 'btn-danger-ghost' : 'btn-ghost'}`} onClick={() => toggleStaffActive(s.id)}>
                          {s.active ? <><UserX size={14} /> Deactivate</> : <><UserCheck size={14} /> Reactivate</>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title"><ShieldCheck size={18} /> Role permissions</h2>
        <ul className="perm-list">
          {Object.entries(PERMISSIONS).map(([role, text]) => (
            <li key={role}><strong>{ROLE_LABELS[role]}</strong><span className="muted">{text}</span></li>
          ))}
        </ul>
      </div>

      {editing && <StaffEditor initial={editing} onClose={() => setEditing(null)} isSelf={editing.id === me.id} />}
    </>
  );
}

function StaffEditor({ initial, onClose, isSelf }) {
  const { saveStaff } = useApp();
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    const err = {};
    if (f.name.trim().length < 2) err.name = 'Name is required.';
    if (!EMAIL_RE.test(f.email.trim())) err.email = 'Enter a valid email.';
    if (!initial.id && (f.password.length < 8 || !/\d/.test(f.password) || !/[a-zA-Z]/.test(f.password))) {
      err.password = 'At least 8 characters with a letter and a number.';
    }
    setErrors(err);
    if (Object.keys(err).length) return;
    const res = await saveStaff({ ...f, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() });
    if (res.error) setErrors({ form: res.error });
    else onClose();
  };

  return (
    <Modal
      open onClose={onClose} title={initial.id ? `Edit ${initial.name}` : 'Add staff member'}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>{initial.id ? 'Save changes' : 'Create account'}</button></>}
    >
      <Field label="Full name" htmlFor="s-name" error={errors.name} required><input id="s-name" value={f.name} onChange={set('name')} /></Field>
      <Field label="Work email" htmlFor="s-email" error={errors.email} required><input id="s-email" type="email" value={f.email} onChange={set('email')} /></Field>
      <Field label="Phone" htmlFor="s-phone"><input id="s-phone" type="tel" value={f.phone} onChange={set('phone')} /></Field>
      {!initial.id && (
        <Field label="Temporary password" htmlFor="s-pass" error={errors.password} hint="Share it with the staff member privately. It is stored hashed (bcrypt)." required>
          <input id="s-pass" type="text" autoComplete="new-password" value={f.password} onChange={set('password')} />
        </Field>
      )}
      <Field label="Role" htmlFor="s-role" hint={PERMISSIONS[f.role]}>
        <select id="s-role" value={f.role} onChange={set('role')} disabled={isSelf}>
          <option value="kitchen">{ROLE_LABELS.kitchen}</option>
          <option value="foh">{ROLE_LABELS.foh}</option>
          <option value="admin">{ROLE_LABELS.admin}</option>
        </select>
      </Field>
      {errors.form && <div className="alert alert-error" role="alert">{errors.form}</div>}
      {!initial.id && (
        <p className="hint-box"><Info size={16} /> Staff can only be created here by a manager — there is no public staff sign-up.</p>
      )}
    </Modal>
  );
}
