import bcrypt from "bcryptjs";
import { Book } from "../models/Book.js";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { Genre } from "../models/Genre.js";
import { Settings } from "../models/Settings.js";
import { getNextSequence } from "../models/Counter.js";

/* ==================== DASHBOARD ==================== */

export const dashboard = async (req, res, next) => {
  try {
    const [bookCount, userCount, orderCount, orders, lowStockCount] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments(),
      Order.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email").lean(),
      Book.countDocuments({ stock: { $lte: 5 } }),
    ]);

    const revenueAgg = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      bookCount,
      userCount,
      orderCount,
      totalRevenue,
      recentOrders: orders,
      lowStockCount,
    });
  } catch (err) {
    next(err);
  }
};

/* ==================== BOOKS ==================== */

export const listBooks = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const genre = (req.query.genre || "").trim();
    const filter = {};
    if (q) filter.$text = { $search: q };
    if (genre) filter.genre = genre;
    const [books, genres] = await Promise.all([
      Book.find(filter).sort({ createdAt: -1 }).lean(),
      genreOptions(),
    ]);
    res.render("admin/books", { title: "Manage Books", books, q, genre, genres });
  } catch (err) {
    next(err);
  }
};

export const newBookForm = async (req, res, next) => {
  try {
    res.render("admin/book-form", { title: "Add Book", book: {}, error: null, mode: "create", genres: await genreOptions() });
  } catch (err) {
    next(err);
  }
};

export const createBook = async (req, res) => {
  try {
    const { title, author, description, price, image, stock } = req.body;
    const genre = (req.body.genreNew && req.body.genreNew.trim()) ? req.body.genreNew.trim() : (req.body.genre || "");
    const coverPath = req.file ? `uploads/${req.file.filename}` : (image || undefined);
    await Book.create({
      title,
      author,
      description,
      genre,
      price: Number(price) || 0,
      image: coverPath,
      stock: Number(stock) || 0,
    });
    res.redirect("/admin/books");
  } catch (err) {
    const message =
      err.name === "ValidationError"
        ? Object.values(err.errors)[0]?.message || "Invalid input."
        : "Could not create the book. Please check the fields and try again.";
    res.status(400).render("admin/book-form", {
      title: "Add Book",
      book: req.body,
      error: message,
      mode: "create",
      genres: await genreOptions(),
    });
  }
};

export const editBookForm = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).render("error", { title: "Not found", message: "Book not found." });
    res.render("admin/book-form", { title: "Edit Book", book, error: null, mode: "edit", genres: await genreOptions() });
  } catch (err) {
    next(err);
  }
};

export const updateBook = async (req, res) => {
  try {
    const { title, author, description, price, image, stock } = req.body;
    const genre = (req.body.genreNew && req.body.genreNew.trim()) ? req.body.genreNew.trim() : (req.body.genre || "");
    const update = {
      title,
      author,
      description,
      genre,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
    };
    if (req.file) update.image = `uploads/${req.file.filename}`;
    else if (image) update.image = image;
    const book = await Book.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!book) return res.status(404).render("error", { title: "Not found", message: "Book not found." });
    res.redirect("/admin/books");
  } catch (err) {
    const message =
      err.name === "ValidationError"
        ? Object.values(err.errors)[0]?.message || "Invalid input."
        : "Could not update the book. Please check the fields and try again.";
    res.status(400).render("admin/book-form", {
      title: "Edit Book",
      book: { ...req.body, _id: req.params.id },
      error: message,
      mode: "edit",
      genres: await genreOptions(),
    });
  }
};

export const deleteBook = async (req, res, next) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.redirect("/admin/books");
  } catch (err) {
    next(err);
  }
};

/* ==================== USERS ==================== */

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.render("admin/users", { title: "Manage Users", users });
  } catch (err) {
    next(err);
  }
};

export const newUserForm = (req, res) => {
  res.render("admin/user-form", { title: "Add User", editUser: {}, error: null, mode: "create" });
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, accessLevel } = req.body;

    if (!name || !email || !password || password.length < 8) {
      throw Object.assign(new Error("Name, email, and an 8+ character password are required."), {
        name: "SimpleValidation",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = await getNextSequence("userId");

    await User.create({
      userId,
      name: name.trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      accessLevel: accessLevel === "master" ? "master" : "usual",
    });
    res.redirect("/admin/users");
  } catch (err) {
    const message =
      err.code === 11000
        ? "An account with that email already exists."
        : err.name === "ValidationError"
        ? Object.values(err.errors)[0]?.message || "Invalid input."
        : err.message || "Could not create the user.";
    res.status(400).render("admin/user-form", {
      title: "Add User",
      editUser: req.body,
      error: message,
      mode: "create",
    });
  }
};

export const editUserForm = async (req, res, next) => {
  try {
    const editUser = await User.findById(req.params.id).lean();
    if (!editUser) return res.status(404).render("error", { title: "Not found", message: "User not found." });
    res.render("admin/user-form", { title: "Edit User", editUser, error: null, mode: "edit" });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, accessLevel, password } = req.body;
    const update = {
      name,
      email: String(email).trim().toLowerCase(),
      accessLevel: accessLevel === "master" ? "master" : "usual",
    };
    if (password) {
      if (password.length < 8) throw Object.assign(new Error("Password must be at least 8 characters."), {});
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!user) return res.status(404).render("error", { title: "Not found", message: "User not found." });
    res.redirect("/admin/users");
  } catch (err) {
    const message =
      err.code === 11000
        ? "An account with that email already exists."
        : err.name === "ValidationError"
        ? Object.values(err.errors)[0]?.message || "Invalid input."
        : err.message || "Could not update the user.";
    res.status(400).render("admin/user-form", {
      title: "Edit User",
      editUser: { ...req.body, _id: req.params.id },
      error: message,
      mode: "edit",
    });
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).render("error", {
        title: "Not allowed",
        message: "You can't delete your own account while logged in as it.",
      });
    }
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/admin/users");
  } catch (err) {
    next(err);
  }
};

