import mongoose from "mongoose";

// Client testimonials shown on the home page — managed from the admin panel.
const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "Reader" },
    message: { type: String, required: true, trim: true },
    image: { type: String, trim: true, default: "" }, // optional avatar path
  },
  { timestamps: true }
);

export const Testimonial = mongoose.model("Testimonial", testimonialSchema);
