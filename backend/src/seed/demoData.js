// Demo data used to fill MongoDB (see seedDatabase.js). Dates are generated relative to
// "now", so the dashboards always show today's orders and upcoming reservations.

import { addDays, pad, toDateKey } from '../utils/format.js';
import { calcTotals, unitPrice } from '../utils/pricing.js';
import { flowFor } from '../utils/status.js';

const img = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMAGES = {
  hero: img('1414235077428-338989a2e8c0', 1800),
  interior: img('1517248135467-4c7edcad34c4', 1200),
  terrace: img('1559339352-11d035aa65de', 1200),
  dining: img('1552566626-52f8b828add9', 1200),
  thali: img('1600891964599-f61ba0e24092', 1200),
};

export const DIETARY = { vegetarian: 'Vegetarian', vegan: 'Vegan', 'gluten-free': 'Gluten-Free' };
export const ALLERGENS = ['Dairy', 'Gluten', 'Nuts', 'Egg', 'Soy', 'Shellfish', 'Sesame'];

const SPICE = {
  name: 'Spice level',
  choices: [{ label: 'Mild', price: 0 }, { label: 'Medium', price: 0 }, { label: 'Hot', price: 0 }],
};
const PIZZA_SIZE = {
  name: 'Size',
  choices: [{ label: 'Regular 8"', price: 0 }, { label: 'Medium 10"', price: 120 }, { label: 'Large 12"', price: 220 }],
};
const DRINK_SIZE = { name: 'Size', choices: [{ label: 'Regular', price: 0 }, { label: 'Large', price: 40 }] };
const BREADS = [{ label: 'Butter naan', price: 60 }, { label: 'Jeera rice', price: 120 }];
const PIZZA_TOPPINGS = [
  { label: 'Extra cheese', price: 50 },
  { label: 'Jalapeños', price: 30 },
  { label: 'Black olives', price: 30 },
  { label: 'Mushrooms', price: 40 },
];

const CATEGORIES = [
  { id: 'starters', name: 'Starters', subcategories: ['Veg', 'Non-Veg', 'Street Food'] },
  { id: 'mains', name: 'Main Course', subcategories: ['North Indian', 'Biryani & Rice', 'Indo-Chinese'] },
  { id: 'pizza-pasta', name: 'Pizza & Pasta', subcategories: ['Pizza', 'Pasta'] },
  { id: 'burgers', name: 'Burgers & Wraps', subcategories: [] },
  { id: 'salads', name: 'Salads & Bowls', subcategories: [] },
  { id: 'desserts', name: 'Desserts', subcategories: [] },
  { id: 'drinks', name: 'Beverages', subcategories: ['Hot', 'Cold'] },
];

const mi = (o) => ({
  subcategory: '', dietary: [], allergens: [], options: [], addOns: [],
  available: true, hidden: false, featured: false, special: false, stock: null, rating: 4.5,
  ...o, image: img(o.image),
});

