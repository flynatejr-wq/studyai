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

// ── Usage limits endpoint ─────────────────────────────────────────────────────
// Returns current usage vs plan limits so the frontend can show usage bars
// and proactively surface upgrade prompts before the user hits a hard wall.
router.get("/limits", (req, res) => {
  const userId = req.user.id;
  const user = db.prepare(
    "SELECT plan, role, is_whitelisted, guides_created_ever, quiz_gen_count, quiz_gen_date FROM users WHERE id = ?"
  ).get(userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  const isPro = user.plan === "pro" || user.plan === "lifetime" || user.is_whitelisted || user.role === "admin";
  const today = new Date().toISOString().slice(0, 10);

  // Daily chat messages sent today
  const chatToday = db.prepare(
    "SELECT COUNT(*) as c FROM chat_messages WHERE user_id = ? AND role = 'user' AND date(created_at) = ?"
  ).get(userId, today)?.c || 0;

  // Folder count
  const folderCount = db.prepare("SELECT COUNT(*) as c FROM folders WHERE user_id = ?").get(userId)?.c || 0;

  // Quiz gens today (reset daily)
  const quizToday = user.quiz_gen_date === today ? (user.quiz_gen_count || 0) : 0;

  res.json({
    plan: user.plan || "free",
    is_pro: isPro,
    limits: {
      guides:      { used: user.guides_created_ever || 0, max: 1,  unlimited: isPro },
      quizzes:     { used: quizToday,                     max: 3,  unlimited: isPro },
      chat:        { used: chatToday,                     max: 15, unlimited: isPro },
      folders:     { used: folderCount,                   max: 3,  unlimited: isPro },
    },
  });
});

export default router;
