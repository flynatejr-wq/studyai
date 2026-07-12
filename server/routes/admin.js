import express from "express";
import { v4 as uuid } from "uuid";
import { timingSafeEqual } from "crypto";
import pool from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { raiseFlag } from "../lib/abuse.js";

const router = express.Router();

const VALID_PLANS = ["free", "pro", "lifetime", "pilot"];
const VALID_ROLES = ["user", "admin"];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function auditLog(adminId, adminEmail, targetUserId, targetEmail, action, oldValue, newValue) {
  await pool.query(
    `INSERT INTO audit_logs (id, admin_id, admin_email, target_user_id, target_email, action, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      uuid(), adminId, adminEmail, targetUserId, targetEmail, action,
      oldValue != null ? String(oldValue) : null,
      newValue != null ? String(newValue) : null,
    ]
  );
}

function safeUser(u) {
  if (!u) return null;
  const { password_hash, reset_token, reset_token_expires, ...rest } = u;
  return rest;
}

// ── Bootstrap: promote any user to admin ──────────────────────────────────────
router.post("/setup", async (req, res) => {
  const { rows: adminRows } = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
  if (Number(adminRows[0].count) > 0) {
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
  try {
    const provided = Buffer.from(setup_secret);
    const expected = Buffer.from(secret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return res.status(403).json({ error: "Invalid setup secret." });
    }
  } catch {
    return res.status(403).json({ error: "Invalid setup secret." });
  }

  const user = (await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()])).rows[0] ?? null;
  if (!user) return res.status(404).json({ error: "No account found with that email." });
  if (user.role === "admin") return res.json({ message: "User is already an admin." });

  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  await auditLog("system", "system@system", user.id, user.email, "set_role", user.role || "user", "admin");
  res.json({ message: "Admin role granted successfully." });
});

// All routes below require admin auth
router.use(requireAdmin);

// ── Platform stats ────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  const totalUsers      = Number((await pool.query("SELECT COUNT(*) as c FROM users")).rows[0].c);
  const proUsers        = Number((await pool.query("SELECT COUNT(*) as c FROM users WHERE plan = 'pro'")).rows[0].c);
  const lifetimeUsers   = Number((await pool.query("SELECT COUNT(*) as c FROM users WHERE plan = 'lifetime'")).rows[0].c);
  const pilotUsers      = Number((await pool.query("SELECT COUNT(*) as c FROM users WHERE plan = 'pilot'")).rows[0].c);
  const freeUsers       = Number((await pool.query("SELECT COUNT(*) as c FROM users WHERE plan = 'free'")).rows[0].c);
  const bannedUsers     = Number((await pool.query("SELECT COUNT(*) as c FROM users WHERE is_banned = 1")).rows[0].c);
  const whitelisted     = Number((await pool.query("SELECT COUNT(*) as c FROM users WHERE is_whitelisted = 1")).rows[0].c);
  const adminCount      = Number((await pool.query("SELECT COUNT(*) as c FROM users WHERE role = 'admin'")).rows[0].c);
  const totalGuides     = Number((await pool.query("SELECT COUNT(*) as c FROM guides")).rows[0].c);
  const totalAuditLogs  = Number((await pool.query("SELECT COUNT(*) as c FROM audit_logs")).rows[0].c);
  const newUsersToday   = Number((await pool.query(
    "SELECT COUNT(*) as c FROM users WHERE DATE(created_at) = CURRENT_DATE"
  )).rows[0].c);

  res.json({
    totalUsers, proUsers, lifetimeUsers, pilotUsers, freeUsers, bannedUsers,
    whitelisted, adminCount, totalGuides, totalAuditLogs, newUsersToday,
  });
});

// ── Cost analytics ────────────────────────────────────────────────────────────
const COST_PER_GUIDE = 0.002;
const COST_PER_QUIZ  = 0.006;

router.get("/cost-stats", async (req, res) => {
  const { rows: totalsRows } = await pool.query(`
    SELECT
      COUNT(*) as total_users,
      SUM(CASE WHEN plan IN ('pro', 'lifetime') THEN 1 ELSE 0 END) as paid_users,
      SUM(COALESCE(guides_created_ever, 0)) as total_guides,
      SUM(COALESCE(total_quizzes, 0))       as total_quizzes,
      SUM(COALESCE(guides_created_ever, 0) * $1 + COALESCE(total_quizzes, 0) * $2) as total_cost,
      SUM(CASE WHEN plan IN ('pro', 'lifetime')
            THEN COALESCE(guides_created_ever, 0) * $1 + COALESCE(total_quizzes, 0) * $2
            ELSE 0 END) as paid_cost
    FROM users
  `, [COST_PER_GUIDE, COST_PER_QUIZ]);
  const totals = totalsRows[0];

  const totalCost      = Number(totals.total_cost)  || 0;
  const totalGuideCost = (Number(totals.total_guides) || 0) * COST_PER_GUIDE;
  const totalQuizCost  = (Number(totals.total_quizzes) || 0) * COST_PER_QUIZ;
  const avgCostPerUser = Number(totals.total_users) > 0 ? totalCost / Number(totals.total_users) : 0;
  const avgCostPerPaid = Number(totals.paid_users)  > 0 ? (Number(totals.paid_cost) || 0) / Number(totals.paid_users) : 0;

  const topUsers = (await pool.query(`
    SELECT id, name, email, plan,
           COALESCE(guides_created_ever, 0) as guides_created_ever,
           COALESCE(total_quizzes, 0)       as total_quizzes,
           (COALESCE(guides_created_ever, 0) * $1 + COALESCE(total_quizzes, 0) * $2) as estimated_cost
    FROM users
    ORDER BY estimated_cost DESC
    LIMIT 25
  `, [COST_PER_GUIDE, COST_PER_QUIZ])).rows;

  res.json({
    summary: {
      totalCost,
      totalGuideCost,
      totalQuizCost,
      avgCostPerUser,
      avgCostPerPaid,
      totalUsers: Number(totals.total_users),
      paidUsers: Number(totals.paid_users),
    },
    topUsers,
  });
});

// ── User list / search ────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 25, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const search = req.query.search?.trim() || "";
  const plan   = req.query.plan || "";
  const role   = req.query.role || "";

  let where = "1=1";
  const params = [];

  if (search) {
    where += ` AND (name LIKE $${params.length + 1} OR email LIKE $${params.length + 2})`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (plan && VALID_PLANS.includes(plan)) {
    where += ` AND plan = $${params.length + 1}`;
    params.push(plan);
  }
  if (role && VALID_ROLES.includes(role)) {
    where += ` AND role = $${params.length + 1}`;
    params.push(role);
  }

  const users = (await pool.query(
    `SELECT id, name, email, plan, role, is_whitelisted, is_banned,
            total_guides, guides_created_ever, total_quizzes, xp, level,
            streak, last_study_date, created_at, admin_notes
     FROM users WHERE ${where}
     ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  )).rows;

  const total = Number((await pool.query(
    `SELECT COUNT(*) as c FROM users WHERE ${where}`,
    params
  )).rows[0].c);

  res.json({ users, total, hasMore: offset + limit < total });
});

