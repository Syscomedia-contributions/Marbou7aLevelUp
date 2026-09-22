import { Router } from "express";
import questionsRoutes from "./questions.routes.js";
import playersRoutes from "./players.routes.js";
import gamesRoutes from "./games.routes.js";
import leaderboardRoutes from "./leaderboard.routes.js";
import earningsRoutes from "./earnings.routes.js";
import antiCheatRoutes from "./antiCheat.routes.js";
import statsRoutes from "./stats.routes.js";
import settingsRoutes from "./settings.routes.js";

const router = Router();

router.use("/questions", questionsRoutes);
router.use("/players", playersRoutes);
router.use("/games", gamesRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/earnings", earningsRoutes);
router.use("/anticheat", antiCheatRoutes);
router.use("/stats", statsRoutes);
router.use("/settings", settingsRoutes);

export default router;
