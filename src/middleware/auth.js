import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const COOKIE_NAME = "token";

export function signToken(user) {
  return jwt.sign(
    { id: user._id, userId: user.userId, email: user.email, accessLevel: user.accessLevel },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Runs on every request. If a valid session cookie is present, attaches the
// user to req.user and res.locals.user (so every EJS view can read
// `user` without every controller having to pass it in explicitly).
// Never blocks the request — pages decide for themselves whether login is required.
export async function attachUser(req, res, next) {
  res.locals.user = null;
  req.user = null;

  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      res.locals.user = user;
    }
  } catch (err) {
    // invalid/expired token — treat as logged out, but don't crash the request
    clearAuthCookie(res);
  }

  next();
}

// For page routes: redirect to login if not authenticated.
export function requirePageAuth(req, res, next) {
  if (!req.user) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
}

// For page routes: only "master" (admin) accounts may proceed.
export function requirePageAdmin(req, res, next) {
  if (!req.user) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  if (req.user.accessLevel !== "master") {
    return res.status(403).render("error", {
      title: "Access denied",
      message: "You don't have permission to view the admin panel.",
    });
  }
  next();
}

// For JSON API routes: 401/403 instead of redirecting.
export function requireApiAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "You must be logged in." });
  }
  next();
}

export function requireApiAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "You must be logged in." });
  }
  if (req.user.accessLevel !== "master") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}
