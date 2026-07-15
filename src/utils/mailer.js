import nodemailer from "nodemailer";

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

function itemsHtml(order) {
  return order.items
    .map((i) => `<tr><td>${i.title}</td><td>${i.quantity}</td><td>Rs. ${i.price}</td></tr>`)
    .join("");
}

export async function sendOrderEmails(order) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("Order placed but email not sent — GMAIL_USER/GMAIL_APP_PASSWORD not set.");
    return;
  }

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `New Order #${order.orderId} — Rs. ${order.totalAmount}`,
    html: `
      <h2>New Order Received</h2>
      <p><strong>Order #:</strong> ${order.orderId}</p>
      <p><strong>Customer:</strong> ${order.shipping.name} (${order.shipping.email})</p>
      <p><strong>Address:</strong> ${order.shipping.address}</p>
      <p><strong>Payment:</strong> ${order.payment.provider} — ${order.payment.status}</p>
      <table border="1" cellpadding="6">${itemsHtml(order)}</table>
      <p><strong>Total:</strong> Rs. ${order.totalAmount}</p>
    `,
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: order.shipping.email,
    subject: `Your order #${order.orderId} is confirmed`,
    html: `
      <h2>Thank you for your order!</h2>
      <p>Order #${order.orderId} confirm ho gaya hai.</p>
      <table border="1" cellpadding="6">${itemsHtml(order)}</table>
      <p><strong>Total:</strong> Rs. ${order.totalAmount}</p>
      <p>Delivery address: ${order.shipping.address}</p>
    `,
  });

  order.payment.emailSent = true;
  await order.save();
}