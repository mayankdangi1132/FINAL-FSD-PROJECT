import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Flame, Plus, Sparkles, Star } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { DIETARY } from '../data/constants.js';
import { formatCurrency } from '../utils/format.js';
import { unitPrice } from '../utils/pricing.js';
import { Img, Modal, QtyStepper, VegMark } from './ui.jsx';

const hasChoices = (item) => item.options.length > 0 || item.addOns.length > 0;

/** Menu item card used on the home and menu pages. */
export function MenuItemCard({ item, onOpen }) {
  const { addToCart, toast } = useApp();
  const soldOut = !item.available;
  const lowStock = item.available && item.stock != null && item.stock <= 5;

  const quickAdd = (e) => {
    e.stopPropagation();
    if (hasChoices(item)) { onOpen(item); return; }
    addToCart({ itemId: item.id, name: item.name, veg: item.veg, image: item.image, price: item.price, qty: 1, selections: {}, addOns: [], note: '' });
    toast(`${item.name} added to cart`);
  };

  return (
    <article className={`menu-card ${soldOut ? 'is-soldout' : ''}`}>
      <button className="menu-card-media" onClick={() => onOpen(item)} aria-label={`View ${item.name}`}>
        <Img src={item.image} alt={item.name} />
        <div className="menu-card-flags">
          {item.special && <span className="flag flag-special"><Sparkles size={12} /> Today's special</span>}
          {item.featured && !item.special && <span className="flag flag-featured"><Star size={12} /> Chef's pick</span>}
        </div>
        {soldOut && <span className="soldout-overlay">Unavailable today</span>}
      </button>
      <div className="menu-card-body">
        <div className="menu-card-title">
          <VegMark veg={item.veg} />
          <h3><button className="link-plain" onClick={() => onOpen(item)}>{item.name}</button></h3>
        </div>
        <p className="menu-card-desc">{item.description}</p>
        <div className="menu-card-meta">
          {item.dietary.filter((d) => d !== 'vegetarian').map((d) => <span key={d} className="chip chip-sm">{DIETARY[d]}</span>)}
          <span className="meta-inline"><Clock size={13} /> {item.prepTime} min</span>
          {item.rating > 0 && <span className="meta-inline"><Star size={13} /> {item.rating}</span>}
        </div>
        {lowStock && <div className="low-stock"><Flame size={13} /> Only {item.stock} left today</div>}
        <div className="menu-card-foot">
          <span className="price">{formatCurrency(item.price)}</span>
          <button className="btn btn-primary btn-sm" onClick={quickAdd} disabled={soldOut} aria-label={`Add ${item.name} to cart`}>
            {soldOut ? 'Sold out' : <><Plus size={16} /> Add</>}
          </button>
        </div>
      </div>
    </article>
  );
}

/** Item details + customization (size, spice level, add-ons, notes). */
export function ItemModal({ item, onClose }) {
  const { addToCart, toast } = useApp();
  const [selections, setSelections] = useState({});
  const [addOns, setAddOns] = useState([]);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!item) return;
    const defaults = {};
    item.options.forEach((g) => { defaults[g.name] = g.choices[0].label; });
    setSelections(defaults);
    setAddOns([]);
    setNote('');
    setQty(1);
  }, [item]);

  if (!item) return null;
  const price = unitPrice(item, selections, addOns);

  const toggleAddOn = (label) =>
    setAddOns((list) => (list.includes(label) ? list.filter((l) => l !== label) : [...list, label]));

  const submit = () => {
    addToCart({ itemId: item.id, name: item.name, veg: item.veg, image: item.image, price, qty, selections, addOns, note: note.trim() });
    toast(`${qty} × ${item.name} added to cart`);
    onClose();
  };

  return (
    <Modal open={!!item} onClose={onClose} title={item.name} size="lg">
      <div className="item-modal">
        <Img src={item.image} alt={item.name} className="item-modal-img" />
        <div className="item-modal-info">
          <div className="item-modal-top">
            <VegMark veg={item.veg} />
            <span className="muted small">{item.veg ? 'Vegetarian' : 'Non-vegetarian'} · <Clock size={13} className="inline-icon" /> {item.prepTime} min</span>
          </div>
          <p>{item.description}</p>
          {item.dietary.length > 0 && (
            <div className="chip-row">{item.dietary.map((d) => <span key={d} className="chip chip-green">{DIETARY[d]}</span>)}</div>
          )}
          <div className="allergen-box">
            <AlertTriangle size={16} />
            <span><strong>Allergens:</strong> {item.allergens.length ? item.allergens.join(', ') : 'None declared'}. Please tell us about any allergies in the notes.</span>
          </div>

          {item.options.map((group) => (
            <fieldset key={group.name} className="option-group">
              <legend>{group.name}</legend>
              <div className="pill-group">
                {group.choices.map((c) => (
                  <label key={c.label} className={`pill ${selections[group.name] === c.label ? 'active' : ''}`}>
                    <input
                      type="radio" name={group.name} value={c.label}
                      checked={selections[group.name] === c.label}
                      onChange={() => setSelections((s) => ({ ...s, [group.name]: c.label }))}
                    />
                    {c.label}{c.price ? ` (+${formatCurrency(c.price)})` : ''}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {item.addOns.length > 0 && (
            <fieldset className="option-group">
              <legend>Add-ons <span className="muted small">(optional)</span></legend>
              {item.addOns.map((a) => (
                <label key={a.label} className="check-row">
                  <input type="checkbox" checked={addOns.includes(a.label)} onChange={() => toggleAddOn(a.label)} />
                  <span>{a.label}</span>
                  <span className="muted">+{formatCurrency(a.price)}</span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="field">
            <label htmlFor="item-note">Special instructions</label>
            <textarea id="item-note" rows={2} maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. no onions, sauce on the side" />
          </div>

          <div className="item-modal-actions">
            <QtyStepper value={qty} onChange={setQty} />
            <button className="btn btn-primary btn-block" onClick={submit} disabled={!item.available}>
              {item.available ? `Add to cart · ${formatCurrency(price * qty)}` : 'Currently unavailable'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
