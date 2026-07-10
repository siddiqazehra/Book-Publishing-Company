import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const orderItemSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
    title: { type: String, required: true }, // snapshot, in case the book is later edited/deleted
    image: { type: String },
    price: { type: Number, required: true }, // unit price at time of order
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: Number, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: {
      type: [orderItemSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    shipping: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true },
    },
    payment: {
      // Demo payment only — never store full card numbers/CVV in a real app.
      cardLast4: { type: String },
      method: { type: String, default: "card" },
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderId) {
    this.orderId = await getNextSequence("orderId");
  }
  next();
});

export const Order = mongoose.model("Order", orderSchema);
