import { useState } from 'react';
import { Eye, EyeOff, FolderTree, Info, Pencil, Plus, Search, Sparkles, Star, Trash2, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { ALLERGENS, DIETARY } from '../../data/constants.js';
import { formatCurrency } from '../../utils/format.js';
import { ConfirmDialog, EmptyState, Field, Img, Modal, PageHeader, Toggle, VegMark } from '../../components/ui.jsx';

const EMPTY_ITEM = {
  name: '', description: '', category: '', subcategory: '', price: '', prepTime: 15, stock: '', image: '',
  veg: true, dietary: [], allergens: [], available: true, hidden: false, featured: false, special: false,
  options: [], addOns: [],
};

// "Regular:0, Large:120"  <->  [{label, price}]
const choicesToText = (list) => list.map((c) => `${c.label}:${c.price}`).join(', ');
const textToChoices = (text) => text.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
  const i = s.lastIndexOf(':');
  return i > 0 ? { label: s.slice(0, i).trim(), price: Number(s.slice(i + 1)) || 0 } : { label: s, price: 0 };
});

export default function AdminMenu() {
  const { menu, categories, patchMenuItem, deleteMenuItem } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [state, setState] = useState('all');
  const [editing, setEditing] = useState(null);
  const [showCats, setShowCats] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const list = menu.filter((m) =>
    (cat === 'all' || m.category === cat)
    && (!q || m.name.toLowerCase().includes(q.toLowerCase()))
    && (state === 'all' || (state === 'available' && m.available && !m.hidden) || (state === 'unavailable' && !m.available) || (state === 'hidden' && m.hidden)));

  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';

  return (
    <>
      <PageHeader
        title="Menu management"
        subtitle={`${menu.length} items in ${categories.length} categories`}
        actions={(
          <>
            <button className="btn btn-ghost" onClick={() => setShowCats(true)}><FolderTree size={16} /> Categories</button>
            <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY_ITEM, category: categories[0]?.id || '' })}><Plus size={16} /> Add item</button>
          </>
        )}
      />
      <div className="card">
        <div className="filter-bar">
          <div className="search-box sm"><Search size={16} /><input type="search" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" /></div>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={state} onChange={(e) => setState(e.target.value)} aria-label="Availability">
            <option value="all">Any status</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        {list.length === 0 ? <EmptyState title="No items" text="Try a different filter or add a new item." /> : (
          <div className="table-wrap">
            <table className="table menu-table">
              <thead>
                <tr><th>Item</th><th>Category</th><th>Price</th><th>Stock</th><th>Available</th><th>Flags</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className={m.hidden ? 'row-muted' : ''}>
                    <td>
                      <div className="item-cell">
                        <Img src={m.image} alt="" className="item-thumb" />
                        <div>
                          <div className="item-cell-name"><VegMark veg={m.veg} /> {m.name}</div>
                          <div className="muted small">{m.prepTime} min · {m.dietary.map((d) => DIETARY[d]).join(', ') || 'No dietary labels'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{catName(m.category)}{m.subcategory && <div className="muted small">{m.subcategory}</div>}</td>
                    <td><strong>{formatCurrency(m.price)}</strong></td>
                    <td>{m.stock == null ? <span className="muted">—</span> : m.stock}</td>
                    <td>
                      <Toggle
                        id={`avail-${m.id}`} checked={m.available}
                        onChange={(v) => patchMenuItem(m.id, { available: v, ...(v && m.stock === 0 ? { stock: null } : {}) }, `Marked "${m.name}" as ${v ? 'available' : 'unavailable'}`)}
                      />
                    </td>
                    <td>
                      <div className="btn-row nowrap">
                        <button className={`icon-btn ${m.featured ? 'on' : ''}`} title="Featured" aria-pressed={m.featured}
                          onClick={() => patchMenuItem(m.id, { featured: !m.featured }, `${m.featured ? 'Unfeatured' : 'Featured'} "${m.name}"`)}>
                          <Star size={16} fill={m.featured ? 'currentColor' : 'none'} />
                        </button>
                        <button className={`icon-btn ${m.special ? 'on' : ''}`} title="Daily special" aria-pressed={m.special}
                          onClick={() => patchMenuItem(m.id, { special: !m.special }, `${m.special ? 'Removed' : 'Set'} "${m.name}" as today's special`)}>
                          <Sparkles size={16} />
                        </button>
                        <button className="icon-btn" title={m.hidden ? 'Show on menu' : 'Hide from menu'} aria-pressed={m.hidden}
                          onClick={() => patchMenuItem(m.id, { hidden: !m.hidden }, `${m.hidden ? 'Unhid' : 'Hid'} "${m.name}"`)}>
                          {m.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="btn-row nowrap">
                        <button className="icon-btn" onClick={() => setEditing({ ...m, stock: m.stock ?? '' })} aria-label={`Edit ${m.name}`}><Pencil size={16} /></button>
                        <button className="icon-btn danger" onClick={() => setToDelete(m)} aria-label={`Delete ${m.name}`}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <ItemEditor initial={editing} onClose={() => setEditing(null)} />}
      {showCats && <CategoryManager onClose={() => setShowCats(false)} />}
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)} title={`Delete "${toDelete?.name}"?`}
        message="It will be removed from the menu. Past orders keep their item names and prices. Tip: hide it instead if it's seasonal."
        confirmLabel="Delete item" onConfirm={() => deleteMenuItem(toDelete.id)}
      />
    </>
  );
}

