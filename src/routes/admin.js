import express from "express";
import * as admin from "../controllers/adminController.js";
import { requirePageAdmin } from "../middleware/auth.js";
import { uploadCover } from "../middleware/upload.js";

const router = express.Router();

// Every route below requires an authenticated "master" (admin) account.
router.use(requirePageAdmin);

router.get("/", admin.dashboard);

// Books
router.get("/books", admin.listBooks);
router.get("/books/new", admin.newBookForm);
router.post("/books", uploadCover, admin.createBook);
router.get("/books/:id/edit", admin.editBookForm);
router.post("/books/:id/update", uploadCover, admin.updateBook);
router.post("/books/:id/delete", admin.deleteBook);

// Genres
router.get("/genres", admin.listGenres);
router.get("/genres/new", admin.newGenreForm);
router.post("/genres", admin.createGenre);
router.get("/genres/:id/edit", admin.editGenreForm);
router.post("/genres/:id/update", admin.updateGenre);
router.post("/genres/:id/delete", admin.deleteGenre);

// Users
router.get("/users", admin.listUsers);
router.get("/users/new", admin.newUserForm);
router.post("/users", admin.createUser);
router.get("/users/:id/edit", admin.editUserForm);
router.post("/users/:id/update", admin.updateUser);
router.post("/users/:id/delete", admin.deleteUser);

// Orders
router.get("/orders", admin.listOrders);
router.get("/orders/:id", admin.viewOrder);
router.post("/orders/:id/status", admin.updateOrderStatus);

// Settings
router.get("/settings", admin.settingsPage);
router.post("/settings", admin.updateSettings);

export const adminRoutes = router;
