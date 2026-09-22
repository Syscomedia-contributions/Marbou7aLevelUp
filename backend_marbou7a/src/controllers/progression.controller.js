import { query } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const getProgression = asyncHandler(async (req, res) => {
  const { rows } = await query(
    "SELECT xp, level, per_category FROM player_progression WHERE user_id = $1",
    [req.user.id]
  );
  const badgesRes = await query("SELECT badge_code FROM user_badges WHERE user_id = $1", [req.user.id]);
  const progression = rows[0]
    ? { xp: rows[0].xp, level: rows[0].level, perCategory: rows[0].per_category }
    : { xp: 0, level: 1, perCategory: {} };

  res.json({ ...progression, badges: badgesRes.rows.map((r) => r.badge_code) });
});
