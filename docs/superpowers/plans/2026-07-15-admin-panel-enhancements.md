# Admin Panel Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Book-Publishing-Company site's own admin panel with book-cover uploads, genre management + filtering, EasyPaisa/JazzCash/COD payment methods alongside SafePay, and a sales report + dashboard polish — all in the site's existing stack.

**Architecture:** Extend the existing ESM/Express 4/Mongoose 8 app. New Mongoose models (`Genre`, `Settings`), a multer upload middleware, new admin controller actions/routes/views, an order-creation branch for manual payments, and a rewritten (coherent) checkout view + JS. No separate app, no data migration.

**Tech Stack:** Node ESM (`"type": "module"`), Express 4, Mongoose 8, EJS, JWT cookie auth, multer (new), SafePay (existing).

## Global Constraints

- ES modules only: `import` / `export`, matching the existing `src/**` style (named exports, `.js` extensions in import paths). NO `require`.
- Every controller action follows the existing pattern: `async (req, res, next) => { try { ... } catch (err) { next(err); } }`, or renders a form with an `error` string on validation failure (see `adminController.createBook`).
- All `/admin/*` page routes stay behind `requirePageAdmin` (already applied via `router.use(requirePageAdmin)` in `src/routes/admin.js`).
- Order totals are ALWAYS computed server-side from DB book prices — never trust a client-sent price (existing `createOrder` behavior; preserve it).
- The existing SafePay happy path must remain unchanged for `paymentMethod === "safepay"` (the default).
- No data migration: `Book.genre` stays a String; `Genre` is an additive managed list; `Settings` is a singleton.
- Manual-payment transaction id reuses the EXISTING `Order.payment.reference` field (already displayed in `views/admin/order-detail.ejs`). Only an optional screenshot path (`Order.payment.proof`) is new.
- Admin views follow the existing template shape: full HTML doc, `<link rel="stylesheet" href="/style.css">` + `/admin.css`, `include('../partials/admin-sidebar', { active: '<key>' })`, `#admin-shell`/`#admin-main`/`#admin-topbar`, and classes `admin-panel`, `data-table`, `btn-sm btn-add|btn-edit|btn-delete`, `admin-form`, `admin-error`, `status-badge status-<x>`.
- **No automated test framework** exists in this project and none is added. Each task is verified by (a) `node --check` on changed `.js` files, (b) booting the server (`npm run dev`) and confirming it starts with no error, and (c) the task's manual browser steps. The site reads its own `.env` (`MONGODB_URI` is already set by the user).
- Admin login for manual checks: `master` account seeded from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (defaults `admin@publishingcompany.com` / `Admin@12345`).

---

## File Structure

```
src/
  middleware/upload.js        (NEW) multer instance → public/uploads
  models/Genre.js             (NEW) { name unique }
  models/Settings.js          (NEW) singleton payment/shop settings
  models/Book.js              (edit) — no schema change needed
  models/Order.js             (edit) payment.provider enum + payment.proof
  controllers/adminController.js  (edit) genres, settings, reports, dashboard polish, book upload
  controllers/orderController.js  (edit) paymentMethod branch
  controllers/paymentController.js (edit) markOrderPaid (manual)
  routes/admin.js             (edit) new routes + upload middleware
  routes/pages.js             (edit) pass settings to checkout page (via controller)
  controllers/pageController.js (edit) checkoutPage passes settings
  utils/seed.js               (edit) backfill Genre from distinct Book.genre
views/admin/
  genres.ejs, genre-form.ejs  (NEW)
  settings.ejs                (NEW)
  reports.ejs                 (NEW)
  dashboard.ejs, books.ejs, book-form.ejs, order-detail.ejs (edit)
views/
  checkout.ejs                (edit) payment-method selector + confirmation
partials/admin-sidebar.ejs    (edit) Genres/Reports/Settings links
public/
  uploads/.gitkeep            (NEW)
  js/checkout.js              (edit/rewrite) coherent submit + payment method
  admin.css                   (edit) new component styles
```

---

### Task 1: Multer upload middleware + book cover upload

**Files:**
- Create: `src/middleware/upload.js`, `public/uploads/.gitkeep`
- Modify: `src/routes/admin.js`, `src/controllers/adminController.js` (createBook, updateBook), `views/admin/book-form.ejs`, `package.json` (multer dep)

**Interfaces:**
- Produces: default-exported multer instance used as `upload.single("cover")`. Uploaded files saved to `public/uploads/<unique>`, and the resulting `Book.image` becomes `"uploads/<filename>"`.

- [ ] **Step 1: Install multer**

```bash
cd "C:\Users\musta\OneDrive\Desktop\Book-Publishing-Company"
npm install multer
```

- [ ] **Step 2: Create `public/uploads/.gitkeep`** (empty file) so the dir exists and is tracked.

- [ ] **Step 3: Create `src/middleware/upload.js`**

```js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const ALLOWED = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".jfif"];

function fileFilter(req, file, cb) {
  const ok = ALLOWED.includes(path.extname(file.originalname).toLowerCase());
  cb(ok ? null : new Error("Only image files are allowed."), ok);
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
```

- [ ] **Step 4: Wire multer into the book create/update routes** in `src/routes/admin.js`. Add the import and apply `upload.single("cover")` before the two handlers:

```js
import { upload } from "../middleware/upload.js";
// ...
router.post("/books", upload.single("cover"), admin.createBook);
router.post("/books/:id/update", upload.single("cover"), admin.updateBook);
```

- [ ] **Step 5: Use the uploaded file in `createBook`** (`src/controllers/adminController.js`). Replace the `image: image || undefined` line so an uploaded file wins, else the text path is kept:

```js
export const createBook = async (req, res) => {
  try {
    const { title, author, description, genre, price, image, stock } = req.body;
    const coverPath = req.file ? `uploads/${req.file.filename}` : (image || undefined);
    await Book.create({
      title,
      author,
      description,
      genre,
      price: Number(price) || 0,
      image: coverPath,
      stock: Number(stock) || 0,
    });
    res.redirect("/admin/books");
  } catch (err) {
    const message =
      err.name === "ValidationError"
        ? Object.values(err.errors)[0]?.message || "Invalid input."
        : "Could not create the book. Please check the fields and try again.";
    res.status(400).render("admin/book-form", { title: "Add Book", book: req.body, error: message, mode: "create" });
  }
};
```

