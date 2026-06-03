import express from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

function parsePlan(p) {
  return {
    ...p,
    guide_ids: JSON.parse(p.guide_ids || "[]"),
  };
}

// ── GET /api/study-plans — list all plans for the user ───────────────────────
router.get("/", (req, res) => {
  const plans = db.prepare(
    "SELECT * FROM study_plans WHERE user_id = ? ORDER BY exam_date ASC"
  ).all(req.user.id);
  res.json(plans.map(parsePlan));
});

// ── POST /api/study-plans — create a plan ────────────────────────────────────
router.post("/", (req, res) => {
  const { title, exam_date, guide_ids = [], daily_goal_minutes = 30, notes = "" } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
  if (!exam_date)     return res.status(400).json({ error: "Exam date is required." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exam_date))
    return res.status(400).json({ error: "Exam date must be in YYYY-MM-DD format." });
  // BUG-14: Compare date strings directly to avoid timezone-induced off-by-one errors
  if (exam_date < new Date().toISOString().slice(0, 10))
    return res.status(400).json({ error: "Exam date must be in the future." });
  if (title.trim().length > 120)
    return res.status(400).json({ error: "Title is too long." });

  const goalMinutes = (daily_goal_minutes != null && daily_goal_minutes !== "") ? Math.max(5, Math.min(480, parseInt(daily_goal_minutes, 10))) : 30;

  // Validate guide_ids belong to this user
  const validatedGuideIds = [];
  if (Array.isArray(guide_ids)) {
    for (const gid of guide_ids) {
      const g = db.prepare("SELECT id FROM guides WHERE id = ? AND user_id = ?").get(gid, req.user.id);
      if (g) validatedGuideIds.push(g.id);
    }
  }

  const id = uuid();
  db.prepare(`
    INSERT INTO study_plans (id, user_id, title, exam_date, guide_ids, daily_goal_minutes, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, title.trim(), exam_date, JSON.stringify(validatedGuideIds), goalMinutes, notes.slice(0, 1000));

  const plan = db.prepare("SELECT * FROM study_plans WHERE id = ?").get(id);
  res.json(parsePlan(plan));
});

// ── PATCH /api/study-plans/:id — update a plan ───────────────────────────────
router.patch("/:id", (req, res) => {
  const plan = db.prepare("SELECT * FROM study_plans WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!plan) return res.status(404).json({ error: "Study plan not found." });

  const { title, exam_date, guide_ids, daily_goal_minutes, notes } = req.body;

  const newTitle = title?.trim() ?? plan.title;
  const newDate  = exam_date ?? plan.exam_date;
  const newGoal  = (daily_goal_minutes != null && daily_goal_minutes !== "")
    ? Math.max(5, Math.min(480, parseInt(daily_goal_minutes, 10)))
    : plan.daily_goal_minutes;
  const newNotes = notes != null ? notes.slice(0, 1000) : plan.notes;

  if (newTitle.length === 0) return res.status(400).json({ error: "Title cannot be empty." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate))
    return res.status(400).json({ error: "Exam date must be in YYYY-MM-DD format." });

  let newGuideIds = JSON.parse(plan.guide_ids || "[]");
  if (Array.isArray(guide_ids)) {
    newGuideIds = [];
    for (const gid of guide_ids) {
      const g = db.prepare("SELECT id FROM guides WHERE id = ? AND user_id = ?").get(gid, req.user.id);
      if (g) newGuideIds.push(g.id);
    }
  }

  db.prepare(`
    UPDATE study_plans
    SET title = ?, exam_date = ?, guide_ids = ?, daily_goal_minutes = ?, notes = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(newTitle, newDate, JSON.stringify(newGuideIds), newGoal, newNotes, plan.id);

  const updated = db.prepare("SELECT * FROM study_plans WHERE id = ?").get(plan.id);
  res.json(parsePlan(updated));
});

// ── DELETE /api/study-plans/:id ───────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const plan = db.prepare("SELECT id FROM study_plans WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!plan) return res.status(404).json({ error: "Study plan not found." });
  db.prepare("DELETE FROM study_plans WHERE id = ?").run(plan.id);
  res.json({ success: true });
});

export default router;
