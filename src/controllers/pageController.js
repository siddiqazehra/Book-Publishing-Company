import { Book } from "../models/Book.js";
import { Order } from "../models/Order.js";
import { Settings } from "../models/Settings.js";
import { Genre } from "../models/Genre.js";
import { Testimonial } from "../models/Testimonial.js";
import { Contact } from "../models/Contact.js";
import { sendContactEmails } from "../utils/mailer.js";

// Small helper: every page needs the full book list for the header search /
// catalog overlay + "BOOKS" JS global (see partials/footer.ejs).
async function getAllBooksLean() {
  return Book.find({}).sort({ createdAt: -1 }).lean();
}

// GET /
export const home = async (req, res, next) => {
  try {
    const books = await getAllBooksLean();
    const testimonials = await Testimonial.find().sort({ createdAt: -1 }).lean();
    res.render("index", { title: "Publishing Company", books, testimonials });
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

// GET /books — full catalog / shop page
export const booksPage = async (req, res, next) => {
  try {
    const [books, genres] = await Promise.all([
      getAllBooksLean(),
      Genre.find().sort({ name: 1 }).lean(),
    ]);
    res.render("books", { title: "Books", books, genres });
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

    // Always store the message in the database first.
    await Contact.create({ name, email, subject, message });

    // NEW: sends both the admin notification AND a confirmation email back
    // to whoever filled out the form (previously only the admin was
    // emailed). If email isn't configured, this just logs a warning and
    // the form still succeeds — same graceful fallback as before.
    await sendContactEmails({ name, email, subject, message });

    res.status(200).json({ success: true, message: "Message sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};