- [ ] **Step 6: Use the uploaded file in `updateBook`** — only overwrite the image when a new file is uploaded (never wipe an existing cover on a fieldless edit). Build the update object conditionally:

```js
export const updateBook = async (req, res) => {
  try {
    const { title, author, description, genre, price, image, stock } = req.body;
    const update = {
      title,
      author,
      description,
      genre,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
    };
    if (req.file) update.image = `uploads/${req.file.filename}`;
    else if (image) update.image = image;
    const book = await Book.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!book) return res.status(404).render("error", { title: "Not found", message: "Book not found." });
    res.redirect("/admin/books");
  } catch (err) {
    const message =
      err.name === "ValidationError"
        ? Object.values(err.errors)[0]?.message || "Invalid input."
        : "Could not update the book. Please check the fields and try again.";
    res.status(400).render("admin/book-form", { title: "Edit Book", book: { ...req.body, _id: req.params.id }, error: message, mode: "edit" });
  }
};
```

- [ ] **Step 7: Add the file input to `views/admin/book-form.ejs`.** Set the form to multipart and add a `cover` file input above the existing text "Cover image path" field:

Change the `<form ...>` opening tag to include `enctype="multipart/form-data"`:
```html
<form class="admin-form" method="POST" enctype="multipart/form-data"
    action="<%= mode === 'create' ? '/admin/books' : '/admin/books/' + book._id + '/update' %>">
```
And insert, just above the existing `<label for="image">Cover image path</label>` block:
```html
<label for="cover">Upload cover image (from your computer)</label>
<input type="file" id="cover" name="cover" accept="image/*">
<% if (book.image) { %>
  <div class="admin-current-cover">Current: <img class="thumb" src="/<%= book.image %>" alt=""></div>
<% } %>
<small class="admin-hint">Or paste an image path/URL below (used only if no file is uploaded).</small>
```

- [ ] **Step 8: Verify.**
  - Run: `node --check src/middleware/upload.js && node --check src/controllers/adminController.js`
  - Boot: `npm run dev` → server starts, no error. Stop it.
  - Manual: log in as admin → `/admin/books/new` → fill fields, choose an image file from disk → Add Book → the new book appears in `/admin/books` with the uploaded cover (file present under `public/uploads/`). Edit a book without choosing a file → its cover is unchanged.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(admin): upload book covers from disk via multer"
```

---

### Task 2: Genre model + admin CRUD + backfill

**Files:**
- Create: `src/models/Genre.js`, `views/admin/genres.ejs`, `views/admin/genre-form.ejs`
- Modify: `src/controllers/adminController.js` (genre actions + a backfill helper), `src/routes/admin.js`, `views/partials/admin-sidebar.ejs`, `src/utils/seed.js`

**Interfaces:**
- Produces: `Genre` model (`{ name: String required unique trim }`, timestamps); admin actions `listGenres, newGenreForm, createGenre, editGenreForm, updateGenre, deleteGenre`; an exported helper `ensureGenresSeeded()` that upserts a `Genre` for each distinct existing `Book.genre`. Routes under `/admin/genres`.
- Consumes: nothing new.

- [ ] **Step 1: Create `src/models/Genre.js`**

```js
import mongoose from "mongoose";

const genreSchema = new mongoose.Schema(
  { name: { type: String, required: [true, "Name is required"], unique: true, trim: true } },
  { timestamps: true }
);

export const Genre = mongoose.model("Genre", genreSchema);
```

- [ ] **Step 2: Add genre actions + backfill helper to `src/controllers/adminController.js`.** Add `import { Genre } from "../models/Genre.js";` at the top, then:

```js
/* ==================== GENRES ==================== */

export async function ensureGenresSeeded() {
  const names = (await Book.distinct("genre")).filter((n) => n && n.trim());
  await Promise.all(
    names.map((name) =>
      Genre.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true }).catch(() => {})
    )
  );
}

export const listGenres = async (req, res, next) => {
  try {
    await ensureGenresSeeded();
    const genres = await Genre.find().sort({ name: 1 }).lean();
    res.render("admin/genres", { title: "Manage Genres", genres });
  } catch (err) { next(err); }
};

export const newGenreForm = (req, res) => {
  res.render("admin/genre-form", { title: "Add Genre", genre: {}, error: null, mode: "create" });
};

export const createGenre = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) throw Object.assign(new Error("Name is required."), { name: "SimpleValidation" });
    await Genre.create({ name });
    res.redirect("/admin/genres");
  } catch (err) {
    const message = err.code === 11000 ? "That genre already exists." : err.message || "Could not create the genre.";
    res.status(400).render("admin/genre-form", { title: "Add Genre", genre: req.body, error: message, mode: "create" });
  }
};

export const editGenreForm = async (req, res, next) => {
  try {
    const genre = await Genre.findById(req.params.id).lean();
    if (!genre) return res.status(404).render("error", { title: "Not found", message: "Genre not found." });
    res.render("admin/genre-form", { title: "Edit Genre", genre, error: null, mode: "edit" });
  } catch (err) { next(err); }
};

export const updateGenre = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) throw Object.assign(new Error("Name is required."), { name: "SimpleValidation" });
    const genre = await Genre.findByIdAndUpdate(req.params.id, { name }, { new: true, runValidators: true });
    if (!genre) return res.status(404).render("error", { title: "Not found", message: "Genre not found." });
    res.redirect("/admin/genres");
  } catch (err) {
    const message = err.code === 11000 ? "That genre already exists." : err.message || "Could not update the genre.";
    res.status(400).render("admin/genre-form", { title: "Edit Genre", genre: { ...req.body, _id: req.params.id }, error: message, mode: "edit" });
  }
};

