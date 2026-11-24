// All Mongoose models in one place.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Exposes `id` instead of `_id` and hides `__v`. */
const toJSON = (extra) => ({
  versionKey: false,
  transform(doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    return extra ? extra(ret) : ret;
  },
});

export const ROLES = ['customer', 'admin', 'kitchen', 'foh'];
export const ORDER_TYPES = ['delivery', 'pickup', 'dine-in'];
export const ORDER_STATUSES = ['placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'served', 'completed', 'cancelled'];
export const RES_STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'cancelled'];
export const TABLE_STATUSES = ['free', 'reserved', 'occupied', 'cleaning'];

// ---------- User ----------
const addressSchema = new Schema({
  label: { type: String, default: 'Home', trim: true, maxlength: 20 },
  line1: { type: String, required: true, trim: true, maxlength: 120 },
  area: { type: String, required: true, trim: true, maxlength: 80 },
  city: { type: String, default: '', trim: true, maxlength: 60 },
  pincode: { type: String, required: true, match: /^\d{6}$/ },
  landmark: { type: String, default: '', trim: true, maxlength: 80 },
}, { toJSON: toJSON() });

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, default: 'customer' },
  active: { type: Boolean, default: true },
  addresses: [addressSchema],
}, { timestamps: true, toJSON: toJSON((ret) => { delete ret.password; return ret; }) });

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.password);
};
export const User = mongoose.model('User', userSchema);

// ---------- Menu ----------
const choiceSchema = new Schema({ label: { type: String, required: true, trim: true }, price: { type: Number, default: 0 } }, { _id: false });
const optionSchema = new Schema({ name: { type: String, required: true, trim: true }, choices: [choiceSchema] }, { _id: false });

export const Category = mongoose.model('Category', new Schema({
  _id: { type: String },
  name: { type: String, required: true, trim: true },
  subcategories: [String],
  sortOrder: { type: Number, default: 0 },
}, { toJSON: toJSON() }));

export const MenuItem = mongoose.model('MenuItem', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', maxlength: 300 },
  category: { type: String, required: true, index: true },
  subcategory: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  veg: { type: Boolean, default: true },
  dietary: [{ type: String, enum: ['vegetarian', 'vegan', 'gluten-free'] }],
  allergens: [String],
  options: [optionSchema],
  addOns: [choiceSchema],
  available: { type: Boolean, default: true },
  hidden: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  special: { type: Boolean, default: false },
  stock: { type: Number, default: null, min: 0 },
  prepTime: { type: Number, default: 15, min: 1 },
  rating: { type: Number, default: 0 },
}, { timestamps: true, toJSON: toJSON() }));

// ---------- Orders ----------
const plainAddress = new Schema({
  label: String, line1: String, area: String, city: String, pincode: String, landmark: String,
}, { _id: false });

const orderItemSchema = new Schema({
  itemId: String,
  name: String,
  veg: Boolean,
  price: Number, // price at the time of ordering — later menu changes don't affect old orders
  qty: Number,
  selections: { type: Schema.Types.Mixed, default: {} },
  addOns: [String],
  note: { type: String, default: '' },
}, { _id: false, minimize: false });

const orderSchema = new Schema({
  orderNumber: { type: Number, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  customer: { name: String, phone: String, email: String },
  type: { type: String, enum: ORDER_TYPES, required: true },
  address: { type: plainAddress, default: null },
  table: { type: String, default: null },
  scheduledFor: { type: String, default: null },
  instructions: { type: String, default: '' },
  items: [orderItemSchema],
  subtotal: Number,
  discount: Number,
  tax: Number,
  fee: Number,
  total: Number,
  promoCode: { type: String, default: null },
  payment: {
    method: { type: String, enum: ['card', 'upi', 'cash', 'pay-at-table'] },
    status: { type: String, enum: ['paid', 'pending', 'refunded', 'void'] },
    sessionId: { type: String, default: null },
    paymentIntent: { type: String, default: null },
  },
  status: { type: String, enum: ORDER_STATUSES, default: 'placed', index: true },
  history: [new Schema({ status: String, at: Date, by: String, note: String }, { _id: false })],
  rating: { type: new Schema({ stars: Number, comment: String, at: Date }, { _id: false }), default: null },
  source: { type: String, default: 'online' },
  accessToken: { type: String, select: false }, // lets a guest view their own order
  createdAt: { type: Date, default: Date.now, index: true },
}, {
  toJSON: toJSON((ret) => {
    ret.id = String(ret.orderNumber);
    ret.no = ret.orderNumber;
    ret.userId = ret.userId ? String(ret.userId) : null;
    delete ret.accessToken;
    if (ret.payment) { delete ret.payment.sessionId; delete ret.payment.paymentIntent; }
    return ret;
  }),
});
export const Order = mongoose.model('Order', orderSchema);

// ---------- Reservations & tables ----------
export const Reservation = mongoose.model('Reservation', new Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true },
  phone: { type: String, required: true, trim: true },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  time: { type: String, required: true },              // HH:MM
  guests: { type: Number, required: true, min: 1 },
  occasion: { type: String, default: '' },
  requests: { type: String, default: '' },
  accessibility: { type: Boolean, default: false },
  table: { type: String, default: null },
  status: { type: String, enum: RES_STATUSES, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
}, {
  toJSON: toJSON((ret) => {
    ret.id = ret.code;
    ret.userId = ret.userId ? String(ret.userId) : null;
    return ret;
  }),
}));

export const Table = mongoose.model('Table', new Schema({
  _id: { type: String }, // e.g. "T5"
  seats: { type: Number, required: true },
  zone: { type: String, default: '' },
  status: { type: String, enum: TABLE_STATUSES, default: 'free' },
  sortOrder: { type: Number, default: 0 },
}, { toJSON: toJSON() }));

export const Waitlist = mongoose.model('Waitlist', new Schema({
  name: { type: String, required: true, trim: true },
  guests: { type: Number, required: true, min: 1 },
  phone: { type: String, default: '' },
  addedAt: { type: Date, default: Date.now },
}, { toJSON: toJSON() }));

// ---------- Promotions, settings, logs ----------
export const Promotion = mongoose.model('Promotion', new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['percent', 'flat'], required: true },
  value: { type: Number, required: true, min: 0 },
  minOrder: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: null },
  active: { type: Boolean, default: true },
  uses: { type: Number, default: 0 },
}, { toJSON: toJSON() }));

export const Setting = mongoose.model('Setting', new Schema({
  _id: { type: String },
  value: { type: Schema.Types.Mixed },
}, { minimize: false }));

export const Activity = mongoose.model('Activity', new Schema({
  at: { type: Date, default: Date.now, index: true },
  by: String,
  userId: { type: Schema.Types.ObjectId, default: null },
  text: String,
}, { toJSON: toJSON() }));

export const Notification = mongoose.model('Notification', new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  orderId: { type: String, default: null },
  text: String,
  at: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
}, { toJSON: toJSON((ret) => { ret.userId = String(ret.userId); return ret; }) }));

const Counter = mongoose.model('Counter', new Schema({ _id: String, seq: Number }));
export { Counter };

/** Atomically returns the next number in a sequence (order numbers, reservation codes). */
export async function nextSeq(name, start) {
  await Counter.updateOne({ _id: name }, { $setOnInsert: { seq: start } }, { upsert: true });
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true });
  return doc.seq;
}
