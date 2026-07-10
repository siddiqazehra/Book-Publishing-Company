import { Book } from "../models/Book.js";
import { getPagination, buildPageMeta } from "../utils/pagination.js";

// GET /api/books?page=1&limit=20&genre=Mystery&q=dracula
export const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (req.query.genre) filter.genre = req.query.genre;
    if (req.query.q) filter.$text = { $search: req.query.q };

    const [books, total] = await Promise.all([
      Book.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Book.countDocuments(filter),
    ]);

    res.json({ books, pagination: buildPageMeta({ page, limit, total }) });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/:id
export const getOne = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ message: "Book not found." });
    res.json({ book });
  } catch (err) {
    next(err);
  }
};
