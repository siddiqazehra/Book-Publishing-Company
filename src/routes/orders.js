import express from "express";
import { createOrder, myOrdersApi } from "../controllers/orderController.js";
import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireApiAuth, createOrder);
router.get("/mine", requireApiAuth, myOrdersApi);

export const orderApiRoutes = router;
