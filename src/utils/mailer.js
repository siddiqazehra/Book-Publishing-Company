import nodemailer from "nodemailer";

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

// Contact-form fields are free-text from an anonymous visitor (unlike order
// data, which comes from our own DB/logged-in user), so escape before
// dropping them into an HTML email.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

// NEW: contact form — sends two emails: one to the admin (so they see the
// message and can just hit reply), and one to the visitor confirming their
// message was actually received and won't be ignored.
export async function sendContactEmails({ name, email, subject, message }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("Contact form submitted, but email not sent — GMAIL_USER/GMAIL_APP_PASSWORD not set.");
    return { sent: false };
  }

  const safeName = escapeHtml(name);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  // 1. Notify the admin — plain and functional, easy to act on.
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.CONTACT_INBOX || process.env.GMAIL_USER,
    replyTo: email, // hitting "reply" goes straight to the visitor, not to us
    subject: `New message: ${subject}`,
    html: `
      <h2>New Contact Form Message</h2>
      <p><strong>From:</strong> ${safeName} (${email})</p>
      <p><strong>Subject:</strong> ${safeSubject}</p>
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
    `,
  });

  // 2. Acknowledge the visitor — reassures them it was actually received,
  // not a dismissive auto-reply.
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: "We've received your message — Publishing Company",
    html: `
      <h2>We've received your message</h2>
      <p>Hi ${safeName},</p>
      <p>Thank you for reaching out to Publishing Company. We've received your
      message about "<strong>${safeSubject}</strong>" and our team will review
      it and get back to you as soon as possible.</p>
      <p>For your records, here's what you sent us:</p>
      <blockquote style="margin:0; padding:10px 16px; border-left:3px solid #1f4d3a; color:#4b463d;">${safeMessage}</blockquote>
      <p>Thanks again for getting in touch.</p>
      <p>— The Publishing Company Team</p>
    `,
  });

  return { sent: true };
}