export const deleteGenre = async (req, res, next) => {
  try {
    await Genre.findByIdAndDelete(req.params.id);
    res.redirect("/admin/genres");
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Add genre routes** to `src/routes/admin.js` (after the Books block):

```js
// Genres
router.get("/genres", admin.listGenres);
router.get("/genres/new", admin.newGenreForm);
router.post("/genres", admin.createGenre);
router.get("/genres/:id/edit", admin.editGenreForm);
router.post("/genres/:id/update", admin.updateGenre);
router.post("/genres/:id/delete", admin.deleteGenre);
```

- [ ] **Step 4: Create `views/admin/genres.ejs`** — mirror `views/admin/books.ejs` structure (admin shell + sidebar `active: 'genres'` + `admin-panel`), a toolbar with a `+ Add Genre` button (`/admin/genres/new`), and a `data-table` of genres:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> - Publishing Company</title>
  <link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/admin.css">
</head>
<body>
  <div id="admin-shell">
    <%- include('../partials/admin-sidebar', { active: 'genres' }) %>
    <main id="admin-main">
      <div id="admin-topbar"><h1>Manage Genres</h1><div class="admin-user">Signed in as <strong><%= user.name %></strong></div></div>
      <div class="admin-panel">
        <div class="admin-toolbar"><span></span><a href="/admin/genres/new" class="btn-sm btn-add">+ Add Genre</a></div>
        <% if (!genres || genres.length === 0) { %>
          <p class="admin-empty">No genres yet.</p>
        <% } else { %>
          <table class="data-table">
            <thead><tr><th>Name</th><th></th></tr></thead>
            <tbody>
              <% genres.forEach(function(g) { %>
                <tr>
                  <td><%= g.name %></td>
                  <td class="table-actions">
                    <a class="btn-sm btn-edit" href="/admin/genres/<%= g._id %>/edit">Edit</a>
                    <form action="/admin/genres/<%= g._id %>/delete" method="POST" onsubmit="return confirm('Delete this genre? Books keep their genre text.');">
                      <button type="submit" class="btn-sm btn-delete">Delete</button>
                    </form>
                  </td>
                </tr>
              <% }); %>
            </tbody>
          </table>
        <% } %>
      </div>
    </main>
  </div>
</body>
</html>
```

- [ ] **Step 5: Create `views/admin/genre-form.ejs`** — mirror `book-form.ejs` (single `name` field), posting to `/admin/genres` (create) or `/admin/genres/<id>/update` (edit):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> - Publishing Company</title>
  <link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/admin.css">
</head>
<body>
  <div id="admin-shell">
    <%- include('../partials/admin-sidebar', { active: 'genres' }) %>
    <main id="admin-main">
      <div id="admin-topbar"><h1><%= mode === 'create' ? 'Add Genre' : 'Edit Genre' %></h1><div class="admin-user">Signed in as <strong><%= user.name %></strong></div></div>
      <div class="admin-panel" style="max-width: 480px;">
        <% if (error) { %><div class="admin-error"><%= error %></div><% } %>
        <form class="admin-form" method="POST" action="<%= mode === 'create' ? '/admin/genres' : '/admin/genres/' + genre._id + '/update' %>">
          <label for="name">Genre name</label>
          <input type="text" id="name" name="name" value="<%= genre.name || '' %>" required maxlength="80">
          <div class="admin-form-actions">
            <button type="submit" class="btn-sm btn-add" style="padding:10px 24px;"><%= mode === 'create' ? 'Add Genre' : 'Save Changes' %></button>
            <a href="/admin/genres" class="btn-sm btn-edit" style="padding:10px 24px;">Cancel</a>
          </div>
        </form>
      </div>
    </main>
  </div>
</body>
</html>
```

- [ ] **Step 6: Add the sidebar link** in `views/partials/admin-sidebar.ejs`, after the Books link:

```html
<a href="/admin/genres" class="<%= active === 'genres' ? 'active' : '' %>">Genres</a>
```

- [ ] **Step 7: Backfill on seed.** In `src/utils/seed.js`, after books are inserted, create genres from distinct book genres. Add near the end of the seed routine (after `Book.insertMany`), importing the model:

```js
import { Genre } from "../models/Genre.js";
// ... after books exist:
const genreNames = (await Book.distinct("genre")).filter((n) => n && n.trim());
for (const name of genreNames) {
  await Genre.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
}
console.log(`Seeded ${genreNames.length} genres.`);
```

- [ ] **Step 8: Verify.**
  - `node --check src/models/Genre.js && node --check src/controllers/adminController.js`
  - `npm run dev` boots clean.
  - Manual: `/admin/genres` shows genres backfilled from existing books; add "Poetry" → appears; add "Poetry" again → "already exists" message; edit → renames; delete → removed. Sidebar shows the Genres link, active when on the page.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(admin): genre model, CRUD, sidebar link, backfill from books"
```

---

### Task 3: Book-form genre dropdown + books list genre filter

**Files:**
- Modify: `src/controllers/adminController.js` (newBookForm, editBookForm, listBooks), `views/admin/book-form.ejs`, `views/admin/books.ejs`

**Interfaces:**
- Consumes: `Genre` model from Task 2.
- Produces: `newBookForm`/`editBookForm` now pass a `genres` string array to the view; `listBooks` accepts `?genre=` and passes `genres` + selected `genre` to the view.

- [ ] **Step 1: Build a shared genre-options helper** in `src/controllers/adminController.js` (near the genre actions):

```js
async function genreOptions() {
  const [managed, used] = await Promise.all([
    Genre.find().sort({ name: 1 }).lean(),
    Book.distinct("genre"),
  ]);
  const set = new Set(managed.map((g) => g.name));
  used.filter((n) => n && n.trim()).forEach((n) => set.add(n));
  return [...set].sort((a, b) => a.localeCompare(b));
}
```

- [ ] **Step 2: Pass `genres` to the book forms.** Update `newBookForm` and `editBookForm`:

```js
export const newBookForm = async (req, res, next) => {
  try {
    res.render("admin/book-form", { title: "Add Book", book: {}, error: null, mode: "create", genres: await genreOptions() });
  } catch (err) { next(err); }
};

export const editBookForm = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).render("error", { title: "Not found", message: "Book not found." });
    res.render("admin/book-form", { title: "Edit Book", book, error: null, mode: "edit", genres: await genreOptions() });
  } catch (err) { next(err); }
};
```
Also update the two `render("admin/book-form", ...)` calls inside `createBook`/`updateBook` error branches to include `genres: await genreOptions()` so the dropdown still populates when re-rendering after a validation error.

- [ ] **Step 3: Replace the genre text input in `views/admin/book-form.ejs`** with a dropdown + a "new genre" fallback:

```html
<label for="genre">Genre</label>
<select id="genre" name="genre">
  <option value="">— Select a genre —</option>
  <% genres.forEach(function(g) { %>
    <option value="<%= g %>" <%= book.genre === g ? 'selected' : '' %>><%= g %></option>
  <% }); %>
