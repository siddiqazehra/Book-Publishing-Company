import mongoose from "mongoose";

// Stores every message sent through the Contact Us form.
const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Contact = mongoose.model("Contact", contactSchema);
