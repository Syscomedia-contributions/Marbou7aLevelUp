const DEFAULT_TT_PREFIXES = [
  "21", "30", "31", "32", "33", "36", "37",
  "50", "51", "90", "91", "92", "93", "94", "95", "97", "98", "99",
];

export function ttPrefixes() {
  const fromEnv = process.env.TT_PREFIXES;
  if (fromEnv) return fromEnv.split(",").map((p) => p.trim()).filter(Boolean);
  return DEFAULT_TT_PREFIXES;
}

/** Strips spaces, dashes, and an optional +216/216/00216 country code. */
export function normalizePhone(raw) {
  if (typeof raw !== "string") return null;
  let cleaned = raw.replace(/[\s-]/g, "");
  cleaned = cleaned.replace(/^\+?216/, "").replace(/^00216/, "");
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