const MENU = [
  mi({ id: 'm1', name: 'Paneer Tikka', category: 'starters', subcategory: 'Veg', price: 280, veg: true,
    description: 'Cottage cheese cubes marinated in hung curd and spices, char-grilled in the tandoor with peppers and onions.',
    dietary: ['vegetarian', 'gluten-free'], allergens: ['Dairy'], prepTime: 15, featured: true, rating: 4.7,
    options: [SPICE], addOns: [{ label: 'Extra mint chutney', price: 20 }], image: '1567188040759-fb8a883dc6d8' }),
  mi({ id: 'm2', name: 'Punjabi Samosa (2 pcs)', category: 'starters', subcategory: 'Street Food', price: 90, veg: true,
    description: 'Crisp pastry stuffed with spiced potatoes and peas, served with tamarind and mint chutneys.',
    dietary: ['vegetarian', 'vegan'], allergens: ['Gluten'], prepTime: 10, rating: 4.5, image: '1601050690597-df0568f70950' }),
  mi({ id: 'm3', name: 'Papdi Chaat', category: 'starters', subcategory: 'Street Food', price: 140, veg: true,
    description: 'Crunchy wafers topped with potatoes, chickpeas, sweet yogurt, chutneys and sev.',
    dietary: ['vegetarian'], allergens: ['Gluten', 'Dairy'], prepTime: 8, rating: 4.4, image: '1610192244261-3f33de3f55e4' }),
  mi({ id: 'm4', name: 'Chicken Seekh Kebab', category: 'starters', subcategory: 'Non-Veg', price: 340, veg: false,
    description: 'Minced chicken with ginger, garlic and fresh herbs, skewered and grilled over charcoal.',
    dietary: ['gluten-free'], prepTime: 20, featured: true, rating: 4.8, options: [SPICE], image: '1555939594-58d7cb561ad1' }),

  mi({ id: 'm5', name: 'Butter Chicken', category: 'mains', subcategory: 'North Indian', price: 420, veg: false,
    description: 'Tandoori chicken simmered in a velvety tomato, butter and cashew gravy. Our best seller.',
    dietary: ['gluten-free'], allergens: ['Dairy', 'Nuts'], prepTime: 25, featured: true, rating: 4.9, stock: 12,
    options: [SPICE], addOns: BREADS, image: '1585937421612-70a008356fbe' }),
  mi({ id: 'm6', name: 'Paneer Butter Masala', category: 'mains', subcategory: 'North Indian', price: 340, veg: true,
    description: 'Soft paneer in a rich, mildly sweet tomato and cream gravy finished with kasuri methi.',
    dietary: ['vegetarian', 'gluten-free'], allergens: ['Dairy', 'Nuts'], prepTime: 20, rating: 4.6,
    options: [SPICE], addOns: BREADS, image: '1631452180519-c014fe946bc7' }),
  mi({ id: 'm7', name: 'Kadhai Paneer', category: 'mains', subcategory: 'North Indian', price: 320, veg: true,
    description: 'Paneer tossed with capsicum, onions and freshly ground kadhai masala.',
    dietary: ['vegetarian', 'gluten-free'], allergens: ['Dairy'], prepTime: 20, rating: 4.4,
    options: [SPICE], addOns: BREADS, image: '1588166524941-3bf61a9c41db' }),
  mi({ id: 'm8', name: 'Kadhai Chicken', category: 'mains', subcategory: 'North Indian', price: 390, veg: false,
    description: 'Bone-in chicken cooked in a wok with tomatoes, peppers and whole spices.',
    dietary: ['gluten-free'], prepTime: 25, rating: 4.5, options: [SPICE], addOns: BREADS, image: '1565557623262-b51c2513a641' }),
  mi({ id: 'm9', name: 'Hyderabadi Biryani', category: 'mains', subcategory: 'Biryani & Rice', price: 380, veg: false,
    description: 'Fragrant basmati rice layered with marinated meat, saffron and fried onions, slow-cooked on dum.',
    allergens: ['Dairy'], prepTime: 30, featured: true, rating: 4.8,
    options: [{ name: 'Choice', choices: [{ label: 'Chicken', price: 0 }, { label: 'Mutton', price: 80 }] }, SPICE],
    addOns: [{ label: 'Raita', price: 40 }, { label: 'Mirchi ka salan', price: 50 }], image: '1512058564366-18510be2db19' }),
  mi({ id: 'm10', name: 'Royal Veg Thali', category: 'mains', subcategory: 'North Indian', price: 450, veg: true,
    description: 'A complete meal: two seasonal curries, dal makhani, rice, two rotis, raita, salad and dessert of the day.',
    dietary: ['vegetarian'], allergens: ['Dairy', 'Gluten'], prepTime: 20, special: true, rating: 4.7, stock: 4,
    image: '1600891964599-f61ba0e24092' }),
  mi({ id: 'm11', name: 'Veg Hakka Noodles', category: 'mains', subcategory: 'Indo-Chinese', price: 240, veg: true,
    description: 'Wok-tossed noodles with crunchy vegetables, soy and a hint of chilli.',
    dietary: ['vegetarian', 'vegan'], allergens: ['Gluten', 'Soy'], prepTime: 12, rating: 4.3,
    options: [SPICE], addOns: [{ label: 'Extra veggies', price: 40 }], image: '1589302168068-964664d93dc0' }),

  mi({ id: 'm12', name: 'Margherita Pizza', category: 'pizza-pasta', subcategory: 'Pizza', price: 320, veg: true,
    description: 'Hand-stretched sourdough base, San Marzano tomato sauce, fresh mozzarella and basil.',
    dietary: ['vegetarian'], allergens: ['Gluten', 'Dairy'], prepTime: 18, featured: true, rating: 4.6,
    options: [PIZZA_SIZE], addOns: PIZZA_TOPPINGS, image: '1574071318508-1cdbab80d002' }),
  mi({ id: 'm13', name: 'Spicy Pepperoni Pizza', category: 'pizza-pasta', subcategory: 'Pizza', price: 420, veg: false,
    description: 'Chicken pepperoni, mozzarella and chilli flakes on our signature tomato sauce.',
    allergens: ['Gluten', 'Dairy'], prepTime: 18, rating: 4.5,
    options: [PIZZA_SIZE], addOns: PIZZA_TOPPINGS.slice(0, 2), image: '1565299624946-b28f40a0ae38' }),
  mi({ id: 'm14', name: 'Seafood Spaghetti', category: 'pizza-pasta', subcategory: 'Pasta', price: 460, veg: false,
    description: 'Prawns and calamari tossed with spaghetti, cherry tomatoes, garlic and white wine sauce.',
    allergens: ['Gluten', 'Shellfish'], prepTime: 20, rating: 4.4, available: false, stock: 0,
    image: '1563379926898-05f4575a45d8' }),
  mi({ id: 'm15', name: 'Pesto Farfalle', category: 'pizza-pasta', subcategory: 'Pasta', price: 300, veg: true,
    description: 'Bow-tie pasta with basil pesto, cherry tomatoes and parmesan. Seasonal — currently hidden.',
    dietary: ['vegetarian'], allergens: ['Gluten', 'Nuts', 'Dairy'], prepTime: 12, hidden: true, rating: 4.2,
    image: '1473093295043-cdd812d0e601' }),

  mi({ id: 'm16', name: 'Double Chicken Cheese Burger', category: 'burgers', price: 290, veg: false,
    description: 'Two grilled chicken patties, cheddar, caramelised onions and house sauce in a brioche bun.',
    allergens: ['Gluten', 'Dairy', 'Egg'], prepTime: 15, rating: 4.5,
    addOns: [{ label: 'Fries', price: 80 }, { label: 'Extra cheese slice', price: 30 }], image: '1568901346375-23c9450c58cd' }),
  mi({ id: 'm17', name: 'Crispy Veg Burger & Fries', category: 'burgers', price: 230, veg: true,
    description: 'Crunchy potato-and-pea patty, lettuce, tomato and chipotle mayo, served with fries.',
    dietary: ['vegetarian'], allergens: ['Gluten', 'Dairy'], prepTime: 12, rating: 4.3, image: '1551782450-a2132b4ba21d' }),
  mi({ id: 'm18', name: 'Paneer Kathi Roll', category: 'burgers', price: 220, veg: true,
    description: 'Flaky paratha wrapped around tikka-spiced paneer, pickled onions and green chutney.',
    dietary: ['vegetarian'], allergens: ['Gluten', 'Dairy'], prepTime: 10, rating: 4.4,
    options: [SPICE], image: '1626700051175-6818013e1d4f' }),

  mi({ id: 'm19', name: 'Mediterranean Salad', category: 'salads', price: 260, veg: true,
    description: 'Crisp greens, cucumber, olives, cherry tomatoes and red onion with a lemon-oregano dressing.',
    dietary: ['vegetarian', 'vegan', 'gluten-free'], prepTime: 8, rating: 4.3, image: '1540189549336-e6e99c3679fe' }),
  mi({ id: 'm20', name: 'Vegan Buddha Bowl', category: 'salads', price: 320, veg: true,
    description: 'Quinoa, roasted chickpeas, avocado, pickled cabbage and greens with a tahini drizzle.',
    dietary: ['vegetarian', 'vegan', 'gluten-free'], allergens: ['Sesame'], prepTime: 10, featured: true, rating: 4.6,
    image: '1512621776951-a57141f2eefd' }),
  mi({ id: 'm21', name: 'Grilled Chicken Salad Bowl', category: 'salads', price: 340, veg: false,
    description: 'Herb-grilled chicken, soft-boiled egg, greens, beetroot and a honey-mustard dressing.',
    dietary: ['gluten-free'], allergens: ['Egg'], prepTime: 12, rating: 4.4, image: '1546069901-ba9599a7e63c' }),

  mi({ id: 'm22', name: 'Berry Cheesecake', category: 'desserts', price: 240, veg: true,
    description: 'Baked vanilla cheesecake on a buttery biscuit base, topped with fresh berry compote.',
    dietary: ['vegetarian'], allergens: ['Dairy', 'Gluten', 'Egg'], prepTime: 5, featured: true, rating: 4.8, stock: 3,
    image: '1565958011703-44f9829ba187' }),
  mi({ id: 'm23', name: 'Tiramisu', category: 'desserts', price: 260, veg: true,
    description: 'Espresso-soaked sponge layered with mascarpone cream and cocoa.',
    dietary: ['vegetarian'], allergens: ['Dairy', 'Gluten', 'Egg'], prepTime: 5, available: false, rating: 4.7,
    image: '1571877227200-a0d98ea607e9' }),
  mi({ id: 'm24', name: 'Honey Pancake Stack', category: 'desserts', price: 220, veg: true,
    description: 'Fluffy buttermilk pancakes with wild honey, butter and seasonal fruit.',
    dietary: ['vegetarian'], allergens: ['Gluten', 'Dairy', 'Egg'], prepTime: 12, rating: 4.5,
    addOns: [{ label: 'Vanilla ice cream scoop', price: 60 }], image: '1567620905732-2d1ec7ab7445' }),

  mi({ id: 'm25', name: 'Cappuccino', category: 'drinks', subcategory: 'Hot', price: 150, veg: true,
    description: 'Double shot of our house-roast espresso with velvety steamed milk.',
    dietary: ['vegetarian', 'gluten-free'], allergens: ['Dairy'], prepTime: 5, rating: 4.6,
    options: [DRINK_SIZE, { name: 'Milk', choices: [{ label: 'Regular milk', price: 0 }, { label: 'Oat milk', price: 50 }] }],
    image: '1509042239860-f550ce710b93' }),
  mi({ id: 'm26', name: 'Cold Coffee', category: 'drinks', subcategory: 'Cold', price: 170, veg: true,
    description: 'Creamy blended iced coffee, lightly sweetened.',
    dietary: ['vegetarian', 'gluten-free'], allergens: ['Dairy'], prepTime: 5, rating: 4.5,
    options: [DRINK_SIZE], addOns: [{ label: 'Ice cream scoop', price: 50 }], image: '1461023058943-07fcbe16d735' }),
  mi({ id: 'm27', name: 'Watermelon Cooler', category: 'drinks', subcategory: 'Cold', price: 140, veg: true,
    description: 'Fresh watermelon juice with lime, mint and a pinch of black salt.',
    dietary: ['vegetarian', 'vegan', 'gluten-free'], prepTime: 4, rating: 4.4, special: true,
    options: [DRINK_SIZE], image: '1497534446932-c925b458314e' }),
  mi({ id: 'm28', name: 'Citrus Sunset Mocktail', category: 'drinks', subcategory: 'Cold', price: 180, veg: true,
    description: 'Orange, passion fruit and grenadine shaken with soda. Alcohol-free.',
    dietary: ['vegetarian', 'vegan', 'gluten-free'], prepTime: 5, rating: 4.3, image: '1544145945-f90425340c7e' }),
  mi({ id: 'm29', name: 'Chocolate Freakshake', category: 'drinks', subcategory: 'Cold', price: 240, veg: true,
    description: 'Thick chocolate shake loaded with whipped cream, brownie bits and fudge sauce.',
    dietary: ['vegetarian'], allergens: ['Dairy', 'Gluten', 'Nuts'], prepTime: 8, rating: 4.6, image: '1563805042-7684c019e1cb' }),
];

