import { query } from "../../config/db.js";

export async function listPlayers({ search, page = 1, pageSize = 20 }) {
  const conditions = ["role = 'player'"];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(phone ILIKE $${params.length} OR pseudo ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const offset = (page - 1) * pageSize;

  const countRes = await query(`SELECT count(*)::int AS total FROM users ${where}`, params);
  const total = countRes.rows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `SELECT u.id, u.phone, u.pseudo, u.is_active, u.created_at, u.last_login_at,
            coalesce(p.xp, 0) AS xp, coalesce(p.level, 1) AS level,
            (SELECT count(*)::int FROM game_sessions gs WHERE gs.user_id = u.id) AS games_played
     FROM users u
     LEFT JOIN player_progression p ON p.user_id = u.id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { items: rows, total, page, pageSize };
}

export async function getPlayer(id) {
  const { rows } = await query(
    `SELECT u.id, u.phone, u.pseudo, u.is_active, u.created_at, u.last_login_at,
            coalesce(p.xp, 0) AS xp, coalesce(p.level, 1) AS level, coalesce(p.per_category, '{}') AS per_category
     FROM users u
     LEFT JOIN player_progression p ON p.user_id = u.id
     WHERE u.id = $1 AND u.role = 'player'`,
    [id]
  );
  const player = rows[0];
  if (!player) return null;

  const badgesRes = await query(
    `SELECT b.code, b.label, b.emoji, ub.earned_at
     FROM user_badges ub JOIN badges b ON b.code = ub.badge_code
     WHERE ub.user_id = $1 ORDER BY ub.earned_at DESC`,
    [id]
  );

  const gamesRes = await query(
    `SELECT id, category_key, status, correct_count, wrong_count, points_earned, created_at, completed_at
     FROM game_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [id]
  );

  return { ...player, badges: badgesRes.rows, recentGames: gamesRes.rows };
}

export async function togglePlayerActive(id) {
  const { rows } = await query(
    "UPDATE users SET is_active = NOT is_active WHERE id = $1 AND role = 'player' RETURNING id, is_active",
    [id]
  );
  if (!rows[0]) {
    const err = new Error("Joueur introuvable.");
    err.status = 404;
    throw err;
  }
  return rows[0];
}
