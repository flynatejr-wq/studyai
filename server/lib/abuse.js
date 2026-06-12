/**
 * abuse.js — Anti-abuse detection and tracking for StudyBuddi
 *
 * Architecture
 * ────────────
 * Three signal types are tracked, all stored only as SHA-256 hashes:
 *   • email  — hash of the normalised email address
 *   • ip     — hash of the client IP
 *   • fp     — hash of the browser fingerprint (computed client-side)
 *
 * Tables used:
 *   deleted_accounts  — anonymised archive of every deleted account
 *   abuse_signals     — running tallies per hash (accounts created, guides generated)
 *   abuse_flags       — raised flags awaiting admin review
 *
 * Enforcement points:
 *   1. POST /api/auth/signup  → recordSignup()
 *   2. POST /api/summarize/*  → checkAbuseStatus() before generation,
 *                               recordGeneration() after success
 *   3. DELETE /api/auth/account → archiveDeletedAccount() before deletion
 */

import { createHash } from "crypto";
import pool from "../db.js";

// ─── Known disposable / temp-mail domains ─────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com",
  "grr.la", "sharklasers.com", "spam4.me", "tempmail.com", "throwaway.email",
  "fakeinbox.com", "trashmail.com", "trashmail.me", "trashmail.at", "trashmail.io",
  "trashmail.xyz", "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
  "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf",
  "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf", "tempinbox.com",
  "spamgourmet.com", "spamgourmet.net", "spamgourmet.org", "dispostable.com",
  "mailnull.com", "spamcorpse.com", "maileater.com", "spam.la", "bumpymail.com",
  "jetable.org", "zetmail.com", "tempail.com", "throwam.com", "spaml.de",
  "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",
  "10minutemail.com", "10minutemail.net", "10minutemail.org",
  "20minutemail.com", "minutemailbox.com", "discard.email",
  "mailnesia.com", "spamfree24.org", "spamfree24.de",
  "tempmailer.com", "tempr.email", "harakirimail.com",
  "getnada.com", "filzmail.com", "maildrop.cc", "spamgrap.com",
  "owlpic.com", "moakt.com", "mohmal.com", "inboxbear.com",
]);

// ─── Utilities ─────────────────────────────────────────────────────────────────

/** SHA-256 hash of a string value — raw values are never stored */
export function hashValue(str) {
  if (!str) return null;
  return createHash("sha256").update(String(str).toLowerCase().trim()).digest("hex");
}

/** Extract the best-available client IP from a request.
 *  MEDIUM-2: Prefer req.ip which is already resolved by Express using trust proxy settings,
 *  rather than reading X-Forwarded-For directly (which can be spoofed if not behind a trusted proxy).
 */
