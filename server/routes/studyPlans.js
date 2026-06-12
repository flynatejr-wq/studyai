import express from "express";
import { v4 as uuid } from "uuid";
import pool from "../db.js";
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
router.get("/", async (req, res) => {
  const plans = (await pool.query(
    "SELECT * FROM study_plans WHERE user_id = $1 ORDER BY exam_date ASC",
    [req.user.id]
  )).rows;
  res.json(plans.map(parsePlan));
});

// ── POST /api/study-plans — create a plan ────────────────────────────────────
router.post("/", async (req, res) => {
  const { title, exam_date, guide_ids = [], daily_goal_minutes = 30, notes = "" } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
  if (!exam_date)     return res.status(400).json({ error: "Exam date is required." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exam_date))
    return res.status(400).json({ error: "Exam date must be in YYYY-MM-DD format." });
  if (exam_date < new Date().toISOString().slice(0, 10))
    return res.status(400).json({ error: "Exam date must be in the future." });
  if (title.trim().length > 120)
    return res.status(400).json({ error: "Title is too long." });

  const goalMinutes = (daily_goal_minutes != null && daily_goal_minutes !== "")
    ? Math.max(5, Math.min(480, parseInt(daily_goal_minutes, 10)))
    : 30;

  // Validate guide_ids belong to this user
  const validatedGuideIds = [];
  if (Array.isArray(guide_ids)) {
    for (const gid of guide_ids) {
      const g = (await pool.query(
        "SELECT id FROM guides WHERE id = $1 AND user_id = $2",
        [gid, req.user.id]
      )).rows[0] ?? null;
      if (g) validatedGuideIds.push(g.id);
    }
  }

  const id = uuid();
  await pool.query(`
    INSERT INTO study_plans (id, user_id, title, exam_date, guide_ids, daily_goal_minutes, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [id, req.user.id, title.trim(), exam_date, JSON.stringify(validatedGuideIds), goalMinutes, notes.slice(0, 1000)]);

  const plan = (await pool.query("SELECT * FROM study_plans WHERE id = $1", [id])).rows[0] ?? null;
  res.json(parsePlan(plan));
});

// ── PATCH /api/study-plans/:id — update a plan ───────────────────────────────
router.patch("/:id", async (req, res) => {
  const plan = (await pool.query(
    "SELECT * FROM study_plans WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
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
      const g = (await pool.query(
        "SELECT id FROM guides WHERE id = $1 AND user_id = $2",
        [gid, req.user.id]
      )).rows[0] ?? null;
      if (g) newGuideIds.push(g.id);
    }
  }

  await pool.query(`
    UPDATE study_plans
    SET title = $1, exam_date = $2, guide_ids = $3, daily_goal_minutes = $4, notes = $5,
        updated_at = NOW()
    WHERE id = $6
  `, [newTitle, newDate, JSON.stringify(newGuideIds), newGoal, newNotes, plan.id]);

  const updated = (await pool.query("SELECT * FROM study_plans WHERE id = $1", [plan.id])).rows[0] ?? null;
  res.json(parsePlan(updated));
});

// ── DELETE /api/study-plans/:id ───────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const plan = (await pool.query(
    "SELECT id FROM study_plans WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!plan) return res.status(404).json({ error: "Study plan not found." });
  await pool.query("DELETE FROM study_plans WHERE id = $1", [plan.id]);
  res.json({ success: true });
});

export default router;
