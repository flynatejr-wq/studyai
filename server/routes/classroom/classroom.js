/**
 * Classroom routes — teacher/student bundle
 *
 * NOT wired into server.js yet. To activate, add:
 *   import classroomRouter from "./routes/classroom/classroom.js";
 *   app.use("/api/classroom", classroomRouter);
 * …and run the schema.sql migrations via db.exec() in db.js.
 *
 * Plan gate: req.user must have plan = 'teacher' for teacher-only endpoints.
 * Students can be on any plan (including 'free') — class membership grants access.
 */

import express from "express";
import { v4 as uuid } from "uuid";
import { requireAuth } from "../../middleware/auth.js";
import db from "../../db.js";

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a unique 6-char uppercase join code (e.g. "XK92PL") */
function generateJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 to avoid confusion
  let code;
  let attempts = 0;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    attempts++;
    if (attempts > 20) throw new Error("Could not generate a unique join code.");
  } while (db.prepare("SELECT 1 FROM classes WHERE join_code = ?").get(code));
  return code;
}

/** Require the authenticated user to have plan = 'teacher' */
function requireTeacher(req, res, next) {
  const user = db.prepare("SELECT plan FROM users WHERE id = ?").get(req.user.id);
  if (!user || user.plan !== "teacher") {
    return res.status(403).json({ error: "Teacher plan required." });
  }
  next();
}

/** Verify the authenticated user owns the given class */
function getOwnedClass(teacherId, classId) {
  return db.prepare("SELECT * FROM classes WHERE id = ? AND teacher_id = ?").get(classId, teacherId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/classroom/classes — list teacher's classes ───────────────────────
router.get("/classes", requireAuth, requireTeacher, (req, res) => {
  const classes = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM class_members cm WHERE cm.class_id = c.id) AS student_count,
      (SELECT COUNT(*) FROM class_guides  cg WHERE cg.class_id = c.id) AS guide_count
    FROM classes c
    WHERE c.teacher_id = ?
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json({ classes });
});

// ── POST /api/classroom/classes — create a class ──────────────────────────────
router.post("/classes", requireAuth, requireTeacher, (req, res) => {
  const { name, description = "" } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Class name is required." });
  if (name.trim().length > 100) return res.status(400).json({ error: "Class name is too long." });

  // Limit: 20 classes per teacher (prevent abuse)
  const count = db.prepare("SELECT COUNT(*) AS n FROM classes WHERE teacher_id = ?").get(req.user.id).n;
  if (count >= 20) return res.status(400).json({ error: "Maximum 20 classes per account." });

  const id       = uuid();
  const joinCode = generateJoinCode();
  db.prepare(`
    INSERT INTO classes (id, teacher_id, name, description, join_code)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, name.trim(), description.trim(), joinCode);

  const created = db.prepare("SELECT * FROM classes WHERE id = ?").get(id);
  res.status(201).json({ class: { ...created, student_count: 0, guide_count: 0 } });
});

// ── PATCH /api/classroom/classes/:id — update class name/description ──────────
router.patch("/classes/:id", requireAuth, requireTeacher, (req, res) => {
  const cls = getOwnedClass(req.user.id, req.params.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });

  const { name, description, is_active } = req.body;
  if (name !== undefined && !name?.trim()) return res.status(400).json({ error: "Class name cannot be empty." });

  db.prepare(`
    UPDATE classes SET
      name        = COALESCE(?, name),
      description = COALESCE(?, description),
      is_active   = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name?.trim() ?? null, description?.trim() ?? null, is_active ?? null, cls.id);

  res.json({ class: db.prepare("SELECT * FROM classes WHERE id = ?").get(cls.id) });
});

// ── DELETE /api/classroom/classes/:id — delete a class ───────────────────────
router.delete("/classes/:id", requireAuth, requireTeacher, (req, res) => {
  const cls = getOwnedClass(req.user.id, req.params.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });
  db.prepare("DELETE FROM classes WHERE id = ?").run(cls.id);
  res.json({ ok: true });
});

