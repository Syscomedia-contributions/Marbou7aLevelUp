import { query } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const listCategories = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT key, name, emoji, tagline, subcategories, theme, immersive_messages, translations FROM categories ORDER BY key`
  );
  res.json({
    categories: rows.map((r) => ({
      key: r.key,
      name: r.name,
      emoji: r.emoji,
      tagline: r.tagline,
      subcategories: r.subcategories,
      theme: r.theme,
      immersiveMessages: r.immersive_messages,
      translations: r.translations,
    })),
  });
});
