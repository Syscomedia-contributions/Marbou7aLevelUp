import { query } from "../../config/db.js";

export async function getEarningsSummary() {
  const { rows } = await query(
    `SELECT
       coalesce(sum(points_earned), 0)::int AS total_points,
       coalesce(sum(level_up_bonus), 0)::int AS total_bonus,
       count(*)::int AS total_sessions,
       coalesce(sum(correct_count), 0)::int AS total_correct,
       coalesce(sum(wrong_count), 0)::int AS total_wrong
     FROM game_sessions
     WHERE status = 'completed'`
  );
  return rows[0];
}

export async function getEarningsByCategory() {
  const { rows } = await query(
    `SELECT category_key, coalesce(sum(points_earned), 0)::int AS points, count(*)::int AS sessions
     FROM game_sessions
     WHERE status = 'completed'
     GROUP BY category_key
     ORDER BY points DESC`
  );
  return rows;
}

export async function getEarningsTimeseries() {
  const { rows } = await query(
    `SELECT date_trunc('day', completed_at)::date AS day, coalesce(sum(points_earned), 0)::int AS points
     FROM game_sessions
     WHERE status = 'completed' AND completed_at >= now() - interval '30 days'
     GROUP BY day
     ORDER BY day ASC`
  );
  return rows;
}
