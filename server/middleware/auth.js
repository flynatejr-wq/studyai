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
    // C-3: Verify the user still exists — catches deleted accounts and post-deletion tokens
    const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(req.user.id);
    if (!exists) return res.status(401).json({ error: "Account no longer exists." });
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

export function signToken(payload) {
  // C-3: 7-day expiry (down from 30d). L-1: Sign only {id} — email is unnecessary and can become stale.
  return jwt.sign({ id: payload.id }, JWT_SECRET, { expiresIn: "7d" });
}