const HOURS = {
  mon: { open: '12:00', close: '23:00', closed: false },
  tue: { open: '12:00', close: '23:00', closed: false },
  wed: { open: '12:00', close: '23:00', closed: false },
  thu: { open: '12:00', close: '23:00', closed: false },
  fri: { open: '12:00', close: '23:30', closed: false },
  sat: { open: '11:00', close: '23:30', closed: false },
  sun: { open: '11:00', close: '23:00', closed: false },
};

export const DEFAULT_SETTINGS = {
  name: 'Saffron Table',
  tagline: 'Modern Indian & global comfort food',
  phone: '+91 98100 00000',
  email: 'hello@saffrontable.test',
  address: '14 Park Street, Connaught Place, New Delhi 110001',
  locations: [
    { id: 'loc1', name: 'Connaught Place (Main)', address: '14 Park Street, Connaught Place, New Delhi 110001',
      phone: '+91 98100 00000', services: ['Dine-In', 'Pickup', 'Delivery'] },
    { id: 'loc2', name: 'Cyber Hub, Gurugram', address: 'Unit 22, DLF Cyber Hub, Gurugram 122002',
      phone: '+91 98100 00001', services: ['Dine-In', 'Pickup'] },
  ],
  hours: HOURS,
  services: { delivery: true, pickup: true, dineIn: true },
  guestCheckout: true,
  cashPayments: true,
  taxRate: 5,
  deliveryFee: 40,
  freeDeliveryAbove: 799,
  minDeliveryOrder: 199,
  reservation: { slotMinutes: 30, maxParty: 10, bookingWindowDays: 30, capacity: 40, durationMinutes: 90 },
};

