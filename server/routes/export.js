import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// ── GET /api/export — download all user data as JSON ─────────────────────────
// Produces a single JSON file containing guides, quiz history, study sessions,
// folders, and a summary of account stats. No PII beyond what the user already
// has access to in the UI.
// Export is a Pro-only feature.
router.get("/", (req, res) => {
  const userId = req.user.id;

  // Pro/lifetime/admin bypass
  const plan = req.user.plan || "free";
  const isProUser = ["pro", "lifetime"].includes(plan) || req.user.is_admin;
  if (!isProUser) {
    return res.status(403).json({
      error: "FREE_LIMIT_EXPORT",
      message: "Export is a Pro feature. Upgrade to download your data.",
    });
  }

  try {
    const user = db.prepare(
      "SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, total_study_time, plan, created_at FROM users WHERE id = ?"
    ).get(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const folders = db.prepare(
      "SELECT id, name, icon, color, created_at FROM folders WHERE user_id = ? ORDER BY created_at"
    ).all(userId);

    const guides = db.prepare(
      "SELECT id, folder_id, title, type, summary, key_terms, quiz_questions, sections, best_quiz_score, quiz_attempts, is_favorite, share_token, created_at, last_studied_at FROM guides WHERE user_id = ? ORDER BY created_at"
    ).all(userId);

    const quizHistory = db.prepare(
      "SELECT qa.guide_id, g.title as guide_title, qa.score, qa.total, qa.created_at FROM quiz_attempts qa LEFT JOIN guides g ON g.id = qa.guide_id WHERE qa.user_id = ? ORDER BY qa.created_at"
    ).all(userId);

    const studySessions = db.prepare(
      "SELECT ss.guide_id, g.title as guide_title, ss.duration_seconds, ss.created_at FROM study_sessions ss LEFT JOIN guides g ON g.id = ss.guide_id WHERE ss.user_id = ? ORDER BY ss.created_at"
    ).all(userId);

    const achievements = db.prepare(
      "SELECT type, earned_at FROM achievements WHERE user_id = ? ORDER BY earned_at"
    ).all(userId);

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
