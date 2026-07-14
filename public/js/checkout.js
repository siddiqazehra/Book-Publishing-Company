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
