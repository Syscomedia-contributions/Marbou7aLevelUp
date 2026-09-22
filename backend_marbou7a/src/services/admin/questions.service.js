import { randomUUID } from "node:crypto";
import { query } from "../../config/db.js";

const PAGE_SIZE_DEFAULT = 20;

export async function listQuestions({ search, categoryKey, difficulty, active, page = 1, pageSize = PAGE_SIZE_DEFAULT }) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(question ILIKE $${params.length} OR id ILIKE $${params.length})`);
  }
  if (categoryKey) {
    params.push(categoryKey);
    conditions.push(`category_key = $${params.length}`);
  }
  if (difficulty) {
    params.push(difficulty);
    conditions.push(`difficulty = $${params.length}`);
  }
  if (active !== undefined) {
    params.push(active);
    conditions.push(`is_active = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  const countRes = await query(`SELECT count(*)::int AS total FROM questions ${where}`, params);
  const total = countRes.rows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `SELECT id, category_key, difficulty, subcategory, kind, question, choices, answer_index,
            image_url, image_emoji, audio_url, pairs, clues, puzzle_tiles, fun_fact, is_active
     FROM questions ${where}
     ORDER BY category_key, id
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { items: rows, total, page, pageSize };
}

export async function getQuestion(id) {
  const { rows } = await query("SELECT * FROM questions WHERE id = $1", [id]);
  return rows[0] || null;
}

const notFound = () => {
  const err = new Error("Question introuvable.");
  err.status = 404;
  throw err;
};

export async function createQuestion(data) {
  const id = `${data.categoryKey}-custom-${randomUUID().slice(0, 8)}`;
  const kind = data.kind || "mcq";
  const isMatching = kind === "matching";
  const isPuzzle = kind === "puzzle";
  const noChoices = isMatching || isPuzzle;
  const { rows } = await query(
    `INSERT INTO questions (id, category_key, difficulty, subcategory, kind, question, choices, answer_index, image_url, image_emoji, audio_url, pairs, clues, puzzle_tiles, fun_fact, xp, translations, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 100, '{}', true)
     RETURNING *`,
    [
      id,
      data.categoryKey,
      data.difficulty,
      data.subcategory || "général",
      kind,
      data.question,
      noChoices ? null : JSON.stringify(data.choices),
      noChoices ? null : data.answerIndex,
      data.imageUrl || null,
      data.imageEmoji || null,
      data.audioUrl || null,
      isMatching ? JSON.stringify(data.pairs) : null,
      kind === "whoami" ? JSON.stringify(data.clues) : null,
      isPuzzle ? JSON.stringify(data.puzzleTiles) : null,
      data.funFact || "",
    ]
  );
  return rows[0];
}

export async function updateQuestion(id, data) {
  const existing = await getQuestion(id);
  if (!existing) notFound();

  const kind = data.kind || "mcq";
  const isMatching = kind === "matching";
  const isPuzzle = kind === "puzzle";
  const noChoices = isMatching || isPuzzle;
  const { rows } = await query(
    `UPDATE questions SET
       category_key = $2,
       difficulty = $3,
       subcategory = $4,
       kind = $5,
       question = $6,
       choices = $7,
       answer_index = $8,
       image_url = $9,
       image_emoji = $10,
       audio_url = $11,
       pairs = $12,
       clues = $13,
       puzzle_tiles = $14,
       fun_fact = $15
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.categoryKey,
      data.difficulty,
      data.subcategory || "général",
      kind,
      data.question,
      noChoices ? null : JSON.stringify(data.choices),
      noChoices ? null : data.answerIndex,
      data.imageUrl || null,
      data.imageEmoji || null,
      data.audioUrl || null,
      isMatching ? JSON.stringify(data.pairs) : null,
      kind === "whoami" ? JSON.stringify(data.clues) : null,
      isPuzzle ? JSON.stringify(data.puzzleTiles) : null,
      data.funFact || "",
    ]
  );
  return rows[0];
}

export async function deleteQuestion(id) {
  const { rowCount } = await query("DELETE FROM questions WHERE id = $1", [id]);
  if (rowCount === 0) notFound();
}

export async function toggleQuestion(id) {
  const { rows } = await query(
    "UPDATE questions SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active",
    [id]
  );
  if (!rows[0]) notFound();
  return rows[0];
}
