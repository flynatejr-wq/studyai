import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// ── GET /api/export — download all user data as JSON ─────────────────────────
router.get("/", async (req, res) => {
  const userId = req.user.id;

  const user = (await pool.query(
    "SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, total_study_time, plan, role, created_at FROM users WHERE id = $1",
    [userId]
  )).rows[0] ?? null;
  if (!user) return res.status(404).json({ error: "User not found." });

  const isProUser = ["pro", "lifetime"].includes(user.plan) || user.role === "admin";
  if (!isProUser) {
    return res.status(403).json({
      error: "FREE_LIMIT_EXPORT",
      message: "Export is a Pro feature. Upgrade to download your data.",
    });
  }

  try {
    const folders = (await pool.query(
      "SELECT id, name, icon, color, created_at FROM folders WHERE user_id = $1 ORDER BY created_at",
      [userId]
    )).rows;

    const guides = (await pool.query(
      "SELECT id, folder_id, title, type, summary, key_terms, quiz_questions, sections, best_quiz_score, quiz_attempts, is_favorite, created_at, last_studied_at FROM guides WHERE user_id = $1 ORDER BY created_at",
      [userId]
    )).rows;

    const quizHistory = (await pool.query(
      "SELECT qa.guide_id, g.title as guide_title, qa.score, qa.total, qa.created_at FROM quiz_attempts qa LEFT JOIN guides g ON g.id = qa.guide_id WHERE qa.user_id = $1 ORDER BY qa.created_at",
      [userId]
    )).rows;

    const studySessions = (await pool.query(
      "SELECT ss.guide_id, g.title as guide_title, ss.duration_seconds, ss.created_at FROM study_sessions ss LEFT JOIN guides g ON g.id = ss.guide_id WHERE ss.user_id = $1 ORDER BY ss.created_at",
      [userId]
    )).rows;

    const achievements = (await pool.query(
      "SELECT type, earned_at FROM achievements WHERE user_id = $1 ORDER BY earned_at",
      [userId]
    )).rows;

    const exportData = {
      exported_at: new Date().toISOString(),
      account: user,
      folders,
      guides: guides.map(g => ({
        ...g,
        summary:        safeParseArr(g.summary),
        key_terms:      safeParseArr(g.key_terms),
        quiz_questions: safeParseArr(g.quiz_questions),
        sections:       safeParseArr(g.sections),
      })),
      quiz_history: quizHistory,
      study_sessions: studySessions,
      achievements,
    };

    const filename = `studybuddi-export-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (err) {
    console.error("[export]", err.message);
    res.status(500).json({ error: "Could not export data. Please try again." });
  }
});

function safeParseArr(str) {
  try { return JSON.parse(str); } catch { return []; }
}

export default router;
