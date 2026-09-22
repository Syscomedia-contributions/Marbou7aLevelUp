import { verifyToken } from "../services/auth.service.js";

function extractUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    return { id: payload.sub, phone: payload.phone, role: payload.role || "player" };
  } catch {
    return null;
  }
}

/** Populates req.user if a valid JWT is present; never blocks the request. */
export function optionalAuth(req, _res, next) {
  req.user = extractUser(req);
  next();
}

/** Requires a valid JWT; responds 401 otherwise. */
export function requireAuth(req, res, next) {
  const user = extractUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  req.user = user;
  next();
}

/** Requires an authenticated admin. Chain after requireAuth (or use standalone —
 *  it re-derives req.user itself so it's safe either way). Responds 401 if not
 *  authenticated, 403 if authenticated but not an admin. */
export function requireAdmin(req, res, next) {
  const user = req.user || extractUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  if (user.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  req.user = user;
  next();
}
