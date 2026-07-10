import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { connectDB } from "./config/db.js";
import { attachUser } from "./middleware/auth.js";
import { apiErrorHandler, pageErrorHandler } from "./middleware/errorHandler.js";

import { pageRoutes } from "./routes/pages.js";
import { bookApiRoutes } from "./routes/books.js";
import { orderApiRoutes } from "./routes/orders.js";
import { adminRoutes } from "./routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();

// ===== VIEW ENGINE =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachUser); // makes req.user / res.locals.user available everywhere

// ===== STATIC ASSETS =====
app.use(express.static(path.join(__dirname, "../public")));

// ===== PAGE ROUTES (server-rendered EJS) =====
app.use("/admin", adminRoutes);
app.use("/", pageRoutes);

// ===== JSON API ROUTES =====
app.use("/api/books", bookApiRoutes);
app.use("/api/orders", orderApiRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Not found" });
});

// 404 for any other unmatched page route
app.use((req, res) => {
  res.status(404).render("error", { title: "Page not found", message: "That page doesn't exist." });
});

app.use("/api", apiErrorHandler);
app.use(pageErrorHandler);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
