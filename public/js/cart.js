/* BEGIN: Book Search & Cart Feature - cart state, drawer UI, header badge */
const CART_STORAGE_KEY = "publishingCompanyCart";

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
    renderCartDrawer();
}

function addToCart(bookId, quantity) {
    quantity = quantity || 1;
    const cart = getCart();
    const existing = cart.find(item => item.id === bookId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ id: bookId, quantity: quantity });
    }
    saveCart(cart);
    openCartDrawer();
}

function removeFromCart(bookId) {
    saveCart(getCart().filter(item => item.id !== bookId));
}

function updateCartQuantity(bookId, quantity) {
    if (quantity <= 0) {
        removeFromCart(bookId);
        return;
    }
    const cart = getCart();
    const item = cart.find(item => item.id === bookId);
    if (!item) return;
    item.quantity = quantity;
    saveCart(cart);
}

function clearCart() {
    saveCart([]);
}

function getCartTotal() {
    return getCart().reduce((total, item) => {
        const book = BOOKS.find(b => b._id === item.id);
        return book ? total + book.price * item.quantity : total;
    }, 0);
}

// CHANGED: this used to sum every stored item's quantity blindly, including
// entries whose id no longer matches a real book (e.g. left over from
// testing, or a book that was later deleted in the admin panel). That's why
// the badge could show a count that didn't match what the cart drawer
// actually displayed (the drawer already skips unmatched items, the badge
// didn't). Now both agree.
function getCartCount() {
    return getCart().reduce((count, item) => {
        const book = BOOKS.find(b => b._id === item.id);
        return book ? count + item.quantity : count;
    }, 0);
}

// NEW: self-healing cleanup — removes any cart entries that don't match a
// real book, so old/orphaned localStorage data doesn't linger forever.
// Guarded on BOOKS actually being loaded: pages like /login and /register
// don't fetch the book catalog (see authController.js), so BOOKS is `[]`
// there — pruning against an empty list would look like "every book is
// invalid" and wipe a perfectly good cart. Only prune on pages that have
// the real catalog loaded.
function pruneInvalidCartItems() {
    if (!Array.isArray(BOOKS) || BOOKS.length === 0) return;
    const validIds = new Set(BOOKS.map(b => b._id));
    const cart = getCart();
    const cleaned = cart.filter(item => validIds.has(item.id));
    if (cleaned.length !== cart.length) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cleaned));
    }
}

function updateCartBadge() {
    const badge = document.getElementById("cart-count-badge");
    if (!badge) return;
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
}

function buildCartDrawer() {
    if (document.getElementById("cart-drawer")) return;

    const overlay = document.createElement("div");
    overlay.id = "cart-drawer-overlay";
    overlay.addEventListener("click", closeCartDrawer);

    const drawer = document.createElement("div");
    drawer.id = "cart-drawer";
    drawer.innerHTML =
        '<div id="cart-drawer-header">' +
        "<h2>Your Cart</h2>" +
        '<button id="cart-drawer-close" aria-label="Close cart">&times;</button>' +
        "</div>" +
        '<div id="cart-drawer-items"></div>' +
        '<div id="cart-drawer-footer">' +
        '<div id="cart-drawer-total"></div>' +
        '<button id="cart-drawer-checkout" class="button">Checkout</button>' +
        "</div>";

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    document.getElementById("cart-drawer-close").addEventListener("click", closeCartDrawer);
    document.getElementById("cart-drawer-checkout").addEventListener("click", () => {
        if (getCartCount() > 0) window.location.href = "/checkout";
    });
}

function openCartDrawer() {
    buildCartDrawer();
    renderCartDrawer();
    document.getElementById("cart-drawer").classList.add("open");
    document.getElementById("cart-drawer-overlay").classList.add("open");
}

function closeCartDrawer() {
    const drawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("cart-drawer-overlay");
    if (drawer) drawer.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
}

function renderCartDrawer() {
    const itemsContainer = document.getElementById("cart-drawer-items");
    const totalContainer = document.getElementById("cart-drawer-total");
    const checkoutBtn = document.getElementById("cart-drawer-checkout");
    if (!itemsContainer) return;

    const cart = getCart();
    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p id="cart-empty-message">Your cart is empty.</p>';
        totalContainer.textContent = "";
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    itemsContainer.innerHTML = cart.map(item => {
        const book = BOOKS.find(b => b._id === item.id);
        if (!book) return "";
        return (
            '<div class="cart-item">' +
            '<img src="/' + book.image + '" alt="' + book.title + '">' +
            '<div class="cart-item-info">' +
            "<h4>" + book.title + "</h4>" +
            "<p>$ " + book.price.toFixed(2) + "</p>" +
            '<div class="cart-item-qty">' +
            '<button onclick="updateCartQuantity(\'' + book._id + '\', ' + (item.quantity - 1) + ')" aria-label="Decrease quantity">-</button>' +
            "<span>" + item.quantity + "</span>" +
            '<button onclick="updateCartQuantity(\'' + book._id + '\', ' + (item.quantity + 1) + ')" aria-label="Increase quantity">+</button>' +
            "</div>" +
            "</div>" +
            '<button class="cart-item-remove" onclick="removeFromCart(\'' + book._id + '\')" aria-label="Remove ' + book.title + '">&times;</button>' +
            "</div>"
        );
    }).join("");

    totalContainer.textContent = "Subtotal: $ " + getCartTotal().toFixed(2);
    if (checkoutBtn) checkoutBtn.disabled = false;
}

document.addEventListener("DOMContentLoaded", () => {
    pruneInvalidCartItems(); // CHANGED: added, cleans up orphaned cart entries before rendering
    buildCartDrawer();
    updateCartBadge();
    renderCartDrawer();

    const cartIcon = document.getElementById("cart-icon");
    if (cartIcon) cartIcon.addEventListener("click", openCartDrawer);
});
/* END: Book Search & Cart Feature - cart state, drawer UI, header badge */