// ── Single user detail ────────────────────────────────────────────────────────
router.get("/users/:id", async (req, res) => {
  const user = (await pool.query(
    `SELECT id, name, email, plan, role, is_whitelisted, is_banned,
            total_guides, guides_created_ever, total_quizzes, xp, level,
            streak, last_study_date, created_at, admin_notes,
            stripe_customer_id, stripe_subscription_id
     FROM users WHERE id = $1`,
    [req.params.id]
  )).rows[0] ?? null;
  if (!user) return res.status(404).json({ error: "User not found." });

  const guideCount = Number((await pool.query(
    "SELECT COUNT(*) as c FROM guides WHERE user_id = $1",
    [req.params.id]
  )).rows[0].c);
  const recentAudit = (await pool.query(
    "SELECT * FROM audit_logs WHERE target_user_id = $1 ORDER BY created_at DESC LIMIT 10",
    [req.params.id]
  )).rows;

  res.json({ user, guideCount, recentAudit });
});

// ── Update user permissions ────────────────────────────────────────────────────
router.patch("/users/:id", async (req, res) => {
  const target = (await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id])).rows[0] ?? null;
  if (!target) return res.status(404).json({ error: "User not found." });

  const admin = (await pool.query("SELECT id, email FROM users WHERE id = $1", [req.user.id])).rows[0] ?? null;
  const { plan, role, is_whitelisted, is_banned, admin_notes } = req.body;
  const updates = [];
  const values  = [];

  if (plan !== undefined) {
    if (!VALID_PLANS.includes(plan)) return res.status(400).json({ error: `Invalid plan. Valid values: ${VALID_PLANS.join(", ")}` });
    if (plan !== target.plan) {
      updates.push(`plan = $${values.length + 1}`); values.push(plan);
      await auditLog(admin.id, admin.email, target.id, target.email, "set_plan", target.plan, plan);
    }
  }

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `Invalid role. Valid values: ${VALID_ROLES.join(", ")}` });
    if (req.user.id === target.id && role !== "admin") {
      return res.status(400).json({ error: "You cannot remove your own admin role." });
    }
    if (role !== target.role) {
      updates.push(`role = $${values.length + 1}`); values.push(role);
      await auditLog(admin.id, admin.email, target.id, target.email, "set_role", target.role, role);
    }
  }

  if (is_whitelisted !== undefined) {
    const val = is_whitelisted ? 1 : 0;
    if (val !== target.is_whitelisted) {
      updates.push(`is_whitelisted = $${values.length + 1}`); values.push(val);
      await auditLog(admin.id, admin.email, target.id, target.email, "set_whitelist", target.is_whitelisted, val);
    }
  }

  if (is_banned !== undefined) {
    const val = is_banned ? 1 : 0;
    if (val !== target.is_banned) {
      updates.push(`is_banned = $${values.length + 1}`); values.push(val);
      await auditLog(admin.id, admin.email, target.id, target.email, "set_ban", target.is_banned, val);
    }
  }

  if (admin_notes !== undefined) {
    if (typeof admin_notes !== "string") return res.status(400).json({ error: "admin_notes must be a string." });
    const notes = admin_notes.slice(0, 1000);
    updates.push(`admin_notes = $${values.length + 1}`); values.push(notes);
  }

  if (updates.length === 0) return res.json({ message: "No changes made." });

  values.push(target.id);
  await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $${values.length}`,
    values
  );

  const updated = (await pool.query(
    `SELECT id, name, email, plan, role, is_whitelisted, is_banned,
            total_guides, guides_created_ever, total_quizzes, xp, level,
            streak, last_study_date, created_at, admin_notes
     FROM users WHERE id = $1`,
    [target.id]
  )).rows[0] ?? null;

  res.json({ user: updated });
});

// ── Reset free-tier usage limits ───────────────────────────────────────────────
router.post("/users/:id/reset-limits", async (req, res) => {
  const target = (await pool.query(
    "SELECT id, email, guides_created_ever FROM users WHERE id = $1",
    [req.params.id]
  )).rows[0] ?? null;
  if (!target) return res.status(404).json({ error: "User not found." });

  const admin = (await pool.query("SELECT id, email FROM users WHERE id = $1", [req.user.id])).rows[0] ?? null;
  const old = target.guides_created_ever;

  await pool.query("UPDATE users SET guides_created_ever = 0 WHERE id = $1", [target.id]);
  await auditLog(admin.id, admin.email, target.id, target.email, "reset_limits", old, 0);

  res.json({ success: true, message: `Usage limits reset for ${target.email}` });
});

// ── Audit log ─────────────────────────────────────────────────────────────────
router.get("/audit-logs", async (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const search = req.query.search?.trim() || "";

  let where = "1=1";
  const params = [];
  if (search) {
    where += ` AND (admin_email LIKE $${params.length + 1} OR target_email LIKE $${params.length + 2} OR action LIKE $${params.length + 3})`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const logs  = (await pool.query(
    `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  )).rows;
  const total = Number((await pool.query(
    `SELECT COUNT(*) as c FROM audit_logs WHERE ${where}`,
    params
  )).rows[0].c);

  res.json({ logs, total, hasMore: offset + limit < total });
});

