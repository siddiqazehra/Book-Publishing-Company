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
    },
    genre: {
      type: String,
      trim: true,
      index: true, // frequently filtered on ("show me all Mystery books")
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    coverImage: {
      type: String, // URL or /images/... path
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Text index enables $text search across title/author, e.g. for the
// search bar already in your header.
bookSchema.index({ title: "text", author: "text" });

// Common sort/filter combo: newest books within a genre.
bookSchema.index({ genre: 1, createdAt: -1 });

export const Book = mongoose.model("Book", bookSchema);
