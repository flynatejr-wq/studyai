-- ── Classroom feature schema ──────────────────────────────────────────────────
-- These tables are ADDITIVE ONLY — they do not modify any existing tables.
-- Wire into db.js when ready to ship by appending the db.exec() calls below.
--
-- New plan value: 'teacher' (sits alongside 'free' | 'pro' | 'lifetime')
-- Users with plan = 'teacher' can create classes and share guides with students.
-- Students joined to a class get read-only access to those guides for free.
-- ─────────────────────────────────────────────────────────────────────────────

-- Classes owned by a teacher
CREATE TABLE IF NOT EXISTS classes (
  id           TEXT PRIMARY KEY,
  teacher_id   TEXT NOT NULL,
  name         TEXT NOT NULL,               -- e.g. "Biology 101 - Period 3"
  description  TEXT DEFAULT '',
  join_code    TEXT NOT NULL UNIQUE,        -- 6-char alphanumeric, e.g. "XK92PL"
  is_active    INTEGER DEFAULT 1,           -- 0 = archived (students can't join)
  created_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Students enrolled in a class
CREATE TABLE IF NOT EXISTS class_members (
  id          TEXT PRIMARY KEY,
  class_id    TEXT NOT NULL,
  student_id  TEXT NOT NULL,
  joined_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(class_id, student_id),
  FOREIGN KEY (class_id)   REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id)   ON DELETE CASCADE
);

-- Guides shared by a teacher to a class
-- Students can read these guides without needing Pro; they cannot edit them.
CREATE TABLE IF NOT EXISTS class_guides (
  id         TEXT PRIMARY KEY,
  class_id   TEXT NOT NULL,
  guide_id   TEXT NOT NULL,
  shared_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(class_id, guide_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id)  ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classes_teacher    ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_join_code  ON classes(join_code);
CREATE INDEX IF NOT EXISTS idx_class_members_class   ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_student ON class_members(student_id);
CREATE INDEX IF NOT EXISTS idx_class_guides_class    ON class_guides(class_id);
CREATE INDEX IF NOT EXISTS idx_class_guides_guide    ON class_guides(guide_id);
