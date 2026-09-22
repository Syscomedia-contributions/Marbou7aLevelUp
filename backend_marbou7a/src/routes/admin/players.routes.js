import { Router } from "express";
import {
  listPlayersHandler,
  getPlayerHandler,
  togglePlayerActiveHandler,
} from "../../controllers/admin/players.controller.js";

const router = Router();

router.get("/", listPlayersHandler);
router.get("/:id", getPlayerHandler);
router.patch("/:id/toggle-active", togglePlayerActiveHandler);

export default router;
