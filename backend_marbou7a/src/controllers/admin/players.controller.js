import { z } from "zod";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listPlayers, getPlayer, togglePlayerActive } from "../../services/admin/players.service.js";

const listSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listPlayersHandler = asyncHandler(async (req, res) => {
  const params = listSchema.parse(req.query);
  const result = await listPlayers(params);
  res.json(result);
});

export const getPlayerHandler = asyncHandler(async (req, res) => {
  const player = await getPlayer(req.params.id);
  if (!player) return res.status(404).json({ error: "Joueur introuvable." });
  res.json({ player });
});

export const togglePlayerActiveHandler = asyncHandler(async (req, res) => {
  const result = await togglePlayerActive(req.params.id);
  res.json(result);
});
