import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const userId = req.user.id;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

  // All guides with quiz history and study time
  const guides = db.prepare(
    "SELECT * FROM guides WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId);

  const guidesWithStats = guides.map((g) => {
    const attempts = db.prepare(
      "SELECT score, total, created_at FROM quiz_attempts WHERE guide_id = ? AND user_id = ? ORDER BY created_at ASC"
    ).all(g.id, userId);

    const lastSession = db.prepare(
      "SELECT created_at FROM study_sessions WHERE guide_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1"
    ).get(g.id, userId);

    const timeRow = db.prepare(
      "SELECT COALESCE(SUM(duration_seconds),0) as total FROM study_sessions WHERE guide_id = ? AND user_id = ?"
    ).get(g.id, userId);

    return {
      id: g.id,
      title: g.title,
      created_at: g.created_at,
      best_quiz_score: g.best_quiz_score,
      quiz_attempts: g.quiz_attempts,
      last_studied_at: lastSession?.created_at || null,
      study_time_seconds: timeRow?.total || 0,
      attempts, // [{score, total, created_at}]
    };
  });

  // Total study time across all guides
  const studyTimeRow = db.prepare(
    "SELECT COALESCE(SUM(duration_seconds),0) as total FROM study_sessions WHERE user_id = ?"
  ).get(userId);

  // Achievements earned
  const achievements = db.prepare(
    "SELECT type, earned_at FROM achievements WHERE user_id = ? ORDER BY earned_at ASC"
  ).all(userId);

  // Recent activity (last 30 days) — group sessions by date
  const activity = db.prepare(`
    SELECT DATE(created_at) as date, SUM(duration_seconds) as seconds
    FROM study_sessions WHERE user_id = ?
      AND created_at >= DATE('now','-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(userId);

  res.json({
    user: {
      name: user.name,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      total_guides: user.total_guides,
      total_quizzes: user.total_quizzes,
      total_study_time: studyTimeRow?.total || 0,
      created_at: user.created_at,
    },
    guides: guidesWithStats,
    achievements,
    activity,
  });
});

export default router;
