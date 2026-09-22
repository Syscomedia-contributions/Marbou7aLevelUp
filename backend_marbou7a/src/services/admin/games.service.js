import { query } from "../../config/db.js";

export async function listGames({ status, categoryKey, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`gs.status = $${params.length}`);
  }
  if (categoryKey) {
    params.push(categoryKey);
    conditions.push(`gs.category_key = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  const countRes = await query(`SELECT count(*)::int AS total FROM game_sessions gs ${where}`, params);
  const total = countRes.rows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `SELECT gs.id, gs.category_key, gs.status, gs.correct_count, gs.wrong_count, gs.points_earned,
            gs.level_up_bonus, gs.created_at, gs.completed_at,
            u.pseudo AS player_pseudo, u.phone AS player_phone
     FROM game_sessions gs
     LEFT JOIN users u ON u.id = gs.user_id
     ${where}
     ORDER BY gs.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { items: rows, total, page, pageSize };
}

export async function getGame(id) {
  const { rows } = await query(
    `SELECT gs.*, u.pseudo AS player_pseudo, u.phone AS player_phone
     FROM game_sessions gs LEFT JOIN users u ON u.id = gs.user_id
     WHERE gs.id = $1`,
    [id]
  );
  const session = rows[0];
  if (!session) return null;

  const answersRes = await query(
    `SELECT ga.question_id, q.question, ga.choice_index, ga.is_correct, ga.time_ms, ga.answered_at
     FROM game_answers ga JOIN questions q ON q.id = ga.question_id
     WHERE ga.session_id = $1 ORDER BY ga.answered_at ASC`,
    [id]
  );

  return { ...session, answers: answersRes.rows };
}
