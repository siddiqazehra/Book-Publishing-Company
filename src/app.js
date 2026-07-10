import dotenv from "dotenv";
import path from "path";
import express from "express";
import cors from "cors";
import {connectDB} from "./config/db.js";
import {authRoutes} from "./routes/auth.js";
import {bookRoutes} from "./routes/books.js";
import {errorHandler} from "./middleware/errorHandler.js";
import { fileURLToPath } from 'url';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

app.use(cors());
app.use(express.json());

// Serve the book store site (index.html, login.html, register.html, css, js, images)
app.use(express.static(path.join(__dirname, "../public")));
// API routes — add each new collection's router here as you build it
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

// Fallback 404 for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
