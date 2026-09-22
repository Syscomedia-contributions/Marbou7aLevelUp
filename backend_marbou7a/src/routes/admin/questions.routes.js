import { Router } from "express";
import {
  listQuestionsHandler,
  getQuestionHandler,
  createQuestionHandler,
  updateQuestionHandler,
  deleteQuestionHandler,
  toggleQuestionHandler,
} from "../../controllers/admin/questions.controller.js";

const router = Router();

router.get("/", listQuestionsHandler);
router.get("/:id", getQuestionHandler);
router.post("/", createQuestionHandler);
router.put("/:id", updateQuestionHandler);
router.delete("/:id", deleteQuestionHandler);
router.patch("/:id/toggle", toggleQuestionHandler);

export default router;