// ══════════════════════════════════════════════════════════════════════════════
// ABUSE MANAGEMENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// ── Abuse overview stats ───────────────────────────────────────────────────────
router.get("/abuse/stats", async (req, res) => {
  const deletedAccounts   = Number((await pool.query("SELECT COUNT(*) as c FROM deleted_accounts")).rows[0].c);
  const deletedWithUsage  = Number((await pool.query("SELECT COUNT(*) as c FROM deleted_accounts WHERE guides_generated > 0")).rows[0].c);
  const activeFlags       = Number((await pool.query("SELECT COUNT(*) as c FROM abuse_flags WHERE resolved_at IS NULL")).rows[0].c);
  const highFlags         = Number((await pool.query("SELECT COUNT(*) as c FROM abuse_flags WHERE severity = 'high' AND resolved_at IS NULL")).rows[0].c);
  const blockedSignals    = Number((await pool.query("SELECT COUNT(*) as c FROM abuse_signals WHERE is_blocked = 1")).rows[0].c);
  const ipSignals         = Number((await pool.query("SELECT COUNT(*) as c FROM abuse_signals WHERE signal_type = 'ip'")).rows[0].c);
  const fpSignals         = Number((await pool.query("SELECT COUNT(*) as c FROM abuse_signals WHERE signal_type = 'fp'")).rows[0].c);
  const multiAccountIps   = Number((await pool.query(
    "SELECT COUNT(*) as c FROM abuse_signals WHERE signal_type = 'ip' AND accounts_created >= 3"
  )).rows[0].c);

  res.json({
    deletedAccounts, deletedWithUsage, activeFlags, highFlags,
    blockedSignals, ipSignals, fpSignals, multiAccountIps,
  });
});

