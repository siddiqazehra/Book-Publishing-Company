import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/User.js";
import { Book } from "../models/Book.js";
import { getNextSequence } from "../models/Counter.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../middleware/auth.js";
import { sendVerificationEmail } from "../utils/mailer.js";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000)); // 6 digits
}

async function issueOtp(user) {
  const otp = generateOtp();
  user.otpCode = await bcrypt.hash(otp, 10);
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save();
  await sendVerificationEmail(user, otp);
}

async function getAllBooksLean() {
  return Book.find({}).sort({ createdAt: -1 }).lean();
}

// GET /login
export const showLogin = async (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("login", {
    title: "Log in",
    error: null,
    notice: req.query.verified ? "Email verified — you can now log in." : null,
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
        notice: null,
        next: safeNext,
        books: await getAllBooksLean(),
      });
    }

    email = String(email).trim().toLowerCase();
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render("login", {
        title: "Log in",
        error: "Incorrect email or password.",
        notice: null,
        next: safeNext,
        books: await getAllBooksLean(),
      });
    }

    if (!user.isVerified) {
      return res.redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.redirect(safeNext);
  } catch (err) {
    console.error(err);
    res.status(500).render("login", {
      title: "Log in",
      error: "Something went wrong. Please try again.",
      notice: null,
      next: "/",
      books: await getAllBooksLean().catch(() => []),
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
        books: await getAllBooksLean(),
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).render("register", {
        title: "Register",
        error: "Passwords do not match.",
        books: await getAllBooksLean(),
      });
    }

    email = String(email).trim().toLowerCase();

    if (password.length < 8) {
      return res.status(400).render("register", {
        title: "Register",
        error: "Password must be at least 8 characters.",
        books: await getAllBooksLean(),
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).render("register", {
        title: "Register",
        error: "An account with that email already exists.",
        books: await getAllBooksLean(),
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
      isVerified: false,
    });

    await issueOtp(user);

    res.redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error(err);
    const message =
      err.code === 11000
        ? "An account with that email already exists."
        : err.name === "ValidationError"
        ? Object.values(err.errors)[0]?.message || "Invalid input."
        : "Something went wrong. Please try again.";
    res.status(400).render("register", { title: "Register", error: message, books: await getAllBooksLean().catch(() => []) });
  }
};

// GET /verify-email
export const showVerifyEmail = async (req, res) => {
  if (req.user) return res.redirect("/");
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email) return res.redirect("/register");
  res.render("verify-email", {
    title: "Verify your email",
    error: null,
    notice: null,
    email,
    books: await getAllBooksLean(),
  });
};

// POST /verify-email
export const verifyEmail = async (req, res) => {
  let { email, otp } = req.body;
  email = String(email || "").trim().toLowerCase();
  otp = String(otp || "").trim();

  const render = async (error) =>
    res.status(400).render("verify-email", {
      title: "Verify your email",
      error,
      notice: null,
      email,
      books: await getAllBooksLean().catch(() => []),
    });

  try {
    if (!email || !otp) return await render("Please enter the code we emailed you.");

    const user = await User.findOne({ email }).select("+otpCode +otpExpires");
    if (!user || !user.otpCode || !user.otpExpires) {
      return await render("We couldn't find a pending verification for that email.");
    }

    if (user.isVerified) {
      return res.redirect("/login?verified=1");
    }

    if (user.otpExpires < new Date()) {
      return await render("That code has expired. Request a new one below.");
    }

    if (!(await bcrypt.compare(otp, user.otpCode))) {
      return await render("That code isn't right. Please try again.");
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.redirect("/login?verified=1");
  } catch (err) {
    console.error(err);
    await render("Something went wrong. Please try again.");
  }
};

// POST /verify-email/resend
export const resendVerification = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  try {
    const user = await User.findOne({ email });
    if (user && !user.isVerified) {
      await issueOtp(user);
    }
    // Same response whether or not the account exists/is already verified,
    // so this can't be used to probe which emails are registered.
    res.render("verify-email", {
      title: "Verify your email",
      error: null,
      notice: "A new code has been sent if that email is pending verification.",
      email,
      books: await getAllBooksLean().catch(() => []),
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("verify-email", {
      title: "Verify your email",
      error: "Something went wrong. Please try again.",
      notice: null,
      email,
      books: [],
    });
  }
};

// POST /logout
export const logout = (req, res) => {
  clearAuthCookie(res);
  res.redirect("/");
};