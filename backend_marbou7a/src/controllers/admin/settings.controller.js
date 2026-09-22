import { z } from "zod";
import { query } from "../../config/db.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { hashPassword, comparePassword } from "../../services/auth.service.js";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4),
});

export const changePasswordHandler = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = passwordSchema.parse(req.body);

  const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: "Compte introuvable." });

  const match = await comparePassword(currentPassword, user.password_hash);
  if (!match) {
    const err = new Error("Mot de passe actuel incorrect.");
    err.status = 401;
    throw err;
  }

  const newHash = await hashPassword(newPassword);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, req.user.id]);
  res.json({ ok: true });
});
