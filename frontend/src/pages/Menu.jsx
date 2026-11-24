import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, ShoppingBag, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { DIETARY } from '../data/constants.js';
import { formatCurrency } from '../utils/format.js';
import { calcTotals } from '../utils/pricing.js';
import { ItemModal, MenuItemCard } from '../components/MenuItem.jsx';
import { EmptyState, PageHeader } from '../components/ui.jsx';

const PRICE_RANGES = {
  all: { label: 'Any price', test: () => true },
  low: { label: 'Under ₹200', test: (p) => p < 200 },
  mid: { label: '₹200 – ₹350', test: (p) => p >= 200 && p <= 350 },
  high: { label: 'Above ₹350', test: (p) => p > 350 },
};

export default function Menu() {
  const { menu, categories, cart, cartCount, settings } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sub, setSub] = useState('all');
  const [diet, setDiet] = useState([]);
  const [vegOnly, setVegOnly] = useState(false);
  const [price, setPrice] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState('recommended');
  const [selected, setSelected] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const visible = menu.filter((m) => !m.hidden);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = visible.filter((m) =>
      (category === 'all' || m.category === category)
      && (sub === 'all' || m.subcategory === sub)
      && (!q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))
      && diet.every((d) => m.dietary.includes(d))
      && (!vegOnly || m.veg)
      && PRICE_RANGES[price].test(m.price)
      && (!availableOnly || m.available));
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [visible, query, category, sub, diet, vegOnly, price, availableOnly, sort]);

  const activeCategory = categories.find((c) => c.id === category);
  const filtersActive = query || diet.length || vegOnly || price !== 'all' || availableOnly || sub !== 'all';
  const resetFilters = () => { setQuery(''); setDiet([]); setVegOnly(false); setPrice('all'); setAvailableOnly(false); setSub('all'); };
  const toggleDiet = (d) => setDiet((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));

  // Group results by category when browsing everything with the default sort.
  const grouped = category === 'all' && sort === 'recommended'
    ? categories.map((c) => ({ ...c, items: results.filter((m) => m.category === c.id) })).filter((g) => g.items.length)
    : [{ id: category, name: activeCategory?.name || 'Results', items: results }];

  const cartTotal = calcTotals(cart, { type: 'pickup', settings, promo: null }).subtotal;

  return (
    <div className="container menu-page">
      <PageHeader
        eyebrow="Order online · Pickup · Delivery · Dine-in"
        title="Our Menu"
        subtitle="Browse by category, filter by dietary needs and customise your dish before adding it to the cart."
      />

      <div className="menu-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="search" placeholder="Search dishes, e.g. paneer, pizza, coffee…" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Search menu"
          />
          {query && <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>}
        </div>
        <button className="btn btn-ghost filter-toggle" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <SlidersHorizontal size={16} /> Filters {filtersActive ? '•' : ''}
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by" className="select">
          <option value="recommended">Sort: Recommended</option>
          <option value="rating">Top rated</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>

      <div className={`filters ${showFilters ? 'open' : ''}`}>
        <div className="chip-row">
          <button className={`chip chip-btn ${vegOnly ? 'active' : ''}`} onClick={() => setVegOnly((v) => !v)} aria-pressed={vegOnly}>
            <span className="veg-mark veg" aria-hidden="true" /> Veg only
          </button>
          {Object.entries(DIETARY).filter(([k]) => k !== 'vegetarian').map(([k, label]) => (
            <button key={k} className={`chip chip-btn ${diet.includes(k) ? 'active' : ''}`} onClick={() => toggleDiet(k)} aria-pressed={diet.includes(k)}>
              {label}
            </button>
          ))}
          <button className={`chip chip-btn ${availableOnly ? 'active' : ''}`} onClick={() => setAvailableOnly((v) => !v)} aria-pressed={availableOnly}>
            Available now
          </button>
          <select value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Price range" className="select select-sm">
            {Object.entries(PRICE_RANGES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </select>
          {filtersActive ? <button className="link-btn" onClick={resetFilters}>Clear filters</button> : null}
        </div>
      </div>

      <div className="category-tabs" role="tablist" aria-label="Menu categories">
        <button role="tab" aria-selected={category === 'all'} className={category === 'all' ? 'active' : ''} onClick={() => { setCategory('all'); setSub('all'); }}>
          All
        </button>
        {categories.map((c) => (
          <button key={c.id} role="tab" aria-selected={category === c.id} className={category === c.id ? 'active' : ''} onClick={() => { setCategory(c.id); setSub('all'); }}>
            {c.name}
          </button>
        ))}
      </div>

      {activeCategory?.subcategories?.length > 0 && (
        <div className="chip-row sub-row">
          <button className={`chip chip-btn ${sub === 'all' ? 'active' : ''}`} onClick={() => setSub('all')}>All {activeCategory.name}</button>
          {activeCategory.subcategories.map((s) => (
            <button key={s} className={`chip chip-btn ${sub === s ? 'active' : ''}`} onClick={() => setSub(s)}>{s}</button>
          ))}
        </div>
      )}

      <p className="muted small results-count" aria-live="polite">{results.length} dish{results.length === 1 ? '' : 'es'} found</p>

      {results.length === 0 ? (
        <EmptyState
          icon={Search} title="No dishes match your filters"
          text="Try a different search term or clear some filters."
          action={<button className="btn btn-primary" onClick={() => { resetFilters(); setCategory('all'); }}>Reset filters</button>}
        />
      ) : (
        grouped.map((g) => (
          <section key={g.id} className="menu-section" aria-labelledby={`cat-${g.id}`}>
            {(category === 'all' && sort === 'recommended') && <h2 id={`cat-${g.id}`} className="menu-section-title">{g.name} <span className="muted">({g.items.length})</span></h2>}
            <div className="menu-grid">
              {g.items.map((item) => <MenuItemCard key={item.id} item={item} onOpen={setSelected} />)}
            </div>
          </section>
        ))
      )}

      {cartCount > 0 && (
        <Link to="/cart" className="cart-bar">
          <span><ShoppingBag size={18} /> {cartCount} item{cartCount === 1 ? '' : 's'} · {formatCurrency(cartTotal)}</span>
          <span>View cart <ArrowRight size={16} /></span>
        </Link>
      )}

      <ItemModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
