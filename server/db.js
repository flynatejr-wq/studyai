import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use DATABASE_PATH env var if set (e.g. a Railway persistent volume at /data/data.db)
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, "data.db");
console.log(`[db] opening database at ${DB_PATH}`);

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
// BUG-15: Enable FK enforcement so cascading deletes/updates work correctly
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    streak INTEGER DEFAULT 0,
    last_study_date TEXT,
    total_guides INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'indigo',
    icon TEXT DEFAULT '📁',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS guides (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    folder_id TEXT,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    summary TEXT NOT NULL,
    key_terms TEXT NOT NULL,
    quiz_questions TEXT NOT NULL,
    best_quiz_score INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    guide_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    guide_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    guide_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    earned_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Safely add new columns to existing tables — only swallows "duplicate column" errors.
// Any other error (typo in column type, wrong table name, etc.) is re-thrown so it
// doesn't silently corrupt the schema on a fresh database.
const safeAlter = (sql) => {
  try { db.exec(sql); }
  catch (err) {
    if (!err.message?.includes("duplicate column name")) throw err;
  }
};
safeAlter("ALTER TABLE users ADD COLUMN total_study_time INTEGER DEFAULT 0");
safeAlter("ALTER TABLE users ADD COLUMN reset_token TEXT");
safeAlter("ALTER TABLE users ADD COLUMN reset_token_expires TEXT");
safeAlter("ALTER TABLE guides ADD COLUMN share_token TEXT");
safeAlter("ALTER TABLE guides ADD COLUMN last_studied_at TEXT");
safeAlter("ALTER TABLE guides ADD COLUMN sections TEXT DEFAULT '[]'");
safeAlter("ALTER TABLE guides ADD COLUMN section_progress TEXT DEFAULT '[]'");

// Monetization columns
safeAlter("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'");
safeAlter("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT");
safeAlter("ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT");
safeAlter("ALTER TABLE users ADD COLUMN quiz_gen_count INTEGER DEFAULT 0");
safeAlter("ALTER TABLE users ADD COLUMN quiz_gen_date TEXT DEFAULT ''");

// Permanent free-tier usage tracking — never decremented (even on guide deletion)
// so delete+recreate loops cannot bypass the limit.
safeAlter("ALTER TABLE users ADD COLUMN guides_created_ever INTEGER DEFAULT 0");

// Idempotency key on guides — prevents duplicate saves from spam-clicks or retries
safeAlter("ALTER TABLE guides ADD COLUMN idempotency_key TEXT");

// Admin & moderation columns
safeAlter("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
safeAlter("ALTER TABLE users ADD COLUMN is_whitelisted INTEGER DEFAULT 0");
safeAlter("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0");
safeAlter("ALTER TABLE users ADD COLUMN admin_notes TEXT DEFAULT ''");

// Email verification
safeAlter("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0");
safeAlter("ALTER TABLE users ADD COLUMN email_verify_token TEXT");

// Guide favorites (bookmarks)
safeAlter("ALTER TABLE guides ADD COLUMN is_favorite INTEGER DEFAULT 0");

// Referral system
safeAlter("ALTER TABLE users ADD COLUMN referral_code TEXT");
safeAlter("ALTER TABLE users ADD COLUMN referred_by TEXT");
safeAlter("ALTER TABLE users ADD COLUMN referral_credits INTEGER DEFAULT 0");
db.exec(`
  CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL,
    referred_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    converted_at TEXT,
    UNIQUE(referred_id),
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);`);

// Study plans / exam countdowns
db.exec(`
  CREATE TABLE IF NOT EXISTS study_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    guide_ids TEXT DEFAULT '[]',
    daily_goal_minutes INTEGER DEFAULT 30,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);`);

// Audit log — permanent record of every admin action (emails stored so records
// survive user deletion; no FK constraint intentionally).
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT,
    admin_email TEXT NOT NULL,
    target_user_id TEXT,
    target_email TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Back-fill referral codes for existing users who don't have one yet
{
  const usersWithoutCode = db.prepare("SELECT id FROM users WHERE referral_code IS NULL").all();
  const update = db.prepare("UPDATE users SET referral_code = ? WHERE id = ?");
  for (const u of usersWithoutCode) {
    update.run(randomBytes(4).toString("hex").toUpperCase(), u.id);
  }
}

// Back-fill email_verified for legacy accounts that predate the verification system.
// Any account created more than 1 hour ago that is still unverified is considered
// a legacy account — mark it verified so existing users aren't locked out.
// New signups (< 1 hour old) are left alone so the verification flow still applies.
{
  const result = db.prepare(
    `UPDATE users SET email_verified = 1, email_verify_token = NULL
     WHERE email_verified = 0
       AND datetime(created_at) < datetime('now', '-1 hour')`
  ).run();
  if (result.changes > 0) {
    console.log(`[db] back-filled email_verified=1 for ${result.changes} legacy account(s)`);
  }
}

// ── Anti-abuse tables ─────────────────────────────────────────────────────────
// These tables survive account deletion intentionally — they hold anonymised
// metadata (hashes only, never raw PII) used to detect free-tier farming.
db.exec(`
  CREATE TABLE IF NOT EXISTS deleted_accounts (
    id                 TEXT PRIMARY KEY,
    original_user_id   TEXT NOT NULL,
    email_hash         TEXT NOT NULL,   -- SHA-256 of normalised email
    email_domain       TEXT,            -- raw domain (e.g. gmail.com) for pattern detection
    ip_hash            TEXT,            -- SHA-256 of client IP at deletion time
    fp_hash            TEXT,            -- SHA-256 of browser fingerprint at deletion time
    guides_generated   INTEGER DEFAULT 0,
    was_pro            INTEGER DEFAULT 0,
    deleted_at         TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS abuse_signals (
    id                 TEXT PRIMARY KEY,
    signal_type        TEXT NOT NULL,   -- 'ip' | 'fp' | 'email'
    signal_hash        TEXT NOT NULL,
    accounts_created   INTEGER DEFAULT 0,
    guides_generated   INTEGER DEFAULT 0,
    first_seen_at      TEXT DEFAULT (datetime('now')),
    last_seen_at       TEXT DEFAULT (datetime('now')),
    is_blocked         INTEGER DEFAULT 0,
    UNIQUE(signal_type, signal_hash)
  );

  CREATE TABLE IF NOT EXISTS abuse_flags (
    id                 TEXT PRIMARY KEY,
    target_type        TEXT NOT NULL,   -- 'user_id' | 'email_hash' | 'ip_hash' | 'fp_hash'
    target_value       TEXT NOT NULL,
    reason             TEXT NOT NULL,
    severity           TEXT DEFAULT 'low',  -- 'low' | 'medium' | 'high'
    related_user_id    TEXT,
    created_at         TEXT DEFAULT (datetime('now')),
    resolved_at        TEXT,
    resolved_by        TEXT,
    notes              TEXT
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email_hash ON deleted_accounts(email_hash);
  CREATE INDEX IF NOT EXISTS idx_deleted_accounts_fp_hash    ON deleted_accounts(fp_hash);
  CREATE INDEX IF NOT EXISTS idx_abuse_signals_type_hash     ON abuse_signals(signal_type, signal_hash);
  CREATE INDEX IF NOT EXISTS idx_abuse_flags_unresolved      ON abuse_flags(resolved_at) WHERE resolved_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_abuse_flags_target          ON abuse_flags(target_type, target_value);
`);

// Google OAuth
safeAlter("ALTER TABLE users ADD COLUMN google_id TEXT");
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;`);

// ── Performance indexes ───────────────────────────────────────────────────────
// Added after initial schema so existing DBs gain them automatically on restart.
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_guides_user_id       ON guides(user_id);
  CREATE INDEX IF NOT EXISTS idx_guides_created_at    ON guides(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_guides_folder_id     ON guides(folder_id);
  CREATE INDEX IF NOT EXISTS idx_guides_idempotency   ON guides(user_id, idempotency_key);
  CREATE INDEX IF NOT EXISTS idx_chat_guide_id        ON chat_messages(guide_id);
  CREATE INDEX IF NOT EXISTS idx_quiz_guide_id        ON quiz_attempts(guide_id);
  CREATE INDEX IF NOT EXISTS idx_quiz_user_id         ON quiz_attempts(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id     ON study_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_target         ON audit_logs(target_user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_created_at     ON audit_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_plan           ON users(plan);
  CREATE INDEX IF NOT EXISTS idx_guides_favorite      ON guides(user_id, is_favorite);
`);

export default db;
