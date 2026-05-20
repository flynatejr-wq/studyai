import express from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { sendPasswordReset, sendVerificationEmail, sendWelcomeEmail, isEmailConfigured } from "../utils/email.js";
import {
  hashValue, getClientIp, isDisposableEmail, getEmailDomain, isValidFp,
  recordSignup, archiveDeletedAccount,
} from "../lib/abuse.js";

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
    const referralCode = randomBytes(4).toString("hex").toUpperCase();

    // Handle referral: if a ref code was provided, link it
    const { ref } = req.body;
    let referredBy = null;
    if (ref) {
      const referrer = db.prepare("SELECT id FROM users WHERE referral_code = ?").get(ref.toUpperCase().trim());
      if (referrer && referrer.id !== id) referredBy = referrer.id;
    }

    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, name.trim(), email.toLowerCase().trim(), password_hash, referralCode, referredBy);

    // Record the referral and award 1 free guide credit to the referrer
    if (referredBy) {
      db.prepare("INSERT OR IGNORE INTO referrals (id, referrer_id, referred_id) VALUES (?, ?, ?)").run(uuid(), referredBy, id);
      db.prepare("UPDATE users SET referral_credits = COALESCE(referral_credits, 0) + 1 WHERE id = ?").run(referredBy);
    }

    // ── Abuse tracking: record signup signals ────────────────────────────────
    const rawIp    = getClientIp(req);
    const rawFp    = req.headers["x-client-fp"];
    const fp       = isValidFp(rawFp) ? rawFp : null;
    const normEmail = email.toLowerCase().trim();
    try {
      recordSignup({
        userId:       id,
        emailHash:    hashValue(normEmail),
        emailDomain:  getEmailDomain(normEmail),
        ipHash:       hashValue(rawIp),
        fpHash:       fp ? hashValue(fp) : null,
        isDisposable: isDisposableEmail(normEmail),
      });
    } catch (abuseErr) {
      // Never let abuse tracking break signup
      console.error("[abuse] recordSignup failed:", abuseErr.message);
    }

    const user = db.prepare("SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, guides_created_ever, plan, role, is_whitelisted, is_banned, email_verified, created_at FROM users WHERE id = ?").get(id);
    const token = signToken({ id });

    // Send verification + welcome emails (best-effort — never fail signup)
    if (isEmailConfigured()) {
      const verifyToken = uuid();
      db.prepare("UPDATE users SET email_verify_token = ? WHERE id = ?").run(verifyToken, id);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const verifyLink = `${frontendUrl}/verify-email?token=${verifyToken}`;
      sendVerificationEmail(email.toLowerCase().trim(), verifyLink).catch(err =>
        console.error("[signup] verification email failed:", err.message)
      );
      sendWelcomeEmail(email.toLowerCase().trim(), name.trim()).catch(err =>
        console.error("[signup] welcome email failed:", err.message)
      );
    } else {
      console.log(`[DEV] Email skipped — RESEND_API_KEY not configured for ${email}`);
    }

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
    const user = db.prepare(
      "SELECT id, name, email, password_hash, streak, last_study_date, total_guides, total_quizzes, guides_created_ever, xp, level, plan, role, is_whitelisted, is_banned, total_study_time, reset_token, reset_token_expires FROM users WHERE email = ?"
    ).get(email.toLowerCase().trim());
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
    const { password_hash, reset_token, reset_token_expires, quiz_gen_count, quiz_gen_date, stripe_customer_id, stripe_subscription_id, admin_notes, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, streak: newStreak } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// ── Get current user ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare(
    "SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, guides_created_ever, plan, role, is_whitelisted, is_banned, email_verified, referral_code, referral_credits, last_study_date, created_at FROM users WHERE id = ?"
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
      "SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, guides_created_ever, plan, role, is_whitelisted, is_banned, email_verified, last_study_date, created_at FROM users WHERE id = ?"
    ).get(req.user.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// ── Change email ──────────────────────────────────────────────────────────────
router.put("/email", requireAuth, async (req, res) => {
  const { newEmail, password } = req.body;
  if (!newEmail || !password) return res.status(400).json({ error: "New email and current password are required." });
  if (!EMAIL_RE.test(newEmail)) return res.status(400).json({ error: "Please enter a valid email address." });

  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Incorrect password." });

    const normalised = newEmail.toLowerCase().trim();
    if (normalised === user.email) return res.status(400).json({ error: "That's already your current email." });

    const taken = db.prepare("SELECT id FROM users WHERE email = ?").get(normalised);
    if (taken) return res.status(400).json({ error: "An account with that email already exists." });

    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(normalised, req.user.id);
    res.json({ success: true, email: normalised });
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

// ── Verify email ─────────────────────────────────────────────────────────────
router.get("/verify-email", (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Verification token is required." });

  const user = db.prepare("SELECT id, email_verified FROM users WHERE email_verify_token = ?").get(token);
  if (!user) return res.status(400).json({ error: "Invalid or already-used verification link." });
  if (user.email_verified) return res.json({ success: true, already: true });

  db.prepare("UPDATE users SET email_verified = 1, email_verify_token = NULL WHERE id = ?").run(user.id);
  res.json({ success: true });
});

// ── Resend verification email ─────────────────────────────────────────────────
router.post("/resend-verification", requireAuth, async (req, res) => {
  const user = db.prepare("SELECT id, email, email_verified FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.email_verified) return res.status(400).json({ error: "Your email is already verified." });
  if (!isEmailConfigured()) return res.status(503).json({ error: "Email service is not configured." });

  try {
    const verifyToken = uuid();
    db.prepare("UPDATE users SET email_verify_token = ? WHERE id = ?").run(verifyToken, user.id);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verifyLink = `${frontendUrl}/verify-email?token=${verifyToken}`;
    await sendVerificationEmail(user.email, verifyLink);
    res.json({ success: true });
  } catch (err) {
    console.error("[resend-verification]", err.message);
    res.status(500).json({ error: "Could not send verification email. Please try again." });
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

    // ── Archive anti-abuse data BEFORE deletion ──────────────────────────────
    const rawIp = getClientIp(req);
    const rawFp = req.headers["x-client-fp"];
    const fp    = isValidFp(rawFp) ? rawFp : null;
    try {
      archiveDeletedAccount(user, {
        ipHash: hashValue(rawIp),
        fpHash: fp ? hashValue(fp) : null,
      });
    } catch (abuseErr) {
      console.error("[abuse] archiveDeletedAccount failed:", abuseErr.message);
      // Don't block deletion — log and continue
    }

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
