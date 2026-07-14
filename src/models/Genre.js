import mongoose from "mongoose";

const genreSchema = new mongoose.Schema(
  { name: { type: String, required: [true, "Name is required"], unique: true, trim: true } },
  { timestamps: true }
);

export const Genre = mongoose.model("Genre", genreSchema);
