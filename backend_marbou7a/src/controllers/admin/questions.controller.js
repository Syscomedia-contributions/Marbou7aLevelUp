import { z } from "zod";
import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  toggleQuestion,
} from "../../services/admin/questions.service.js";

const listSchema = z.object({
  search: z.string().optional(),
  categoryKey: z.string().optional(),
  difficulty: z.string().optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const questionBodySchema = z.object({
  categoryKey: z.string().min(1),
  difficulty: z.enum(["facile", "moyen", "difficile", "ultime"]),
  subcategory: z.string().optional(),
  kind: z.enum(["mcq", "truefalse", "image", "matching", "whoami", "sound", "puzzle"]).default("mcq"),
  question: z.string().min(3),
  choices: z.array(z.string().min(1)).min(2).max(6).optional(),
  answerIndex: z.number().int().min(0).optional(),
  imageUrl: z.string().trim().max(2000).optional(),
  imageEmoji: z.string().trim().max(8).optional(),
  audioUrl: z.string().trim().max(2000).optional(),
  pairs: z
    .array(z.object({ left: z.string().min(1), right: z.string().min(1) }))
    .min(2)
    .max(8)
    .optional(),
  clues: z.array(z.string().min(1)).min(1).max(6).optional(),
  puzzleTiles: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        imageUrl: z.string().trim().min(1),
        imagePosition: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]),
      })
    )
    .length(4)
    .optional(),
  funFact: z.string().optional(),
});

function validateQuestionBody(data) {
  if (data.kind === "matching") {
    if (!data.pairs || data.pairs.length < 2) {
      const err = new Error("Le puzzle (association) doit contenir au moins 2 paires.");
      err.status = 400;
      throw err;
    }
    return;
  }
  if (data.kind === "puzzle") {
    if (!data.puzzleTiles || data.puzzleTiles.length !== 4) {
      const err = new Error("Le puzzle chronologique doit contenir exactement 4 tuiles, dans le bon ordre.");
      err.status = 400;
      throw err;
    }
    return;
  }
  if (!data.choices || data.choices.length < 2) {
    const err = new Error("Au moins 2 propositions sont requises.");
    err.status = 400;
    throw err;
  }
  if (data.answerIndex === undefined || data.answerIndex >= data.choices.length) {
    const err = new Error("L'index de la bonne réponse dépasse le nombre de propositions.");
    err.status = 400;
    throw err;
  }
  if (data.kind === "whoami" && (!data.clues || data.clues.length < 1)) {
    const err = new Error("Le format « Qui suis-je ? » doit contenir au moins un indice.");
    err.status = 400;
    throw err;
  }
  if (data.kind === "sound" && !data.audioUrl) {
    const err = new Error("Le format « Reconnais le son » doit avoir un extrait audio.");
    err.status = 400;
    throw err;
  }
}

export const listQuestionsHandler = asyncHandler(async (req, res) => {
  const params = listSchema.parse(req.query);
  const result = await listQuestions(params);
  res.json(result);
});

export const getQuestionHandler = asyncHandler(async (req, res) => {
  const question = await getQuestion(req.params.id);
  if (!question) return res.status(404).json({ error: "Question introuvable." });
  res.json({ question });
});

export const createQuestionHandler = asyncHandler(async (req, res) => {
  const data = questionBodySchema.parse(req.body);
  validateQuestionBody(data);
  const question = await createQuestion(data);
  res.status(201).json({ question });
});

export const updateQuestionHandler = asyncHandler(async (req, res) => {
  const data = questionBodySchema.parse(req.body);
  validateQuestionBody(data);
  const question = await updateQuestion(req.params.id, data);
  res.json({ question });
});

export const deleteQuestionHandler = asyncHandler(async (req, res) => {
  await deleteQuestion(req.params.id);
  res.status(204).send();
});

export const toggleQuestionHandler = asyncHandler(async (req, res) => {
  const result = await toggleQuestion(req.params.id);
  res.json(result);
});
