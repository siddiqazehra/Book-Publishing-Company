# Book Publishing Company

A full-stack bookstore website built with **Express**, **MongoDB (Mongoose)**, and **EJS**.
This project merges two earlier branches — a REST auth/books API and an EJS storefront —
into one working app, and adds the missing pieces: an admin panel, orders, cart & checkout.

## Features

**Storefront (public)**
- Home page with new releases, genres, author spotlight
- Book search & sort (client-side overlay) + header search
- Book details page with quantity selector
- Cart (persisted in the browser) with a slide-out drawer
- Checkout that creates a real order in MongoDB (demo payment — no real charge)
- About, Contact (with working contact form + FAQ accordion), Author pages
- "My Orders" page for logged-in customers to track order status

**Accounts**
- One shared login/register design for both customers and admins
- Sessions via an httpOnly JWT cookie (not localStorage — safer, works with server-rendered pages)
- Roles: `usual` (customer) and `master` (admin), stored on the `User` model

**Admin panel** (`/admin`, requires an admin/`master` account)
- Dashboard with book/user/order counts and revenue
- Books: list, add, edit, delete
- Users: list, add, edit (including promoting/demoting admin role), delete
- Orders: list all orders, view details, update status (pending → processing → shipped → delivered / cancelled)

## Tech stack

- Node.js + Express 4
- MongoDB + Mongoose
- EJS server-rendered views
- JWT auth in an httpOnly cookie
- Vanilla JS + localStorage for the cart (no frontend framework)

## Project structure

```
src/
  app.js                 entry point
  config/db.js           MongoDB connection
  models/                User, Book, Order, Counter
  middleware/auth.js      cookie session, requireAuth/requireAdmin guards
  middleware/errorHandler.js
  controllers/            authController, bookController, pageController,
                          orderController, adminController
  routes/                 pages.js, books.js, orders.js, admin.js
  utils/pagination.js, utils/seed.js
views/                    EJS templates (storefront + admin/*)
public/                   style.css, admin.css, images, fonts, client JS
```

## Getting started

1. **Install dependencies**
   ```
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your own values:
   ```
   cp .env.example .env
   ```
   At minimum you need a `MONGODB_URI` (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
   works fine) and a `JWT_SECRET` (any long random string).

3. **Seed sample data** (optional but recommended)
   ```
   npm run seed
   ```
   This loads a starter catalog of books and creates a default admin account using
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env` (defaults to
   `admin@publishingcompany.com` / `Admin@12345` if not set).

4. **Run the app**
   ```
   npm run dev      # with nodemon, auto-restarts on changes
   # or
   npm start
   ```
   Visit `http://localhost:3000`.

5. **Log in as admin**

   Log in with the seeded admin account, then go to `http://localhost:3000/admin`.
   You can promote any other user to admin from **Admin → Users → Edit**.

## Notes on design decisions

- **Cookie-based sessions instead of localStorage tokens.** The original auth branch
  used a JSON API + a token in `localStorage`, which doesn't work well with
  server-rendered EJS pages (the server can't read `localStorage`). Login/register
  now POST directly to the server, which sets an httpOnly cookie; every page and the
  JSON API both read the same cookie, so there's one login system for the whole site.
- **Books use MongoDB's own `_id`**, not the old hand-rolled numeric `id` from the
  static book list. All the frontend JS (cart, search, book details) was updated to
  match.
- **Checkout is demo-only.** The card fields are validated (16-digit number, MM/YY,
  CVV) but no real payment processor is called — this matches the original checkout
  page's own "This is a demo checkout" notice. Prices are always re-read from the
  database when an order is placed, never trusted from the browser.
- **Admin CRUD is server-rendered** (classic forms + redirects) rather than a JS
  single-page app, so it keeps working even with JavaScript disabled and is easier
  to extend.
