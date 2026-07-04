const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: Number,
    img: String,
    genre: String,
    rating: Number,
    reviews: Number,
    description: String,
    pages: Number,
    language: String,
    format: String,
    isbn: String
});

module.exports = mongoose.model("Book", bookSchema);