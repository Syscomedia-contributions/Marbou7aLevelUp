import { Router } from "express";
import { getProgression } from "../controllers/progression.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, getProgression);

export default router;
