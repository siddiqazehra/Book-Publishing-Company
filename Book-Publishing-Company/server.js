const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home Route
app.get("/", (req, res) => {
    res.send("Publishing Company Contact API Running...");
});

// Contact Route
app.post("/contact", async (req, res) => {
    try {

        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        // Gmail Transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "yourgmail@gmail.com",
                pass: "YOUR_APP_PASSWORD"
            }
        });

        // Mail Options
        const mailOptions = {
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
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: "Message sent successfully."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});