// ── Deleted accounts list ──────────────────────────────────────────────────────
router.get("/abuse/deleted-accounts", async (req, res) => {
  const limit   = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
  const offset  = Math.max(parseInt(req.query.offset) || 0, 0);
  const abused  = req.query.abused === "1";

  let where = "1=1";
  if (abused) where += " AND guides_generated > 0";

  const rows  = (await pool.query(
    `SELECT id, original_user_id, email_domain, guides_generated, was_pro, deleted_at,
            CASE WHEN fp_hash IS NOT NULL THEN 1 ELSE 0 END as has_fp,
            CASE WHEN ip_hash IS NOT NULL THEN 1 ELSE 0 END as has_ip
     FROM deleted_accounts WHERE ${where}
     ORDER BY deleted_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  )).rows;
  const total = Number((await pool.query(
    `SELECT COUNT(*) as c FROM deleted_accounts WHERE ${where}`
  )).rows[0].c);

  res.json({ rows, total, hasMore: offset + limit < total });
});

// ── Abuse signals list ─────────────────────────────────────────────────────────
router.get("/abuse/signals", async (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const type   = ["ip", "fp", "email"].includes(req.query.type) ? req.query.type : null;
  const blocked = req.query.blocked === "1";

  let where = "1=1";
  const params = [];
  if (type)    { where += ` AND signal_type = $${params.length + 1}`; params.push(type); }
  if (blocked) { where += " AND is_blocked = 1"; }

  const rows  = (await pool.query(
    `SELECT id, signal_type,
            substr(signal_hash, 1, 12) || '…' as signal_preview,
            signal_hash,
            accounts_created, guides_generated, first_seen_at, last_seen_at, is_blocked
     FROM abuse_signals WHERE ${where}
     ORDER BY guides_generated DESC, accounts_created DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  )).rows;
  const total = Number((await pool.query(
    `SELECT COUNT(*) as c FROM abuse_signals WHERE ${where}`,
    params
  )).rows[0].c);

  res.json({ rows, total, hasMore: offset + limit < total });
});

