import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {User} from "../models/User.js";

import { getNextSequence } from "../models/Counter.js";

function signToken(user) {
  return jwt.sign(
      { id: user._id, userId: user.userId, email: user.email, accessLevel: user.accessLevel },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are all required." });
    }

    email = String(email).trim().toLowerCase();

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists." });
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

    res.status(201).json({
      message: "Account created.",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    if (err.name === "ValidationError") {
      const first = Object.values(err.errors)[0]?.message || "Invalid input.";
      return res.status(400).json({ message: first });
    }
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    email = String(email).trim().toLowerCase();

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const token = signToken(user);

    res.json({
      message: "Logged in.",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// GET /api/auth/me  (requires the `protect` middleware)
export const me = async (req, res) => {
  res.json({ user: req.user });
};