export function getClientIp(req) {
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/** True if the email's domain is in the disposable list */
export function isDisposableEmail(email) {
  const domain = String(email).split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

/** Extract domain from email */
export function getEmailDomain(email) {
  return String(email).split("@")[1]?.toLowerCase() || "";
}

/** Validate a client fingerprint hash — must be 32-char hex */
export function isValidFp(fp) {
  return typeof fp === "string" && /^[0-9a-f]{32,64}$/.test(fp);
}

// ─── Core abuse check ──────────────────────────────────────────────────────────

/**
 * Check whether a generation attempt should be blocked.
 * Called at the summarize endpoint AFTER the standard free-tier counter check.
 *
 * Returns null if OK, or { blocked: true, reason: string } if blocked.
 * Whitelisted users (is_whitelisted=1) bypass this check at the route level.
 */
export async function checkAbuseStatus({ emailHash, ipHash, fpHash }) {
  // ── 1. Email previously associated with a deleted account that used a free guide
  if (emailHash) {
    const { rows } = await pool.query(
      `SELECT guides_generated FROM deleted_accounts
       WHERE email_hash = $1 ORDER BY deleted_at DESC LIMIT 1`,
      [emailHash]
    );
    const prev = rows[0] ?? null;
    if (prev && prev.guides_generated > 0) {
      return { blocked: true, reason: "email_reuse_after_deletion" };
    }
  }

  // ── 2. Browser fingerprint seen in a deleted account that used a free guide
  if (fpHash) {
    const { rows: fpRows } = await pool.query(
      `SELECT guides_generated FROM deleted_accounts
       WHERE fp_hash = $1 ORDER BY deleted_at DESC LIMIT 1`,
      [fpHash]
    );
    const prevFp = fpRows[0] ?? null;
    if (prevFp && prevFp.guides_generated > 0) {
      return { blocked: true, reason: "fingerprint_reuse_after_deletion" };
    }

    // Explicitly blocked fingerprint (admin action)
    const { rows: fpSigRows } = await pool.query(
      `SELECT is_blocked FROM abuse_signals WHERE signal_type = 'fp' AND signal_hash = $1`,
      [fpHash]
    );
    const fpSig = fpSigRows[0] ?? null;
    if (fpSig?.is_blocked) {
      return { blocked: true, reason: "fingerprint_blocked" };
    }
  }

  // ── 3. Explicitly blocked IP (admin action — not auto-blocked on IP alone)
  if (ipHash) {
    const { rows: ipSigRows } = await pool.query(
      `SELECT is_blocked FROM abuse_signals WHERE signal_type = 'ip' AND signal_hash = $1`,
      [ipHash]
    );
    const ipSig = ipSigRows[0] ?? null;
    if (ipSig?.is_blocked) {
      return { blocked: true, reason: "ip_blocked" };
    }
  }

  return null; // allowed
}

// ─── Signal recording ──────────────────────────────────────────────────────────

/**
 * Called after a successful signup.
 * Upserts signal rows and raises automatic flags for suspicious patterns.
 */
export async function recordSignup({ userId, emailHash, emailDomain, ipHash, fpHash, isDisposable }) {
  const now = new Date().toISOString();

  const upsertSignal = async (type, hash) => {
    await pool.query(`
      INSERT INTO abuse_signals (id, signal_type, signal_hash, accounts_created, guides_generated, first_seen_at, last_seen_at)
      VALUES (lower(encode(gen_random_bytes(16), 'hex')), $1, $2, 1, 0, $3, $3)
      ON CONFLICT(signal_type, signal_hash) DO UPDATE SET
        accounts_created = abuse_signals.accounts_created + 1,
        last_seen_at     = EXCLUDED.last_seen_at
    `, [type, hash, now]);
  };

  if (ipHash)    await upsertSignal("ip",    ipHash);
  if (fpHash)    await upsertSignal("fp",    fpHash);
  if (emailHash) await upsertSignal("email", emailHash);

  // Auto-flag: disposable email address
  if (isDisposable && emailHash) {
    await raiseFlag("email_hash", emailHash, "disposable_email", "medium", userId);
  }

  // Auto-flag: IP has created 5+ accounts
  if (ipHash) {
    const { rows } = await pool.query(
      `SELECT accounts_created FROM abuse_signals WHERE signal_type = 'ip' AND signal_hash = $1`,
      [ipHash]
    );
    const ipSig = rows[0] ?? null;
    if (ipSig && ipSig.accounts_created >= 5) {
      await raiseFlag("ip_hash", ipHash, "rapid_account_creation", "high", userId);
    }
  }

  // Auto-flag: fingerprint has created 3+ accounts
  if (fpHash) {
    const { rows } = await pool.query(
      `SELECT accounts_created FROM abuse_signals WHERE signal_type = 'fp' AND signal_hash = $1`,
      [fpHash]
    );
    const fpSig = rows[0] ?? null;
    if (fpSig && fpSig.accounts_created >= 3) {
      await raiseFlag("fp_hash", fpHash, "multiple_accounts_same_device", "high", userId);
    }
  }
}

/**
 * Called after a free guide is successfully generated.
 * Increments generation counters on all known signals for this user.
 */
export async function recordGeneration({ emailHash, ipHash, fpHash }) {
  const now = new Date().toISOString();
  const bump = async (type, hash) => {
    await pool.query(
      `UPDATE abuse_signals SET guides_generated = guides_generated + 1, last_seen_at = $1
       WHERE signal_type = $2 AND signal_hash = $3`,
      [now, type, hash]
    );
  };
  if (emailHash) await bump("email", emailHash);
  if (ipHash)    await bump("ip",    ipHash);
  if (fpHash)    await bump("fp",    fpHash);
}

// ─── Account deletion archival ─────────────────────────────────────────────────

/**
 * Archive anti-abuse metadata before deleting a user account.
 * Must be called BEFORE the user row is removed.
 */
export async function archiveDeletedAccount(user, { ipHash = null, fpHash = null } = {}) {
  const emailHash = hashValue(user.email);
  const domain    = getEmailDomain(user.email);

  await pool.query(`
    INSERT INTO deleted_accounts
      (id, original_user_id, email_hash, email_domain, ip_hash, fp_hash, guides_generated, was_pro, deleted_at)
    VALUES
      (lower(encode(gen_random_bytes(16), 'hex')), $1, $2, $3, $4, $5, $6, $7, NOW())
  `, [
    user.id,
    emailHash,
    domain,
    ipHash  || null,
    fpHash  || null,
    user.guides_created_ever || 0,
    (user.plan === "pro" || user.plan === "lifetime") ? 1 : 0,
  ]);
}

// ─── Flag helpers ──────────────────────────────────────────────────────────────

/**
 * Raise a flag — silently ignores if an identical unresolved flag already exists.
 */
export async function raiseFlag(targetType, targetValue, reason, severity = "low", relatedUserId = null) {
  const { rows } = await pool.query(
    `SELECT id FROM abuse_flags
     WHERE target_type = $1 AND target_value = $2 AND reason = $3 AND resolved_at IS NULL`,
    [targetType, targetValue, reason]
  );
  if (rows.length > 0) return; // don't spam duplicate flags

  await pool.query(`
    INSERT INTO abuse_flags (id, target_type, target_value, reason, severity, related_user_id, created_at)
    VALUES (lower(encode(gen_random_bytes(16), 'hex')), $1, $2, $3, $4, $5, NOW())
  `, [targetType, targetValue, reason, severity, relatedUserId || null]);
}
