import express from "express";
import * as pages from "../controllers/pageController.js";
import * as auth from "../controllers/authController.js";
import { handlePaymentComplete, handlePaymentCancel } from "../controllers/paymentController.js";
import { requirePageAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", pages.home);
router.get("/books", pages.booksPage);
router.get("/about", pages.about);
router.get("/book-details", pages.bookDetails);
router.get("/checkout", requirePageAuth, pages.checkoutPage);
router.get("/contact-us", pages.contactUs);
router.post("/contact", pages.submitContact);
router.get("/author/:name", pages.authorBooks);

router.get("/checkout/complete", handlePaymentComplete);
router.post("/checkout/complete", handlePaymentComplete);
router.get("/checkout/cancel", handlePaymentCancel);

router.get("/my-orders", requirePageAuth, pages.myOrders);

router.get("/login", auth.showLogin);
router.post("/login", auth.login);
router.get("/register", auth.showRegister);
router.post("/register", auth.register);
router.get("/verify-email", auth.showVerifyEmail);
router.post("/verify-email", auth.verifyEmail);
router.post("/verify-email/resend", auth.resendVerification);
router.post("/logout", auth.logout);

export const pageRoutes = router;