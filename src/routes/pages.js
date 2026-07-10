import express from "express";
import * as pages from "../controllers/pageController.js";
import * as auth from "../controllers/authController.js";
import { requirePageAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", pages.home);
router.get("/about", pages.about);
router.get("/book-details", pages.bookDetails);
router.get("/checkout", requirePageAuth, pages.checkoutPage);
router.get("/contact-us", pages.contactUs);
router.post("/contact", pages.submitContact);
router.get("/author/:name", pages.authorBooks);

router.get("/my-orders", requirePageAuth, pages.myOrders);

router.get("/login", auth.showLogin);
router.post("/login", auth.login);
router.get("/register", auth.showRegister);
router.post("/register", auth.register);
router.post("/logout", auth.logout);

export const pageRoutes = router;
