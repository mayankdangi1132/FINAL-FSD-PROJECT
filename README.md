# 🍽️ Saffron Table — Restaurant Management & Online Ordering Platform

A full-stack **MERN** web application (MongoDB, Express.js, React.js, Node.js) for a restaurant:
customers browse the menu, order online, book tables and track their orders live; staff run the
kitchen and the dining room; managers control the menu, staff, promotions, settings and reports.

---

## ✨ Features

| Role | What they can do |
| --- | --- |
| **Customer** | Browse and search the menu (veg / vegan / gluten-free / price filters), customise dishes (size, spice, add-ons), cart and checkout (delivery, pickup, dine-in), promo codes, card / UPI / cash, live order tracking, cancel before the kitchen accepts, reorder, ratings, table reservations with real-time availability, saved addresses, notifications. **Must sign in to order or book.** |
| **Kitchen staff** | Kitchen display with New / Preparing / Ready columns, timers, modifiers and allergy notes. Sees **no prices or customer contact details**. |
| **Front of house** | Floor plan with table status, reservations (confirm, seat, assign tables, complete), waitlist, dine-in orders (serve, close bill), pickup / delivery handoff, create dine-in orders. |
| **Admin / manager** | Dashboard with sales charts, all orders (status changes, cancellations, refunds), reservations, menu & category management with photo upload, promotions, staff accounts and roles, reports with CSV export, activity (audit) log, restaurant settings (hours, services, fees, booking rules). |

