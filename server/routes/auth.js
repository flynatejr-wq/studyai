import express from "express";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { sendPasswordReset, isEmailConfigured } from "../utils/email.js";

// H-7: SHA-256 hash reset tokens before storing so a DB read can't be used to take over accounts
function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Signup ────────────────────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email || !password)
    return res.status(400).json({ error: "All fields are required." });
  if (!EMAIL_RE.test(email))
    return res.status(400).json({ error: "Please enter a valid email address." });
  if (name.trim().length > 80)
    return res.status(400).json({ error: "Name is too long." });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (password.length > 72)
    return res.status(400).json({ error: "Password must be 72 characters or fewer." });

  try {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim());
    if (existing) return res.status(400).json({ error: "An account with that email already exists." });

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuid();
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)"
    ).run(id, name.trim(), email.toLowerCase().trim(), password_hash);

    const user = db.prepare("SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, created_at FROM users WHERE id = ?").get(id);
    const token = signToken({ id });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
    if (!user) return res.status(400).json({ error: "No account found with that email." });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Incorrect password." });

    // Update streak
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    let newStreak = user.streak;
    if (user.last_study_date === yesterday) newStreak = user.streak + 1;
    else if (user.last_study_date !== today) newStreak = 1;

    db.prepare("UPDATE users SET streak = ?, last_study_date = ? WHERE id = ?")
      .run(newStreak, today, user.id);

    const token = signToken({ id: user.id });
    const { password_hash, reset_token, reset_token_expires, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, streak: newStreak } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// ── Get current user ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare(
    "SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, last_study_date, created_at FROM users WHERE id = ?"
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json(user);
});

// ── Update profile ────────────────────────────────────────────────────────────
router.put("/profile", requireAuth, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
  if (name.trim().length > 80) return res.status(400).json({ error: "Name is too long." });

  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Current password is required to set a new password." });
      if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });
      if (newPassword.length > 72) return res.status(400).json({ error: "New password must be 72 characters or fewer." });
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(400).json({ error: "Current password is incorrect." });
      const hash = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET name = ?, password_hash = ? WHERE id = ?").run(name.trim(), hash, req.user.id);
    } else {
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.trim(), req.user.id);
    }

    const updated = db.prepare(
      "SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, last_study_date, created_at FROM users WHERE id = ?"
    ).get(req.user.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// ── Forgot password ───────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  // Always return 200 to prevent email enumeration
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user) return res.json({ success: true });

  try {
    const token = uuid();
    // H-7: Store only the SHA-256 hash so a DB read can't be used to reset any account
    const tokenHash = hashResetToken(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    db.prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?")
      .run(tokenHash, expires, user.id);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    if (isEmailConfigured()) {
      await sendPasswordReset(user.email, resetLink);
    } else {
      // Dev fallback: log the link so it's usable without SMTP configured
      console.log(`[DEV] Password reset link for ${user.email}: ${resetLink}`);
    }

    // M-6: Don't leak server config (emailConfigured) to the client
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not send reset email. Please try again." });
  }
});

// ── Reset password ────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and password are required." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (password.length > 72) return res.status(400).json({ error: "Password must be 72 characters or fewer." });

  try {
    // H-7: Compare against stored hash, not the raw token
    const tokenHash = hashResetToken(token);
    const user = db.prepare("SELECT * FROM users WHERE reset_token = ?").get(tokenHash);
    if (!user) return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });

    const expired = new Date(user.reset_token_expires) < new Date();
    if (expired) return res.status(400).json({ error: "This reset link has expired. Please request a new one." });

    const hash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?")
      .run(hash, user.id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// ── Delete account ────────────────────────────────────────────────────────────
router.delete("/account", requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required to delete your account." });

  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Incorrect password." });

    // Wrap all deletions in a transaction so it's atomic
    db.transaction(() => {
      db.prepare("DELETE FROM study_sessions WHERE user_id = ?").run(req.user.id);
      db.prepare("DELETE FROM achievements WHERE user_id = ?").run(req.user.id);
      db.prepare("DELETE FROM quiz_attempts WHERE user_id = ?").run(req.user.id);
      db.prepare("DELETE FROM chat_messages WHERE user_id = ?").run(req.user.id);
      db.prepare("DELETE FROM guides WHERE user_id = ?").run(req.user.id);
      db.prepare("DELETE FROM folders WHERE user_id = ?").run(req.user.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(req.user.id);
    })();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;
