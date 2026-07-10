import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 200,
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    genre: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    // Path or URL to the cover image, e.g. "images/book-1.jfif" (frontend
    // templates prefix this with "/" when rendering <img src>).
    image: {
      type: String,
      trim: true,
      default: "images/book-1.jfif",
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    // How many copies have been "bought" — drives the popularity sort in the
    // catalog overlay and the "N readers have bought this book" line.
    popularity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Text index enables $text search across title/author.
bookSchema.index({ title: "text", author: "text" });
bookSchema.index({ genre: 1, createdAt: -1 });

export const Book = mongoose.model("Book", bookSchema);