**Security:** JWT authentication · bcrypt password hashing · role-based access control on every
route · no public staff sign-up · **sign-in required to order or book a table** · anti-spam limits
(1 booking per day, max 3 upcoming bookings and 3 unconfirmed orders per account, per-account rate limits) · server-side validation (zod) · prices recalculated on the server
(the client can't change them) · customers can only see their own orders and reservations ·
NoSQL-injection filtering · rate-limited login · Helmet security headers · audit log of admin and
order-status changes · card details never touch our server (Stripe Checkout).

---

## 🚀 Run it on any laptop

**You only need [Node.js](https://nodejs.org) 18.18 or newer** (the LTS version is best).
You do **not** need to install MongoDB — the backend starts its own local MongoDB automatically.

```bash
cd "fsd project"
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

- `npm install` installs everything (root, `backend/` and `frontend/`).
- The **first** `npm run dev` downloads MongoDB once (~100 MB) and fills the database with demo
  data. Later runs start in a few seconds, and your data is kept in `backend/.data/`.
- An internet connection is needed for the first install and for the food photos.
- Stop everything with **Ctrl + C**.

### Demo accounts

Password for every demo account: **`demo1234`** (the sign-in page also has one-click buttons).

| Role | Email |
| --- | --- |
| Customer | customer@example.com |
| Admin / Manager | admin@saffrontable.test |
| Kitchen Staff | kitchen@saffrontable.test |
| Front of House | host@saffrontable.test |

**Tip for your presentation:** open the site in two browser tabs. Place an order as a customer in
one tab, sign in as Kitchen Staff in the other and move the order along — the customer's tracking
page updates by itself. (Each tab keeps its own sign-in.)

Promo codes to try at checkout: `WELCOME10`, `FLAT75`.
The site has a **light / dark mode** toggle (moon / sun icon in the top bar); it follows your system theme the first time.

**Documents for your submission and presentation** are in [`docs/`](docs/):
`Saffron Table - Project Report.pdf` (25 pages) and `Saffron Table - Presentation.pptx` (24 slides with speaker notes for studying).
To restore the original sample data: **Admin → Settings → Reset demo data** (or `npm run seed`).

---

## 🧰 Scripts (run in the project folder)

| Command | What it does |
| --- | --- |
| `npm install` | Installs all dependencies (backend + frontend) |
| `npm run dev` | Starts the API (port 5050) and the React app (port 5173) together |
| `npm run seed` | Resets the database to the demo data |
| `npm run build` | Builds the React app for production |
| `npm start` | Starts the API, which also serves the built React app at http://localhost:5050 |

---

## ⚙️ Configuration (optional)

Everything works without configuration. To change settings, copy `backend/.env.example` to
`backend/.env` and edit it:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | Use your own MongoDB, e.g. a local server or **MongoDB Atlas** (`mongodb+srv://…`). Leave empty for the built-in one. |
| `JWT_SECRET` | Secret for signing login tokens — **set a long random value in production**. |
| `STRIPE_SECRET_KEY` | A Stripe **test** key (`sk_test_…`) turns on real Stripe Checkout. Use test card `4242 4242 4242 4242`, any future date, any CVC. Without it, card/UPI payments are simulated. |
| `CLOUDINARY_*` | Store uploaded menu photos on Cloudinary. Without it, photos are saved in `backend/uploads/`. |
| `PORT`, `CLIENT_URL` | API port (default 5050) and the React app's URL. |

To browse the database, open the URL printed in the terminal (e.g.
`mongodb://127.0.0.1:27018/saffron_table`) in **MongoDB Compass**.

---

## 🏗️ Tech stack

- **Frontend:** React 18, React Router 6, Vite, plain CSS (responsive), lucide-react icons
- **Backend:** Node.js, Express 4, Mongoose 8, JWT (`jsonwebtoken`), `bcryptjs`, `zod` validation,
  `helmet`, `express-rate-limit`, `multer` uploads, Stripe, Cloudinary
- **Database:** MongoDB (built-in via `mongodb-memory-server`, or any MongoDB / Atlas)
- **API testing:** Postman collection in [`docs/`](docs/)

## 📁 Project structure

```
fsd project/
├── package.json              ← one-command scripts (install / dev / seed / build / start)
├── backend/
│   ├── .env.example
│   └── src/
│       ├── server.js         ← starts MongoDB + Express, seeds demo data on first run
│       ├── app.js            ← middleware, routes, serves the React build in production
│       ├── config/           ← environment + database connection
│       ├── models/           ← Mongoose schemas (User, MenuItem, Order, Reservation, …)
│       ├── middleware/       ← JWT auth, role checks, error handling, input sanitising
│       ├── controllers/      ← auth, menu, orders, reservations, admin
│       ├── routes/index.js   ← every endpoint and who can call it
│       ├── seed/             ← demo data
│       └── utils/            ← pricing, order-status rules, reservation slots
├── frontend/
│   └── src/
│       ├── api.js            ← fetch wrapper (adds the JWT)
│       ├── context/          ← app state, talks to the API
│       ├── pages/            ← public site, customer/, admin/, kitchen/, foh/
│       ├── components/       ← layout, navbar, menu cards, shared UI
│       └── styles/
└── docs/
    └── Saffron-Table.postman_collection.json
```

## 🔌 API overview

All endpoints are under `/api`. 🔓 public · 👤 signed in · 🧑‍🍳 staff · 🛡️ admin

| Method & path | Access | Purpose |
| --- | --- | --- |
| `POST /auth/register`, `POST /auth/login` | 🔓 | Customer sign-up, sign-in (returns JWT) |
| `GET/PATCH /auth/me`, `POST/DELETE /auth/me/addresses` | 👤 | Profile and saved addresses |
| `GET /settings`, `GET /categories`, `GET /menu` | 🔓 | Restaurant info and menu |
| `PUT /settings`, `POST/PUT/PATCH/DELETE /menu`, `/categories`, `POST /uploads` | 🛡️ | Manage settings, menu, photos |
| `POST /orders` | 👤 customer | Place an order (sign-in required, per-account limits) |
| `GET /orders/my` · `GET /orders/:id` | 👤 / owner | Order history · track an order |
| `GET /orders` · `PATCH /orders/:id/status` | 🧑‍🍳 | Staff order list (filtered by role) · update status (rules per role) |
| `POST /orders/:id/cancel` · `/refund` · `/rate` | owner / 🛡️ | Cancel, refund, rate |
| `POST /orders/staff` | front of house | Dine-in order for a table |
| `GET /reservations/availability` · `POST /reservations` | 🔓 · 👤 customer | Free slots · book a table (sign-in required, max 3 upcoming) |
| `GET /reservations`, `PATCH /reservations/:code` | front of house | Manage bookings and table assignment |
| `GET/PATCH /tables`, `/waitlist` | front of house | Floor plan and waitlist |
| `POST /promotions/validate` · `/promotions` | 🔓 · 🛡️ | Check a promo code · manage promotions |
| `/staff`, `/activity`, `POST /admin/reset-demo` | 🛡️ | Staff accounts, audit log, demo reset |
| `GET /notifications` | 👤 | Customer notifications |

Import `docs/Saffron-Table.postman_collection.json` into Postman to try them — the **Login**
requests save the token automatically.

---

## 📤 Put it on GitHub

```bash
cd "fsd project"
git init
git add .
git commit -m "Saffron Table - MERN restaurant platform"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/saffron-table.git
git push -u origin main
```

`node_modules`, `.env` and the local database are excluded by `.gitignore`. Anyone who clones the
repo just runs `npm install` and `npm run dev`.

**Copying with a USB drive or zip instead?** Leave out the `node_modules` folders and
`backend/.data` — they are recreated by `npm install` / `npm run dev`, and `node_modules` built on
a Mac won't work on Windows.

## 🛠️ Troubleshooting

- **"Port 5173 is in use"** — Vite picks the next free port; use the URL it prints (e.g. `http://localhost:5174`).
- **"Port 5050 is already in use"** — set `PORT=5051` in `backend/.env` and run with
  `VITE_API_PROXY=http://localhost:5051 npm run dev`.
- **MongoDB download fails** (firewall / no internet) — install MongoDB or create a free
  MongoDB Atlas cluster and put its connection string in `MONGO_URI`.
- **"Can't reach the server" page** — the backend isn't running; check the `[api]` lines in the terminal.
- **Start completely fresh** — stop the app, delete `backend/.data`, run `npm run dev` again.
