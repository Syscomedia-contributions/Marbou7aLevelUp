import { query, withTransaction } from "../../config/db.js";

// Heuristic thresholds — MVP, no ML: flag sessions that look statistically
// implausible for a human answering real trivia questions.
const FAST_ANSWER_MS = 1200;
const FAST_ANSWER_MIN_CORRECT_RATIO = 0.8;
const PERFECT_STREAK_LENGTH = 5;

/** Scans completed sessions not yet flagged for the known heuristics and
 *  inserts any newly-detected flags. Returns how many new flags were created. */
export async function scanForFlags() {
  let created = 0;

  await withTransaction(async (client) => {
    // Heuristic 1: suspiciously fast average answer time with a high score.
    const fast = await client.query(
      `SELECT gs.id AS session_id, gs.user_id, avg(ga.time_ms) AS avg_ms,
              gs.correct_count, (gs.correct_count + gs.wrong_count) AS total
       FROM game_sessions gs
       JOIN game_answers ga ON ga.session_id = gs.id
       WHERE gs.status = 'completed' AND gs.user_id IS NOT NULL
       GROUP BY gs.id
       HAVING avg(ga.time_ms) < $1
          AND gs.correct_count::float / NULLIF(gs.correct_count + gs.wrong_count, 0) >= $2`,
      [FAST_ANSWER_MS, FAST_ANSWER_MIN_CORRECT_RATIO]
    );
    for (const row of fast.rows) {
      const res = await client.query(
        `INSERT INTO anti_cheat_flags (session_id, user_id, reason, severity)
         VALUES ($1, $2, 'fast_answers', 'high')
         ON CONFLICT (session_id, reason) DO NOTHING
         RETURNING id`,
        [row.session_id, row.user_id]
      );
      if (res.rows.length) created += 1;
    }

    // Heuristic 2: N consecutive perfect sessions in a row for the same player.
    const players = await client.query(
      `SELECT DISTINCT user_id FROM game_sessions WHERE status = 'completed' AND user_id IS NOT NULL`
    );
    for (const { user_id } of players.rows) {
      const recent = await client.query(
        `SELECT id, correct_count, wrong_count FROM game_sessions
         WHERE user_id = $1 AND status = 'completed'
         ORDER BY completed_at DESC LIMIT $2`,
        [user_id, PERFECT_STREAK_LENGTH]
      );
      const allPerfect =
        recent.rows.length === PERFECT_STREAK_LENGTH && recent.rows.every((r) => r.wrong_count === 0 && r.correct_count > 0);
      if (allPerfect) {
        const latestSessionId = recent.rows[0].id;
        const res = await client.query(
          `INSERT INTO anti_cheat_flags (session_id, user_id, reason, severity)
           VALUES ($1, $2, 'perfect_streak', 'medium')
           ON CONFLICT (session_id, reason) DO NOTHING
           RETURNING id`,
          [latestSessionId, user_id]
        );
        if (res.rows.length) created += 1;
      }
    }
  });

  return created;
}

export async function listFlags({ resolved, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (resolved !== undefined) {
    params.push(resolved);
    conditions.push(`f.resolved = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  const countRes = await query(`SELECT count(*)::int AS total FROM anti_cheat_flags f ${where}`, params);
  const total = countRes.rows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `SELECT f.id, f.session_id, f.reason, f.severity, f.detected_at, f.resolved, f.resolved_at,
            u.pseudo AS player_pseudo, u.phone AS player_phone,
            gs.category_key, gs.correct_count, gs.wrong_count
     FROM anti_cheat_flags f
     LEFT JOIN users u ON u.id = f.user_id
     LEFT JOIN game_sessions gs ON gs.id = f.session_id
     ${where}
     ORDER BY f.detected_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { items: rows, total, page, pageSize };
}

export async function resolveFlag(id) {
  const { rows } = await query(
    "UPDATE anti_cheat_flags SET resolved = true, resolved_at = now() WHERE id = $1 RETURNING *",
    [id]
  );
  if (!rows[0]) {
    const err = new Error("Alerte introuvable.");
    err.status = 404;
    throw err;
  }
  return rows[0];
}
