/* BEGIN: Book Search & Cart Feature - catalog overlay (search/sort), index.html only */
function renderCatalogGrid(searchTerm, sortBy) {
    const grid = document.getElementById("catalog-grid");
    if (!grid) return;

    const term = (searchTerm || "").trim().toLowerCase();
    let results = BOOKS.filter(book =>
        !term ||
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term)
    );

    switch (sortBy) {
        case "price-asc":
            results.sort((a, b) => a.price - b.price);
            break;
        case "price-desc":
            results.sort((a, b) => b.price - a.price);
            break;
        case "popularity":
            results.sort((a, b) => b.popularity - a.popularity);
            break;
        case "author":
            results.sort((a, b) => a.author.localeCompare(b.author));
            break;
        default:
            results.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (results.length === 0) {
        grid.innerHTML = '<p id="catalog-no-results">No books found. Try a different search.</p>';
        return;
    }

    grid.innerHTML = results.map(book =>
        '<a class="catalog-card" href="/book-details?id=' + book.id + '">' +
        '<div class="catalog-card-img"><img src="/' + book.image + '" alt="' + book.title + '"></div>' +
        '<div class="catalog-card-info">' +
        "<h3>" + book.title + "</h3>" +
        "<p>" + book.author + "</p>" +
        '<p class="orange-text">$ ' + book.price.toFixed(2) + "</p>" +
        "</div>" +
        "</a>"
    ).join("");
}

function openCatalogOverlay(prefillSearch) {
    const overlay = document.getElementById("catalog-overlay");
    if (!overlay) return;
    const input = document.getElementById("catalog-search-input");
    const sortSelect = document.getElementById("catalog-sort-select");
    if (prefillSearch !== undefined) input.value = prefillSearch;
    renderCatalogGrid(input.value, sortSelect.value);
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeCatalogOverlay() {
    const overlay = document.getElementById("catalog-overlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
}

document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById("catalog-overlay");
    if (!overlay) return;

    const input = document.getElementById("catalog-search-input");
    const sortSelect = document.getElementById("catalog-sort-select");
    const closeBtn = document.getElementById("catalog-close");
    const viewAllBtn = document.getElementById("blue-button");
    const headerForm = document.getElementById("header-search-form");
    const headerInput = document.getElementById("header-search-input");
    const headerSearchBtn = document.getElementById("header-search-button");

    input.addEventListener("input", () => renderCatalogGrid(input.value, sortSelect.value));
    sortSelect.addEventListener("change", () => renderCatalogGrid(input.value, sortSelect.value));
    closeBtn.addEventListener("click", closeCatalogOverlay);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeCatalogOverlay();
    });

    if (viewAllBtn) {
        viewAllBtn.addEventListener("click", () => openCatalogOverlay(""));
    }

    if (headerForm) {
        headerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            openCatalogOverlay(headerInput.value);
        });
    }
    if (headerSearchBtn) {
        headerSearchBtn.addEventListener("click", () => openCatalogOverlay(headerInput.value));
    }

    // arrived here via a search box on another page (e.g. index.html?search=dracula)
    const params = new URLSearchParams(window.location.search);
    if (params.has("search")) {
        openCatalogOverlay(params.get("search"));
    }
});
/* END: Book Search & Cart Feature - catalog overlay (search/sort), index.html only */