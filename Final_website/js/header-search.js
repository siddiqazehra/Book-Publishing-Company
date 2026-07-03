/* BEGIN: Book Search & Cart Feature - header search (non-homepage pages) */
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("header-search-form");
    if (!form) return;

    // On index.html, catalog.js owns the submit handler and opens the overlay directly.
    if (document.getElementById("catalog-overlay")) return;

    const goToCatalog = () => {
        const input = document.getElementById("header-search-input");
        const query = encodeURIComponent((input && input.value) || "");
        window.location.href = "index.html?search=" + query;
    };

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        goToCatalog();
    });

    const btn = document.getElementById("header-search-button");
    if (btn) btn.addEventListener("click", goToCatalog);
});
/* END: Book Search & Cart Feature - header search (non-homepage pages) */