const USERS = [
  { id: 'u-admin', name: 'Priya Sharma', email: 'admin@saffrontable.test', phone: '98100 11111', role: 'admin', active: true },
  { id: 'u-chef', name: 'Arjun Mehta', email: 'kitchen@saffrontable.test', phone: '98100 22222', role: 'kitchen', active: true },
  { id: 'u-chef2', name: 'Ravi Kumar', email: 'ravi@saffrontable.test', phone: '98100 22223', role: 'kitchen', active: true },
  { id: 'u-foh', name: 'Neha Kapoor', email: 'host@saffrontable.test', phone: '98100 33333', role: 'foh', active: true },
  { id: 'u-foh2', name: 'Sameer Khan', email: 'sameer@saffrontable.test', phone: '98100 33334', role: 'foh', active: false },
  {
    id: 'u-cust', name: 'Rahul Verma', email: 'customer@example.com', phone: '98765 43210', role: 'customer', active: true,
    addresses: [
      { id: 'a1', label: 'Home', line1: 'Flat 304, Tower C', area: 'Sector 62', city: 'Noida', pincode: '201301', landmark: 'Near the metro station' },
      { id: 'a2', label: 'Work', line1: '5th floor, Statesman House', area: 'Barakhamba Road', city: 'New Delhi', pincode: '110001', landmark: '' },
    ],
  },
];