// ── GET /api/classroom/classes/:id/members — list students in a class ─────────
router.get("/classes/:id/members", requireAuth, requireTeacher, (req, res) => {
  const cls = getOwnedClass(req.user.id, req.params.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.xp, u.level, cm.joined_at
    FROM class_members cm
    JOIN users u ON u.id = cm.student_id
    WHERE cm.class_id = ?
    ORDER BY cm.joined_at DESC
  `).all(cls.id);
  res.json({ members });
});

// ── DELETE /api/classroom/classes/:id/members/:studentId — remove student ─────
router.delete("/classes/:id/members/:studentId", requireAuth, requireTeacher, (req, res) => {
  const cls = getOwnedClass(req.user.id, req.params.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });
  db.prepare("DELETE FROM class_members WHERE class_id = ? AND student_id = ?").run(cls.id, req.params.studentId);
  res.json({ ok: true });
});

// ── GET /api/classroom/classes/:id/guides — list guides shared to a class ─────
router.get("/classes/:id/guides", requireAuth, requireTeacher, (req, res) => {
  const cls = getOwnedClass(req.user.id, req.params.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });

  const guides = db.prepare(`
    SELECT g.id, g.title, g.type, g.created_at, cg.shared_at
    FROM class_guides cg
    JOIN guides g ON g.id = cg.guide_id
    WHERE cg.class_id = ?
    ORDER BY cg.shared_at DESC
  `).all(cls.id);
  res.json({ guides });
});

// ── POST /api/classroom/classes/:id/guides — share a guide to a class ─────────
router.post("/classes/:id/guides", requireAuth, requireTeacher, (req, res) => {
  const cls = getOwnedClass(req.user.id, req.params.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });

  const { guide_id } = req.body;
  if (!guide_id) return res.status(400).json({ error: "guide_id is required." });

  // Only allow sharing guides the teacher actually owns
  const guide = db.prepare("SELECT id FROM guides WHERE id = ? AND user_id = ?").get(guide_id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found or not yours." });

  // Idempotent — silently ignore if already shared
  const existing = db.prepare("SELECT 1 FROM class_guides WHERE class_id = ? AND guide_id = ?").get(cls.id, guide_id);
  if (existing) return res.json({ ok: true, already_shared: true });

  db.prepare("INSERT INTO class_guides (id, class_id, guide_id) VALUES (?, ?, ?)").run(uuid(), cls.id, guide_id);
  res.status(201).json({ ok: true });
});

// ── DELETE /api/classroom/classes/:id/guides/:guideId — unshare a guide ───────
router.delete("/classes/:id/guides/:guideId", requireAuth, requireTeacher, (req, res) => {
  const cls = getOwnedClass(req.user.id, req.params.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });
  db.prepare("DELETE FROM class_guides WHERE class_id = ? AND guide_id = ?").run(cls.id, req.params.guideId);
  res.json({ ok: true });
});

// ── POST /api/classroom/classes/:id/regenerate-code — new join code ───────────
router.post("/classes/:id/regenerate-code", requireAuth, requireTeacher, (req, res) => {
  const cls = getOwnedClass(req.user.id, req.params.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });
  const newCode = generateJoinCode();
  db.prepare("UPDATE classes SET join_code = ? WHERE id = ?").run(newCode, cls.id);
  res.json({ join_code: newCode });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /api/classroom/join — student joins a class by code ──────────────────
router.post("/join", requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: "Join code is required." });

  const cls = db.prepare("SELECT * FROM classes WHERE join_code = ? AND is_active = 1").get(code.trim().toUpperCase());
  if (!cls) return res.status(404).json({ error: "Invalid or expired join code. Check with your teacher." });

  // Teacher can't join their own class as a student
  if (cls.teacher_id === req.user.id) return res.status(400).json({ error: "You own this class." });

  // Idempotent — already a member
  const existing = db.prepare("SELECT 1 FROM class_members WHERE class_id = ? AND student_id = ?").get(cls.id, req.user.id);
  if (existing) return res.json({ ok: true, already_member: true, class: cls });

  // Cap at 200 students per class (soft limit)
  const count = db.prepare("SELECT COUNT(*) AS n FROM class_members WHERE class_id = ?").get(cls.id).n;
  if (count >= 200) return res.status(400).json({ error: "This class is full. Contact your teacher." });

  db.prepare("INSERT INTO class_members (id, class_id, student_id) VALUES (?, ?, ?)").run(uuid(), cls.id, req.user.id);
  res.status(201).json({ ok: true, class: cls });
});

// ── GET /api/classroom/my-classes — student's enrolled classes ────────────────
router.get("/my-classes", requireAuth, (req, res) => {
  const classes = db.prepare(`
    SELECT c.id, c.name, c.description,
      (SELECT COUNT(*) FROM class_guides cg WHERE cg.class_id = c.id) AS guide_count,
      cm.joined_at
    FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = ?
    ORDER BY cm.joined_at DESC
  `).all(req.user.id);
  res.json({ classes });
});

// ── GET /api/classroom/my-classes/:id/guides — guides in a student's class ────
router.get("/my-classes/:id/guides", requireAuth, (req, res) => {
  // Confirm student is a member
  const membership = db.prepare("SELECT 1 FROM class_members WHERE class_id = ? AND student_id = ?").get(req.params.id, req.user.id);
  if (!membership) return res.status(403).json({ error: "You are not a member of this class." });

  const guides = db.prepare(`
    SELECT g.id, g.title, g.type, g.summary, g.key_terms, g.sections, g.created_at, cg.shared_at
    FROM class_guides cg
    JOIN guides g ON g.id = cg.guide_id
    WHERE cg.class_id = ?
    ORDER BY cg.shared_at DESC
  `).all(req.params.id);
  res.json({ guides });
});

// ── DELETE /api/classroom/my-classes/:id — student leaves a class ─────────────
router.delete("/my-classes/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM class_members WHERE class_id = ? AND student_id = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

export default router;
