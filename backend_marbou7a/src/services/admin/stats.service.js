import { query } from "../../config/db.js";

export async function getStatsSummary() {
  const [players, activePlayers, games, gamesInProgress, earnings, alerts] = await Promise.all([
    query("SELECT count(*)::int AS n FROM users WHERE role = 'player'"),
    query(
      "SELECT count(*)::int AS n FROM users WHERE role = 'player' AND last_login_at >= now() - interval '7 days'"
    ),
    query("SELECT count(*)::int AS n FROM game_sessions"),
    query("SELECT count(*)::int AS n FROM game_sessions WHERE status = 'in_progress'"),
    query("SELECT coalesce(sum(points_earned), 0)::int AS n FROM game_sessions WHERE status = 'completed'"),
    query("SELECT count(*)::int AS n FROM anti_cheat_flags WHERE resolved = false"),
  ]);

  return {
    totalPlayers: players.rows[0].n,
    activePlayers: activePlayers.rows[0].n,
    totalGames: games.rows[0].n,
    gamesInProgress: gamesInProgress.rows[0].n,
    totalEarnings: earnings.rows[0].n,
    openAlerts: alerts.rows[0].n,
  };
}

export async function getStatsCharts() {
  const [signups, gamesPerDay] = await Promise.all([
    query(
      `SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS n
       FROM users WHERE role = 'player' AND created_at >= now() - interval '30 days'
       GROUP BY day ORDER BY day ASC`
    ),
    query(
      `SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS n
       FROM game_sessions WHERE created_at >= now() - interval '30 days'
       GROUP BY day ORDER BY day ASC`
    ),
  ]);

  return { signups: signups.rows, gamesPerDay: gamesPerDay.rows };
}