</select>
<input type="text" name="genreNew" placeholder="…or type a new genre" maxlength="80">
<small class="admin-hint">If you type a new genre, it is used instead of the dropdown selection.</small>
```
And in BOTH `createBook` and `updateBook`, resolve the genre from `genreNew` first: replace the destructured `genre` usage so it reads:
```js
const genre = (req.body.genreNew && req.body.genreNew.trim()) ? req.body.genreNew.trim() : (req.body.genre || "");
```
(Place this line right after reading `req.body`, and remove `genre` from the destructuring list to avoid a clash.)

- [ ] **Step 4: Add genre filtering to `listBooks`:**

```js
export const listBooks = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const genre = (req.query.genre || "").trim();
    const filter = {};
    if (q) filter.$text = { $search: q };
    if (genre) filter.genre = genre;
    const [books, genres] = await Promise.all([
      Book.find(filter).sort({ createdAt: -1 }).lean(),
      genreOptions(),
    ]);
    res.render("admin/books", { title: "Manage Books", books, q, genre, genres });
  } catch (err) { next(err); }
};
```

- [ ] **Step 5: Add the genre filter dropdown to the `views/admin/books.ejs` toolbar.** Inside the existing search `<form action="/admin/books" method="GET">`, add before its submit button:

```html
<select name="genre">
  <option value="">All genres</option>
  <% genres.forEach(function(g) { %>
    <option value="<%= g %>" <%= genre === g ? 'selected' : '' %>><%= g %></option>
  <% }); %>
</select>
```

- [ ] **Step 6: Verify.**
  - `node --check src/controllers/adminController.js`
  - `npm run dev` boots clean.
  - Manual: `/admin/books/new` → genre dropdown lists existing genres; pick one, add book → saved with that genre. Type a new genre in the fallback → that value wins. `/admin/books?genre=Classic` (or via the dropdown) → only Classic books show; "All genres" clears the filter; search + genre filter combine.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(admin): genre dropdown on book form + genre filter on books list"
```

---

### Task 4: Settings model + admin settings page

**Files:**
- Create: `src/models/Settings.js`, `views/admin/settings.ejs`
- Modify: `src/controllers/adminController.js` (settingsPage, updateSettings), `src/routes/admin.js`, `views/partials/admin-sidebar.ejs`

**Interfaces:**
- Produces: `Settings` model with static `Settings.getSingleton()`; admin actions `settingsPage`, `updateSettings`; routes `GET /admin/settings`, `POST /admin/settings`. Fields: `shopName, easypaisaNumber, easypaisaName, jazzcashNumber, jazzcashName`.
- Consumed later by: Task 5 (checkout instructions) and Task 6 (checkout UI).

- [ ] **Step 1: Create `src/models/Settings.js`**

```js
import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  shopName: { type: String, default: "Publishing Company" },
  easypaisaNumber: { type: String, default: "" },
  easypaisaName: { type: String, default: "" },
  jazzcashNumber: { type: String, default: "" },
  jazzcashName: { type: String, default: "" },
});

settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

export const Settings = mongoose.model("Settings", settingsSchema);
```

- [ ] **Step 2: Add settings actions to `src/controllers/adminController.js`** (add `import { Settings } from "../models/Settings.js";`):

```js
/* ==================== SETTINGS ==================== */

export const settingsPage = async (req, res, next) => {
  try {
    const settings = await Settings.getSingleton();
    res.render("admin/settings", { title: "Payment Settings", settings, saved: req.query.saved === "1" });
  } catch (err) { next(err); }
};

export const updateSettings = async (req, res, next) => {
  try {
    const doc = await Settings.getSingleton();
    const fields = ["shopName", "easypaisaNumber", "easypaisaName", "jazzcashNumber", "jazzcashName"];
    fields.forEach((f) => { doc[f] = (req.body[f] || "").trim(); });
    await doc.save();
    res.redirect("/admin/settings?saved=1");
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Add routes** to `src/routes/admin.js`:

```js
// Settings
router.get("/settings", admin.settingsPage);
router.post("/settings", admin.updateSettings);
```

- [ ] **Step 4: Create `views/admin/settings.ejs`** — admin shell (`active: 'settings'`), a form posting to `/admin/settings` with the five fields:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> - Publishing Company</title>
  <link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/admin.css">
</head>
<body>
  <div id="admin-shell">
    <%- include('../partials/admin-sidebar', { active: 'settings' }) %>
    <main id="admin-main">
      <div id="admin-topbar"><h1>Payment Settings</h1><div class="admin-user">Signed in as <strong><%= user.name %></strong></div></div>
      <div class="admin-panel" style="max-width: 560px;">
        <% if (saved) { %><div class="admin-success">Settings saved.</div><% } %>
        <form class="admin-form" method="POST" action="/admin/settings">
          <label for="shopName">Shop name</label>
          <input type="text" id="shopName" name="shopName" value="<%= settings.shopName || '' %>">
          <h3>EasyPaisa</h3>
          <label for="easypaisaNumber">EasyPaisa number</label>
          <input type="text" id="easypaisaNumber" name="easypaisaNumber" value="<%= settings.easypaisaNumber || '' %>" placeholder="03XX-XXXXXXX">
          <label for="easypaisaName">EasyPaisa account name</label>
          <input type="text" id="easypaisaName" name="easypaisaName" value="<%= settings.easypaisaName || '' %>">
          <h3>JazzCash</h3>
          <label for="jazzcashNumber">JazzCash number</label>
          <input type="text" id="jazzcashNumber" name="jazzcashNumber" value="<%= settings.jazzcashNumber || '' %>" placeholder="03XX-XXXXXXX">
          <label for="jazzcashName">JazzCash account name</label>
          <input type="text" id="jazzcashName" name="jazzcashName" value="<%= settings.jazzcashName || '' %>">
          <div class="admin-form-actions">
            <button type="submit" class="btn-sm btn-add" style="padding:10px 24px;">Save Settings</button>
          </div>
        </form>
      </div>
    </main>
  </div>
</body>
</html>
```

- [ ] **Step 5: Add the sidebar link** in `views/partials/admin-sidebar.ejs`, after Orders:

```html
<a href="/admin/settings" class="<%= active === 'settings' ? 'active' : '' %>">Settings</a>
```

- [ ] **Step 6: Verify.**
  - `node --check src/models/Settings.js && node --check src/controllers/adminController.js`
  - `npm run dev` boots clean.
  - Manual: `/admin/settings` → set EasyPaisa/JazzCash numbers + names → Save → "Settings saved." and values persist on reload.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(admin): payment/shop settings singleton + admin page"
