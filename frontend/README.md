# Saffron Table — Restaurant Management & Online Ordering (Frontend)

React frontend for the MERN restaurant project. It covers every screen in the brief — the public
website, online ordering, reservations, the customer dashboard, and separate dashboards for the
admin/manager, kitchen staff and front-of-house staff.

The app currently runs in **demo mode**: data is seeded in the browser (`localStorage`), so you can
click through the whole system without the backend. Every action in `src/context/AppContext.jsx`
is commented with the Express route it maps to, so it can be swapped for real API calls later.

## Run it

```bash
cd restaurant-frontend
npm install
npm run dev
```

Open http://localhost:5174.

## Demo accounts

On the **Sign in** page, click any demo account (any password works in demo mode):

| Role | Email | Lands on |
| --- | --- | --- |
| Customer | customer@example.com | `/account` |
| Admin / Manager | admin@saffrontable.test | `/admin` |
| Kitchen Staff | kitchen@saffrontable.test | `/kitchen` |
| Front of House | host@saffrontable.test | `/foh` |

The signed-in user is stored **per browser tab** while the data is shared between tabs. So you can
place an order as a customer in one tab, move it along from the Kitchen display in a second tab,
and watch the customer's tracking page update live.

To start over, go to **Admin → Settings → Reset demo data**.

## What's included

**Customer website**
- Home: hero, service options, featured dishes, today's specials, reviews, hours and locations
- Menu: search, categories and subcategories, veg / vegan / gluten-free filters, price filter, sort,
  availability and low-stock labels
- Item dialog: size / spice options, add-ons, special instructions, allergens
- Cart and checkout: delivery / pickup / dine-in, saved addresses, scheduled time, promo codes,
  GST and delivery fee, card / UPI (simulated Stripe) or cash
- Order tracking with a live status timeline, cancellation, rating and reorder
- Table reservations with real-time slot availability (overlapping bookings can't exceed capacity)
- Customer account: active orders, order history with filters, reservations, profile, saved addresses, reviews
- Guest checkout and order lookup by order number + phone

**Admin / Manager** — overview KPIs and charts, order management (search, filters, status changes,
cancel, refund), reservations with table assignment, menu CRUD with image upload, categories,
promotions, staff accounts and roles, reports with CSV export, activity (audit) log, and restaurant settings.

**Kitchen display** — New / Preparing / Ready columns, elapsed timers with late warnings, item modifiers
and allergy notes. No prices or customer contact details are shown.

**Front of house** — floor plan with table statuses, today's / tomorrow's reservations, waitlist,
dine-in orders (mark served, close bill), pickup / delivery handoff, and new dine-in orders.

**Security in the UI** — role-based route guards, no public staff sign-up, customers can only view
their own orders and reservations, and every status change is checked against the user's role
(`canSetStatus` in `src/utils/status.js`). The backend must enforce the same rules.

## Project structure

```
src/
  App.jsx                 routes (public, /admin, /kitchen, /foh)
  context/AppContext.jsx  app state + actions (maps to the Express API)
  data/seed.js            demo menu, orders, reservations, staff, settings
  components/             layout, navbar, footer, menu cards, shared UI pieces
  pages/                  public pages, customer/, admin/, kitchen/, foh/
  utils/                  formatting, pricing, status rules, reservation slots
  styles/                 base.css (design system), site.css, dashboard.css
```

Tech: React 18, React Router 6, Vite, plain CSS and lucide-react icons. Food photos load from Unsplash
and fall back to a placeholder when offline.
