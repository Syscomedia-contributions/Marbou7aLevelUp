import { query } from "../../config/db.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

export const getAdminLeaderboard = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.pseudo, u.phone, p.xp, p.level,
            (SELECT count(*)::int FROM game_sessions gs WHERE gs.user_id = u.id) AS games_played
     FROM player_progression p
     JOIN users u ON u.id = p.user_id
     WHERE u.role = 'player' AND u.is_active = true
     ORDER BY p.xp DESC
     LIMIT 100`
  );
  res.json({ leaderboard: rows });
});
