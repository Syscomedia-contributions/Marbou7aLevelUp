import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool, withTransaction } from "../config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  const raw = readFileSync(path.join(__dirname, "seed-data.json"), "utf8");
  const { categories, questions } = JSON.parse(raw);

  await withTransaction(async (client) => {
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (key, name, emoji, tagline, subcategories, theme, immersive_messages, translations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (key) DO UPDATE SET
           name = EXCLUDED.name,
           emoji = EXCLUDED.emoji,
           tagline = EXCLUDED.tagline,
           subcategories = EXCLUDED.subcategories,
           theme = EXCLUDED.theme,
           immersive_messages = EXCLUDED.immersive_messages,
           translations = EXCLUDED.translations`,
        [
          cat.key,
          cat.name,
          cat.emoji,
          cat.tagline,
          JSON.stringify(cat.subcategories),
          JSON.stringify(cat.theme),
          JSON.stringify(cat.immersiveMessages),
          JSON.stringify(cat.translations),
        ]
      );
    }

    for (const q of questions) {
      await client.query(
        `INSERT INTO questions (id, category_key, difficulty, subcategory, kind, question, choices, answer_index, image_url, image_emoji, audio_url, pairs, clues, puzzle_tiles, fun_fact, xp, translations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO UPDATE SET
           category_key = EXCLUDED.category_key,
           difficulty = EXCLUDED.difficulty,
           subcategory = EXCLUDED.subcategory,
           kind = EXCLUDED.kind,
           question = EXCLUDED.question,
           choices = EXCLUDED.choices,
           answer_index = EXCLUDED.answer_index,
           image_url = EXCLUDED.image_url,
           image_emoji = EXCLUDED.image_emoji,
           audio_url = EXCLUDED.audio_url,
           pairs = EXCLUDED.pairs,
           clues = EXCLUDED.clues,
           puzzle_tiles = EXCLUDED.puzzle_tiles,
           fun_fact = EXCLUDED.fun_fact,
           xp = EXCLUDED.xp,
           translations = EXCLUDED.translations`,
        [
          q.id,
          q.categoryKey,
          q.difficulty,
          q.subcategory,
          q.kind,
          q.question,
          q.choices ? JSON.stringify(q.choices) : null,
          q.answerIndex,
          q.imageUrl,
          q.imageEmoji,
          q.audioUrl,
          q.pairs ? JSON.stringify(q.pairs) : null,
          q.clues ? JSON.stringify(q.clues) : null,
          q.puzzleTiles ? JSON.stringify(q.puzzleTiles) : null,
          q.funFact,
          q.xp,
          JSON.stringify(q.translations),
        ]
      );
    }
  });

  console.log(`Seeded ${categories.length} categories and ${questions.length} questions.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
