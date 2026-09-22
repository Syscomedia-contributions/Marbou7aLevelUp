import { query, withTransaction } from "../config/db.js";
import { applyRunResult, computeSpeedBonus } from "./scoring.service.js";

const QUESTIONS_PER_GAME = 10;

const shuffle = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** One question of each rare kind (whoami/sound/puzzle) is guaranteed per game when available. */
const RARE_KINDS = ["whoami", "sound", "puzzle"];

const pickSessionQuestions = (rows) => {
  const rare = RARE_KINDS.map((kind) => shuffle(rows.filter((r) => r.kind === kind)).slice(0, 1)).flat();
  const rareIds = new Set(rare.map((r) => r.id));
  const rest = shuffle(rows.filter((r) => !rareIds.has(r.id))).slice(
    0,
    Math.max(0, QUESTIONS_PER_GAME - rare.length)
  );
  return shuffle([...rare, ...rest]).slice(0, Math.min(QUESTIONS_PER_GAME, rows.length));
};

/** Strips the correct answer from a DB question row before sending it to the client. */
function toPublicQuestion(row) {
  const base = {
    id: row.id,
    categoryKey: row.category_key,
    difficulty: row.difficulty,
    subcategory: row.subcategory,
    kind: row.kind,
    question: row.question_text,
    imageUrl: row.image_url,
    imageEmoji: row.image_emoji,
    audioUrl: row.audio_url,
    funFact: row.fun_fact,
    xp: row.xp,
    translations: row.translations,
  };
  if (row.kind === "matching") {
    const pairs = row.pairs || [];
    base.matchingLeft = pairs.map((p) => p.left);
    base.matchingRightShuffled = shuffle(pairs.map((p) => p.right));
  } else if (row.kind === "puzzle") {
    const tiles = row.puzzle_tiles || [];
    // Stored array order IS the correct chronological order — never expose it,
    // send a shuffled copy (still no "answer" field) for the client to reorder.
    base.puzzleTilesShuffled = shuffle(
      tiles.map((tile) => ({
        id: tile.id,
        label: tile.label,
        imageUrl: tile.imageUrl,
        imagePosition: tile.imagePosition,
      }))
    );
  } else {
    base.choices = row.choices;
    if (row.kind === "whoami") base.clues = row.clues || [];
  }
  return base;
}

export async function createGameSession({ userId, categoryKey }) {
  const catRes = await query("SELECT key FROM categories WHERE key = $1", [categoryKey]);
  if (catRes.rows.length === 0) {
    const err = new Error("Unknown category");
    err.status = 404;
    throw err;
  }

  const allQuestions = await query(
    `SELECT id, category_key, difficulty, subcategory, kind, choices, image_url, image_emoji, audio_url, pairs, clues, puzzle_tiles, fun_fact, xp, translations, question
     FROM questions WHERE category_key = $1 AND is_active = true`,
    [categoryKey]
  );
  if (allQuestions.rows.length === 0) {
    const err = new Error("No questions available for this category");
    err.status = 404;
    throw err;
  }

  const picked = pickSessionQuestions(allQuestions.rows);
  const questionIds = picked.map((q) => q.id);

  const insert = await query(
    `INSERT INTO game_sessions (user_id, category_key, question_ids)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, categoryKey, questionIds]
  );

  return {
    sessionId: insert.rows[0].id,
    questions: picked.map((row) => toPublicQuestion({ ...row, question_text: row.question })),
  };
}

async function loadSession(sessionId) {
  const { rows } = await query("SELECT * FROM game_sessions WHERE id = $1", [sessionId]);
  return rows[0] || null;
}

export async function submitAnswer({ sessionId, userId, questionId, choiceIndex, matches, tileOrder, timeMs }) {
  const session = await loadSession(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.status !== "in_progress") {
    const err = new Error("Session already finished");
    err.status = 409;
    throw err;
  }
  if (session.user_id && session.user_id !== userId) {
    const err = new Error("Not your session");
    err.status = 403;
    throw err;
  }
  if (!session.question_ids.includes(questionId)) {
    const err = new Error("Question not part of this session");
    err.status = 400;
    throw err;
  }

  const { rows } = await query(
    "SELECT id, kind, answer_index, pairs, puzzle_tiles FROM questions WHERE id = $1",
    [questionId]
  );
  const question = rows[0];
  if (!question) {
    const err = new Error("Question not found");
    err.status = 404;
    throw err;
  }

  let isCorrect = false;
  if (question.kind === "matching") {
    const pairs = question.pairs || [];
    isCorrect =
      !!matches &&
      pairs.length > 0 &&
      pairs.every((p) => matches[p.left] === p.right);
  } else if (question.kind === "puzzle") {
    const tiles = question.puzzle_tiles || [];
    isCorrect =
      Array.isArray(tileOrder) &&
      tiles.length > 0 &&
      tileOrder.length === tiles.length &&
      tiles.every((tile, index) => tileOrder[index] === tile.id);
  } else {
    isCorrect = typeof choiceIndex === "number" && choiceIndex === question.answer_index;
  }

  // Speed bonus (whoami / sound only) — computed server-side from time_ms,
  // the client's declared elapsed time is never trusted for scoring beyond this.
  const speedBonus =
    isCorrect && (question.kind === "whoami" || question.kind === "sound")
      ? computeSpeedBonus(timeMs)
      : 0;

  try {
    await query(
      `INSERT INTO game_answers (session_id, question_id, choice_index, matches, tile_order, is_correct, time_ms, speed_bonus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sessionId,
        questionId,
        typeof choiceIndex === "number" ? choiceIndex : null,
        matches ? JSON.stringify(matches) : null,
        Array.isArray(tileOrder) ? JSON.stringify(tileOrder) : null,
        isCorrect,
        timeMs ?? null,
        speedBonus,
      ]
    );
  } catch (err) {
    if (err.code === "23505") {
      const dup = new Error("Question already answered");
      dup.status = 409;
      throw dup;
    }
    throw err;
  }

  return {
    isCorrect,
    correctIndex: question.kind === "matching" || question.kind === "puzzle" ? null : question.answer_index,
    correctPairs: question.kind === "matching" ? question.pairs : null,
    correctTileOrder: question.kind === "puzzle" ? (question.puzzle_tiles || []).map((t) => t.id) : null,
    speedBonus,
  };
}

