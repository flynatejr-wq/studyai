import express from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// Get all guides (optionally by folder)
router.get("/", (req, res) => {
  const { folder_id } = req.query;
  let guides;
  if (folder_id) {
    guides = db.prepare("SELECT * FROM guides WHERE user_id = ? AND folder_id = ? ORDER BY created_at DESC").all(req.user.id, folder_id);
  } else {
    guides = db.prepare("SELECT * FROM guides WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  }
  res.json(guides.map(g => ({
    ...g,
    summary: JSON.parse(g.summary),
    key_terms: JSON.parse(g.key_terms),
    quiz_questions: JSON.parse(g.quiz_questions),
  })));
});

// Get single guide
router.get("/:id", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  res.json({
    ...guide,
    summary: JSON.parse(guide.summary),
    key_terms: JSON.parse(guide.key_terms),
    quiz_questions: JSON.parse(guide.quiz_questions),
  });
});

// Save a guide
router.post("/", (req, res) => {
  const { title, folder_id, type, summary, key_terms, quiz_questions } = req.body;
  if (!title || !summary || !key_terms || !quiz_questions)
    return res.status(400).json({ error: "Missing required fields." });

  const id = uuid();
  db.prepare(`INSERT INTO guides (id, user_id, folder_id, title, type, summary, key_terms, quiz_questions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.user.id, folder_id || null, title, type || "text",
      JSON.stringify(summary), JSON.stringify(key_terms), JSON.stringify(quiz_questions));

  // Update user stats
  const today = new Date().toISOString().split("T")[0];
  db.prepare("UPDATE users SET total_guides = total_guides + 1, xp = xp + 50, last_study_date = ? WHERE id = ?")
    .run(today, req.user.id);
  updateLevel(req.user.id);

  const guide = db.prepare("SELECT * FROM guides WHERE id = ?").get(id);
  res.json({
    ...guide,
    summary: JSON.parse(guide.summary),
    key_terms: JSON.parse(guide.key_terms),
    quiz_questions: JSON.parse(guide.quiz_questions),
  });
});

// Move guide to folder
router.patch("/:id/move", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  db.prepare("UPDATE guides SET folder_id = ? WHERE id = ?").run(req.body.folder_id || null, guide.id);
  res.json({ success: true });
});

// Delete guide
router.delete("/:id", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  db.prepare("DELETE FROM guides WHERE id = ?").run(guide.id);
  res.json({ success: true });
});

// Submit quiz attempt
router.post("/:id/quiz", (req, res) => {
  const { score, total } = req.body;
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const attemptId = uuid();
  db.prepare("INSERT INTO quiz_attempts (id, guide_id, user_id, score, total) VALUES (?, ?, ?, ?, ?)")
    .run(attemptId, guide.id, req.user.id, score, total);

  // Update best score
  if (score > guide.best_quiz_score) {
    db.prepare("UPDATE guides SET best_quiz_score = ?, quiz_attempts = quiz_attempts + 1 WHERE id = ?")
      .run(score, guide.id);
  } else {
    db.prepare("UPDATE guides SET quiz_attempts = quiz_attempts + 1 WHERE id = ?").run(guide.id);
  }

  // Award XP
  const xpGained = score * 10;
  db.prepare("UPDATE users SET xp = xp + ?, total_quizzes = total_quizzes + 1 WHERE id = ?")
    .run(xpGained, req.user.id);
  updateLevel(req.user.id);

  res.json({ success: true, xpGained });
});

// Get quiz history for a guide
router.get("/:id/quiz-history", (req, res) => {
  const attempts = db.prepare(
    "SELECT * FROM quiz_attempts WHERE guide_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10"
  ).all(req.params.id, req.user.id);
  res.json(attempts);
});

function updateLevel(userId) {
  const user = db.prepare("SELECT xp FROM users WHERE id = ?").get(userId);
  const level = Math.floor(Math.sqrt(user.xp / 100)) + 1;
  db.prepare("UPDATE users SET level = ? WHERE id = ?").run(Math.min(level, 50), userId);
}

export default router;
