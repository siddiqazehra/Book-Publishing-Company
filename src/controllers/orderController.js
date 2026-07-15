import { Book } from "../models/Book.js";
import { Order } from "../models/Order.js";
import { Settings } from "../models/Settings.js";
import { getSafepay, SAFEPAY_CURRENCY } from "../config/safepay.js";

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

export const createOrder = async (req, res, next) => {
  try {
    const { items, shipping } = req.body;

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
      if (!book) continue;
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

    totalAmount = Math.round(totalAmount * 100) / 100;

    const METHODS = ["safepay", "easypaisa", "jazzcash", "cash"];
    const paymentMethod = METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : "safepay";

    if (paymentMethod !== "safepay") {
      const order = await Order.create({
        user: req.user._id,
        items: orderItems,
        totalAmount,
        shipping: { name: shipping.name, email: shipping.email, address: shipping.address },
        payment: {
          provider: paymentMethod,
          status: "pending",
          reference: String(req.body.reference || "").trim(),
        },
        status: paymentMethod === "cash" ? "processing" : "pending",
      });

      Book.bulkWrite(
        orderItems.map((i) => ({ updateOne: { filter: { _id: i.book }, update: { $inc: { popularity: i.quantity } } } }))
      ).catch((e) => console.error("popularity update failed:", e.message));

      let payTo = null;
      if (paymentMethod === "easypaisa" || paymentMethod === "jazzcash") {
        const s = await Settings.getSingleton();
        payTo = paymentMethod === "easypaisa"
          ? { number: s.easypaisaNumber, name: s.easypaisaName }
          : { number: s.jazzcashNumber, name: s.jazzcashName };
      }

      return res.status(201).json({
        manual: true,
        method: paymentMethod,
        order: { id: order._id, orderId: order.orderId },
        payTo,
        totalAmount,
      });
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      shipping: {
        name: shipping.name,
        email: shipping.email,
        address: shipping.address,
      },
      payment: { provider: "safepay", status: "pending" },
      status: "pending",
    });

    const amountInSubunits = Math.round(totalAmount * 100);

    let checkoutUrl;
    try {
      const safepay = getSafepay();

      const { token } = await safepay.payments.create({
        amount: amountInSubunits,
        currency: SAFEPAY_CURRENCY,
      });

      checkoutUrl = safepay.checkout.create({
        token,
        orderId: String(order.orderId),
        cancelUrl: `${APP_BASE_URL}/checkout/cancel?orderId=${order.orderId}`,
        redirectUrl: `${APP_BASE_URL}/checkout/complete`,
        source: "custom",
        webhooks: true,
      });

      order.payment.token = token;
      await order.save();
    } catch (safepayErr) {
      order.payment.status = "failed";
      order.status = "cancelled";
      await order.save();
      console.error("Safepay payment creation failed:", safepayErr?.message || safepayErr);
      return res.status(502).json({ message: "We couldn't start the payment. Please try again." });
    }

    Book.bulkWrite(
      orderItems.map((i) => ({
        updateOne: { filter: { _id: i.book }, update: { $inc: { popularity: i.quantity } } },
      }))
    ).catch((e) => console.error("popularity update failed:", e.message));

    res.status(201).json({
      message: "Order created. Redirecting to Safepay.",
      order: { id: order._id, orderId: order.orderId },
      checkoutUrl,
    });
  } catch (err) {
    next(err);
  }
};

export const myOrdersApi = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};