```

---

### Task 5: Order payment methods (model + createOrder branch + manual confirmation)

**Files:**
- Modify: `src/models/Order.js` (payment.provider enum + payment.proof), `src/controllers/orderController.js` (createOrder branch)

**Interfaces:**
- Consumes: `Settings` (Task 4).
- Produces: `POST /api/orders` accepts `paymentMethod` in `["safepay","easypaisa","jazzcash","cash"]` (default `"safepay"`) and, for manual methods, an optional `reference` string. Response for manual/cash orders is `{ manual: true, order: { orderId }, method, payTo }` (no `checkoutUrl`); SafePay response is unchanged (`{ checkoutUrl, order }`).

- [ ] **Step 1: Extend the Order payment schema** in `src/models/Order.js`. Change the `provider` enum and add `proof`:

```js
    payment: {
      provider: { type: String, enum: ["safepay", "easypaisa", "jazzcash", "cash"], default: "safepay" },
      status: { type: String, enum: ["pending", "paid", "failed", "cancelled"], default: "pending", index: true },
      token: { type: String },
      tracker: { type: String },
      reference: { type: String },
      proof: { type: String, default: "" },
      paidAt: { type: Date },
    },
```

- [ ] **Step 2: Branch `createOrder` on `paymentMethod`** in `src/controllers/orderController.js`. Add `import { Settings } from "../models/Settings.js";` at the top. After `totalAmount` is finalized and BEFORE the SafePay block, read the method and short-circuit manual/cash:

```js
    const METHODS = ["safepay", "easypaisa", "jazzcash", "cash"];
    const paymentMethod = METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : "safepay";

    if (paymentMethod !== "safepay") {
      const order = await Order.create({
        user: req.user._id,
        items: orderItems,
        totalAmount,
        shipping: { name: shipping.name, email: shipping.email, address: shipping.address },
        payment: {
          provider: paymentMethod,
          status: "pending",
          reference: (req.body.reference || "").trim(),
        },
        status: paymentMethod === "cash" ? "processing" : "pending",
      });

      Book.bulkWrite(
        orderItems.map((i) => ({ updateOne: { filter: { _id: i.book }, update: { $inc: { popularity: i.quantity } } } }))
      ).catch((e) => console.error("popularity update failed:", e.message));

      let payTo = null;
      if (paymentMethod === "easypaisa" || paymentMethod === "jazzcash") {
        const s = await Settings.getSingleton();
        payTo = paymentMethod === "easypaisa"
          ? { number: s.easypaisaNumber, name: s.easypaisaName }
          : { number: s.jazzcashNumber, name: s.jazzcashName };
      }

      return res.status(201).json({
        manual: true,
        method: paymentMethod,
        order: { id: order._id, orderId: order.orderId },
        payTo,
        totalAmount,
      });
    }
```
Leave the existing SafePay code path (order create + token + checkoutUrl) below, unchanged, for the default `safepay` method. (The SafePay branch already sets `payment.provider: "safepay"`.)

- [ ] **Step 3: Verify.**
  - `node --check src/models/Order.js && node --check src/controllers/orderController.js`
  - `npm run dev` boots clean.
  - Manual (using the browser devtools console or curl with a logged-in session cookie, since the UI selector lands in Task 6): `POST /api/orders` with a valid cart + `paymentMethod: "easypaisa"` returns `{ manual: true, method: "easypaisa", payTo: {...}, order: { orderId } }` and creates a `pending` easypaisa order (visible at `/admin/orders`); `paymentMethod: "cash"` creates a `processing` cash order; omitting `paymentMethod` still returns a SafePay `checkoutUrl`. Server never trusts a client price (total matches DB prices).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(checkout): manual easypaisa/jazzcash/cash payment methods in createOrder"
```

---

### Task 6: Checkout UI — payment method selector + manual confirmation

**Files:**
- Modify: `views/checkout.ejs`, `public/js/checkout.js`, `src/controllers/pageController.js` (checkoutPage passes settings)

**Interfaces:**
- Consumes: `Settings` (Task 4), the `POST /api/orders` manual response shape (Task 5).
- Produces: a coherent checkout page whose form sends `paymentMethod` (+ `reference` for manual) and shows an in-page confirmation for manual/cash orders or redirects to SafePay for card.

Note: the current `public/js/checkout.js` references DOM ids that don't exist in `checkout.ejs` (`checkout-card-number`, `checkout-confirmation`) — it is inconsistent from a prior merge. This task makes the view and script coherent.

- [ ] **Step 1: Pass settings to the checkout page.** In `src/controllers/pageController.js`, find `checkoutPage` and have it load Settings and pass them to the render. Add `import { Settings } from "../models/Settings.js";` at the top and, in `checkoutPage`, include `payment` in the render locals, e.g.:

```js
export const checkoutPage = async (req, res, next) => {
  try {
    const settings = await Settings.getSingleton();
    const payment = {
      easypaisa: { number: settings.easypaisaNumber, name: settings.easypaisaName },
      jazzcash: { number: settings.jazzcashNumber, name: settings.jazzcashName },
    };
    // preserve whatever this function already passes (e.g. books for the footer);
    // add `payment` to that same render locals object.
    res.render("checkout", { title: "Checkout", payment, books: res.locals.books || [] });
  } catch (err) { next(err); }
};
```
IMPORTANT: read the existing `checkoutPage` first and keep any locals it already passes (such as `books` for `partials/footer`); only ADD `payment`. If `books` is sourced differently, keep that source.

- [ ] **Step 2: Rewrite `views/checkout.ejs`'s form area** to add a payment-method selector, a manual-payment info box, a transaction-reference input, and a hidden confirmation panel. Replace the `<form id="checkout-form"> ... </form>` block with:

