import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler.js";
import { createGameSession, submitAnswer, finishSession } from "../services/games.service.js";

const startSchema = z.object({ categoryKey: z.string().min(1) });
const answerSchema = z.object({
  questionId: z.string().min(1),
  choiceIndex: z.number().int().min(0).nullable().optional(),
  matches: z.record(z.string(), z.string()).nullable().optional(),
  tileOrder: z.array(z.string()).nullable().optional(),
  timeMs: z.number().int().nonnegative().optional(),
});
const finishSchema = z.object({
  guestProgression: z
    .object({
      xp: z.number().nonnegative().optional(),
      badges: z.array(z.string()).optional(),
      perCategory: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
});

export const startGame = asyncHandler(async (req, res) => {
  const { categoryKey } = startSchema.parse(req.body);
  const result = await createGameSession({ userId: req.user?.id ?? null, categoryKey });
  res.status(201).json(result);
});

export const answerQuestion = asyncHandler(async (req, res) => {
  const body = answerSchema.parse(req.body);
  const result = await submitAnswer({
    sessionId: req.params.id,
    userId: req.user?.id ?? null,
    questionId: body.questionId,
    choiceIndex: body.choiceIndex ?? null,
    matches: body.matches ?? null,
    tileOrder: body.tileOrder ?? null,
    timeMs: body.timeMs,
  });
  res.json(result);
});

export const finishGame = asyncHandler(async (req, res) => {
  const { guestProgression } = finishSchema.parse(req.body ?? {});
  const result = await finishSession({
    sessionId: req.params.id,
    userId: req.user?.id ?? null,
    guestProgression,
  });
  res.json(result);
});
