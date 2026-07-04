# Book Store — Login & Register (MongoDB Atlas)

A working login/register system for your Publishing Company site: Express API +
Mongoose talking to MongoDB Atlas, bcrypt-hashed passwords, JWT sessions, and
your existing HTML/CSS pages wired up to it.

## 1. Add your images

Your `index.html` references an `images/` folder (logos, book covers, etc.)
that wasn't part of what you pasted in. Copy your real `images/` folder into
`public/images/` so those references resolve. `login.html` and `register.html`
only use `images/footer-icon-*.png` for the footer.

## 2. Set up MongoDB Atlas

1. In Atlas, create a free cluster if you don't have one.
2. Database Access → add a database user (username + password).
3. Network Access → add your IP (or `0.0.0.0/0` while developing).
4. Database → Connect → Drivers → copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Add a database name to the path, e.g. `.../bookstore?retryWrites=true...`

## 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:
- `MONGODB_URI` — your Atlas connection string from step 2
- `JWT_SECRET` — any long random string (e.g. run `openssl rand -hex 32`)

## 4. Install and run

```bash
npm install
npm start
```

Visit `http://localhost:3000` — that's your home page, served straight out of
`public/`. `http://localhost:3000/login.html` and `/register.html` are live.

## How it works

- **`POST /api/auth/register`** — takes `{ name, email, password }`, hashes
  the password with bcrypt, creates the user in MongoDB, returns a JWT.
- **`POST /api/auth/login`** — takes `{ email, password }`, verifies the hash,
  returns a JWT.
- The frontend (`public/js/auth.js`) posts to those routes, stores the token
  and user in `localStorage`, and redirects to `index.html`.
- The header (`#login-register`) checks `localStorage` on every page load —
  if a token is present it swaps the Login/Register buttons for "Hi, name"
  and a Log out button.

## What I changed in your existing files

- `index.html`: `#header-socialmediaicons` → `#login-register`, social icons
  removed, replaced with Login/Register buttons (reusing your existing
  `.button`, `#white-button`, `#blue-button` classes so the buttons look
  exactly like the ones already on your hero section).
- `style.css`: removed `#header-socialmediaicons` and `.icon-divs` rules,
  added a small `#login-register` rule (just flex + centering — no new
  colors or fonts), and appended an `#auth-section` block at the end for the
  login/register form pages. Every other rule is untouched.

## Security notes worth knowing

- Passwords are never stored in plain text — bcrypt with a salt.
- The password field has `select: false` in the schema, so normal queries
  never pull it back by accident.
- Tokens live in `localStorage`, which is simple and fine for getting this
  running, but it's readable by any JS on the page (XSS risk). If you later
  add richer features, consider moving to an httpOnly cookie instead.
- This currently has no "forgot password" flow or protected routes — happy
  to add a JWT-checking middleware and a `/api/auth/me` endpoint next if you
  want pages that require login (like a checkout or account page).
