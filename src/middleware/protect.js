import jwt from "jsonwebtoken";
import {User} from "../models/User.js";


// Attaches req.user if a valid token is present; otherwise 401.
// Use this on any route in any future collection (orders, reviews, etc.)
// that should only work for logged-in users.

export const protect = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "You must be logged in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }
    req.user = { id: user._id, userId: user.userId, name: user.name, email: user.email, accessLevel: user.accessLevel };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired session, please log in again." });
  }
};
