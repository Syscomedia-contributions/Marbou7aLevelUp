const DEFAULT_TT_PREFIXES = [
  "21", "30", "31", "32", "33", "36", "37",
  "50", "51", "90", "91", "92", "93", "94", "95", "97", "98", "99",
];

export function ttPrefixes() {
  const fromEnv = process.env.TT_PREFIXES;
  if (fromEnv) return fromEnv.split(",").map((p) => p.trim()).filter(Boolean);
  return DEFAULT_TT_PREFIXES;
}

/**
 * Strips spaces and dashes. A leading 216, +216, or 00216 is removed only when
 * 8 digits remain, so a local number that itself starts with 216 is kept.
 */
export function normalizePhone(raw) {
  if (typeof raw !== "string") return null;
  let cleaned = raw.replace(/[\s-]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("00216") && /^\d{8}$/.test(cleaned.slice(5))) {
    cleaned = cleaned.slice(5);
  } else if (cleaned.startsWith("216") && /^\d{8}$/.test(cleaned.slice(3))) {
    cleaned = cleaned.slice(3);
  }
  return cleaned;
}

export function isValidTunisianMobile(raw) {
  const cleaned = normalizePhone(raw);
  return !!cleaned && /^\d{8}$/.test(cleaned);
}

export function isTunisieTelecomNumber(raw) {
  const cleaned = normalizePhone(raw);
  if (!cleaned || !/^\d{8}$/.test(cleaned)) return false;
  const prefix = cleaned.slice(0, 2);
  return ttPrefixes().includes(prefix);
}