function ItemEditor({ initial, onClose }) {
  const { categories, saveMenuItem, uploadImage } = useApp();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    ...initial,
    optionsText: initial.options.map((g) => ({ name: g.name, text: choicesToText(g.choices) })),
    addOnsText: choicesToText(initial.addOns),
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const toggleIn = (k, v) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const subs = categories.find((c) => c.id === f.category)?.subcategories || [];

  // Uploads to the API (Cloudinary if configured, otherwise backend/uploads).
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors((er) => ({ ...er, image: 'Please choose an image file.' })); return; }
    if (file.size > 2 * 1024 * 1024) { setErrors((er) => ({ ...er, image: 'Image must be 2 MB or smaller.' })); return; }
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) { setF((s) => ({ ...s, image: url })); setErrors((er) => ({ ...er, image: undefined })); }
  };

  const save = async () => {
    const err = {};
    if (f.name.trim().length < 2) err.name = 'Name is required.';
    if (f.description.trim().length < 10) err.description = 'Add a short description (10+ characters).';
    if (!f.category) err.category = 'Choose a category.';
    if (!(Number(f.price) > 0)) err.price = 'Enter a price greater than 0.';
    if (!(Number(f.prepTime) > 0)) err.prepTime = 'Enter preparation time in minutes.';
    if (f.stock !== '' && !(Number(f.stock) >= 0)) err.stock = 'Stock must be 0 or more.';
    setErrors(err);
    if (Object.keys(err).length) return;
    const { optionsText, addOnsText, ...rest } = f;
    setSaving(true);
    const ok = await saveMenuItem({
      ...rest,
      name: f.name.trim(),
      description: f.description.trim(),
      price: Number(f.price),
      prepTime: Number(f.prepTime),
      stock: f.stock === '' ? null : Number(f.stock),
      dietary: f.veg ? f.dietary : f.dietary.filter((d) => d !== 'vegetarian' && d !== 'vegan'),
      options: optionsText.filter((g) => g.name.trim() && g.text.trim()).map((g) => ({ name: g.name.trim(), choices: textToChoices(g.text) })),
      addOns: textToChoices(addOnsText),
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open onClose={onClose} title={initial.id ? `Edit ${initial.name}` : 'Add menu item'} size="lg"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving || uploading}>{saving ? 'Saving…' : initial.id ? 'Save changes' : 'Add item'}</button></>}
    >
      {initial.id && (
        <p className="hint-box"><Info size={16} /> Price changes only apply to new orders — past orders keep the price they were placed at.</p>
      )}
      <div className="editor-grid">
        <div className="editor-image">
          <Img src={f.image} alt="Item photo preview" className="editor-preview" />
          <label className="btn btn-ghost btn-sm btn-block file-btn">
            <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload photo'}
            <input type="file" accept="image/*" onChange={onFile} />
          </label>
          <Field label="…or image URL" htmlFor="e-img" error={errors.image}>
            <input id="e-img" value={f.image} onChange={set('image')} placeholder="https://…" />
          </Field>
        </div>
        <div>
          <div className="form-grid">
            <Field label="Item name" htmlFor="e-name" error={errors.name} required><input id="e-name" value={f.name} onChange={set('name')} /></Field>
            <Field label="Price (₹)" htmlFor="e-price" error={errors.price} required><input id="e-price" type="number" min="0" value={f.price} onChange={set('price')} /></Field>
            <Field label="Category" htmlFor="e-cat" error={errors.category} required>
              <select id="e-cat" value={f.category} onChange={(e) => setF((s) => ({ ...s, category: e.target.value, subcategory: '' }))}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Subcategory" htmlFor="e-sub">
              <select id="e-sub" value={f.subcategory} onChange={set('subcategory')} disabled={!subs.length}>
                <option value="">{subs.length ? 'None' : 'No subcategories'}</option>
                {subs.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Prep time (min)" htmlFor="e-prep" error={errors.prepTime} required><input id="e-prep" type="number" min="1" value={f.prepTime} onChange={set('prepTime')} /></Field>
            <Field label="Portions in stock today" htmlFor="e-stock" error={errors.stock} hint="Leave empty for unlimited"><input id="e-stock" type="number" min="0" value={f.stock} onChange={set('stock')} /></Field>
          </div>
          <Field label="Description" htmlFor="e-desc" error={errors.description} required>
            <textarea id="e-desc" rows={2} value={f.description} onChange={set('description')} />
          </Field>
        </div>
      </div>

      <div className="editor-section">
        <h3 className="sub-title">Type & dietary labels</h3>
        <div className="chip-row">
          <label className={`pill ${f.veg ? 'active' : ''}`}><input type="radio" checked={f.veg} onChange={() => setF((s) => ({ ...s, veg: true }))} /> <VegMark veg /> Veg</label>
          <label className={`pill ${!f.veg ? 'active' : ''}`}><input type="radio" checked={!f.veg} onChange={() => setF((s) => ({ ...s, veg: false }))} /> <VegMark veg={false} /> Non-veg</label>
          {Object.entries(DIETARY).map(([k, l]) => (
            <label key={k} className={`pill ${f.dietary.includes(k) ? 'active' : ''}`}>
              <input type="checkbox" checked={f.dietary.includes(k)} onChange={() => toggleIn('dietary', k)} disabled={!f.veg && k !== 'gluten-free'} /> {l}
            </label>
          ))}
        </div>
        <h3 className="sub-title">Allergens</h3>
        <div className="chip-row">
          {ALLERGENS.map((a) => (
            <label key={a} className={`pill ${f.allergens.includes(a) ? 'active warn' : ''}`}>
              <input type="checkbox" checked={f.allergens.includes(a)} onChange={() => toggleIn('allergens', a)} /> {a}
            </label>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <h3 className="sub-title">Customisation options</h3>
        <p className="muted small">Format: <code>Label:extra price</code>, separated by commas — e.g. <code>Regular:0, Large:120</code></p>
        {f.optionsText.map((g, i) => (
          <div key={i} className="option-editor-row">
            <input aria-label="Option group name" placeholder="Group, e.g. Size" value={g.name}
              onChange={(e) => setF((s) => ({ ...s, optionsText: s.optionsText.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))} />
            <input aria-label="Choices" placeholder="Mild:0, Medium:0, Hot:0" value={g.text}
              onChange={(e) => setF((s) => ({ ...s, optionsText: s.optionsText.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) }))} />
            <button className="icon-btn danger" onClick={() => setF((s) => ({ ...s, optionsText: s.optionsText.filter((_, j) => j !== i) }))} aria-label="Remove option group"><Trash2 size={16} /></button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => setF((s) => ({ ...s, optionsText: [...s.optionsText, { name: '', text: '' }] }))}><Plus size={14} /> Add option group</button>
        <Field label="Add-ons" htmlFor="e-addons" hint="e.g. Extra cheese:50, Fries:80">
          <input id="e-addons" value={f.addOnsText} onChange={set('addOnsText')} />
        </Field>
      </div>

      <div className="editor-section toggles-row">
        <Toggle id="e-avail" checked={f.available} onChange={(v) => setF((s) => ({ ...s, available: v }))} label="Available to order" />
        <Toggle id="e-feat" checked={f.featured} onChange={(v) => setF((s) => ({ ...s, featured: v }))} label="Featured (home page)" />
        <Toggle id="e-special" checked={f.special} onChange={(v) => setF((s) => ({ ...s, special: v }))} label="Today's special" />
        <Toggle id="e-hidden" checked={f.hidden} onChange={(v) => setF((s) => ({ ...s, hidden: v }))} label="Hidden from customers" />
      </div>
    </Modal>
  );
}

function CategoryManager({ onClose }) {
  const { categories, menu, saveCategory, deleteCategory } = useApp();
  const [name, setName] = useState('');
  const [subs, setSubs] = useState('');
  const [error, setError] = useState('');

  const add = () => {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!id) { setError('Enter a category name.'); return; }
    if (categories.some((c) => c.id === id)) { setError('That category already exists.'); return; }
    saveCategory({ id, name: name.trim(), subcategories: subs.split(',').map((s) => s.trim()).filter(Boolean) });
    setName(''); setSubs(''); setError('');
  };

  return (
    <Modal open onClose={onClose} title="Categories & subcategories" size="md" footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
      <ul className="cat-list">
        {categories.map((c) => {
          const count = menu.filter((m) => m.category === c.id).length;
          return (
            <li key={c.id}>
              <div>
                <strong>{c.name}</strong> <span className="muted small">· {count} item{count === 1 ? '' : 's'}</span>
                <input
                  className="input-sm" aria-label={`Subcategories of ${c.name}`} placeholder="Subcategories (comma separated)"
                  defaultValue={c.subcategories.join(', ')}
                  onBlur={(e) => {
                    const next = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                    if (next.join('|') !== c.subcategories.join('|')) saveCategory({ ...c, subcategories: next });
                  }}
                />
              </div>
              <button className="icon-btn danger" disabled={count > 0} title={count ? 'Move or delete its items first' : 'Delete category'} onClick={() => deleteCategory(c.id)} aria-label={`Delete ${c.name}`}>
                <Trash2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="add-cat">
        <h3 className="sub-title">Add a category</h3>
        <div className="form-grid">
          <Field label="Name" htmlFor="c-name" error={error}><input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Soups" /></Field>
          <Field label="Subcategories (optional)" htmlFor="c-subs"><input id="c-subs" value={subs} onChange={(e) => setSubs(e.target.value)} placeholder="Veg, Non-Veg" /></Field>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={add}><Plus size={14} /> Add category</button>
      </div>
    </Modal>
  );
}