```html
<form id="checkout-form">
  <h2>Shipping Details</h2>
  <input type="text" id="checkout-name" placeholder="Full Name" value="<%= user ? user.name : '' %>" required>
  <input type="email" id="checkout-email" placeholder="Email Address" value="<%= user ? user.email : '' %>" required>
  <input type="text" id="checkout-address" placeholder="Shipping Address" required>

  <h2>Payment Method</h2>
  <label class="pay-opt"><input type="radio" name="paymentMethod" value="safepay" checked> Card (SafePay)</label>
  <label class="pay-opt"><input type="radio" name="paymentMethod" value="easypaisa"> EasyPaisa</label>
  <label class="pay-opt"><input type="radio" name="paymentMethod" value="jazzcash"> JazzCash</label>
  <label class="pay-opt"><input type="radio" name="paymentMethod" value="cash"> Cash on Delivery</label>

  <div id="pay-easypaisa" class="pay-info" hidden>
    Send <strong id="pay-total-ep"></strong> to EasyPaisa
    <strong><%= payment.easypaisa.number || 'N/A' %></strong>
    <% if (payment.easypaisa.name) { %>(<%= payment.easypaisa.name %>)<% } %>,
    then enter your transaction ID below.
  </div>
  <div id="pay-jazzcash" class="pay-info" hidden>
    Send <strong id="pay-total-jc"></strong> to JazzCash
    <strong><%= payment.jazzcash.number || 'N/A' %></strong>
    <% if (payment.jazzcash.name) { %>(<%= payment.jazzcash.name %>)<% } %>,
    then enter your transaction ID below.
  </div>
  <input type="text" id="checkout-reference" placeholder="Transaction ID (EasyPaisa/JazzCash)" hidden>

  <p id="checkout-error" class="error"></p>
  <button type="submit" class="button" id="checkout-place-order">Place Order</button>
</form>

<div id="checkout-confirmation" hidden>
  <h2>Order placed!</h2>
  <p id="checkout-confirmation-msg"></p>
  <a href="/my-orders" class="button">View my orders</a>
</div>
```

- [ ] **Step 3: Rewrite `public/js/checkout.js`** into a single coherent file: keep `renderCheckoutSummary`, toggle the manual info boxes when the payment method changes, and on submit send `paymentMethod` (+ `reference`) and handle both response shapes. Full file:

```js
/* Book Search & Cart — checkout logic (creates a DB order) */
function renderCheckoutSummary() {
  const itemsContainer = document.getElementById("checkout-summary-items");
  const totalContainer = document.getElementById("checkout-summary-total");
  const placeOrderBtn = document.getElementById("checkout-place-order");
  if (!itemsContainer) return;
  const cart = getCart();
  if (cart.length === 0) {
    itemsContainer.innerHTML = '<p id="checkout-empty-message">Your cart is empty. <a href="/">Browse books</a> to add something first.</p>';
    totalContainer.textContent = "";
    if (placeOrderBtn) placeOrderBtn.disabled = true;
    return;
  }
  itemsContainer.innerHTML = cart.map((item) => {
    const book = BOOKS.find((b) => b._id === item.id);
    if (!book) return "";
    return '<div class="checkout-summary-item"><span>' + book.title + " &times; " + item.quantity +
      "</span><span>$ " + (book.price * item.quantity).toFixed(2) + "</span></div>";
  }).join("");
  totalContainer.textContent = "Total: $ " + getCartTotal().toFixed(2);
  if (placeOrderBtn) placeOrderBtn.disabled = false;
}

function selectedMethod() {
  const el = document.querySelector('input[name="paymentMethod"]:checked');
  return el ? el.value : "safepay";
}

function syncPaymentUI() {
  const method = selectedMethod();
  const total = "$ " + getCartTotal().toFixed(2);
  const ep = document.getElementById("pay-easypaisa");
  const jc = document.getElementById("pay-jazzcash");
  const ref = document.getElementById("checkout-reference");
  const epTotal = document.getElementById("pay-total-ep");
  const jcTotal = document.getElementById("pay-total-jc");
  if (epTotal) epTotal.textContent = total;
  if (jcTotal) jcTotal.textContent = total;
  if (ep) ep.hidden = method !== "easypaisa";
  if (jc) jc.hidden = method !== "jazzcash";
  if (ref) ref.hidden = !(method === "easypaisa" || method === "jazzcash");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("checkout-form");
  if (!form) return;
  renderCheckoutSummary();
  syncPaymentUI();
  form.querySelectorAll('input[name="paymentMethod"]').forEach((r) => r.addEventListener("change", syncPaymentUI));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("checkout-error");
    const placeOrderBtn = document.getElementById("checkout-place-order");
    const cart = getCart();
    if (cart.length === 0) { errorEl.textContent = "Your cart is empty."; return; }
    const name = document.getElementById("checkout-name").value.trim();
    const email = document.getElementById("checkout-email").value.trim();
    const address = document.getElementById("checkout-address").value.trim();
    if (!name || !email || !address) { errorEl.textContent = "Please fill in your name, email, and address."; return; }
    const method = selectedMethod();
    const reference = (document.getElementById("checkout-reference").value || "").trim();
    if ((method === "easypaisa" || method === "jazzcash") && !reference) {
      errorEl.textContent = "Please enter your EasyPaisa/JazzCash transaction ID.";
      return;
    }
    errorEl.textContent = "";

    const payload = {
      items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
      shipping: { name, email, address },
      paymentMethod: method,
      reference,
    };
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = method === "safepay" ? "Redirecting…" : "Placing order…";
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { window.location.href = "/login?next=" + encodeURIComponent("/checkout"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errorEl.textContent = data.message || "Something went wrong. Please try again.";
        placeOrderBtn.disabled = false; placeOrderBtn.textContent = "Place Order";
        return;
      }
      clearCart();
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      // manual / cash confirmation
      document.getElementById("checkout-layout").hidden = true;
      const notice = document.getElementById("checkout-demo-notice");
      if (notice) notice.hidden = true;
      const conf = document.getElementById("checkout-confirmation");
      const msg = document.getElementById("checkout-confirmation-msg");
      let text = "Your order #" + (data.order?.orderId ?? "") + " has been placed.";
      if (data.method === "cash") text += " Pay cash on delivery.";
      else if (data.payTo) text += " Please send $ " + (data.totalAmount?.toFixed?.(2) ?? "") + " to " + data.method + " " + (data.payTo.number || "") + ".";
      msg.textContent = text;
      conf.hidden = false;
    } catch (err) {
      errorEl.textContent = "Network error. Please check your connection and try again.";
      placeOrderBtn.disabled = false; placeOrderBtn.textContent = "Place Order";
    }
  });
});
```

- [ ] **Step 4: Update the demo notice copy** in `views/checkout.ejs` (`#checkout-demo-notice`) so it no longer implies card-only. Replace its text with: `Choose how you'd like to pay. Card payments are handled securely by SafePay; EasyPaisa/JazzCash and Cash on Delivery are also available.`

