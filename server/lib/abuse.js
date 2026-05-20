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
import db from "../db.js";

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

/** Extract the best-available client IP from a request */
export function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"]?.trim() ||
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
export function checkAbuseStatus({ emailHash, ipHash, fpHash }) {
  // ── 1. Email previously associated with a deleted account that used a free guide
  if (emailHash) {
    const prev = db.prepare(
      `SELECT guides_generated FROM deleted_accounts
       WHERE email_hash = ? ORDER BY deleted_at DESC LIMIT 1`
    ).get(emailHash);
    if (prev && prev.guides_generated > 0) {
      return { blocked: true, reason: "email_reuse_after_deletion" };
    }
  }

  // ── 2. Browser fingerprint seen in a deleted account that used a free guide
  if (fpHash) {
    const prevFp = db.prepare(
      `SELECT guides_generated FROM deleted_accounts
       WHERE fp_hash = ? ORDER BY deleted_at DESC LIMIT 1`
    ).get(fpHash);
    if (prevFp && prevFp.guides_generated > 0) {
      return { blocked: true, reason: "fingerprint_reuse_after_deletion" };
    }

    // Explicitly blocked fingerprint (admin action)
    const fpSig = db.prepare(
      `SELECT is_blocked FROM abuse_signals WHERE signal_type = 'fp' AND signal_hash = ?`
    ).get(fpHash);
    if (fpSig?.is_blocked) {
      return { blocked: true, reason: "fingerprint_blocked" };
    }
  }

  // ── 3. Explicitly blocked IP (admin action — not auto-blocked on IP alone)
  if (ipHash) {
    const ipSig = db.prepare(
      `SELECT is_blocked FROM abuse_signals WHERE signal_type = 'ip' AND signal_hash = ?`
    ).get(ipHash);
    if (ipSig?.is_blocked) {
      return { blocked: true, reason: "ip_blocked" };
    }
  }

  return null; // allowed
}

// ─── Signal recording ──────────────────────────────────────────────────────────

const UPSERT_SIGNAL = db.prepare(`
  INSERT INTO abuse_signals (id, signal_type, signal_hash, accounts_created, guides_generated, first_seen_at, last_seen_at)
  VALUES (lower(hex(randomblob(16))), ?, ?, ?, 0, ?, ?)
  ON CONFLICT(signal_type, signal_hash) DO UPDATE SET
    accounts_created = accounts_created + excluded.accounts_created,
    last_seen_at     = excluded.last_seen_at
`);

const BUMP_GENERATION = db.prepare(`
  UPDATE abuse_signals
  SET guides_generated = guides_generated + 1, last_seen_at = ?
  WHERE signal_type = ? AND signal_hash = ?
`);

/**
 * Called after a successful signup.
 * Upserts signal rows and raises automatic flags for suspicious patterns.
 */
export function recordSignup({ userId, emailHash, emailDomain, ipHash, fpHash, isDisposable }) {
  const now = new Date().toISOString();

  if (ipHash)    UPSERT_SIGNAL.run("ip",    ipHash,    1, now, now);
  if (fpHash)    UPSERT_SIGNAL.run("fp",    fpHash,    1, now, now);
  if (emailHash) UPSERT_SIGNAL.run("email", emailHash, 1, now, now);

  // Auto-flag: disposable email address
  if (isDisposable && emailHash) {
    raiseFlag("email_hash", emailHash, "disposable_email", "medium", userId);
  }

  // Auto-flag: IP has created 5+ accounts (cumulative — catches slow rollers)
  if (ipHash) {
    const ipSig = db.prepare(
      `SELECT accounts_created FROM abuse_signals WHERE signal_type = 'ip' AND signal_hash = ?`
    ).get(ipHash);
    if (ipSig && ipSig.accounts_created >= 5) {
      raiseFlag("ip_hash", ipHash, "rapid_account_creation", "high", userId);
    }
  }

  // Auto-flag: fingerprint has created 3+ accounts
  if (fpHash) {
    const fpSig = db.prepare(
      `SELECT accounts_created FROM abuse_signals WHERE signal_type = 'fp' AND signal_hash = ?`
    ).get(fpHash);
    if (fpSig && fpSig.accounts_created >= 3) {
      raiseFlag("fp_hash", fpHash, "multiple_accounts_same_device", "high", userId);
    }
  }
}

/**
 * Called after a free guide is successfully generated.
 * Increments generation counters on all known signals for this user.
 */
export function recordGeneration({ emailHash, ipHash, fpHash }) {
  const now = new Date().toISOString();
  if (emailHash) BUMP_GENERATION.run(now, "email", emailHash);
  if (ipHash)    BUMP_GENERATION.run(now, "ip",    ipHash);
  if (fpHash)    BUMP_GENERATION.run(now, "fp",    fpHash);
}

// ─── Account deletion archival ─────────────────────────────────────────────────

/**
 * Archive anti-abuse metadata before deleting a user account.
 * Must be called INSIDE the deletion transaction, before the user row is removed.
 */
export function archiveDeletedAccount(user, { ipHash = null, fpHash = null } = {}) {
  const emailHash = hashValue(user.email);
  const domain    = getEmailDomain(user.email);

  db.prepare(`
    INSERT INTO deleted_accounts
      (id, original_user_id, email_hash, email_domain, ip_hash, fp_hash, guides_generated, was_pro, deleted_at)
    VALUES
      (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    user.id,
    emailHash,
    domain,
    ipHash  || null,
    fpHash  || null,
    user.guides_created_ever || 0,
    (user.plan === "pro" || user.plan === "lifetime") ? 1 : 0,
  );
}

// ─── Flag helpers ──────────────────────────────────────────────────────────────

/**
 * Raise a flag — silently ignores if an identical unresolved flag already exists.
 */
export function raiseFlag(targetType, targetValue, reason, severity = "low", relatedUserId = null) {
  const existing = db.prepare(
    `SELECT id FROM abuse_flags
     WHERE target_type = ? AND target_value = ? AND reason = ? AND resolved_at IS NULL`
  ).get(targetType, targetValue, reason);
  if (existing) return; // don't spam duplicate flags

  db.prepare(`
    INSERT INTO abuse_flags (id, target_type, target_value, reason, severity, related_user_id, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, datetime('now'))
  `).run(targetType, targetValue, reason, severity, relatedUserId || null);
}
