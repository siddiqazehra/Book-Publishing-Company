import express from "express";
import { list, getOne, create, update, remove } from "../controllers/bookController.js";
import {protect} from "../middleware/protect.js";

const router = express.Router();

router.get("/", list);
router.get("/:id", getOne);
router.post("/", protect, create);
router.put("/:id", protect, update);
router.delete("/:id", protect, remove);

export const bookRoutes = router;
