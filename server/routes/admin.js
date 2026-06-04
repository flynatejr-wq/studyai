import express from "express";
import { v4 as uuid } from "uuid";
import { timingSafeEqual } from "crypto";
import db from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { raiseFlag } from "../lib/abuse.js";

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
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
  if (adminCount.count > 0) {
    return res.status(403).json({ error: "Setup already completed." });
  }

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

// ── Cost analytics ────────────────────────────────────────────────────────────
const COST_PER_GUIDE = 0.002; // Haiku guide generation
const COST_PER_QUIZ  = 0.006; // Haiku quiz generation

router.get("/cost-stats", (req, res) => {
  // Platform totals
  const totals = db.prepare(`
    SELECT
      SUM(guides_created_ever) as total_guides,
      SUM(total_quizzes)       as total_quizzes,
      COUNT(*)                 as total_users,
      SUM(CASE WHEN plan = 'pro' OR plan = 'lifetime' THEN 1 ELSE 0 END) as paid_users
    FROM users
  `).get();

  const totalGuideCost = (totals.total_guides || 0) * COST_PER_GUIDE;
  const totalQuizCost  = (totals.total_quizzes || 0) * COST_PER_QUIZ;
  const totalCost      = totalGuideCost + totalQuizCost;
  const avgCostPerUser = totals.total_users > 0 ? totalCost / totals.total_users : 0;
  const avgCostPerPaid = totals.paid_users > 0
    ? db.prepare(`
        SELECT SUM(guides_created_ever * ? + total_quizzes * ?) as cost
        FROM users WHERE plan IN ('pro', 'lifetime')
      `).get(COST_PER_GUIDE, COST_PER_QUIZ).cost / totals.paid_users
    : 0;

  // Top 25 users by estimated cost
  const topUsers = db.prepare(`
    SELECT id, name, email, plan,
           guides_created_ever,
           total_quizzes,
           (guides_created_ever * ? + total_quizzes * ?) as estimated_cost
    FROM users
    ORDER BY estimated_cost DESC
    LIMIT 25
  `).all(COST_PER_GUIDE, COST_PER_QUIZ);

  res.json({
    summary: {
      totalCost,
      totalGuideCost,
      totalQuizCost,
      avgCostPerUser,
      avgCostPerPaid,
      totalUsers: totals.total_users,
      paidUsers: totals.paid_users,
    },
    topUsers,
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
    `SELECT id, name, email, plan, role, is_whitelisted, is_banned,
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

// ══════════════════════════════════════════════════════════════════════════════
// ABUSE MANAGEMENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// ── Abuse overview stats ───────────────────────────────────────────────────────
router.get("/abuse/stats", (req, res) => {
  const deletedAccounts   = db.prepare("SELECT COUNT(*) as c FROM deleted_accounts").get().c;
  const deletedWithUsage  = db.prepare("SELECT COUNT(*) as c FROM deleted_accounts WHERE guides_generated > 0").get().c;
  const activeFlags       = db.prepare("SELECT COUNT(*) as c FROM abuse_flags WHERE resolved_at IS NULL").get().c;
  const highFlags         = db.prepare("SELECT COUNT(*) as c FROM abuse_flags WHERE severity = 'high' AND resolved_at IS NULL").get().c;
  const blockedSignals    = db.prepare("SELECT COUNT(*) as c FROM abuse_signals WHERE is_blocked = 1").get().c;
  const ipSignals         = db.prepare("SELECT COUNT(*) as c FROM abuse_signals WHERE signal_type = 'ip'").get().c;
  const fpSignals         = db.prepare("SELECT COUNT(*) as c FROM abuse_signals WHERE signal_type = 'fp'").get().c;
  const multiAccountIps   = db.prepare(
    "SELECT COUNT(*) as c FROM abuse_signals WHERE signal_type = 'ip' AND accounts_created >= 3"
  ).get().c;

  res.json({
    deletedAccounts, deletedWithUsage, activeFlags, highFlags,
    blockedSignals, ipSignals, fpSignals, multiAccountIps,
  });
});

// ── Deleted accounts list ──────────────────────────────────────────────────────
router.get("/abuse/deleted-accounts", (req, res) => {
  const limit   = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
  const offset  = Math.max(parseInt(req.query.offset) || 0, 0);
  const abused  = req.query.abused === "1"; // filter: only those with guide usage

  let where = "1=1";
  if (abused) where += " AND guides_generated > 0";

  const rows  = db.prepare(
    `SELECT id, original_user_id, email_domain, guides_generated, was_pro, deleted_at,
            CASE WHEN fp_hash IS NOT NULL THEN 1 ELSE 0 END as has_fp,
            CASE WHEN ip_hash IS NOT NULL THEN 1 ELSE 0 END as has_ip
     FROM deleted_accounts WHERE ${where}
     ORDER BY deleted_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM deleted_accounts WHERE ${where}`).get().c;

  res.json({ rows, total, hasMore: offset + limit < total });
});

// ── Abuse signals list ─────────────────────────────────────────────────────────
router.get("/abuse/signals", (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const type   = ["ip", "fp", "email"].includes(req.query.type) ? req.query.type : null;
  const blocked = req.query.blocked === "1";

  let where = "1=1";
  const params = [];
  if (type)    { where += " AND signal_type = ?"; params.push(type); }
  if (blocked) { where += " AND is_blocked = 1"; }

  const rows  = db.prepare(
    `SELECT id, signal_type,
            substr(signal_hash, 1, 12) || '…' as signal_preview,
            signal_hash,
            accounts_created, guides_generated, first_seen_at, last_seen_at, is_blocked
     FROM abuse_signals WHERE ${where}
     ORDER BY guides_generated DESC, accounts_created DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM abuse_signals WHERE ${where}`).get(...params).c;

  res.json({ rows, total, hasMore: offset + limit < total });
});

// ── Block / unblock a signal ───────────────────────────────────────────────────
router.patch("/abuse/signals/:id/block", (req, res) => {
  const { block } = req.body; // true = block, false = unblock
  const signal = db.prepare("SELECT * FROM abuse_signals WHERE id = ?").get(req.params.id);
  if (!signal) return res.status(404).json({ error: "Signal not found." });

  const val = block ? 1 : 0;
  db.prepare("UPDATE abuse_signals SET is_blocked = ? WHERE id = ?").run(val, signal.id);

  const admin = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.user.id);
  auditLog(admin.id, admin.email, null, "system", block ? "block_signal" : "unblock_signal", signal.signal_hash, String(val));

  res.json({ success: true, is_blocked: val });
});

// ── Abuse flags list ───────────────────────────────────────────────────────────
router.get("/abuse/flags", (req, res) => {
  const limit      = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
  const offset     = Math.max(parseInt(req.query.offset) || 0, 0);
  const unresolved = req.query.unresolved !== "0"; // default: only unresolved

  let where = "1=1";
  if (unresolved) where += " AND resolved_at IS NULL";

  const rows  = db.prepare(
    `SELECT f.*, u.email as related_user_email
     FROM abuse_flags f
     LEFT JOIN users u ON u.id = f.related_user_id
     WHERE ${where}
     ORDER BY
       CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       created_at DESC
     LIMIT ? OFFSET ?`
  ).all(limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM abuse_flags WHERE ${where}`).get().c;

  res.json({ rows, total, hasMore: offset + limit < total });
});

// ── Resolve a flag ─────────────────────────────────────────────────────────────
router.post("/abuse/flags/:id/resolve", (req, res) => {
  const flag = db.prepare("SELECT * FROM abuse_flags WHERE id = ?").get(req.params.id);
  if (!flag) return res.status(404).json({ error: "Flag not found." });
  if (flag.resolved_at) return res.status(400).json({ error: "Flag already resolved." });

  const admin = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.user.id);
  const notes = typeof req.body.notes === "string" ? req.body.notes.slice(0, 500) : null;

  db.prepare(
    "UPDATE abuse_flags SET resolved_at = datetime('now'), resolved_by = ?, notes = ? WHERE id = ?"
  ).run(admin.email, notes, flag.id);

  auditLog(admin.id, admin.email, flag.related_user_id, flag.related_user_id || "system", "resolve_flag", flag.reason, "resolved");

  res.json({ success: true });
});

// ── Raise a manual flag ────────────────────────────────────────────────────────
router.post("/abuse/flags", (req, res) => {
  const { target_type, target_value, reason, severity, related_user_id } = req.body;
  if (!target_type || !target_value || !reason) {
    return res.status(400).json({ error: "target_type, target_value, and reason are required." });
  }
  const validTypes = ["user_id", "email_hash", "ip_hash", "fp_hash"];
  const validSev   = ["low", "medium", "high"];
  if (!validTypes.includes(target_type)) return res.status(400).json({ error: `Invalid target_type. Use: ${validTypes.join(", ")}` });
  const sev = validSev.includes(severity) ? severity : "medium";

  raiseFlag(target_type, target_value.trim(), reason.trim(), sev, related_user_id || null);

  const admin = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.user.id);
  auditLog(admin.id, admin.email, related_user_id || null, related_user_id || "system", "manual_flag", null, reason);

  res.json({ success: true });
});

export default router;
