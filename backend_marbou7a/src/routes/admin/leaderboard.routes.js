import { Router } from "express";
import { getAdminLeaderboard } from "../../controllers/admin/leaderboard.controller.js";

const router = Router();

router.get("/", getAdminLeaderboard);

export default router;
