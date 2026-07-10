import express from "express";
import { list, getOne } from "../controllers/bookController.js";

const router = express.Router();

router.get("/", list);
router.get("/:id", getOne);

export const bookApiRoutes = router;
