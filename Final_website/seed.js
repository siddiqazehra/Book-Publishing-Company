// Run once to load your books into MongoDB: node seed.js
const mongoose = require("mongoose");
const Book = require("./models/book.js");
const BOOKS = require("./js/books-data.js");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected. Seeding books...");

    await Book.deleteMany({});
    await Book.insertMany(BOOKS);

    console.log("Done — " + BOOKS.length + " books inserted.");
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
});