/** Password for every demo account. */
export const DEMO_PASSWORD = 'demo1234';

/** Demo accounts shown on the sign-in page. */
export const DEMO_ACCOUNTS = [
  { role: 'customer', email: 'customer@example.com', label: 'Customer' },
  { role: 'admin', email: 'admin@saffrontable.test', label: 'Admin / Manager' },
  { role: 'kitchen', email: 'kitchen@saffrontable.test', label: 'Kitchen Staff' },
  { role: 'foh', email: 'host@saffrontable.test', label: 'Front of House' },
];

const PROMOS = [
  { id: 'p1', code: 'WELCOME10', description: '10% off your first order', type: 'percent', value: 10, minOrder: 300, maxDiscount: 150, active: true, uses: 42 },
  { id: 'p2', code: 'FLAT75', description: '₹75 off orders above ₹699', type: 'flat', value: 75, minOrder: 699, maxDiscount: null, active: true, uses: 18 },
  { id: 'p3', code: 'WEEKEND20', description: '20% off on weekend orders', type: 'percent', value: 20, minOrder: 500, maxDiscount: 200, active: false, uses: 7 },
];

const TABLES = [
  { id: 'T1', seats: 2, zone: 'Window' }, { id: 'T2', seats: 2, zone: 'Window' },
  { id: 'T3', seats: 4, zone: 'Main hall' }, { id: 'T4', seats: 4, zone: 'Main hall' },
  { id: 'T5', seats: 4, zone: 'Main hall' }, { id: 'T6', seats: 4, zone: 'Main hall' },
  { id: 'T7', seats: 6, zone: 'Main hall' }, { id: 'T8', seats: 6, zone: 'Patio' },
  { id: 'T9', seats: 8, zone: 'Private room' }, { id: 'T10', seats: 2, zone: 'Patio' },
  { id: 'T11', seats: 2, zone: 'Bar' }, { id: 'T12', seats: 4, zone: 'Patio' },
];

const CUSTOMERS = [
  ['Aisha Khan', '98110 23456'], ['Rohan Gupta', '98220 34567'], ['Meera Iyer', '98330 45678'],
  ['Karan Singh', '98440 56789'], ['Ananya Das', '98550 67890'], ['Vikram Rao', '98660 78901'],
  ['Sneha Patel', '98770 89012'], ['Arnav Joshi', '98880 90123'], ['Ishita Bose', '98990 01234'],
  ['Dev Malhotra', '97110 12345'], ['Kavya Nair', '97220 23456'], ['Farhan Ali', '97330 34567'],
  ['Pooja Reddy', '97440 45678'], ['Siddharth Jain', '97550 56789'],
];

const ADDRESSES = [
  { line1: 'B-12', area: 'Lajpat Nagar II', city: 'New Delhi', pincode: '110024' },
  { line1: 'H-45', area: 'Rajouri Garden', city: 'New Delhi', pincode: '110027' },
  { line1: '7A, Hauz Khas Village', area: 'Hauz Khas', city: 'New Delhi', pincode: '110016' },
  { line1: '221, Pocket 4', area: 'Mayur Vihar Phase 1', city: 'New Delhi', pincode: '110091' },
];

const COMMENTS = [
  'Food arrived hot and well packed. The butter chicken is the best in town!',
  'Loved the paneer tikka. Will order again.',
  'Great taste, slightly late delivery but worth the wait.',
  'Biryani was flavourful and the portion was generous.',
  'Lovely ambience and friendly staff.',
  'Pizza crust was perfect. Kids loved it.',
];

