import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { FREE_CHAT_DAILY_LIMIT } from "./chat.js";
import {
  TTS_MONTHLY_CHARS_FREE, TTS_MONTHLY_CHARS_PRO,
  PILOT_GUIDES_PER_DAY, PILOT_QUIZZES_PER_DAY, PILOT_CHAT_PER_DAY,
} from "../limits.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.user.id;

  const user = (await pool.query(
    "SELECT id, name, email, xp, level, streak, last_study_date, total_guides, total_quizzes, total_study_time, plan, created_at FROM users WHERE id = $1",
    [userId]
  )).rows[0] ?? null;

  // All guides with quiz history and study time
  const guides = (await pool.query(
    "SELECT * FROM guides WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  )).rows;

  const guidesWithStats = await Promise.all(guides.map(async (g) => {
    const attempts = (await pool.query(
      "SELECT score, total, created_at FROM quiz_attempts WHERE guide_id = $1 AND user_id = $2 ORDER BY created_at ASC",
      [g.id, userId]
    )).rows;

    const lastSession = (await pool.query(
      "SELECT created_at FROM study_sessions WHERE guide_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1",
      [g.id, userId]
    )).rows[0] ?? null;

    const timeRow = (await pool.query(
      "SELECT COALESCE(SUM(duration_seconds),0) as total FROM study_sessions WHERE guide_id = $1 AND user_id = $2",
      [g.id, userId]
    )).rows[0];

    return {
      id: g.id,
      title: g.title,
      created_at: g.created_at,
      best_quiz_score: g.best_quiz_score,
      quiz_attempts: g.quiz_attempts,
      last_studied_at: lastSession?.created_at || null,
      study_time_seconds: Number(timeRow?.total) || 0,
      attempts,
    };
  }));

  // Total study time across all guides
  const studyTimeRow = (await pool.query(
    "SELECT COALESCE(SUM(duration_seconds),0) as total FROM study_sessions WHERE user_id = $1",
    [userId]
  )).rows[0];

  // Achievements earned
  const achievements = (await pool.query(
    "SELECT type, earned_at FROM achievements WHERE user_id = $1 ORDER BY earned_at ASC",
    [userId]
  )).rows;

  // Recent activity (last 30 days) — group sessions by date
  const activity = (await pool.query(`
    SELECT DATE(created_at) as date, SUM(duration_seconds) as seconds
    FROM study_sessions WHERE user_id = $1
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [userId])).rows;

  res.json({
    user: {
      name: user.name,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      total_guides: user.total_guides,
      total_quizzes: user.total_quizzes,
      total_study_time: Number(studyTimeRow?.total) || 0,
      created_at: user.created_at,
    },
    guides: guidesWithStats,
    achievements,
    activity,
  });
});

// ── Usage limits endpoint ─────────────────────────────────────────────────────
router.get("/limits", async (req, res) => {
  const userId = req.user.id;
  const user = (await pool.query(
    "SELECT plan, role, is_whitelisted, guides_created_ever, guides_created_today, guides_created_date, quiz_gen_count, quiz_gen_date, tts_chars_used, tts_chars_month FROM users WHERE id = $1",
    [userId]
  )).rows[0] ?? null;
  if (!user) return res.status(404).json({ error: "User not found." });

  const isPro = user.plan === "pro" || user.plan === "lifetime" || user.is_whitelisted || user.role === "admin";
  const isPilot = user.plan === "pilot";
  const today = new Date().toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);

  // Daily chat messages sent today
  const chatToday = Number((await pool.query(
    "SELECT COUNT(*) as c FROM chat_messages WHERE user_id = $1 AND role = 'user' AND DATE(created_at) = $2",
    [userId, today]
  )).rows[0]?.c) || 0;

  // Folder count
  const folderCount = Number((await pool.query(
    "SELECT COUNT(*) as c FROM folders WHERE user_id = $1",
    [userId]
  )).rows[0]?.c) || 0;

  // Quiz gens today (reset daily)
  const quizToday = user.quiz_gen_date === today ? (user.quiz_gen_count || 0) : 0;

  // Guides created today (reset daily) — only meaningful for the pilot tier,
  // whose cap is daily rather than the free tier's lifetime cap.
  const guidesToday = user.guides_created_date === today ? (user.guides_created_today || 0) : 0;

  // Voice (TTS) chars this month — reset monthly, not daily. Capped for
  // every tier (Pro's/pilot's cap is just much higher), never unlimited.
  const voiceThisMonth = user.tts_chars_month === monthKey ? (user.tts_chars_used || 0) : 0;
  const voiceCap = (isPro || isPilot) ? TTS_MONTHLY_CHARS_PRO : TTS_MONTHLY_CHARS_FREE;

  res.json({
    plan: user.plan || "free",
    is_pro: isPro,
    limits: {
      guides:  isPilot
        ? { used: guidesToday, max: PILOT_GUIDES_PER_DAY,  unlimited: false }
        : { used: user.guides_created_ever || 0, max: 1, unlimited: isPro },
      quizzes: isPilot
        ? { used: quizToday, max: PILOT_QUIZZES_PER_DAY, unlimited: false }
        : { used: quizToday, max: 3, unlimited: isPro },
      chat:    isPilot
        ? { used: chatToday, max: PILOT_CHAT_PER_DAY, unlimited: false }
        : { used: chatToday, max: FREE_CHAT_DAILY_LIMIT, unlimited: isPro },
      // Folders cost nothing to serve — pilot gets the same unlimited
      // treatment as Pro, no separate cap needed.
      folders: { used: folderCount, max: 3, unlimited: isPro || isPilot },
      voice:   { used: voiceThisMonth, max: voiceCap, unlimited: false },
    },
  });
});

export default router;
