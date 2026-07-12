import pg from "pg";
import { randomBytes } from "crypto";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Convenience query helper — used by routes that import { query } from "../db.js"
export async function query(sql, params) {
  return pool.query(sql, params);
}

export async function initDb() {
  console.log("[db] initialising PostgreSQL schema...");

  // ── Core tables ─────────────────────────────────────────────────────────────
  await pool.query(`
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
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT 'indigo',
      icon TEXT DEFAULT '📁',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      guide_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      guide_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      guide_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      earned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── ALTER TABLE: add new columns idempotently ────────────────────────────────
  const safeAlters = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_study_time INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TEXT",
    "ALTER TABLE guides ADD COLUMN IF NOT EXISTS share_token TEXT",
    "ALTER TABLE guides ADD COLUMN IF NOT EXISTS last_studied_at TIMESTAMPTZ",
    "ALTER TABLE guides ADD COLUMN IF NOT EXISTS sections TEXT DEFAULT '[]'",
    "ALTER TABLE guides ADD COLUMN IF NOT EXISTS section_progress TEXT DEFAULT '[]'",
    "ALTER TABLE guides ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'detailed'",
    // Monetization
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS quiz_gen_count INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS quiz_gen_date TEXT DEFAULT ''",
    // Permanent free-tier counter
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS guides_created_ever INTEGER DEFAULT 0",
    // Idempotency key
    "ALTER TABLE guides ADD COLUMN IF NOT EXISTS idempotency_key TEXT",
    // Admin & moderation
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_whitelisted INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT ''",
    // Email verification
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT",
    // Guide favorites
    "ALTER TABLE guides ADD COLUMN IF NOT EXISTS is_favorite INTEGER DEFAULT 0",
    // Referral system
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0",
    // Reminder tracking
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_reminder_sent_date TEXT",
    // Google OAuth
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT",
    // Microsoft OAuth (SSO) — required by institutions like SSU whose IT
    // policy mandates signing in with the school's Microsoft/Azure AD account.
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_id TEXT",
    // TTS monthly character quota — bounds the one unmetered per-request cost
    // (OpenAI tts-1) against the flat-price Pro subscription.
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS tts_chars_used INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS tts_chars_month TEXT DEFAULT ''",
    // Daily guide-creation counter for the 'pilot' plan tier — guide creation
    // previously only had a lifetime cap (guides_created_ever), no daily-reset
    // mechanism to bound a free institutional pilot account's cost.
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS guides_created_today INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS guides_created_date TEXT DEFAULT ''",
  ];

  for (const sql of safeAlters) {
    await pool.query(sql);
  }

  // ── Additional tables ────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      converted_at TIMESTAMPTZ,
      UNIQUE(referred_id),
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      guide_ids TEXT DEFAULT '[]',
      daily_goal_minutes INTEGER DEFAULT 30,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      admin_email TEXT NOT NULL,
      target_user_id TEXT,
      target_email TEXT NOT NULL,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ── Anti-abuse tables ────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deleted_accounts (
      id                 TEXT PRIMARY KEY,
      original_user_id   TEXT NOT NULL,
      email_hash         TEXT NOT NULL,
      email_domain       TEXT,
      ip_hash            TEXT,
      fp_hash            TEXT,
      guides_generated   INTEGER DEFAULT 0,
      was_pro            INTEGER DEFAULT 0,
      deleted_at         TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS abuse_signals (
      id                 TEXT PRIMARY KEY,
      signal_type        TEXT NOT NULL,
      signal_hash        TEXT NOT NULL,
      accounts_created   INTEGER DEFAULT 0,
      guides_generated   INTEGER DEFAULT 0,
      first_seen_at      TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at       TIMESTAMPTZ DEFAULT NOW(),
      is_blocked         INTEGER DEFAULT 0,
      UNIQUE(signal_type, signal_hash)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS abuse_flags (
      id                 TEXT PRIMARY KEY,
      target_type        TEXT NOT NULL,
      target_value       TEXT NOT NULL,
      reason             TEXT NOT NULL,
      severity           TEXT DEFAULT 'low',
      related_user_id    TEXT,
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      resolved_at        TIMESTAMPTZ,
      resolved_by        TEXT,
      notes              TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_events (
      id TEXT PRIMARY KEY,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ── Indexes ──────────────────────────────────────────────────────────────────
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)",
    "CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)",
    "CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email_hash ON deleted_accounts(email_hash)",
    "CREATE INDEX IF NOT EXISTS idx_deleted_accounts_fp_hash    ON deleted_accounts(fp_hash)",
    "CREATE INDEX IF NOT EXISTS idx_abuse_signals_type_hash     ON abuse_signals(signal_type, signal_hash)",
    "CREATE INDEX IF NOT EXISTS idx_abuse_flags_target          ON abuse_flags(target_type, target_value)",
    "CREATE INDEX IF NOT EXISTS idx_guides_user_id       ON guides(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_guides_created_at    ON guides(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_guides_folder_id     ON guides(folder_id)",
    "CREATE INDEX IF NOT EXISTS idx_guides_idempotency   ON guides(user_id, idempotency_key)",
    "CREATE INDEX IF NOT EXISTS idx_chat_guide_id        ON chat_messages(guide_id)",
    "CREATE INDEX IF NOT EXISTS idx_quiz_guide_id        ON quiz_attempts(guide_id)",
    "CREATE INDEX IF NOT EXISTS idx_quiz_user_id         ON quiz_attempts(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_user_id     ON study_sessions(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_audit_target         ON audit_logs(target_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_audit_created_at     ON audit_logs(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_plan           ON users(plan)",
    "CREATE INDEX IF NOT EXISTS idx_guides_favorite      ON guides(user_id, is_favorite)",
    // Partial index for unresolved abuse_flags — PostgreSQL supports WHERE in CREATE INDEX
    "CREATE INDEX IF NOT EXISTS idx_abuse_flags_unresolved ON abuse_flags(resolved_at) WHERE resolved_at IS NULL",
    // Unique partial index for google_id
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id) WHERE microsoft_id IS NOT NULL",
  ];

  for (const sql of indexes) {
    await pool.query(sql);
  }

  // ── Back-fill referral codes for users that don't have one ──────────────────
  {
    const { rows: usersWithoutCode } = await pool.query(
      "SELECT id FROM users WHERE referral_code IS NULL"
    );
    for (const u of usersWithoutCode) {
      await pool.query(
        "UPDATE users SET referral_code = $1 WHERE id = $2",
        [randomBytes(4).toString("hex").toUpperCase(), u.id]
      );
    }
  }

  // ── Back-fill email_verified for legacy accounts ─────────────────────────────
  {
    const result = await pool.query(`
      UPDATE users SET email_verified = 1, email_verify_token = NULL
      WHERE email_verified = 0
        AND created_at < NOW() - INTERVAL '1 hour'
    `);
    if (result.rowCount > 0) {
      console.log(`[db] back-filled email_verified=1 for ${result.rowCount} legacy account(s)`);
    }
  }

  console.log("[db] PostgreSQL schema ready.");
}

export default pool;
