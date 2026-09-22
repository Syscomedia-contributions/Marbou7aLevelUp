import { Router } from "express";
import { listGamesHandler, getGameHandler } from "../../controllers/admin/games.controller.js";

const router = Router();

router.get("/", listGamesHandler);
router.get("/:id", getGameHandler);

export default router;
