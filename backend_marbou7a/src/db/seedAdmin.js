// One-time bootstrap script for the single admin account. Run manually:
//   npm run seed:admin
// Reads ADMIN_BOOTSTRAP_PHONE / ADMIN_BOOTSTRAP_PASSWORD from .env, creates the
// user if it doesn't exist yet (or promotes an existing account to role='admin'
// and resets its password if it already does), then exits.
import "dotenv/config";
import { pool } from "../config/db.js";
import { normalizePhone, isValidTunisianMobile } from "../utils/phone.js";
import { hashPassword } from "../services/auth.service.js";

async function seedAdmin() {
  const rawPhone = process.env.ADMIN_BOOTSTRAP_PHONE;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!rawPhone || !password) {
    throw new Error(
      "Set ADMIN_BOOTSTRAP_PHONE and ADMIN_BOOTSTRAP_PASSWORD in backend_marbou7a/.env before running this script."
    );
  }
  const phone = normalizePhone(rawPhone);
  if (!isValidTunisianMobile(phone)) {
    throw new Error(`ADMIN_BOOTSTRAP_PHONE "${rawPhone}" is not a valid 8-digit Tunisian number.`);
  }
  if (password.length < 4) {
    throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 4 characters.");
  }

  const passwordHash = await hashPassword(password);
  const pseudo = "Admin";

  const { rows } = await pool.query(
    `INSERT INTO users (phone, phone_verified_at, password_hash, pseudo, role, last_login_at)
     VALUES ($1, now(), $2, $3, 'admin', now())
     ON CONFLICT (phone) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       is_active = true
     RETURNING id, phone, pseudo, role`,
    [phone, passwordHash, pseudo]
  );

  console.log(`Admin account ready: ${rows[0].phone} (role=${rows[0].role}, id=${rows[0].id})`);
  await pool.end();
}

seedAdmin().catch((err) => {
  console.error("seed:admin failed:", err.message);
  process.exit(1);
});
