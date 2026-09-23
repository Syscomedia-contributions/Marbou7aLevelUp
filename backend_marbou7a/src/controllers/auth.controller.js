import { z } from "zod";
import { query } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { normalizePhone, isValidTunisianMobile } from "../utils/phone.js";
import { startOtp, verifyOtp } from "../services/otp.service.js";
import { hashPassword, comparePassword, issueToken } from "../services/auth.service.js";

const phoneSchema = z.string().refine(isValidTunisianMobile, "Numéro tunisien invalide (8 chiffres attendus)");
const passwordSchema = z.string().min(4, "Le mot de passe doit contenir au moins 4 caractères");

const registerStartSchema = z.object({ phone: phoneSchema });
const registerVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6),
  password: passwordSchema,
});
const loginSchema = z.object({ phone: phoneSchema, password: passwordSchema });

export const registerStart = asyncHandler(async (req, res) => {
  const { phone: rawPhone } = registerStartSchema.parse(req.body);
  const phone = normalizePhone(rawPhone);

  const existing = await query("SELECT id FROM users WHERE phone = $1", [phone]);
  if (existing.rows.length > 0) {
    const err = new Error("Un compte existe déjà avec ce numéro.");
    err.status = 409;
    throw err;
  }

  await startOtp(phone, "register");
  res.json({ ok: true });
});

export const registerVerify = asyncHandler(async (req, res) => {
  const { phone: rawPhone, code, password } = registerVerifySchema.parse(req.body);
  const phone = normalizePhone(rawPhone);

  const result = await verifyOtp(phone, "register", code);
  if (!result.valid) {
    const err = new Error("Code invalide ou expiré.");
    err.status = 422;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const pseudo = `Joueur${phone.slice(-4)}`;

  let user;
  try {
    const { rows } = await query(
      `INSERT INTO users (phone, phone_verified_at, password_hash, pseudo, last_login_at)
       VALUES ($1, now(), $2, $3, now())
       RETURNING id, phone, pseudo, role`,
      [phone, passwordHash, pseudo]
    );
    user = rows[0];
  } catch (err) {
    if (err.code === "23505") {
      const dup = new Error("Un compte existe déjà avec ce numéro.");
      dup.status = 409;
      throw dup;
    }
    throw err;
  }

  const token = issueToken(user);
  res.status(201).json({ token, user: { id: user.id, phone: user.phone, pseudo: user.pseudo, role: user.role } });
});

export const login = asyncHandler(async (req, res) => {
  const { phone: rawPhone, password } = loginSchema.parse(req.body);
  const phone = normalizePhone(rawPhone);

  const { rows } = await query(
    "SELECT id, phone, pseudo, password_hash, role, is_active FROM users WHERE phone = $1",
    [phone]
  );
  const user = rows[0];
  const invalid = () => {
    const err = new Error("Numéro ou mot de passe incorrect.");
    err.status = 401;
    throw err;
  };
  if (!user) return invalid();
  if (user.is_active === false) {
    const err = new Error("Ce compte a été désactivé.");
    err.status = 403;
    throw err;
  }

  const match = await comparePassword(password, user.password_hash);
  if (!match) return invalid();

  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);

  const token = issueToken(user);
  res.json({ token, user: { id: user.id, phone: user.phone, pseudo: user.pseudo, role: user.role } });
});

export const me = asyncHandler(async (req, res) => {
  const { rows } = await query(
    "SELECT id, phone, pseudo, role, created_at FROM users WHERE id = $1",
    [req.user.id]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});