- [ ] **Step 5: Verify.**
  - `node --check public/js/checkout.js` (syntax) and `node --check src/controllers/pageController.js`.
  - `npm run dev` boots clean.
  - Manual (log in as a normal customer, add a book to cart, go to `/checkout`): default Card → "Place Order" redirects to SafePay. Select EasyPaisa → the info box shows the number from Settings and a transaction-ID field appears (required); submit → in-page confirmation with the order number; the order shows in `/admin/orders` as an `easypaisa` `pending` order with the reference. JazzCash behaves the same. Cash on Delivery → confirmation, order is `processing`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(checkout): payment-method selector UI + coherent checkout script"
```

---

### Task 7: Admin order detail — payment proof + Mark as Paid

**Files:**
- Modify: `views/admin/order-detail.ejs`, `src/controllers/paymentController.js` (markOrderPaid), `src/routes/admin.js`

**Interfaces:**
- Consumes: `Order.payment.provider/status/reference/proof`.
- Produces: `POST /admin/orders/:id/payment` → `paymentController.markOrderPaid` sets `payment.status = "paid"`, `payment.paidAt = now` for non-SafePay orders, then redirects back to the order.

- [ ] **Step 1: Add `markOrderPaid` to `src/controllers/paymentController.js`** (import `Order` if not already imported there):

```js
export const markOrderPaid = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).render("error", { title: "Not found", message: "Order not found." });
    if (order.payment.provider !== "safepay") {
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
      if (order.status === "pending") order.status = "processing";
      await order.save();
    }
    res.redirect("/admin/orders/" + order._id);
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Add the route** to `src/routes/admin.js` (in the Orders block). Also import `markOrderPaid`:

```js
import { markOrderPaid } from "../controllers/paymentController.js";
// ...
router.post("/orders/:id/payment", markOrderPaid);
```

- [ ] **Step 3: Show payment details + Mark-as-Paid in `views/admin/order-detail.ejs`.** The Payment line already shows provider/status/reference. Add, inside the "Customer & Shipping" panel after the Payment `<p>`, a proof image (if any) and a mark-paid form for manual unpaid orders:

```html
<% if (order.payment && order.payment.proof) { %>
  <p><strong>Proof:</strong> <img class="thumb" src="/<%= order.payment.proof %>" alt="payment proof"></p>
<% } %>
<% if (order.payment && order.payment.provider !== 'safepay' && order.payment.status !== 'paid') { %>
  <form method="POST" action="/admin/orders/<%= order._id %>/payment" style="margin-top:8px;">
    <button type="submit" class="btn-sm btn-add">Mark as Paid</button>
  </form>
<% } %>
```

- [ ] **Step 4: Verify.**
  - `node --check src/controllers/paymentController.js`
  - `npm run dev` boots clean.
  - Manual: open a manual (easypaisa) order at `/admin/orders/:id` → it shows provider `easypaisa`, status `pending`, the reference, and a "Mark as Paid" button. Click it → status becomes `paid`, order status `processing`, button disappears. A SafePay order shows no Mark-as-Paid button.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(admin): show manual payment proof + Mark as Paid on order detail"
```

---

### Task 8: Sales report page

**Files:**
- Create: `views/admin/reports.ejs`
- Modify: `src/controllers/adminController.js` (reports), `src/routes/admin.js`, `views/partials/admin-sidebar.ejs`

**Interfaces:**
- Produces: `GET /admin/reports` → `adminController.reports` renders `views/admin/reports.ejs` with `{ totalRevenue, totalOrders, byStatus, bestSellers, from, to }`. Excludes cancelled orders from revenue/orders/best-sellers; optional `from`/`to` `createdAt` range.

- [ ] **Step 1: Add `reports` to `src/controllers/adminController.js`:**

```js
/* ==================== REPORTS ==================== */

export const reports = async (req, res, next) => {
  try {
    const from = (req.query.from || "").trim();
    const to = (req.query.to || "").trim();
    const match = { status: { $ne: "cancelled" } };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }
    const orders = await Order.find(match).lean();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);

    const byStatusAgg = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const byStatus = byStatusAgg.reduce((m, r) => { m[r._id] = r.count; return m; }, {});

    const bestSellers = await Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      { $group: { _id: "$items.title", qty: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } } },
      { $sort: { qty: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, title: "$_id", qty: 1, revenue: 1 } },
    ]);

    res.render("admin/reports", { title: "Sales Report", totalRevenue, totalOrders, byStatus, bestSellers, from, to });
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Add the route** to `src/routes/admin.js`:

```js
// Reports
router.get("/reports", admin.reports);
```

- [ ] **Step 3: Create `views/admin/reports.ejs`** — admin shell (`active: 'reports'`), a from/to GET filter, summary stat cards, a by-status list, and a best-sellers table:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> - Publishing Company</title>
  <link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/admin.css">
</head>
<body>
  <div id="admin-shell">
    <%- include('../partials/admin-sidebar', { active: 'reports' }) %>
    <main id="admin-main">
      <div id="admin-topbar"><h1>Sales Report</h1><div class="admin-user">Signed in as <strong><%= user.name %></strong></div></div>
      <div class="admin-panel">
        <form class="admin-toolbar" action="/admin/reports" method="GET">
          <label>From <input type="date" name="from" value="<%= from %>"></label>
          <label>To <input type="date" name="to" value="<%= to %>"></label>
          <button type="submit" class="btn-sm btn-edit">Apply</button>
          <a href="/admin/reports" class="btn-sm btn-add">Reset</a>
        </form>
      </div>
      <div class="admin-stats">
        <div class="admin-stat-card"><div class="stat-label">Revenue (excl. cancelled)</div><div class="stat-value orange">$ <%= totalRevenue.toFixed(2) %></div></div>
        <div class="admin-stat-card"><div class="stat-label">Orders</div><div class="stat-value"><%= totalOrders %></div></div>
      </div>
      <div class="admin-panel">
        <h2>Orders by Status</h2>
        <table class="data-table">
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            <% ['pending','processing','shipped','delivered','cancelled'].forEach(function(s){ %>
              <tr><td><span class="status-badge status-<%= s %>"><%= s %></span></td><td><%= byStatus[s] || 0 %></td></tr>
            <% }); %>
          </tbody>
        </table>
      </div>
      <div class="admin-panel">
        <h2>Best Sellers</h2>
        <% if (!bestSellers || bestSellers.length === 0) { %>
          <p class="admin-empty">No sales yet.</p>
        <% } else { %>
          <table class="data-table">
            <thead><tr><th>Title</th><th>Copies Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              <% bestSellers.forEach(function(b){ %>
                <tr><td><%= b.title %></td><td><%= b.qty %></td><td>$ <%= b.revenue.toFixed(2) %></td></tr>
              <% }); %>
            </tbody>
          </table>
        <% } %>
      </div>
    </main>
  </div>