/** Tiny deterministic random generator so the demo data looks the same every reset. */
function mulberry32(seed) {
  return function rand() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STEP_OFFSETS = [0, 2, 5, 20, 26, 45]; // minutes after placing, per position in the flow

export function createSeedState() {
  const rand = mulberry32(20261123);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const now = new Date();
  const settings = structuredClone(DEFAULT_SETTINGS);
  const menu = structuredClone(MENU);
  const byId = Object.fromEntries(menu.map((m) => [m.id, m]));
  const rahul = USERS.find((u) => u.id === 'u-cust');

  const line = (id, qty = 1, selections = {}, addOns = [], note = '') => {
    const it = byId[id];
    return { itemId: id, name: it.name, veg: it.veg, price: unitPrice(it, selections, addOns), qty, selections, addOns, note };
  };

  let no = 1001;
  const orders = [];

  function mkOrder({ created, type, customer, userId = null, items, status, instructions = '', table = null,
    address = null, method = 'card', promo = null, rating = null, scheduledFor = null }) {
    const totals = calcTotals(items, { type, settings, promo });
    const flow = flowFor(type);
    const history = [];
    if (status === 'cancelled') {
      history.push({ status: 'placed', at: created.toISOString(), by: customer.name });
      history.push({ status: 'cancelled', at: new Date(+created + 4 * 60000).toISOString(), by: 'Priya Sharma', note: 'Cancelled at customer request' });
    } else {
      const idx = flow.indexOf(status);
      const elapsed = (now - created) / 60000;
      const last = STEP_OFFSETS[idx];
      const scale = last > elapsed && last > 0 ? (elapsed * 0.9) / last : 1;
      flow.slice(0, idx + 1).forEach((s, i) => {
        const by = i === 0 ? customer.name : ['preparing', 'ready'].includes(s) ? 'Arjun Mehta' : 'Neha Kapoor';
        history.push({ status: s, at: new Date(+created + STEP_OFFSETS[i] * scale * 60000).toISOString(), by });
      });
    }
    let payStatus = 'paid';
    if (status === 'cancelled') payStatus = method === 'cash' || method === 'pay-at-table' ? 'void' : 'refunded';
    else if ((method === 'cash' || method === 'pay-at-table') && status !== 'completed') payStatus = 'pending';
    const order = {
      id: String(no), no, createdAt: created.toISOString(), userId, customer, type, address, table, scheduledFor,
      instructions, items, ...totals, promoCode: promo?.code || null,
      payment: { method, status: payStatus }, status, history, rating, source: table && type === 'dine-in' && method === 'pay-at-table' ? 'staff' : 'online',
    };
    no += 1;
    orders.push(order);
    return order;
  }

  const randomItems = () => {
    const pool = menu.filter((m) => !m.hidden);
    const count = 1 + Math.floor(rand() * 3);
    const items = [];
    for (let i = 0; i < count; i++) {
      const it = pick(pool);
      if (items.some((l) => l.itemId === it.id)) continue;
      const sel = {};
      it.options.forEach((g) => { sel[g.name] = g.choices[Math.floor(rand() * g.choices.length)].label; });
      items.push(line(it.id, rand() < 0.25 ? 2 : 1, sel));
    }
    return items;
  };

  // ---- Order history for the last 30 days (drives reports and charts) ----
  const RAHUL_DAYS = { 3: null, 8: 5, 15: null, 24: 4 };
  for (let d = 30; d >= 1; d--) {
    const day = addDays(now, -d);
    const weekend = [0, 5, 6].includes(day.getDay());
    const count = 4 + Math.floor(rand() * 5) + (weekend ? 3 : 0);
    for (let k = 0; k < count; k++) {
      const minutes = 12 * 60 + Math.floor(rand() * 630);
      const created = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
      const isRahul = k === 0 && d in RAHUL_DAYS;
      const r = rand();
      const type = isRahul ? 'delivery' : r < 0.45 ? 'delivery' : r < 0.7 ? 'pickup' : 'dine-in';
      const [name, phone] = isRahul ? [rahul.name, rahul.phone] : pick(CUSTOMERS);
      const status = !isRahul && rand() < 0.07 ? 'cancelled' : 'completed';
      const method = type === 'dine-in' ? (rand() < 0.5 ? 'pay-at-table' : 'card') : rand() < 0.5 ? 'card' : rand() < 0.6 ? 'upi' : 'cash';
      let rating = null;
      if (isRahul && RAHUL_DAYS[d]) {
        rating = { stars: RAHUL_DAYS[d], comment: d === 8 ? COMMENTS[0] : COMMENTS[2], at: new Date(+created + 90 * 60000).toISOString() };
      } else if (!isRahul && status === 'completed' && rand() < 0.35) {
        rating = { stars: rand() < 0.7 ? 5 : rand() < 0.8 ? 4 : 3, comment: pick(COMMENTS), at: new Date(+created + 90 * 60000).toISOString() };
      }
      mkOrder({
        created, type, status, method, rating,
        customer: { name, phone, email: isRahul ? rahul.email : '' },
        userId: isRahul ? rahul.id : null,
        items: randomItems(),
        table: type === 'dine-in' ? pick(TABLES).id : null,
        address: type === 'delivery' ? (isRahul ? rahul.addresses[0] : pick(ADDRESSES)) : null,
        promo: rand() < 0.12 ? PROMOS[0] : null,
      });
    }
  }

  // ---- Earlier today: completed orders ----
  [260, 200, 150, 110, 75].forEach((ago) => {
    const [name, phone] = pick(CUSTOMERS);
    const type = pick(['delivery', 'pickup', 'dine-in']);
    mkOrder({
      created: new Date(+now - ago * 60000), type, status: 'completed', customer: { name, phone, email: '' },
      items: randomItems(), method: type === 'dine-in' ? 'pay-at-table' : 'card',
      table: type === 'dine-in' ? pick(TABLES).id : null, address: type === 'delivery' ? pick(ADDRESSES) : null,
    });
  });

  // ---- Live orders (what the kitchen and front-of-house dashboards show) ----
  const ago = (m) => new Date(+now - m * 60000);
  const guest = (n) => ({ name: CUSTOMERS[n][0], phone: CUSTOMERS[n][1], email: '' });
  mkOrder({ created: ago(52), type: 'dine-in', status: 'served', table: 'T6', method: 'pay-at-table', customer: { name: 'Table T6', phone: '', email: '' },
    items: [line('m19'), line('m20'), line('m27', 2, { Size: 'Regular' })] });
  mkOrder({ created: ago(38), type: 'delivery', status: 'out-for-delivery', customer: guest(5), address: ADDRESSES[1], method: 'upi',
    items: [line('m13', 1, { Size: 'Medium 10"' }, ['Jalapeños']), line('m28')] });
  mkOrder({ created: ago(30), type: 'dine-in', status: 'ready', table: 'T4', method: 'pay-at-table', customer: { name: 'Table T4', phone: '', email: '' },
    items: [line('m8', 1, { 'Spice level': 'Medium' }, ['Butter naan']), line('m6', 1, { 'Spice level': 'Mild' }), line('m25', 2, { Size: 'Regular', Milk: 'Regular milk' })] });
  mkOrder({ created: ago(26), type: 'pickup', status: 'ready', customer: guest(2), method: 'cash',
    items: [line('m25', 2, { Size: 'Large', Milk: 'Oat milk' }), line('m24', 1, {}, ['Vanilla ice cream scoop'])] });
  mkOrder({ created: ago(21), type: 'pickup', status: 'preparing', customer: guest(9), method: 'card',
    items: [line('m4', 1, { 'Spice level': 'Hot' }), line('m18', 2, { 'Spice level': 'Medium' })] });
  mkOrder({ created: ago(18), type: 'dine-in', status: 'preparing', table: 'T3', method: 'pay-at-table', customer: { name: 'Table T3', phone: '', email: '' },
    items: [line('m10', 2, {}, [], 'One thali without onion & garlic'), line('m2')], instructions: 'Guest has a peanut allergy — please use separate utensils.' });
  mkOrder({ created: ago(16), type: 'delivery', status: 'preparing', userId: rahul.id,
    customer: { name: rahul.name, phone: rahul.phone, email: rahul.email }, address: rahul.addresses[0], method: 'card',
    items: [line('m9', 1, { Choice: 'Chicken', 'Spice level': 'Hot' }, ['Raita']), line('m22')], instructions: 'Please make the biryani extra spicy. Ring the bell once.' });
  mkOrder({ created: ago(9), type: 'dine-in', status: 'confirmed', table: 'T7', method: 'pay-at-table', customer: { name: 'Table T7', phone: '', email: '' },
    items: [line('m1', 1, { 'Spice level': 'Hot' }), line('m11', 1, { 'Spice level': 'Medium' }), line('m27', 2, { Size: 'Large' })] });
  mkOrder({ created: ago(4), type: 'pickup', status: 'placed', customer: guest(7), method: 'card', scheduledFor: null,
    items: [line('m12', 1, { Size: 'Large 12"' }, ['Extra cheese']), line('m26', 2, { Size: 'Regular' })] });
  mkOrder({ created: ago(2), type: 'delivery', status: 'placed', customer: guest(10), address: ADDRESSES[3], method: 'cash',
    items: [line('m5', 1, { 'Spice level': 'Medium' }, ['Butter naan']), line('m3')], instructions: 'Less oily, please.' });

  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // ---- Reservations ----
  const reservations = [];
  let resNo = 2001;
  const mkRes = (o) => {
    const r = { id: `R${resNo}`, userId: null, email: '', requests: '', accessibility: false, occasion: '', table: null,
      createdAt: new Date(+now - 2 * 86400000).toISOString(), ...o };
    resNo += 1;
    reservations.push(r);
    return r;
  };
  const slot = (h, m = 0) => `${pad(h)}:${pad(m)}`;

  for (let d = 14; d >= 1; d--) {
    const day = toDateKey(addDays(now, -d));
    const count = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < count; k++) {
      const [name, phone] = pick(CUSTOMERS);
      mkRes({ date: day, time: slot(12 + Math.floor(rand() * 10), rand() < 0.5 ? 0 : 30), guests: 2 + Math.floor(rand() * 5),
        name, phone, status: rand() < 0.15 ? 'cancelled' : 'completed' });
    }
  }
  mkRes({ date: toDateKey(addDays(now, -10)), time: '20:00', guests: 2, name: rahul.name, phone: rahul.phone, email: rahul.email,
    userId: rahul.id, status: 'completed', occasion: 'Anniversary' });

  const today = toDateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const seatedMin = Math.min(21 * 60, Math.max(12 * 60, Math.floor((nowMin - 30) / 30) * 30));
  mkRes({ date: today, time: slot(12, 30), guests: 2, ...nameOf(0), status: 'cancelled' });
  mkRes({ date: today, time: slot(13), guests: 3, ...nameOf(4), status: 'completed', table: 'T5' });
  mkRes({ date: today, time: slot(Math.floor(seatedMin / 60), seatedMin % 60), guests: 5, ...nameOf(7), status: 'seated', table: 'T7' });
  mkRes({ date: today, time: '19:30', guests: 2, ...nameOf(8), status: 'confirmed', table: 'T2', email: 'ishita@example.com' });
  mkRes({ date: today, time: '20:00', guests: 2, ...nameOf(9), status: 'pending', occasion: 'Anniversary', requests: 'Window seat if possible, please.' });
  mkRes({ date: today, time: '20:30', guests: 4, ...nameOf(1), status: 'confirmed', table: null });
  mkRes({ date: today, time: '21:00', guests: 6, ...nameOf(6), status: 'confirmed', accessibility: true, requests: 'One guest uses a wheelchair — step-free table please.' });
  const tomorrow = toDateKey(addDays(now, 1));
  mkRes({ date: tomorrow, time: '20:00', guests: 3, name: rahul.name, phone: rahul.phone, email: rahul.email, userId: rahul.id,
    status: 'confirmed', occasion: 'Birthday', requests: 'Could you add a candle to the dessert?' });
  mkRes({ date: tomorrow, time: '19:00', guests: 8, ...nameOf(12), status: 'pending', requests: 'Team dinner — need the private room if free.' });
  mkRes({ date: toDateKey(addDays(now, 3)), time: '13:30', guests: 2, ...nameOf(3), status: 'pending' });
  mkRes({ date: toDateKey(addDays(now, 5)), time: '20:30', guests: 4, ...nameOf(11), status: 'confirmed' });

  function nameOf(i) {
    return { name: CUSTOMERS[i][0], phone: CUSTOMERS[i][1] };
  }

  const tableStatus = { T2: 'reserved', T3: 'occupied', T4: 'occupied', T6: 'occupied', T7: 'occupied', T10: 'cleaning' };
  const tables = TABLES.map((t) => ({ ...t, status: tableStatus[t.id] || 'free' }));

  const rahulLive = orders.find((o) => o.userId === rahul.id && o.status === 'preparing');
  const notifications = [
    { id: 'n3', userId: rahul.id, orderId: rahulLive.id, text: `Order #${rahulLive.id} is being prepared`, at: rahulLive.history[2].at, read: false },
    { id: 'n2', userId: rahul.id, orderId: rahulLive.id, text: `Order #${rahulLive.id} was confirmed`, at: rahulLive.history[1].at, read: true },
    { id: 'n1', userId: rahul.id, orderId: null, text: 'Your table for tomorrow at 8:00 PM is confirmed', at: ago(300).toISOString(), read: true },
  ];

  const activity = [
    { text: 'Order #' + orders[0].id + ' placed (delivery)', by: orders[0].customer.name, m: 2 },
    { text: 'Confirmed reservation R' + (resNo - 8) + ' for Ishita Bose', by: 'Neha Kapoor', m: 45 },
    { text: 'Marked "Tiramisu" as unavailable', by: 'Priya Sharma', m: 180 },
    { text: 'Updated price of "Butter Chicken": ₹400 → ₹420', by: 'Priya Sharma', m: 60 * 26 },
    { text: 'Deactivated staff account Sameer Khan (Front of House)', by: 'Priya Sharma', m: 60 * 50 },
    { text: 'Created promotion WELCOME10', by: 'Priya Sharma', m: 60 * 24 * 6 },
    { text: 'Added staff member Ravi Kumar (Kitchen Staff)', by: 'Priya Sharma', m: 60 * 24 * 9 },
  ].map((a, i) => ({ id: `act${i}`, at: ago(a.m).toISOString(), by: a.by, text: a.text }));

  return {
    version: 1,
    settings,
    categories: structuredClone(CATEGORIES),
    menu,
    users: structuredClone(USERS),
    promos: structuredClone(PROMOS),
    orders,
    reservations,
    tables,
    waitlist: [{ id: 'w1', name: 'Farhan Ali', guests: 2, phone: '97330 34567', addedAt: ago(6).toISOString() }],
    notifications,
    activity,
    cart: [],
    nextOrderNo: no,
    nextResNo: resNo,
  };
}
