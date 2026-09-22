import { query } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const getLeaderboard = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT u.pseudo, p.xp, p.level
     FROM player_progression p
     JOIN users u ON u.id = p.user_id
     WHERE u.role = 'player' AND u.is_active = true
     ORDER BY p.xp DESC
     LIMIT 50`
  );
  res.json({ leaderboard: rows });
});