async function loadProgressionRow(userId) {
  const { rows } = await query("SELECT xp, level, per_category FROM player_progression WHERE user_id = $1", [userId]);
  if (rows.length === 0) return { xp: 0, level: 1, perCategory: {} };
  return { xp: rows[0].xp, level: rows[0].level, perCategory: rows[0].per_category };
}

async function loadBadges(userId) {
  const { rows } = await query("SELECT badge_code FROM user_badges WHERE user_id = $1", [userId]);
  return rows.map((r) => r.badge_code);
}

export async function finishSession({ sessionId, userId, guestProgression }) {
  const session = await loadSession(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.status !== "in_progress") {
    const err = new Error("Session already finished");
    err.status = 409;
    throw err;
  }
  if (session.user_id && session.user_id !== userId) {
    const err = new Error("Not your session");
    err.status = 403;
    throw err;
  }

  const answers = await query(
    "SELECT is_correct, speed_bonus FROM game_answers WHERE session_id = $1",
    [sessionId]
  );
  const correct = answers.rows.filter((a) => a.is_correct).length;
  const wrong = answers.rows.length - correct;
  const total = session.question_ids.length;
  const speedBonus = answers.rows.reduce((sum, a) => sum + (a.speed_bonus || 0), 0);

  const isGuest = !session.user_id;
  let prev;
  if (isGuest) {
    prev = {
      xp: Number(guestProgression?.xp) || 0,
      badges: Array.isArray(guestProgression?.badges) ? guestProgression.badges : [],
      perCategory: guestProgression?.perCategory && typeof guestProgression.perCategory === "object" ? guestProgression.perCategory : {},
    };
  } else {
    const row = await loadProgressionRow(userId);
    prev = { xp: row.xp, badges: await loadBadges(userId), perCategory: row.perCategory };
  }

  const result = applyRunResult(prev, { category: session.category_key, correct, wrong, total, speedBonus });

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE game_sessions
       SET status = 'completed', correct_count = $2, wrong_count = $3,
           points_earned = $4, level_up_bonus = $5, completed_at = now()
       WHERE id = $1`,
      [sessionId, correct, wrong, result.pointsEarned, result.levelUpBonus]
    );

    if (!isGuest) {
      await client.query(
        `INSERT INTO player_progression (user_id, xp, level, per_category, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (user_id) DO UPDATE SET
           xp = EXCLUDED.xp, level = EXCLUDED.level, per_category = EXCLUDED.per_category, updated_at = now()`,
        [userId, result.next.xp, result.next.level, JSON.stringify(result.next.perCategory)]
      );
      for (const badge of result.newBadges) {
        await client.query(
          `INSERT INTO user_badges (user_id, badge_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, badge]
        );
      }
    }
  });

  return {
    leveledUp: result.leveledUp,
    newBadges: result.newBadges,
    finalXp: result.next.xp,
    finalLevel: result.next.level,
    pointsEarned: result.pointsEarned,
    levelUpBonus: result.levelUpBonus,
    speedBonus,
    correct,
    wrong,
    total,
    // Full updated state — guests persist this wholesale to localStorage since the
    // server has no account to store it against; authenticated clients can use it
    // for immediate UI state without an extra GET /progression round-trip.
    progression: {
      xp: result.next.xp,
      level: result.next.level,
      badges: result.next.badges,
      perCategory: result.next.perCategory,
    },
  };
}
