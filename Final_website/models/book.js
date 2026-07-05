const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    price: { type: Number, required: true },
    popularity: { type: Number, default: 0 },
    image: { type: String, required: true },
    description: { type: String, default: "" }
});

module.exports = mongoose.model("Book", bookSchema);