// ── Block / unblock a signal ───────────────────────────────────────────────────
router.patch("/abuse/signals/:id/block", async (req, res) => {
  const { block } = req.body;
  const signal = (await pool.query("SELECT * FROM abuse_signals WHERE id = $1", [req.params.id])).rows[0] ?? null;
  if (!signal) return res.status(404).json({ error: "Signal not found." });

  const val = block ? 1 : 0;
  await pool.query("UPDATE abuse_signals SET is_blocked = $1 WHERE id = $2", [val, signal.id]);

  const admin = (await pool.query("SELECT id, email FROM users WHERE id = $1", [req.user.id])).rows[0] ?? null;
  await auditLog(admin.id, admin.email, null, "system", block ? "block_signal" : "unblock_signal", signal.signal_hash, String(val));

  res.json({ success: true, is_blocked: val });
});

// ── Abuse flags list ───────────────────────────────────────────────────────────
router.get("/abuse/flags", async (req, res) => {
  const limit      = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
  const offset     = Math.max(parseInt(req.query.offset) || 0, 0);
  const unresolved = req.query.unresolved !== "0";

  let where = "1=1";
  if (unresolved) where += " AND resolved_at IS NULL";

  const rows  = (await pool.query(
    `SELECT f.*, u.email as related_user_email
     FROM abuse_flags f
     LEFT JOIN users u ON u.id = f.related_user_id
     WHERE ${where}
     ORDER BY
       CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )).rows;
  const total = Number((await pool.query(
    `SELECT COUNT(*) as c FROM abuse_flags WHERE ${where}`
  )).rows[0].c);

  res.json({ rows, total, hasMore: offset + limit < total });
});

// ── Resolve a flag ─────────────────────────────────────────────────────────────
router.post("/abuse/flags/:id/resolve", async (req, res) => {
  const flag = (await pool.query("SELECT * FROM abuse_flags WHERE id = $1", [req.params.id])).rows[0] ?? null;
  if (!flag) return res.status(404).json({ error: "Flag not found." });
  if (flag.resolved_at) return res.status(400).json({ error: "Flag already resolved." });

  const admin = (await pool.query("SELECT id, email FROM users WHERE id = $1", [req.user.id])).rows[0] ?? null;
  const notes = typeof req.body.notes === "string" ? req.body.notes.slice(0, 500) : null;

  await pool.query(
    "UPDATE abuse_flags SET resolved_at = NOW(), resolved_by = $1, notes = $2 WHERE id = $3",
    [admin.email, notes, flag.id]
  );

  await auditLog(admin.id, admin.email, flag.related_user_id, flag.related_user_id || "system", "resolve_flag", flag.reason, "resolved");

  res.json({ success: true });
});

// ── Raise a manual flag ────────────────────────────────────────────────────────
router.post("/abuse/flags", async (req, res) => {
  const { target_type, target_value, reason, severity, related_user_id } = req.body;
  if (!target_type || !target_value || !reason) {
    return res.status(400).json({ error: "target_type, target_value, and reason are required." });
  }
  const validTypes = ["user_id", "email_hash", "ip_hash", "fp_hash"];
  const validSev   = ["low", "medium", "high"];
  if (!validTypes.includes(target_type)) return res.status(400).json({ error: `Invalid target_type. Use: ${validTypes.join(", ")}` });
  const sev = validSev.includes(severity) ? severity : "medium";

  await raiseFlag(target_type, target_value.trim(), reason.trim(), sev, related_user_id || null);

  const admin = (await pool.query("SELECT id, email FROM users WHERE id = $1", [req.user.id])).rows[0] ?? null;
  await auditLog(admin.id, admin.email, related_user_id || null, related_user_id || "system", "manual_flag", null, reason);

  res.json({ success: true });
});

export default router;
