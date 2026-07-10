import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Book } from "../models/Book.js";
import { getNextSequence } from "../models/Counter.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../middleware/auth.js";

async function getAllBooksLean() {
  return Book.find({}).sort({ createdAt: -1 }).lean();
}

// GET /login
export const showLogin = async (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("login", {
    title: "Log in",
    error: null,
    next: req.query.next || "/",
    books: await getAllBooksLean(),
  });
};

// GET /register
export const showRegister = async (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("register", { title: "Register", error: null, books: await getAllBooksLean() });
};

// POST /login
export const login = async (req, res) => {
  try {
    let { email, password, next } = req.body;
    const safeNext = next && next.startsWith("/") ? next : "/";

    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Log in",
        error: "Email and password are required.",
        next: safeNext,
      });
    }

    email = String(email).trim().toLowerCase();
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render("login", {
        title: "Log in",
        error: "Incorrect email or password.",
        next: safeNext,
      });
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.redirect(safeNext);
  } catch (err) {
    console.error(err);
    res.status(500).render("login", {
      title: "Log in",
      error: "Something went wrong. Please try again.",
      next: "/",
    });
  }
};

// POST /register
export const register = async (req, res) => {
  try {
    let { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).render("register", {
        title: "Register",
        error: "Name, email, and password are all required.",
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).render("register", {
        title: "Register",
        error: "Passwords do not match.",
      });
    }

    email = String(email).trim().toLowerCase();

    if (password.length < 8) {
      return res.status(400).render("register", {
        title: "Register",
        error: "Password must be at least 8 characters.",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).render("register", {
        title: "Register",
        error: "An account with that email already exists.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = await getNextSequence("userId");

    const user = await User.create({
      userId,
      name: name.trim(),
      email,
      password: hashedPassword,
      accessLevel: "usual",
    });

    const token = signToken(user);
    setAuthCookie(res, token);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    const message =
      err.code === 11000
        ? "An account with that email already exists."
        : err.name === "ValidationError"
        ? Object.values(err.errors)[0]?.message || "Invalid input."
        : "Something went wrong. Please try again.";
    res.status(400).render("register", { title: "Register", error: message });
  }
};

// POST /logout
export const logout = (req, res) => {
  clearAuthCookie(res);
  res.redirect("/");
};
