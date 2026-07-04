const books = require("./books");

console.log("Enter a genre:");

process.stdin.on("data", function (data) {
  const genre = data.toString().trim();

  let found = false;

  books.forEach(book => {
    if (book.genre.toLowerCase() === genre.toLowerCase()) {
      console.log(book.title + " - " + book.author);
      found = true;
    }
  });

  if (!found) {
    console.log("No books found.");
  }

  process.exit();
});