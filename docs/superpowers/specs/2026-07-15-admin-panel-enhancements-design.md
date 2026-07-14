# Admin Panel Enhancements — Design Spec

**Date:** 2026-07-15
**Status:** Approved
**Repo:** Book-Publishing-Company (existing full-stack Express + MongoDB + EJS app)

## Context

The site is already a complete full-stack app: ESM (`"type": "module"`), Express 4,
Mongoose 8, JWT cookie auth (`attachUser` / `requirePageAdmin`), SafePay checkout,
and a working admin panel at `/admin` (Dashboard, Books CRUD, Users, Orders). This
project does NOT replace that admin or bolt on the separate standalone dashboard —
it completes the site's **own** admin, in the site's own stack and conventions.

Admin login is a `master` account (seeded from `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`, defaults `admin@publishingcompany.com` / `Admin@12345`).

**Testing:** the project has no test framework and the existing code has no tests.
Following that convention, this work is verified by running the app end-to-end
(manual walkthrough), not by adding a test suite. A light test setup can be added
later if desired.

## Goals (4 enhancements)

1. Book cover image upload from the admin's computer (multer).
2. Genre/Category management + filtering (managed list feeding a dropdown).
3. EasyPaisa/JazzCash (and Cash on Delivery) payment methods alongside SafePay.
4. Sales report page + dashboard polish (quick actions, low-stock).

## Non-Goals

- No change to the SafePay flow's happy path.
- No replacement of the existing admin or the storefront design language.
- No data migration of existing books (genre stays a string on `Book`).
- No automated test suite (matches existing project convention).

---

## 1. Book Cover Upload (multer)

- Add `multer` dependency. New `src/middleware/upload.js` exports a configured
  multer instance: disk storage to `public/uploads/`, unique filenames, image
  MIME/extension filter (jpg/jpeg/png/webp/gif/jfif), 5 MB limit.
- `views/admin/book-form.ejs`: `enctype="multipart/form-data"`, add a file input
  `cover` alongside the existing `image` text field (which stays as a
  URL/path fallback so existing books and manual paths still work).
- `adminController.createBook` / `updateBook`: apply `upload.single("cover")` in
  the route. If `req.file` present, set `image = "uploads/" + req.file.filename`;
  otherwise keep the submitted `image` string. On update with no new file, the
  existing image is preserved (do not overwrite `image` with empty).
- `Book.image` convention is unchanged (relative path rendered with a leading
  `/`), so `uploads/<file>` slots in exactly like `images/book-1.jfif`.
- `public/uploads/` is created with a `.gitkeep`; the directory is ensured at
  multer init (defensive `fs.mkdirSync(..., { recursive: true })`).

## 2. Genre / Category Management + Filter

- New model `src/models/Genre.js`: `{ name: String required unique trim }`,
  timestamps.
- Admin CRUD (page routes under `/admin/genres`): list, new, create, edit,
  update, delete. Duplicate name → friendly error. Deleting a genre that is
  still used by books is allowed but warns (books keep their `genre` string;
  the name simply leaves the managed list) — simplest, no cascade.
- First-run backfill: a small idempotent step (in `seed.js` and/or a one-time
  guard in the genres controller) creates `Genre` docs from the distinct
  existing `Book.genre` values, so the managed list starts populated.
- `views/admin/book-form.ejs`: the `genre` field becomes a `<select>` populated
  from `Genre` names UNION the distinct existing `Book.genre` values (so no
  current genre becomes unselectable), plus a free-text "or type a new one"
  fallback input. The chosen/typed value is stored into `Book.genre` (string) —
  fully backward compatible, no migration.
- `views/admin/books.ejs`: add a genre filter `<select>` (GET query `genre`) next
  to the existing search box. `adminController.listBooks` adds `genre` to its
  filter when present (exact match), preserving the existing `$text` search.

## 3. EasyPaisa / JazzCash / Cash Payment Methods

### Settings model
- New `src/models/Settings.js` (singleton): `{ shopName, easypaisaNumber,
  easypaisaName, jazzcashNumber, jazzcashName }`, all strings with sensible
  defaults. Static `Settings.getSingleton()` (findOne-or-create).
- Admin page `/admin/settings` (GET form, POST update) to edit these.

### Order model change
- `Order.payment.provider` enum extended to
  `["safepay", "easypaisa", "jazzcash", "cash"]` (default stays `"safepay"`).
- Add `Order.payment.proof` (String, default "") to hold a customer-submitted
  transaction id / reference (and optional uploaded screenshot path).
- Payment `status` enum unchanged (`pending/paid/failed/cancelled`).

