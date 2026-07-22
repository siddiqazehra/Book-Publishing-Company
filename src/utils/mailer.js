import nodemailer from "nodemailer";

// Emails go out through Gmail (same approach as the contact form). To enable,
// set GMAIL_USER + GMAIL_APP_PASSWORD in .env (the App Password needs 2-step
// verification turned on for that Google account). When they're absent the
// helpers below no-op so ordering never breaks on a machine without mail set up.
function getTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

async function send(to, subject, html) {
  const transport = getTransport();
  if (!transport) {
    console.warn(`[mailer] GMAIL_USER/GMAIL_APP_PASSWORD not set — skipped email "${subject}" to ${to}`);
    return;
  }
  if (!to) return;
  try {
    await transport.sendMail({
      from: `"Publishing Company" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Never let a mail failure break the order flow.
    console.error(`[mailer] failed to send "${subject}" to ${to}:`, err.message);
  }
}

const money = (n) => "Rs. " + Number(n || 0).toFixed(2);

function shell(inner) {
  return `
  <div style="background:#f3eee4;padding:28px 0;font-family:Arial,Helvetica,sans-serif;color:#201e1a;">
    <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e4dac8;border-radius:14px;overflow:hidden;">
      <div style="background:#17392b;padding:22px 28px;">
        <div style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#fdfaf2;">
          PUBLISHING <span style="color:#c39c58;font-style:italic;">COMPANY</span>
        </div>
      </div>
      <div style="padding:26px 28px;">${inner}</div>
      <div style="padding:16px 28px;border-top:1px solid #e4dac8;color:#8c8474;font-size:12px;">
        Thank you for shopping with Publishing Company.
      </div>
    </div>
  </div>`;
}

function itemsTable(order) {
  const rows = (order.items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #efe8db;">${it.title} <span style="color:#8c8474;">× ${it.quantity}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #efe8db;text-align:right;">${money(it.price * it.quantity)}</td>
      </tr>`
    )
    .join("");
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:14px 0;">
      ${rows}
      <tr>
        <td style="padding:12px 0 0;font-weight:bold;">Total</td>
        <td style="padding:12px 0 0;text-align:right;font-weight:bold;color:#b0894c;">${money(order.totalAmount)}</td>
      </tr>
    </table>`;
}

// Sent right after registration, with the OTP the customer needs to
// verify their email before they can log in.
export async function sendVerificationEmail(user, otp) {
  if (!user) return;
  const html = shell(`
    <h2 style="font-family:Georgia,serif;font-weight:normal;margin:0 0 6px;">Verify your email, ${user.name || "there"}</h2>
    <p style="font-size:14px;color:#4b463d;margin:0 0 18px;">Use the code below to verify your account. It expires in 10 minutes.</p>
    <div style="text-align:center;margin:0 0 18px;">
      <span style="display:inline-block;font-family:Georgia,serif;font-size:32px;letter-spacing:8px;color:#17392b;background:#f3eee4;border-radius:10px;padding:14px 22px;">${otp}</span>
    </div>
    <p style="font-size:13px;color:#8c8474;">If you didn't create an account with us, you can safely ignore this email.</p>
  `);
  await send(user.email, "Verify your email — Publishing Company", html);
}

// Sent to the customer when they place an order.
export async function sendOrderConfirmation(order, settings) {
  if (!order) return;
  const method = order.payment?.provider || "safepay";
  let payNote = "";
  if (settings && (method === "easypaisa" || method === "jazzcash")) {
    const acct = method === "easypaisa"
      ? { n: settings.easypaisaNumber, name: settings.easypaisaName }
      : { n: settings.jazzcashNumber, name: settings.jazzcashName };
    if (acct.n) {
      payNote = `<div style="background:#eef2ee;border:1px solid #d5e0d8;border-left:3px solid #1f4d3a;border-radius:8px;padding:12px 14px;margin:6px 0 14px;font-size:14px;">
        Please send <strong>${money(order.totalAmount)}</strong> via <strong>${method}</strong> to
        <strong>${acct.n}</strong>${acct.name ? " (" + acct.name + ")" : ""} and reply with your transaction ID.
      </div>`;
    }
  } else if (method === "cash") {
    payNote = `<p style="font-size:14px;">You chose <strong>Cash on Delivery</strong> — please keep the amount ready.</p>`;
  }

  const html = shell(`
    <h2 style="font-family:Georgia,serif;font-weight:normal;margin:0 0 6px;">Thank you, ${order.shipping?.name || "reader"}!</h2>
    <p style="font-size:14px;color:#4b463d;margin:0 0 14px;">We've received your order <strong>#${order.orderId}</strong>. Here's a summary:</p>
    ${itemsTable(order)}
    ${payNote}
    <p style="font-size:13px;color:#8c8474;">Shipping to: ${order.shipping?.address || ""}</p>
  `);
  await send(order.shipping?.email, `Order #${order.orderId} confirmed — Publishing Company`, html);
}

// Sent to the customer when an admin changes the order status.
export async function sendOrderStatusUpdate(order) {
  if (!order) return;
  const labels = {
    pending: "received and is pending",
    processing: "being processed",
    shipped: "on its way (shipped)",
    delivered: "delivered",
    cancelled: "cancelled",
  };
  const state = labels[order.status] || order.status;
  const html = shell(`
    <h2 style="font-family:Georgia,serif;font-weight:normal;margin:0 0 6px;">Order #${order.orderId} update</h2>
    <p style="font-size:15px;color:#4b463d;">Hi ${order.shipping?.name || "there"}, your order is now
      <strong style="color:#1f4d3a;text-transform:capitalize;">${state}</strong>.</p>
    ${itemsTable(order)}
  `);
  await send(order.shipping?.email, `Order #${order.orderId} is now ${order.status} — Publishing Company`, html);
}

// Notify the SHOP OWNER (GMAIL_USER) that an order was placed / paid. This is a
// separate email from the customer confirmation, so it never double-sends.
export async function sendOrderEmails(order) {
  if (!order) return;
  const html = shell(`
    <h2 style="font-family:Georgia,serif;font-weight:normal;margin:0 0 6px;">New order received</h2>
    <p style="font-size:14px;color:#4b463d;"><strong>Order:</strong> #${order.orderId}</p>
    <p style="font-size:14px;color:#4b463d;"><strong>Customer:</strong> ${order.shipping?.name || ""} (${order.shipping?.email || ""})</p>
    <p style="font-size:14px;color:#4b463d;"><strong>Address:</strong> ${order.shipping?.address || ""}</p>
    <p style="font-size:14px;color:#4b463d;"><strong>Payment:</strong> ${order.payment?.provider || ""} — ${order.payment?.status || ""}</p>
    ${itemsTable(order)}
  `);
  await send(process.env.GMAIL_USER, `New order #${order.orderId} — Publishing Company`, html);
}

// Sent when a visitor submits the Contact Us form: one notification to the
// shop's own inbox, and one confirmation copy back to the visitor.
export async function sendContactEmails({ name, email, subject, message }) {
  const adminHtml = shell(`
    <h2 style="font-family:Georgia,serif;font-weight:normal;margin:0 0 6px;">New contact message</h2>
    <p style="font-size:14px;color:#4b463d;"><strong>From:</strong> ${name || ""} (${email || ""})</p>
    <p style="font-size:14px;color:#4b463d;"><strong>Subject:</strong> ${subject || ""}</p>
    <p style="font-size:14px;color:#4b463d;white-space:pre-line;">${message || ""}</p>
  `);
  await send(process.env.GMAIL_USER, `Contact: ${subject || "New message"} — Publishing Company`, adminHtml);

  const customerHtml = shell(`
    <h2 style="font-family:Georgia,serif;font-weight:normal;margin:0 0 6px;">Thanks for reaching out, ${name || "there"}!</h2>
    <p style="font-size:14px;color:#4b463d;">We've received your message and will get back to you soon. Here's a copy for your records:</p>
    <p style="font-size:14px;color:#4b463d;margin:12px 0 4px;"><strong>Subject:</strong> ${subject || ""}</p>
    <p style="font-size:14px;color:#201e1a;white-space:pre-line;">${message || ""}</p>
  `);
  await send(email, `We've received your message — Publishing Company`, customerHtml);
}
