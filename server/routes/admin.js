import express from "express";
import { v4 as uuid } from "uuid";
import { timingSafeEqual } from "crypto";
import db from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const VALID_PLANS = ["free", "pro", "lifetime"];
const VALID_ROLES = ["user", "admin"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function auditLog(adminId, adminEmail, targetUserId, targetEmail, action, oldValue, newValue) {
  db.prepare(
    `INSERT INTO audit_logs (id, admin_id, admin_email, target_user_id, target_email, action, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuid(), adminId, adminEmail, targetUserId, targetEmail, action,
    oldValue != null ? String(oldValue) : null,
    newValue != null ? String(newValue) : null,
  );
}

function safeUser(u) {
  if (!u) return null;
  const { password_hash, reset_token, reset_token_expires, ...rest } = u;
  return rest;
}

// ── Bootstrap: promote any user to admin (requires ADMIN_SETUP_SECRET env var) ──
// No auth required — used to create/manage admin accounts.
// Protected only by the shared secret set in environment variables.
router.post("/setup", (req, res) => {
  const secret = process.env.ADMIN_SETUP_SECRET;
  if (!secret) {
    return res.status(503).json({ error: "Admin setup is not configured on this server." });
  }
  const { email, setup_secret } = req.body;
  if (!email || !setup_secret) {
    return res.status(400).json({ error: "email and setup_secret are required." });
  }
  // Constant-time comparison to prevent timing attacks on secret comparison
  try {
    const provided = Buffer.from(setup_secret);
    const expected = Buffer.from(secret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return res.status(403).json({ error: "Invalid setup secret." });
    }
  } catch {
    return res.status(403).json({ error: "Invalid setup secret." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user) return res.status(404).json({ error: "No account found with that email." });
  if (user.role === "admin") return res.json({ message: "User is already an admin." });

  db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
  auditLog("system", "system@system", user.id, user.email, "set_role", user.role || "user", "admin");
  res.json({ message: "Admin role granted successfully." });
});

// All routes below require admin auth
router.use(requireAdmin);

// ── Platform stats ────────────────────────────────────────────────────────────
router.get("/stats", (req, res) => {
  const totalUsers      = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const proUsers        = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'pro'").get().c;
  const lifetimeUsers   = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'lifetime'").get().c;
  const freeUsers       = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'free'").get().c;
  const bannedUsers     = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_banned = 1").get().c;
  const whitelisted     = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_whitelisted = 1").get().c;
  const adminCount      = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get().c;
  const totalGuides     = db.prepare("SELECT COUNT(*) as c FROM guides").get().c;
  const totalAuditLogs  = db.prepare("SELECT COUNT(*) as c FROM audit_logs").get().c;
  const newUsersToday   = db.prepare(
    "SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')"
  ).get().c;

  res.json({
    totalUsers, proUsers, lifetimeUsers, freeUsers, bannedUsers,
    whitelisted, adminCount, totalGuides, totalAuditLogs, newUsersToday,
  });
});

// ── User list / search ────────────────────────────────────────────────────────
router.get("/users", (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 25, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const search = req.query.search?.trim() || "";
  const plan   = req.query.plan || "";   // filter by plan
  const role   = req.query.role || "";   // filter by role

  let where = "1=1";
  const params = [];

  if (search) {
    where += " AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (plan && VALID_PLANS.includes(plan)) {
    where += " AND plan = ?";
    params.push(plan);
  }
  if (role && VALID_ROLES.includes(role)) {
    where += " AND role = ?";
    params.push(role);
  }

  const users = db.prepare(
    `SELECT id, name, email, plan, role, is_whitelisted, is_banned, is_banned,
            total_guides, guides_created_ever, total_quizzes, xp, level,
            streak, last_study_date, created_at, admin_notes
     FROM users WHERE ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${where}`).get(...params).c;

  res.json({ users, total, hasMore: offset + limit < total });
});

// ── Single user detail ────────────────────────────────────────────────────────
router.get("/users/:id", (req, res) => {
  const user = db.prepare(
    `SELECT id, name, email, plan, role, is_whitelisted, is_banned,
            total_guides, guides_created_ever, total_quizzes, xp, level,
            streak, last_study_date, created_at, admin_notes,
            stripe_customer_id, stripe_subscription_id
     FROM users WHERE id = ?`
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  const guideCount = db.prepare("SELECT COUNT(*) as c FROM guides WHERE user_id = ?").get(req.params.id).c;
  const recentAudit = db.prepare(
    "SELECT * FROM audit_logs WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 10"
  ).all(req.params.id);

  res.json({ user, guideCount, recentAudit });
});

// ── Update user permissions ────────────────────────────────────────────────────
// Accepts any combination of: plan, role, is_whitelisted, is_banned, admin_notes
router.patch("/users/:id", (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found." });

  const admin = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.user.id);
  const { plan, role, is_whitelisted, is_banned, admin_notes } = req.body;
  const updates = [];
  const values  = [];

  if (plan !== undefined) {
    if (!VALID_PLANS.includes(plan)) return res.status(400).json({ error: `Invalid plan. Valid values: ${VALID_PLANS.join(", ")}` });
    if (plan !== target.plan) {
      updates.push("plan = ?"); values.push(plan);
      auditLog(admin.id, admin.email, target.id, target.email, "set_plan", target.plan, plan);
    }
  }

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `Invalid role. Valid values: ${VALID_ROLES.join(", ")}` });
    // Prevent self-demotion to avoid locking out the last admin
    if (req.user.id === target.id && role !== "admin") {
      return res.status(400).json({ error: "You cannot remove your own admin role." });
    }
    if (role !== target.role) {
      updates.push("role = ?"); values.push(role);
      auditLog(admin.id, admin.email, target.id, target.email, "set_role", target.role, role);
    }
  }

  if (is_whitelisted !== undefined) {
    const val = is_whitelisted ? 1 : 0;
    if (val !== target.is_whitelisted) {
      updates.push("is_whitelisted = ?"); values.push(val);
      auditLog(admin.id, admin.email, target.id, target.email, "set_whitelist", target.is_whitelisted, val);
    }
  }

  if (is_banned !== undefined) {
    const val = is_banned ? 1 : 0;
    if (val !== target.is_banned) {
      updates.push("is_banned = ?"); values.push(val);
      auditLog(admin.id, admin.email, target.id, target.email, "set_ban", target.is_banned, val);
    }
  }

  if (admin_notes !== undefined) {
    if (typeof admin_notes !== "string") return res.status(400).json({ error: "admin_notes must be a string." });
    const notes = admin_notes.slice(0, 1000);
    updates.push("admin_notes = ?"); values.push(notes);
    // Don't audit note changes (too noisy); they're visible in the user record
  }

  if (updates.length === 0) return res.json({ message: "No changes made." });

  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values, target.id);

  const updated = db.prepare(
    `SELECT id, name, email, plan, role, is_whitelisted, is_banned,
            total_guides, guides_created_ever, total_quizzes, xp, level,
            streak, last_study_date, created_at, admin_notes
     FROM users WHERE id = ?`
  ).get(target.id);

  res.json({ user: updated });
});

// ── Reset free-tier usage limits ───────────────────────────────────────────────
router.post("/users/:id/reset-limits", (req, res) => {
  const target = db.prepare("SELECT id, email, guides_created_ever FROM users WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found." });

  const admin = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.user.id);
  const old = target.guides_created_ever;

  db.prepare("UPDATE users SET guides_created_ever = 0 WHERE id = ?").run(target.id);
  auditLog(admin.id, admin.email, target.id, target.email, "reset_limits", old, 0);

  res.json({ success: true, message: `Usage limits reset for ${target.email}` });
});

// ── Audit log ─────────────────────────────────────────────────────────────────
router.get("/audit-logs", (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const search = req.query.search?.trim() || "";

  let where = "1=1";
  const params = [];
  if (search) {
    where += " AND (admin_email LIKE ? OR target_email LIKE ? OR action LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const logs  = db.prepare(
    `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM audit_logs WHERE ${where}`).get(...params).c;

  res.json({ logs, total, hasMore: offset + limit < total });
});

export default router;
