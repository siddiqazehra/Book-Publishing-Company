const books = require("./books");

console.log("Enter an author:");

process.stdin.on("data", function (data) {
  const author = data.toString().trim();

  let found = false;

  books.forEach(book => {
    if (book.author.toLowerCase() === author.toLowerCase()) {
      console.log(book.title + " - " + book.genre);
      found = true;
    }
  });

  if (!found) {
    console.log("No books found.");
  }

  process.exit();
});