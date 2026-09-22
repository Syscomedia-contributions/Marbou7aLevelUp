import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DATA_DIR = path.resolve(__dirname, "../../Marbou7a Level Up/src/data/quiz");

const { QUIZ_CATEGORIES } = await import(pathToFileURL(path.join(FRONTEND_DATA_DIR, "categories.ts")));
const { CATEGORY_TR, QUESTION_TR } = await import(pathToFileURL(path.join(FRONTEND_DATA_DIR, "translations.ts")));

const categories = QUIZ_CATEGORIES.map((cat) => ({
  key: cat.key,
  name: cat.name,
  emoji: cat.emoji,
  tagline: cat.tagline,
  subcategories: cat.subcategories,
  theme: cat.theme,
  immersiveMessages: cat.immersiveMessages,
  translations: CATEGORY_TR[cat.key] ?? {},
}));

const questions = QUIZ_CATEGORIES.flatMap((cat) =>
  cat.questions.map((q) => ({
    id: q.id,
    categoryKey: cat.key,
    difficulty: q.difficulty,
    subcategory: q.subcategory,
    kind: q.kind ?? "mcq",
    question: q.question,
    choices: q.choices ?? null,
    answerIndex: typeof q.answer === "number" ? q.answer : null,
    imageUrl: q.imageUrl ?? null,
    imageEmoji: q.imageEmoji ?? null,
    pairs: q.pairs ?? null,
    funFact: q.funFact,
    xp: q.xp,
    translations: QUESTION_TR[q.id] ?? {},
  }))
);

writeFileSync(
  path.resolve(__dirname, "../src/db/seed-data.json"),
  JSON.stringify({ categories, questions }, null, 2),
  "utf8"
);

console.log(`Extracted ${categories.length} categories and ${questions.length} questions.`);
