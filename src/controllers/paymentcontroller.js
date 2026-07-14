import crypto from "crypto";
import { Order } from "../models/Order.js";

function isValidSafepaySignature(tracker, signature) {
  if (!tracker || !signature) return false;
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET;
  const expected = crypto.createHmac("sha256", secret).update(tracker).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
  } catch {
    return false;
  }
}

export const handlePaymentComplete = async (req, res) => {
  try {
    const source = { ...req.query, ...req.body };
    const { order_id: orderIdParam, orderId: orderIdParam2, tracker, signature, reference, reference_code } = source;
    const orderId = orderIdParam || orderIdParam2;

    const order = await Order.findOne({ orderId: Number(orderId) });
    if (!order) {
      return res.status(404).render("error", { title: "Order not found", message: "We couldn't find that order." });
    }

    const validSignature = isValidSafepaySignature(tracker, signature);

    if (!validSignature) {
      order.payment.status = "failed";
      await order.save();
      return res.status(400).render("error", {
        title: "Payment verification failed",
        message: "We couldn't verify this payment. If money was deducted, please contact support with your order number: " + order.orderId,
      });
    }

    order.payment.status = "paid";
    order.payment.tracker = tracker;
    order.payment.reference = reference || reference_code;
    order.payment.paidAt = new Date();
    order.status = "processing";
    await order.save();

    res.render("checkout-success", { title: "Payment successful", order });
  } catch (err) {
    console.error("Safepay redirect handling failed:", err.message);
    res.status(500).render("error", { title: "Something went wrong", message: "Please contact support with your order details." });
  }
};

export const handlePaymentCancel = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    if (orderId) {
      const order = await Order.findOne({ orderId: Number(orderId) });
      if (order && order.payment.status === "pending") {
        order.payment.status = "cancelled";
        order.status = "cancelled";
        await order.save();
      }
    }
    res.render("checkout-cancel", { title: "Payment cancelled" });
  } catch (err) {
    console.error("Safepay cancel handling failed:", err.message);
    res.render("checkout-cancel", { title: "Payment cancelled" });
  }
};

export const handleSafepayWebhook = async (req, res) => {
  try {
    const { tracker, signature, order_id: orderId, reference, reference_code } = req.body || {};

    if (!isValidSafepaySignature(tracker, signature)) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const order = await Order.findOne({ orderId: Number(orderId) });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.payment.status !== "paid") {
      order.payment.status = "paid";
      order.payment.tracker = tracker;
      order.payment.reference = reference || reference_code;
      order.payment.paidAt = new Date();
      order.status = "processing";
      await order.save();
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Safepay webhook handling failed:", err.message);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};