import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use DATABASE_PATH env var if set (e.g. a Railway persistent volume at /data/data.db)
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, "data.db");
console.log(`[db] opening database at ${DB_PATH}`);

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

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
