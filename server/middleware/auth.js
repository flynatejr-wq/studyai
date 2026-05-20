import jwt from "jsonwebtoken";
import db from "../db.js";

// C-1: No fallback secret — crash at startup if missing so misconfiguration is caught immediately
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Server cannot start without it.");
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const token = header.split(" ")[1];
    // C-2: Restrict to HS256 only — prevents "alg: none" and algorithm confusion attacks
    req.user = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    // C-3: Verify the user still exists and is not banned — checks live DB, not just JWT
    const dbUser = db.prepare("SELECT id, is_banned FROM users WHERE id = ?").get(req.user.id);
    if (!dbUser) return res.status(401).json({ error: "Account no longer exists." });
    if (dbUser.is_banned) return res.status(403).json({ error: "Your account has been suspended. Contact support for assistance." });
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Admin-only guard — always fetches role from DB so a stale JWT can never grant admin access.
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const dbUser = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.id);
    if (!dbUser || dbUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    next();
  });
}

export function signToken(payload) {
  // C-3: 7-day expiry (down from 30d). L-1: Sign only {id} — email is unnecessary and can become stale.
  return jwt.sign({ id: payload.id }, JWT_SECRET, { expiresIn: "7d" });
}
