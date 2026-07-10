import { Book } from "../models/Book.js";
import { Order } from "../models/Order.js";

// POST /api/orders  — creates an order from the cart the browser sends us.
// Prices are always re-read from the database here — never trust the
// price the client sends, only the book id + quantity.
export const createOrder = async (req, res, next) => {
  try {
    const { items, shipping, cardNumber } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty." });
    }
    if (!shipping || !shipping.name || !shipping.email || !shipping.address) {
      return res.status(400).json({ message: "Shipping name, email, and address are required." });
    }

    const bookIds = items.map((i) => i.id);
    const books = await Book.find({ _id: { $in: bookIds } }).lean();
    const bookMap = new Map(books.map((b) => [String(b._id), b]));

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const book = bookMap.get(String(item.id));
      const quantity = Math.max(1, Number(item.quantity) || 1);
      if (!book) continue; // book removed/deleted since it was added to cart
      orderItems.push({
        book: book._id,
        title: book.title,
        image: book.image,
        price: book.price,
        quantity,
      });
      totalAmount += book.price * quantity;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ message: "None of the items in your cart are available anymore." });
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      shipping: {
        name: shipping.name,
        email: shipping.email,
        address: shipping.address,
      },
      payment: {
        cardLast4: typeof cardNumber === "string" ? cardNumber.replace(/\s+/g, "").slice(-4) : undefined,
        method: "card",
      },
      status: "pending",
    });

    // bump popularity counters (best-effort, don't block the response on it)
    Book.bulkWrite(
      orderItems.map((i) => ({
        updateOne: { filter: { _id: i.book }, update: { $inc: { popularity: i.quantity } } },
      }))
    ).catch((e) => console.error("popularity update failed:", e.message));

    res.status(201).json({ message: "Order placed.", order: { id: order._id, orderId: order.orderId } });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/mine
export const myOrdersApi = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};
