/* BEGIN: Book Search & Cart Feature - simulated checkout logic */
function renderCheckoutSummary() {
    const itemsContainer = document.getElementById("checkout-summary-items");
    const totalContainer = document.getElementById("checkout-summary-total");
    const placeOrderBtn = document.getElementById("checkout-place-order");
    if (!itemsContainer) return;

    const cart = getCart();

    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p id="checkout-empty-message">Your cart is empty. ' +
            '<a href="index.html">Browse books</a> to add something first.</p>';
        totalContainer.textContent = "";
        if (placeOrderBtn) placeOrderBtn.disabled = true;
        return;
    }

    itemsContainer.innerHTML = cart.map(item => {
        const book = BOOKS.find(b => b.id === item.id);
        if (!book) return "";
        return (
            '<div class="checkout-summary-item">' +
            "<span>" + book.title + " &times; " + item.quantity + "</span>" +
            "<span>$ " + (book.price * item.quantity).toFixed(2) + "</span>" +
            "</div>"
        );
    }).join("");

    totalContainer.textContent = "Total: $ " + getCartTotal().toFixed(2);
    if (placeOrderBtn) placeOrderBtn.disabled = false;
}

function validateCheckoutForm() {
    const cardNumber = document.getElementById("checkout-card-number").value.replace(/\s+/g, "");
    const expiry = document.getElementById("checkout-card-expiry").value.trim();
    const cvv = document.getElementById("checkout-card-cvv").value.trim();

    if (!/^\d{16}$/.test(cardNumber)) {
        return "Card number must be 16 digits.";
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
        return "Expiry must be in MM/YY format.";
    }
    if (!/^\d{3,4}$/.test(cvv)) {
        return "CVV must be 3 or 4 digits.";
    }
    return null;
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("checkout-form");
    if (!form) return;

    renderCheckoutSummary();

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const errorEl = document.getElementById("checkout-error");
        const validationError = validateCheckoutForm();
        if (validationError) {
            errorEl.textContent = validationError;
            return;
        }
        errorEl.textContent = "";

        clearCart();
        document.getElementById("checkout-layout").hidden = true;
        document.getElementById("checkout-demo-notice").hidden = true;
        document.getElementById("checkout-confirmation").hidden = false;
    });
});
/* END: Book Search & Cart Feature - simulated checkout logic */
