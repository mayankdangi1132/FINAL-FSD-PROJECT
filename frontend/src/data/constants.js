// Static values used by the UI. All restaurant data (menu, orders, reservations, settings)
// comes from the Express API and MongoDB.

const img = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMAGES = {
  hero: img('1414235077428-338989a2e8c0', 1800),
  interior: img('1517248135467-4c7edcad34c4'),
  terrace: img('1559339352-11d035aa65de'),
  dining: img('1552566626-52f8b828add9'),
  thali: img('1600891964599-f61ba0e24092'),
};

export const DIETARY = { vegetarian: 'Vegetarian', vegan: 'Vegan', 'gluten-free': 'Gluten-Free' };
export const ALLERGENS = ['Dairy', 'Gluten', 'Nuts', 'Egg', 'Soy', 'Shellfish', 'Sesame'];

/** Demo accounts created by the backend seed (see backend/src/seed). */
export const DEMO_PASSWORD = 'demo1234';
export const DEMO_ACCOUNTS = [
  { role: 'customer', email: 'customer@example.com', label: 'Customer' },
  { role: 'admin', email: 'admin@saffrontable.test', label: 'Admin / Manager' },
  { role: 'kitchen', email: 'kitchen@saffrontable.test', label: 'Kitchen Staff' },
  { role: 'foh', email: 'host@saffrontable.test', label: 'Front of House' },
];
