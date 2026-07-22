document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("book-details-parent");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const bookId = params.get("id");
    const book = BOOKS.find(b => b._id === bookId);

    if (!book) {
        container.innerHTML =
            '<div id="book-not-found">' +
            "<h2>Book not found</h2>" +
            "<p>We couldn't find the book you were looking for.</p>" +
            '<a class="button" id="blue-button" href="/">Back to Home</a>' +
            "</div>";
        return;
    }

    document.title = book.title + " - Publishing Company";

    container.innerHTML =
        '<div id="book-details-image"><img src="/' + book.image + '" alt="' + book.title + '"></div>' +
        '<div id="book-details-info">' +
        '<p class="orange-text">Rs. ' + book.price.toFixed(2) + "</p>" +
        "<h1>" + book.title + "</h1>" +
        "<p id=\"book-details-author\">By " + book.author + "</p>" +
        '<p id="book-details-popularity">' + book.popularity.toLocaleString() + " readers have bought this book</p>" +
        '<p id="book-details-description">' + book.description + "</p>" +
        '<div id="book-details-qty">' +
        '<label for="book-quantity">Quantity</label>' +
        '<div class="qty-stepper">' +
        '<button type="button" id="qty-decrease" aria-label="Decrease quantity">&minus;</button>' +
        '<input type="number" id="book-quantity" value="1" min="1">' +
        '<button type="button" id="qty-increase" aria-label="Increase quantity">+</button>' +
        '</div>' +
        "</div>" +
        '<button class="button" id="add-to-cart-button">Add to Cart</button>' +
        "</div>";

    const qtyInput = document.getElementById("book-quantity");
    document.getElementById("qty-decrease").addEventListener("click", () => {
        qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    });
    document.getElementById("qty-increase").addEventListener("click", () => {
        qtyInput.value = Number(qtyInput.value) + 1;
    });
    document.getElementById("add-to-cart-button").addEventListener("click", () => {
        const quantity = Math.max(1, Number(qtyInput.value) || 1);
        addToCart(book._id, quantity);
    });
});
