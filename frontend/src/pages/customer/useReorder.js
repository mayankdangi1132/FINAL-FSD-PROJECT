import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { unitPrice } from '../../utils/pricing.js';

/** Re-adds a past order's items to the cart at today's prices. */
export function useReorder() {
  const { menu, addToCart, toast } = useApp();
  const navigate = useNavigate();
  return (order) => {
    const skipped = [];
    let added = 0;
    order.items.forEach((l) => {
      const item = menu.find((m) => m.id === l.itemId);
      if (!item || item.hidden || !item.available) { skipped.push(l.name); return; }
      addToCart({
        itemId: item.id, name: item.name, veg: item.veg, image: item.image,
        price: unitPrice(item, l.selections, l.addOns), qty: l.qty, selections: l.selections, addOns: l.addOns, note: l.note || '',
      });
      added += 1;
    });
    if (skipped.length) toast(`Not available right now: ${skipped.join(', ')}`, 'error');
    if (added) {
      toast('Items added to your cart at current prices');
      navigate('/cart');
    }
  };
}