</body>
</html>
```

- [ ] **Step 4: Add the sidebar link** in `views/partials/admin-sidebar.ejs`, after Orders (before/near Settings):

```html
<a href="/admin/reports" class="<%= active === 'reports' ? 'active' : '' %>">Reports</a>
```

- [ ] **Step 5: Verify.**
  - `node --check src/controllers/adminController.js`
  - `npm run dev` boots clean.
  - Manual: `/admin/reports` shows revenue (matching non-cancelled order totals), order count, by-status counts, and best-sellers (titles + qty + revenue). Set a from/to range → figures update; Reset clears it.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(admin): sales report page (revenue, status breakdown, best sellers)"
```

---

### Task 9: Dashboard polish — quick actions + low-stock

**Files:**
- Modify: `src/controllers/adminController.js` (dashboard), `views/admin/dashboard.ejs`, `views/admin/books.ejs`

**Interfaces:**
- Consumes: existing models.
- Produces: `dashboard` also passes `lowStockCount` (books with `stock <= 5`); the dashboard view shows quick-action buttons + a low-stock stat card; the books list highlights low-stock rows.

- [ ] **Step 1: Add low-stock count to `dashboard`** in `src/controllers/adminController.js`. Extend the `Promise.all` and the render locals:

```js
    const [bookCount, userCount, orderCount, orders, lowStockCount] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments(),
      Order.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email").lean(),
      Book.countDocuments({ stock: { $lte: 5 } }),
    ]);
```
and add `lowStockCount` to the `res.render("admin/dashboard", { ... })` locals.

- [ ] **Step 2: Add quick actions + low-stock card to `views/admin/dashboard.ejs`.** Right after the `#admin-topbar` div, add a quick-actions bar:

```html
<div class="admin-quick-actions">
  <a class="btn-sm btn-add" href="/admin/books/new">+ Add Book</a>
  <a class="btn-sm btn-edit" href="/admin/genres">Manage Genres</a>
  <a class="btn-sm btn-edit" href="/admin/reports">Sales Report</a>
  <a class="btn-sm btn-edit" href="/admin/settings">Payment Settings</a>
</div>
```
And add a fifth stat card inside `.admin-stats`:
```html
<div class="admin-stat-card">
  <div class="stat-label">Low-stock Books (≤ 5)</div>
  <div class="stat-value <%= lowStockCount > 0 ? 'orange' : '' %>"><%= lowStockCount %></div>
</div>
```

- [ ] **Step 3: Highlight low-stock rows in `views/admin/books.ejs`.** Change the row `<tr>` in the books loop to add a class when stock is low, and mark the stock cell:

```html
<tr class="<%= book.stock <= 5 ? 'row-low-stock' : '' %>">
```
and change the stock cell to:
```html
<td><%= book.stock %><% if (book.stock <= 5) { %> <span class="low-stock-tag">Low</span><% } %></td>
```

- [ ] **Step 4: Add supporting CSS to `public/admin.css`** (append at the end): styles for `.admin-quick-actions` (flex, gap, margin), `.row-low-stock` (subtle warning background), `.low-stock-tag` (small red pill), `.pay-opt`/`.pay-info` (checkout is storefront `style.css`, so put `.pay-opt`/`.pay-info` in `public/style.css` instead), `.admin-success`/`.admin-hint`/`.admin-current-cover` (used by earlier tasks). Example:

```css
/* admin.css */
.admin-quick-actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 18px; }
.row-low-stock { background: #fff7ed; }
.low-stock-tag { display:inline-block; background:#dc2626; color:#fff; font-size:11px; padding:1px 6px; border-radius:9px; margin-left:4px; }
.admin-success { background:#dcfce7; color:#166534; padding:10px 14px; border-radius:6px; margin-bottom:14px; }
.admin-hint { display:block; color:#777; font-size:12px; margin:2px 0 10px; }
.admin-current-cover { margin:6px 0; }
```
And append to `public/style.css`:
```css
.pay-opt { display:block; margin:6px 0; cursor:pointer; }
.pay-info { background:#f1f5f9; border-radius:6px; padding:10px 12px; margin:8px 0; font-size:14px; }
```

- [ ] **Step 5: Verify.**
  - `node --check src/controllers/adminController.js`
  - `npm run dev` boots clean.
  - Manual: `/admin` shows the quick-action buttons (each navigates correctly), the Low-stock card (count of books with stock ≤ 5). `/admin/books` highlights low-stock rows with a "Low" tag. Add a book with stock 2 → it appears highlighted and the dashboard count increments.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(admin): dashboard quick actions, low-stock card + row highlight"
```

---

## Self-Review Notes

- **Spec coverage:** (1) Book cover upload → Task 1. (2) Genre management + filter → Tasks 2–3. (3) EasyPaisa/JazzCash/COD → Settings (Task 4) + order model/branch (Task 5) + checkout UI (Task 6) + admin proof/mark-paid (Task 7). (4) Sales report + dashboard polish → Tasks 8–9. All four spec goals mapped.
- **No test framework:** verification is `node --check` + boot smoke + manual browser steps per task, consistent with the project (which has no tests) and the spec's stated approach.
- **Type/interface consistency:** `paymentMethod` values `["safepay","easypaisa","jazzcash","cash"]` are identical in `Order.js` enum (T5), `createOrder` (T5), checkout JS (T6). Manual response shape `{ manual, method, order:{orderId}, payTo, totalAmount }` produced in T5 is consumed verbatim in T6. `Settings.getSingleton()` defined T4, used in T5 and T6. `genreOptions()` defined T3, used by the book forms and list. `Order.payment.reference` (existing) carries the transaction id; `Order.payment.proof` (new, T5) is displayed in T7.
- **Backward compatibility:** SafePay path unchanged (default method); `Book.genre` stays a string; existing book covers (`images/...`) still render since new uploads use the same relative-path convention (`uploads/...`).
- **Known pre-existing issue fixed in passing:** `public/js/checkout.js` referenced non-existent DOM ids (`checkout-card-number`, `checkout-confirmation`); Task 6 replaces it with a coherent view + script.
