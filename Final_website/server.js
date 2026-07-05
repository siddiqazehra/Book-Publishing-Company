const path = require("path");
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
require("dotenv").config();

const Book = require("./models/book.js");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MONGODB =====
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

// ===== VIEW ENGINE =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets — ONLY these specific folders/files are served publicly.
// server.js, seed.js, models/, and views/ (which hold the DB connection string
// and unrendered templates) are never exposed.
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/Lora", express.static(path.join(__dirname, "Lora")));
app.use("/jquery-validation-1.21.0", express.static(path.join(__dirname, "jquery-validation-1.21.0")));
app.get("/style.css", (req, res) => res.sendFile(path.join(__dirname, "style.css")));
app.get("/jquery-3.7.1.min.js", (req, res) => res.sendFile(path.join(__dirname, "jquery-3.7.1.min.js")));

// ===== PAGE ROUTES =====

app.get("/", async (req, res) => {
    const books = await Book.find({}).sort({ id: 1 }).lean();
    res.render("index", { books });
});

app.get("/about", async (req, res) => {
    const books = await Book.find({}).sort({ id: 1 }).lean();
    res.render("about", { books });
});

app.get("/book-details", async (req, res) => {
    const books = await Book.find({}).sort({ id: 1 }).lean();
    res.render("book-details", { books });
});

app.get("/checkout", async (req, res) => {
    const books = await Book.find({}).sort({ id: 1 }).lean();
    res.render("checkout", { books });
});

app.get("/contact-us", async (req, res) => {
    const books = await Book.find({}).sort({ id: 1 }).lean();
    res.render("contact-us", { books });
});

// ===== AUTHOR BOOKS (View All Books per author) =====
app.get("/author/:name", async (req, res) => {
    const authorName = decodeURIComponent(req.params.name);
    const books = await Book.find({}).sort({ id: 1 }).lean();
    const authorBooks = books.filter(b => b.author === authorName);
    res.render("author-books", { authorName, authorBooks, books });
});

// ===== CONTACT FORM =====
app.post("/contact", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
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
            `
        });

        res.status(200).json({ success: true, message: "Message sent successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});