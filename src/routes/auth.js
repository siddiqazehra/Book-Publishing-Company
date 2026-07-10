// this file previously contained all the register/login logic
// inline (bcrypt hashing, JWT signing, DB queries — ~90 lines). That logic
// moved to controllers/authController.js. This file is now just route
// wiring, plus a new GET /me route.
import express from "express";

import { register, login, me } from "../controllers/authController.js";
import { protect } from "../middleware/protect.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me); //(requires login)

export const authRoutes = router;