### Checkout flow (`POST /api/orders` + checkout UI)
- `views/checkout.ejs` (+ its checkout JS in `public/js`): add a payment-method
  selector — **SafePay (card)**, **EasyPaisa**, **JazzCash**, **Cash on
  Delivery** — and pass the chosen `paymentMethod` in the order request body.
  For EasyPaisa/JazzCash, the page shows the destination number + account name
  (fetched from Settings) and a field for the customer's transaction id.
- `orderController.createOrder` branches on `paymentMethod`:
  - `safepay` (default): existing flow unchanged (create SafePay token +
    checkoutUrl, return it).
  - `easypaisa` / `jazzcash`: create the order with
    `payment.provider = <method>`, `payment.status = "pending"`, store the
    submitted `proof`/reference; DO NOT call SafePay. Return a JSON result that
    directs the browser to an order-instructions/confirmation page showing the
    number to send money to and the order number.
  - `cash`: create the order, `payment.provider = "cash"`, `payment.status =
    "pending"`, order `status = "processing"`; show confirmation.
  - Server always computes `totalAmount` from DB book prices (never trusts
    client price), as it does today. Popularity `$inc` still runs.
- New page `GET /checkout/complete/manual?orderId=...` (or reuse the order
  confirmation view) renders manual-payment instructions from Settings.

### Admin order detail
- `views/admin/order-detail.ejs`: show `payment.provider`, `payment.status`, and
  the submitted `proof`/reference (with image if a screenshot was uploaded).
- Add a **"Mark as Paid"** action (`POST /admin/orders/:id/payment` →
  `paymentController` or `adminController`) that sets `payment.status = "paid"`,
  `payment.paidAt = now` for manual (non-SafePay) orders.

## 4. Sales Report + Dashboard Polish

### Reports page
- New `GET /admin/reports` → `adminController.reports` renders
  `views/admin/reports.ejs`.
- Data (excluding `status = cancelled`): total revenue, total orders,
  orders-by-status counts, best-selling books (aggregate `$unwind items` →
  group by `items.title`, sum quantity and revenue, top 10 by qty). Optional
  `from`/`to` date-range filter on `createdAt`.

### Dashboard polish
- `views/admin/dashboard.ejs`: add **quick-action buttons** (Add Book, Manage
  Genres, Settings, View Orders) and a **Low-stock** stat card (count of books
  with `stock <= 5`). Recent-orders table stays.
- `views/admin/books.ejs`: visually highlight rows with `stock <= 5`.
- `views/partials/admin-sidebar.ejs`: add links for **Genres**, **Reports**,
  **Settings** (with active-state handling).

---

## Routes Added/Changed

Page routes (under `/admin`, all behind `requirePageAdmin`):
- `GET /admin/genres`, `GET /admin/genres/new`, `POST /admin/genres`,
  `GET /admin/genres/:id/edit`, `POST /admin/genres/:id/update`,
  `POST /admin/genres/:id/delete`
- `GET /admin/settings`, `POST /admin/settings`
- `GET /admin/reports`
- `POST /admin/orders/:id/payment` (mark manual order as paid)
- `POST /admin/books` and `POST /admin/books/:id/update` gain
  `upload.single("cover")`

API / storefront:
- `POST /api/orders` gains a `paymentMethod` (and optional `proof`) in the body;
  branches as above.
- Optional `POST /api/orders` may also accept a proof screenshot upload; if
  supported, it uses the same multer instance (kept minimal — a text reference
  is the baseline, screenshot is a nice-to-have).

## Error Handling

- Reuse the project's `apiErrorHandler` / `pageErrorHandler` and the existing
  controller try/catch + `next(err)` pattern.
- Validation failures re-render the relevant form with an `error` message
  (matching the existing `book-form` / `user-form` pattern).
- Duplicate genre name → friendly message, not a 500.
- Multer file-type/size rejection → friendly error on the form, not a crash.

## Data Integrity

- Order totals always computed server-side from DB book prices.
- Existing SafePay flow untouched; manual methods never call SafePay.
- No migration: `Book.genre` remains a string; `Genre` is an additive managed
  list. `Settings` is a singleton.

## Verification (manual, end-to-end)

After implementation, run the site (`npm run seed` if needed, `npm run dev`),
log in as the master admin, and verify: upload a book cover from disk; create/
edit/delete a genre and see it in the book-form dropdown and books filter; set
EasyPaisa/JazzCash numbers in Settings; place an order via each payment method
(SafePay redirect still works; EasyPaisa/JazzCash show instructions + record the
order; COD places the order); mark a manual order as paid in admin; open the
reports page and confirm revenue/best-sellers/status counts; confirm dashboard
quick actions, low-stock card, and sidebar links.