/* ==================== ORDERS ==================== */

export const listOrders = async (req, res, next) => {
  try {
    const statusFilter = req.query.status;
    const filter = statusFilter ? { status: statusFilter } : {};
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .lean();
    res.render("admin/orders", { title: "All Orders", orders, statusFilter: statusFilter || "" });
  } catch (err) {
    next(err);
  }
};

export const viewOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email").lean();
    if (!order) return res.status(404).render("error", { title: "Not found", message: "Order not found." });
    res.render("admin/order-detail", { title: `Order #${order.orderId}`, order, error: null });
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!valid.includes(status)) {
      return res.redirect(`/admin/orders/${req.params.id}`);
    }
    await Order.findByIdAndUpdate(req.params.id, { status });
    res.redirect(`/admin/orders/${req.params.id}`);
  } catch (err) {
    next(err);
  }
};

/* ==================== GENRES ==================== */

export async function genreOptions() {
  const [managed, used] = await Promise.all([
    Genre.find().sort({ name: 1 }).lean(),
    Book.distinct("genre"),
  ]);
  const set = new Set(managed.map((g) => g.name));
  used.filter((n) => n && n.trim()).forEach((n) => set.add(n));
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function ensureGenresSeeded() {
  const names = (await Book.distinct("genre")).filter((n) => n && n.trim());
  await Promise.all(
    names.map((name) =>
      Genre.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true }).catch(() => {})
    )
  );
}

export const listGenres = async (req, res, next) => {
  try {
    await ensureGenresSeeded();
    const genres = await Genre.find().sort({ name: 1 }).lean();
    res.render("admin/genres", { title: "Manage Genres", genres });
  } catch (err) { next(err); }
};

export const newGenreForm = (req, res) => {
  res.render("admin/genre-form", { title: "Add Genre", genre: {}, error: null, mode: "create" });
};

export const createGenre = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) throw Object.assign(new Error("Name is required."), { name: "SimpleValidation" });
    await Genre.create({ name });
    res.redirect("/admin/genres");
  } catch (err) {
    const message = err.code === 11000 ? "That genre already exists." : err.message || "Could not create the genre.";
    res.status(400).render("admin/genre-form", { title: "Add Genre", genre: req.body, error: message, mode: "create" });
  }
};

export const editGenreForm = async (req, res, next) => {
  try {
    const genre = await Genre.findById(req.params.id).lean();
    if (!genre) return res.status(404).render("error", { title: "Not found", message: "Genre not found." });
    res.render("admin/genre-form", { title: "Edit Genre", genre, error: null, mode: "edit" });
  } catch (err) { next(err); }
};

export const updateGenre = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) throw Object.assign(new Error("Name is required."), { name: "SimpleValidation" });
    const genre = await Genre.findByIdAndUpdate(req.params.id, { name }, { new: true, runValidators: true });
    if (!genre) return res.status(404).render("error", { title: "Not found", message: "Genre not found." });
    res.redirect("/admin/genres");
  } catch (err) {
    const message = err.code === 11000 ? "That genre already exists." : err.message || "Could not update the genre.";
    res.status(400).render("admin/genre-form", { title: "Edit Genre", genre: { ...req.body, _id: req.params.id }, error: message, mode: "edit" });
  }
};

export const deleteGenre = async (req, res, next) => {
  try {
    await Genre.findByIdAndDelete(req.params.id);
    res.redirect("/admin/genres");
  } catch (err) { next(err); }
};

/* ==================== REPORTS ==================== */

export const reports = async (req, res, next) => {
  try {
    const from = (req.query.from || "").trim();
    const to = (req.query.to || "").trim();
    const match = { status: { $ne: "cancelled" } };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }
    const orders = await Order.find(match).lean();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);

    const byStatusAgg = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const byStatus = byStatusAgg.reduce((m, r) => { m[r._id] = r.count; return m; }, {});

    const bestSellers = await Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      { $group: { _id: "$items.title", qty: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } } },
      { $sort: { qty: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, title: "$_id", qty: 1, revenue: 1 } },
    ]);

    res.render("admin/reports", { title: "Sales Report", totalRevenue, totalOrders, byStatus, bestSellers, from, to });
  } catch (err) { next(err); }
};

/* ==================== SETTINGS ==================== */

export const settingsPage = async (req, res, next) => {
  try {
    const settings = await Settings.getSingleton();
    res.render("admin/settings", { title: "Payment Settings", settings, saved: req.query.saved === "1" });
  } catch (err) { next(err); }
};

export const updateSettings = async (req, res, next) => {
  try {
    const doc = await Settings.getSingleton();
    const fields = ["shopName", "easypaisaNumber", "easypaisaName", "jazzcashNumber", "jazzcashName"];
    fields.forEach((f) => { doc[f] = (req.body[f] || "").trim(); });
    await doc.save();
    res.redirect("/admin/settings?saved=1");
  } catch (err) { next(err); }
};
