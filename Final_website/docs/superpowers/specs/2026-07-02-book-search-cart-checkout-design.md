# Book Search, Details, Cart & Checkout — Design

Date: 2026-07-02

## Goal

Make the book catalog interactive: clickable book cards, a working search/filter/sort
over all books, a book details page with add-to-cart, a cart drawer, and a simulated
checkout flow. Site remains static HTML/CSS/JS (no backend).

## Data

`js/books-data.js` — single array of book objects, shared by every page:

```
{ id, title, author, price, popularity, image, description }
```

Contains the 3 existing homepage books plus 5 new placeholder entries (classic-lit
style, matching existing tone) for `book1.jpg`, `book3.jpg`, `book4.jpg`, `book5.jpg`,
`book6.jpg`. Placeholder data is clearly invented and swappable later.

## Components

- `js/cart.js` — cart state in `localStorage`; add/remove/update qty; renders the
  cart drawer and header badge. Included on every page.
- `js/catalog.js` — search (name/author) + sort (name, author, price, popularity)
  over `books-data.js`; renders the full-screen catalog overlay on `index.html`.
- `book-details.html` + `js/book-details.js` — template page, reads `?id=` from the
  URL, renders one book, has quantity + Add to Cart. Unknown id shows "Book not found".
- `checkout.html` + `js/checkout.js` — simulated order flow: summary from cart,
  shipping + demo card-style fields (client-side only, no network/payment call),
  "Place Order" shows confirmation and empties the cart. Empty cart disables checkout.

## Homepage changes

- Header search box becomes functional; typing + Enter opens the catalog overlay
  pre-filtered.
- "View all books" hero button opens the catalog overlay unfiltered.
- New Release book cards link to `book-details.html?id=<n>`.
- New cart icon + item-count badge in the header opens the cart drawer.

## Styling

New sections appended to the existing `style.css` (matching its existing
per-page-section comment convention), not new stylesheet files.

## Change tracking

New blocks in HTML/CSS/JS are wrapped in `BEGIN/END` marker comments so changes are
easy to spot. A file-by-file changelog, split by HTML/CSS/JS, is provided after
implementation.
