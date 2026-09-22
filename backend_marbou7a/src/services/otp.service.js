import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { query } from "../config/db.js";
import { env } from "../config/env.js";
import { getSmsProvider } from "./sms/smsProvider.js";

const MAX_VERIFY_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 12;

function generateCode() {
  const max = 10 ** env.otpLength;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(env.otpLength, "0");
}

export async function startOtp(phone, purpose) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60_000);

  await query(
    `INSERT INTO otp_codes (phone, code_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
    [phone, codeHash, purpose, expiresAt]
  );

  const provider = getSmsProvider();
  await provider.send({
    to: phone,
    message: `Marbou7a Cash — votre code de vérification : ${code} (valable ${env.otpTtlMinutes} min).`,
  });
}

export async function verifyOtp(phone, purpose, submittedCode) {
  const { rows } = await query(
    `SELECT id, code_hash, expires_at, consumed_at, attempt_count
     FROM otp_codes
     WHERE phone = $1 AND purpose = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, purpose]
  );
  const record = rows[0];
  if (!record) return { valid: false, reason: "not_found" };
  if (record.consumed_at) return { valid: false, reason: "already_used" };
  if (new Date(record.expires_at) < new Date()) return { valid: false, reason: "expired" };
  if (record.attempt_count >= MAX_VERIFY_ATTEMPTS) return { valid: false, reason: "too_many_attempts" };

  const match = await bcrypt.compare(submittedCode, record.code_hash);
  if (!match) {
    await query(`UPDATE otp_codes SET attempt_count = attempt_count + 1 WHERE id = $1`, [record.id]);
    return { valid: false, reason: "incorrect" };
  }

  await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [record.id]);
  return { valid: true };
}
