/* BEGIN: Book Search & Cart Feature - real checkout logic (creates a DB order) */
function renderCheckoutSummary() {
    const itemsContainer = document.getElementById("checkout-summary-items");
    const totalContainer = document.getElementById("checkout-summary-total");
    const placeOrderBtn = document.getElementById("checkout-place-order");
    if (!itemsContainer) return;

    const cart = getCart();

    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p id="checkout-empty-message">Your cart is empty. ' +
            '<a href="/">Browse books</a> to add something first.</p>';
        totalContainer.textContent = "";
        if (placeOrderBtn) placeOrderBtn.disabled = true;
        return;
    }

    itemsContainer.innerHTML = cart.map(item => {
        const book = BOOKS.find(b => b._id === item.id);
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

if (!res.ok || !data.checkoutUrl) {
    errorEl.textContent = data.message || "Something went wrong. Please try again.";
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Continue to Payment";
    return;
}

clearCart();
window.location.href = data.checkoutUrl;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("checkout-form");
    if (!form) return;

    renderCheckoutSummary();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById("checkout-error");
        const placeOrderBtn = document.getElementById("checkout-place-order");

        const validationError = validateCheckoutForm();
        if (validationError) {
            errorEl.textContent = validationError;
            return;
        }
        errorEl.textContent = "";

        const cart = getCart();
        if (cart.length === 0) {
            errorEl.textContent = "Your cart is empty.";
            return;
        }

        const payload = {
            items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
            shipping: {
                name: document.getElementById("checkout-name").value.trim(),
                email: document.getElementById("checkout-email").value.trim(),
                address: document.getElementById("checkout-address").value.trim(),
            },
            // Demo payment only — never store full card numbers/CVV in a real app.
            cardNumber: document.getElementById("checkout-card-number").value,
        };

        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Redirecting to Safepay...";

        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));

            if (res.status === 401) {
                window.location.href = "/login?next=" + encodeURIComponent("/checkout");
                return;
            }

            if (!res.ok) {
                errorEl.textContent = data.message || "Something went wrong. Please try again.";
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = "Place Order";
                return;
            }

            clearCart();
            document.getElementById("checkout-layout").hidden = true;
            document.getElementById("checkout-demo-notice").hidden = true;
            document.getElementById("checkout-confirmation").hidden = false;
        } catch (err) {
            errorEl.textContent = "Network error. Please check your connection and try again.";
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = "Place Order";
        }
    });
});
/* END: Book Search & Cart Feature - real checkout logic */
