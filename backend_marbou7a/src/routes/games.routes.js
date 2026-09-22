import { Router } from "express";
import { startGame, answerQuestion, finishGame } from "../controllers/games.controller.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", optionalAuth, startGame);
router.post("/:id/answer", optionalAuth, answerQuestion);
router.post("/:id/finish", optionalAuth, finishGame);

export default router;
