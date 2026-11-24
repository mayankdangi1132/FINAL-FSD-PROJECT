// Price calculation. In the real app the backend recalculates every total —
// the client-side numbers are only for display.

/** Unit price of a menu item with the chosen options and add-ons. */
export function unitPrice(item, selections = {}, addOns = []) {
  let price = item.price;
  (item.options || []).forEach((group) => {
    const choice = group.choices.find((c) => c.label === selections[group.name]);
    if (choice) price += choice.price;
  });
  addOns.forEach((label) => {
    const addOn = (item.addOns || []).find((a) => a.label === label);
    if (addOn) price += addOn.price;
  });
  return price;
}

/** "Large · Hot · + Extra cheese" */
export function describeLine(line) {
  const parts = Object.values(line.selections || {});
  if (line.addOns?.length) parts.push(`+ ${line.addOns.join(', ')}`);
  return parts.join(' · ');
}

export function promoDiscount(promo, subtotal) {
  if (!promo || !promo.active || subtotal < (promo.minOrder || 0)) return 0;
  let d = promo.type === 'percent' ? (subtotal * promo.value) / 100 : promo.value;
  if (promo.maxDiscount) d = Math.min(d, promo.maxDiscount);
  return Math.round(Math.min(d, subtotal));
}

export function calcTotals(lines, { type, settings, promo }) {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const discount = promoDiscount(promo, subtotal);
  const tax = Math.round(((subtotal - discount) * settings.taxRate) / 100);
  const fee = type === 'delivery' && subtotal > 0 && subtotal < settings.freeDeliveryAbove ? settings.deliveryFee : 0;
  return { subtotal, discount, tax, fee, total: subtotal - discount + tax + fee };
}

export const itemCount = (lines) => lines.reduce((s, l) => s + l.qty, 0);

export const itemsSummary = (lines, max = 3) => {
  const names = lines.map((l) => `${l.qty}× ${l.name}`);
  return names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max} more` : names.join(', ');
};
