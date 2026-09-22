import { z } from "zod";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listGames, getGame } from "../../services/admin/games.service.js";

const listSchema = z.object({
  status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
  categoryKey: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listGamesHandler = asyncHandler(async (req, res) => {
  const params = listSchema.parse(req.query);
  const result = await listGames(params);
  res.json(result);
});

export const getGameHandler = asyncHandler(async (req, res) => {
  const game = await getGame(req.params.id);
  if (!game) return res.status(404).json({ error: "Partie introuvable." });
  res.json({ game });
});
