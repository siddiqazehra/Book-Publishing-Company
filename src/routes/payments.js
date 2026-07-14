import express from "express";
import { handleSafepayWebhook } from "../controllers/paymentController.js";

const router = express.Router();
router.post("/safepay/webhook", handleSafepayWebhook);

export const paymentApiRoutes = router;