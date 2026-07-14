import nodemailer from "nodemailer";
import { Book } from "../models/Book.js";
import { Order } from "../models/Order.js";
import { Settings } from "../models/Settings.js";

// Small helper: every page needs the full book list for the header search /
// catalog overlay + "BOOKS" JS global (see partials/footer.ejs).
async function getAllBooksLean() {
  return Book.find({}).sort({ createdAt: -1 }).lean();
}

// GET /
export const home = async (req, res, next) => {
  try {
    const books = await getAllBooksLean();
    res.render("index", { title: "Publishing Company", books });
  } catch (err) {
    next(err);
  }
};

// GET /about
export const about = async (req, res, next) => {
  try {
    const books = await getAllBooksLean();
    res.render("about", { title: "About Us", books });
  } catch (err) {
    next(err);
  }
};

// GET /book-details?id=...
export const bookDetails = async (req, res, next) => {
  try {
    const books = await getAllBooksLean();
    res.render("book-details", { title: "Book Details", books });
  } catch (err) {
    next(err);
  }
};

// GET /checkout
export const checkoutPage = async (req, res, next) => {
  try {
    const books = await getAllBooksLean();
    const settings = await Settings.getSingleton();
    const payment = {
      easypaisa: { number: settings.easypaisaNumber, name: settings.easypaisaName },
      jazzcash: { number: settings.jazzcashNumber, name: settings.jazzcashName },
    };
    res.render("checkout", { title: "Checkout", books, payment, error: null });
  } catch (err) {
    next(err);
  }
};

// GET /contact-us
export const contactUs = async (req, res, next) => {
  try {
    const books = await getAllBooksLean();
    res.render("contact-us", { title: "Contact Us", books });
  } catch (err) {
    next(err);
  }
};

// GET /author/:name
export const authorBooks = async (req, res, next) => {
  try {
    const authorName = decodeURIComponent(req.params.name);
    const books = await getAllBooksLean();
    const authorBooksList = books.filter((b) => b.author === authorName);
    res.render("author-books", { title: authorName, authorName, authorBooks: authorBooksList, books });
  } catch (err) {
    next(err);
  }
};

// GET /my-orders (logged-in customers)
export const myOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.render("my-orders", { title: "My Orders", orders });
  } catch (err) {
    next(err);
  }
};

// POST /contact
export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      // Email isn't configured in this environment — don't fail the whole
      // form, just let the visitor know their message wasn't actually sent.
      console.warn("Contact form submitted, but GMAIL_USER/GMAIL_APP_PASSWORD are not set — email not sent.");
      return res.status(200).json({
        success: true,
        message: "Message received (email delivery isn't configured on this server yet).",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: email,
      to: "publishingcompany@gmail.com",
      subject: `Contact Form: ${subject}`,
      html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `,
    });

    res.status(200).json({ success: true, message: "Message sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};
