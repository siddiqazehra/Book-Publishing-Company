// Grid of every book in the catalog, arranged into 3 rows via CSS grid
// (grid-auto-flow: column) with left/right arrows to scroll horizontally.
function renderReleaseGrid(sortBy) {
    const grid = document.getElementById("release-grid");
    if (!grid) return;

    let results = BOOKS.slice();

    switch (sortBy) {
        case "title":
            results.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case "price-asc":
            results.sort((a, b) => a.price - b.price);
            break;
        case "price-desc":
            results.sort((a, b) => b.price - a.price);
            break;
        case "popularity":
            results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            break;
        default: // "newest"
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (results.length === 0) {
        grid.innerHTML = '<p id="release-empty">No books yet — check back soon.</p>';
        return;
    }

    grid.innerHTML = results.map(book =>
        '<a class="book release-book" href="/book-details?id=' + book._id + '">' +
        '<div class="book-card"><img src="/' + book.image + '" alt="' + book.title + '"></div>' +
        '<div class="book-content">' +
        '<p class="orange-text">$ ' + book.price.toFixed(2) + '</p>' +
        '<h3>' + book.title + '</h3>' +
        '<p>By ' + book.author + '</p>' +
        '</div>' +
        '</a>'
    ).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("release-grid");
    if (!grid) return;

    const sortSelect = document.getElementById("release-sort-select");
    const prevBtn = document.getElementById("release-prev");
    const nextBtn = document.getElementById("release-next");

    renderReleaseGrid(sortSelect ? sortSelect.value : "newest");

    if (sortSelect) {
        sortSelect.addEventListener("change", () => renderReleaseGrid(sortSelect.value));
    }

    // one "page" of horizontal scroll ~= the grid's own visible width
    const scrollByPage = (direction) => {
        grid.scrollBy({ left: direction * grid.clientWidth * 0.9, behavior: "smooth" });
    };
    if (prevBtn) prevBtn.addEventListener("click", () => scrollByPage(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => scrollByPage(1));
});
