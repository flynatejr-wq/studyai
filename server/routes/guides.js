import express from "express";
import { v4 as uuid } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

function makeAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 3,
    timeout: 120_000,
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParse(str, fallback = []) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function stripHtml(s) {
  return typeof s === "string" ? s.replace(/<[^>]+>/g, "").trim() : s;
}

function parseGuide(g) {
  const rawSections = safeParse(g.sections || "[]", []);
  const cleanSections = rawSections.map(s => ({
    ...s,
    keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints.map(stripHtml) : [],
    terms: Array.isArray(s.terms)
      ? s.terms.map(t => ({ term: stripHtml(t.term), definition: stripHtml(t.definition) }))
      : [],
    quiz: Array.isArray(s.quiz)
      ? s.quiz.map(q => ({ question: stripHtml(q.question), answer: stripHtml(q.answer) }))
      : [],
    content: Array.isArray(s.content) ? s.content : [],
  }));

  return {
    ...g,
    summary:        safeParse(g.summary, []).map(stripHtml),
    key_terms:      safeParse(g.key_terms, []).map(t => ({ term: stripHtml(t.term), definition: stripHtml(t.definition) })),
    quiz_questions: safeParse(g.quiz_questions, []).map(q => ({ question: stripHtml(q.question), answer: stripHtml(q.answer) })),
    sections:         cleanSections,
    section_progress: safeParse(g.section_progress || "[]", []),
  };
}

async function updateLevel(userId) {
  const row = (await pool.query("SELECT xp FROM users WHERE id = $1", [userId])).rows[0] ?? null;
  if (!row) return;
  const level = Math.min(Math.floor(Math.sqrt(row.xp / 100)) + 1, 50);
  await pool.query("UPDATE users SET level = $1 WHERE id = $2", [level, userId]);
}

async function checkAchievements(userId) {
  const user = (await pool.query("SELECT * FROM users WHERE id = $1", [userId])).rows[0] ?? null;
  if (!user) return;
  const studyTimeRow = (await pool.query(
    "SELECT COALESCE(SUM(duration_seconds),0) as total FROM study_sessions WHERE user_id = $1",
    [userId]
  )).rows[0];
  const studyTime = Number(studyTimeRow?.total) || 0;
  const perfectQuiz = (await pool.query(
    "SELECT 1 FROM quiz_attempts WHERE user_id = $1 AND score = total AND total > 0 LIMIT 1",
    [userId]
  )).rows[0] ?? null;

  const candidates = [];
  if (user.total_guides >= 1)  candidates.push("first_guide");
  if (user.total_guides >= 5)  candidates.push("five_guides");
  if (user.total_guides >= 10) candidates.push("ten_guides");
  if (user.total_guides >= 25) candidates.push("twenty_five_guides");
  if (user.total_quizzes >= 1) candidates.push("first_quiz");
  if (user.total_quizzes >= 10) candidates.push("ten_quizzes");
  if (perfectQuiz)             candidates.push("perfect_quiz");
  if (user.streak >= 3)        candidates.push("streak_3");
  if (user.streak >= 7)        candidates.push("streak_7");
  if (user.streak >= 30)       candidates.push("streak_30");
  if (user.xp >= 100)          candidates.push("xp_100");
  if (user.xp >= 500)          candidates.push("xp_500");
  if (user.xp >= 1000)         candidates.push("xp_1000");
  if (user.xp >= 5000)         candidates.push("xp_5000");
  if (user.level >= 5)         candidates.push("level_5");
  if (user.level >= 10)        candidates.push("level_10");
  if (studyTime >= 3600)       candidates.push("study_time_60");
  if (studyTime >= 18000)      candidates.push("study_time_300");

  for (const type of candidates) {
    await pool.query(
      "INSERT INTO achievements (id, user_id, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [uuid(), userId, type]
    );
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Get guides — supports ?folder_id for legacy, ?limit+?offset+?search for AllGuides
router.get("/", async (req, res) => {
  const { folder_id, limit, offset, search } = req.query;

  if (limit !== undefined) {
    const limitNum = Math.min(Math.max(parseInt(limit) || 24, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    const searchTerm = search ? `%${search}%` : null;

    let guides, total;
    if (searchTerm) {
      guides = (await pool.query(
        "SELECT * FROM guides WHERE user_id = $1 AND title LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        [req.user.id, searchTerm, limitNum, offsetNum]
      )).rows;
      total = Number((await pool.query(
        "SELECT COUNT(*) as c FROM guides WHERE user_id = $1 AND title LIKE $2",
        [req.user.id, searchTerm]
      )).rows[0].c);
    } else {
      guides = (await pool.query(
        "SELECT * FROM guides WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        [req.user.id, limitNum, offsetNum]
      )).rows;
      total = Number((await pool.query(
        "SELECT COUNT(*) as c FROM guides WHERE user_id = $1",
        [req.user.id]
      )).rows[0].c);
    }

    return res.json({
      guides: guides.map(parseGuide),
      total,
      hasMore: offsetNum + limitNum < total,
    });
  }

  // Legacy: return plain array
  const guides = folder_id
    ? (await pool.query(
        "SELECT * FROM guides WHERE user_id = $1 AND folder_id = $2 ORDER BY created_at DESC",
        [req.user.id, folder_id]
      )).rows
    : (await pool.query(
        "SELECT * FROM guides WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user.id]
      )).rows;
  res.json(guides.map(parseGuide));
});

// Get single guide
router.get("/:id", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  res.json(parseGuide(guide));
});

// Save a guide
const FREE_GUIDE_LIMIT = 1;

router.post("/", async (req, res) => {
  const { title, folder_id, type, format, summary, key_terms, quiz_questions, sections, idempotency_key } = req.body;
  if (!title?.trim() || !summary || !key_terms || !quiz_questions)
    return res.status(400).json({ error: "Missing required fields." });
  if (title.trim().length > 200)
    return res.status(400).json({ error: "Title is too long." });

  // ── Idempotency ──────────────────────────────────────────────────────────────
  if (idempotency_key) {
    const existing = (await pool.query(
      "SELECT * FROM guides WHERE user_id = $1 AND idempotency_key = $2",
      [req.user.id, idempotency_key]
    )).rows[0] ?? null;
    if (existing) return res.json(parseGuide(existing));
  }

  const id = uuid();
  const today = new Date().toISOString().split("T")[0];
  const sectionsArr = Array.isArray(sections) ? sections : [];
  const initialProgress = sectionsArr.map(() => false);

  // ── Atomic limit check + insert ──────────────────────────────────────────────
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const user = (await client.query(
      "SELECT plan, role, is_whitelisted, guides_created_ever FROM users WHERE id = $1",
      [req.user.id]
    )).rows[0] ?? null;
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }

    const isUnrestricted = user.plan === "pro" || user.plan === "lifetime" || user.is_whitelisted || user.role === "admin";
    if (!isUnrestricted && (user.guides_created_ever || 0) >= FREE_GUIDE_LIMIT) {
      await client.query("ROLLBACK");
      console.log(`[free-limit] user ${req.user.id} blocked at save step (guides_created_ever=${user.guides_created_ever})`);
      return res.status(403).json({
        error: "FREE_LIMIT_GUIDES",
        message: `Free accounts are limited to ${FREE_GUIDE_LIMIT} saved guide. Upgrade to Pro for unlimited guides.`,
      });
    }

    await client.query(
      `INSERT INTO guides (id, user_id, folder_id, title, type, format, summary, key_terms, quiz_questions, sections, section_progress, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, req.user.id, folder_id || null, title.trim(), type || "text", format || "detailed",
       JSON.stringify(summary), JSON.stringify(key_terms), JSON.stringify(quiz_questions),
       JSON.stringify(sectionsArr), JSON.stringify(initialProgress),
       idempotency_key || null]
    );

    await client.query(
      "UPDATE users SET total_guides = total_guides + 1, guides_created_ever = guides_created_ever + 1, xp = xp + 50, last_study_date = $1 WHERE id = $2",
      [today, req.user.id]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[guides POST] unexpected error:", err);
    return res.status(500).json({ error: "Something went wrong saving your guide." });
  } finally {
    client.release();
  }

  await updateLevel(req.user.id);
  await checkAchievements(req.user.id);

  const saved = (await pool.query("SELECT * FROM guides WHERE id = $1", [id])).rows[0] ?? null;
  res.json(parseGuide(saved));
});

// Update section progress
router.patch("/:id/section-progress", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const { progress } = req.body;
  if (!Array.isArray(progress)) return res.status(400).json({ error: "Invalid progress data." });

  const sections = safeParse(guide.sections, []);
  if (progress.length !== sections.length)
    return res.status(400).json({ error: "Progress length mismatch." });
  if (!progress.every(v => typeof v === "boolean"))
    return res.status(400).json({ error: "Progress entries must be booleans." });

  await pool.query(
    "UPDATE guides SET section_progress = $1 WHERE id = $2",
    [JSON.stringify(progress), guide.id]
  );
  res.json({ success: true });
});

// Move guide to folder
router.patch("/:id/move", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const targetFolderId = req.body.folder_id || null;
  if (targetFolderId) {
    const folder = (await pool.query(
      "SELECT id FROM folders WHERE id = $1 AND user_id = $2",
      [targetFolderId, req.user.id]
    )).rows[0] ?? null;
    if (!folder) return res.status(400).json({ error: "Invalid folder." });
  }

  await pool.query("UPDATE guides SET folder_id = $1 WHERE id = $2", [targetFolderId, guide.id]);
  res.json({ success: true });
});

// Delete guide
router.delete("/:id", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM guides WHERE id = $1", [guide.id]);
    await client.query(
      "UPDATE users SET total_guides = GREATEST(0, total_guides - 1) WHERE id = $1",
      [req.user.id]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  res.json({ success: true });
});

// Submit quiz attempt — with server-side score validation
router.post("/:id/quiz", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const actualQuestions = safeParse(guide.quiz_questions, []);
  if (!actualQuestions.length)
    return res.status(500).json({ error: "Guide quiz data is unavailable." });
  const totalNum = actualQuestions.length;
  const scoreNum = parseInt(req.body.score);
  if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > totalNum || totalNum < 1)
    return res.status(400).json({ error: "Invalid quiz score." });

  const xpGained = scoreNum > (guide.best_quiz_score || 0) ? scoreNum * 10 : 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO quiz_attempts (id, guide_id, user_id, score, total) VALUES ($1, $2, $3, $4, $5)",
      [uuid(), guide.id, req.user.id, scoreNum, totalNum]
    );
    if (scoreNum >= guide.best_quiz_score) {
      await client.query(
        "UPDATE guides SET best_quiz_score = $1, quiz_attempts = quiz_attempts + 1 WHERE id = $2",
        [scoreNum, guide.id]
      );
    } else {
      await client.query(
        "UPDATE guides SET quiz_attempts = quiz_attempts + 1 WHERE id = $1",
        [guide.id]
      );
    }
    if (xpGained > 0) {
      await client.query(
        "UPDATE users SET xp = xp + $1, total_quizzes = total_quizzes + 1 WHERE id = $2",
        [xpGained, req.user.id]
      );
    } else {
      await client.query(
        "UPDATE users SET total_quizzes = total_quizzes + 1 WHERE id = $1",
        [req.user.id]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await updateLevel(req.user.id);
  await checkAchievements(req.user.id);

  res.json({ success: true, xpGained });
});

// Log a study session
router.post("/:id/session", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const duration = Math.max(0, Math.min(parseInt(req.body.duration_seconds) || 0, 7200));
  if (duration < 10) return res.json({ success: true });

  await pool.query(
    "INSERT INTO study_sessions (id, guide_id, user_id, duration_seconds) VALUES ($1, $2, $3, $4)",
    [uuid(), guide.id, req.user.id, duration]
  );

  const now = new Date().toISOString();
  await pool.query("UPDATE guides SET last_studied_at = $1 WHERE id = $2", [now, guide.id]);
  await pool.query(
    "UPDATE users SET total_study_time = COALESCE(total_study_time, 0) + $1 WHERE id = $2",
    [duration, req.user.id]
  );

  await checkAchievements(req.user.id);
  res.json({ success: true });
});

// Get quiz history
router.get("/:id/quiz-history", async (req, res) => {
  const guide = (await pool.query(
    "SELECT id FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  const attempts = (await pool.query(
    "SELECT score, total, created_at FROM quiz_attempts WHERE guide_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 20",
    [req.params.id, req.user.id]
  )).rows;
  res.json(attempts);
});

// Get or create a public share link
router.post("/:id/share", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  let token = guide.share_token;
  if (!token) {
    token = uuid();
    await pool.query("UPDATE guides SET share_token = $1 WHERE id = $2", [token, guide.id]);
  }

  res.json({ token });
});

// Toggle favorite
router.patch("/:id/favorite", async (req, res) => {
  const guide = (await pool.query(
    "SELECT id, is_favorite FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  const newVal = guide.is_favorite ? 0 : 1;
  await pool.query("UPDATE guides SET is_favorite = $1 WHERE id = $2", [newVal, guide.id]);
  res.json({ is_favorite: newVal });
});

// Revoke share link
router.delete("/:id/share", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  await pool.query("UPDATE guides SET share_token = NULL WHERE id = $1", [guide.id]);
  res.json({ success: true });
});

// Generate quiz
router.post("/:id/generate-quiz", async (req, res) => {
  console.log(`[quiz] POST /guides/${req.params.id}/generate-quiz - count=${req.body.count}, mode=${req.body.mode}`);
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  // Free-tier limit: 3 quiz generations per day
  const user = (await pool.query(
    "SELECT plan, role, is_whitelisted, quiz_gen_count, quiz_gen_date FROM users WHERE id = $1",
    [req.user.id]
  )).rows[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const isFreeTier = user && user.plan !== "pro" && user.plan !== "lifetime" && !user.is_whitelisted && user.role !== "admin";
  if (isFreeTier) {
    // Atomically increment the counter if under the daily limit
    const result = await pool.query(`
      UPDATE users
      SET quiz_gen_count = CASE WHEN quiz_gen_date = $1 THEN quiz_gen_count + 1 ELSE 1 END,
          quiz_gen_date = $1
      WHERE id = $2
        AND (quiz_gen_date != $1 OR quiz_gen_count < 3)
    `, [today, req.user.id]);

    if (result.rowCount === 0) {
      return res.status(403).json({
        error: "FREE_LIMIT_QUIZZES",
        message: "Free accounts are limited to 3 AI quiz generations per day. Upgrade to Pro for unlimited quizzes.",
      });
    }
  }

  const count = Math.min(Math.max(parseInt(req.body.count) || 5, 3), 30);
  const VALID_MODES = ["mcq", "self-grade", "true-false", "fill-blank", "adaptive-mixed"];
  const mode = VALID_MODES.includes(req.body.mode) ? req.body.mode : "mcq";

  const stripTags = (s) => (typeof s === "string" ? s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");

  const rawSections = safeParse(guide.sections || "[]", []);
  let contextParts = [`Title: ${guide.title}`];

  if (rawSections.length > 0) {
    rawSections.forEach((s, i) => {
      contextParts.push(`\nSection ${i + 1}${s.title ? `: ${s.title}` : ""}`);
      if (s.overview) {
        const ov = stripTags(s.overview);
        if (ov) contextParts.push(`Overview: ${ov}`);
      }
      if (Array.isArray(s.keyPoints) && s.keyPoints.length)
        contextParts.push(`Key Points:\n${s.keyPoints.map(p => `- ${stripTags(p)}`).join("\n")}`);
      if (Array.isArray(s.terms) && s.terms.length)
        contextParts.push(`Terms:\n${s.terms.map(t => `- ${t.term}: ${t.definition}`).join("\n")}`);
    });
  } else {
    const summary  = safeParse(guide.summary,   []);
    const keyTerms = safeParse(guide.key_terms, []);
    if (summary.length)
      contextParts.push(`\nSummary:\n${summary.map((s, i) => `${i + 1}. ${stripTags(s)}`).join("\n")}`);
    if (keyTerms.length)
      contextParts.push(`\nKey Terms:\n${keyTerms.map(t => `- ${t.term}: ${t.definition}`).join("\n")}`);
  }

  const context = contextParts.join("\n");

  let prompt;
  if (mode === "mcq") {
    prompt = `Based on this study guide, generate exactly ${count} multiple-choice questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects. Each object must have:\n- "question": the question text\n- "options": array of exactly 4 answer choices (strings)\n- "correctIndex": 0-based index of the correct option (0, 1, 2, or 3)\n- "explanation": one sentence explaining why the answer is correct\n\nVary the difficulty. Make wrong options plausible but clearly incorrect on reflection.\nReturn ONLY the JSON array, no extra text.`;
  } else if (mode === "true-false") {
    prompt = `Based on this study guide, generate exactly ${count} true/false questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects. Each object must have:\n- "statement": a factual statement that is either true or false\n- "answer": boolean true or false\n- "explanation": one sentence explaining why the statement is true or false\n\nMix true and false statements roughly equally. Avoid trick questions.\nReturn ONLY the JSON array, no extra text.`;
  } else if (mode === "fill-blank") {
    prompt = `Based on this study guide, generate exactly ${count} fill-in-the-blank questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects. Each object must have:\n- "sentence": a sentence with exactly one blank represented as "___"\n- "answer": the single word or short phrase that fills the blank\n- "hint": a 3-5 word hint (e.g. the category or type of answer)\n\nThe blank should always replace a key term or important concept.\nReturn ONLY the JSON array, no extra text.`;
  } else if (mode === "adaptive-mixed") {
    prompt = `Based on this study guide, generate exactly ${count} quiz questions as a mix of multiple-choice, true/false, and fill-in-the-blank types.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects. Each object must have a "type" field that is one of "mcq", "true-false", or "fill-blank", plus the fields for that type:\n\nFor "mcq": "question", "options" (array of 4 strings), "correctIndex" (number 0-3), "explanation" (string)\nFor "true-false": "statement" (string), "answer" (boolean), "explanation" (string)\nFor "fill-blank": "sentence" (string with "___"), "answer" (string), "hint" (string)\n\nAim for roughly equal distribution of all three types. Vary difficulty.\nReturn ONLY the JSON array, no extra text.`;
  } else {
    prompt = `Based on this study guide, generate exactly ${count} quiz questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects, each with "question" and "answer" fields.\nReturn ONLY the JSON array, no extra text.`;
  }

  try {
    const client = makeAnthropicClient();
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      system: "You are an educational quiz generator. Respond with ONLY a valid JSON array — no markdown, no code fences, no explanation. Start your response with [ and end with ].",
      max_tokens: Math.min(8000, Math.max(
        mode === "adaptive-mixed" ? 7000 : mode === "mcq" ? 4500 : 3500,
        count * (mode === "mcq" ? 250 : mode === "adaptive-mixed" ? 300 : 200)
      )),
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].text.trim();
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("Invalid AI response");

    const questions = JSON.parse(raw.slice(start, end + 1));

    if (!Array.isArray(questions) || questions.length === 0)
      throw new Error("AI returned no questions.");
    for (const q of questions) {
      if (mode === "mcq") {
        if (typeof q.question !== "string") throw new Error("Malformed MCQ question.");
        if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error("MCQ question missing options.");
        if (typeof q.correctIndex !== "number") throw new Error("MCQ question missing correctIndex.");
      } else if (mode === "true-false") {
        if (typeof q.statement !== "string") throw new Error("Malformed true/false question.");
        if (typeof q.answer !== "boolean") throw new Error("True/false answer must be boolean.");
      } else if (mode === "fill-blank") {
        if (typeof q.sentence !== "string" || !q.sentence.includes("___")) throw new Error("Fill-blank missing sentence with ___.");
        if (typeof q.answer !== "string") throw new Error("Fill-blank missing answer.");
      } else if (mode === "adaptive-mixed") {
        const validTypes = ["mcq", "true-false", "fill-blank"];
        if (!validTypes.includes(q.type)) throw new Error(`Unknown adaptive question type: ${q.type}`);
        if (q.type === "mcq") {
          if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error("Adaptive MCQ missing options.");
          if (typeof q.correctIndex !== "number") throw new Error("Adaptive MCQ missing correctIndex.");
        } else if (q.type === "true-false") {
          if (typeof q.statement !== "string") throw new Error("Adaptive T/F missing statement.");
          if (typeof q.answer !== "boolean") throw new Error("Adaptive T/F answer must be boolean.");
        } else if (q.type === "fill-blank") {
          if (typeof q.sentence !== "string" || !q.sentence.includes("___")) throw new Error("Adaptive fill-blank missing sentence.");
          if (typeof q.answer !== "string") throw new Error("Adaptive fill-blank missing answer.");
        }
      }
    }

    // Shuffle MCQ options so the correct answer isn't always first
    const shuffled = questions.map(q => {
      if (!Array.isArray(q.options) || typeof q.correctIndex !== "number") return q;
      const correct = q.options[q.correctIndex];
      const opts = [...q.options];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      return { ...q, options: opts, correctIndex: opts.indexOf(correct) };
    });

    res.json({ questions: shuffled, mode });
  } catch (err) {
    const msg = err?.message || err?.toString() || "unknown";
    console.error("[generate-quiz error]", msg, "status=", err?.status, "stack=", err?.stack?.split("\n").slice(0, 3).join(" | "));
    res.status(500).json({ error: "Could not generate quiz. Please try again." });
  }
});

// Writing prompts generator
router.post("/:id/writing-prompts", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const stripTags = (s) => (typeof s === "string" ? s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");
  const rawSections = safeParse(guide.sections || "[]", []);
  let contextParts = [`Title: ${guide.title}`];

  if (rawSections.length > 0) {
    rawSections.slice(0, 5).forEach((s, i) => {
      contextParts.push(`\nSection ${i + 1}${s.title ? `: ${s.title}` : ""}`);
      if (s.overview) contextParts.push(`Overview: ${stripTags(s.overview).slice(0, 200)}`);
      if (Array.isArray(s.keyPoints) && s.keyPoints.length)
        contextParts.push(`Key Points: ${s.keyPoints.slice(0, 3).map(p => stripTags(p)).join("; ")}`);
    });
  } else {
    const summary = safeParse(guide.summary, []);
    if (summary.length) contextParts.push(`\nSummary:\n${summary.slice(0, 5).map((s, i) => `${i + 1}. ${stripTags(s)}`).join("\n")}`);
  }

  const context = contextParts.join("\n").slice(0, 6000);
  const prompt = `Based on this study guide, generate 5 analytical essay and writing prompts.\n\n${context}\n\nReturn ONLY a JSON array of 5 strings. Each string is a 1-2 sentence writing prompt requiring analysis, comparison, or argument — not just factual recall. Vary difficulty.\nReturn ONLY the JSON array.`;

  try {
    const client = makeAnthropicClient();
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      system: "You are an educational writing prompt generator. Return ONLY a valid JSON array of strings. No markdown, no code fences.",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.content[0].text.trim();
    const start = raw.indexOf("["); const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("Invalid AI response");
    const prompts = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(prompts)) throw new Error("Expected array");
    res.json({ prompts: prompts.slice(0, 5) });
  } catch {
    res.status(500).json({ error: "Could not generate prompts. Please try again." });
  }
});

// Teach-it-back evaluator
router.post("/:id/teach-back", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const { explanation } = req.body;
  if (!explanation || typeof explanation !== "string" || explanation.trim().length < 20)
    return res.status(400).json({ error: "Explanation is too short." });
  if (explanation.trim().length > 5000)
    return res.status(400).json({ error: "Explanation is too long. Please keep it under 5,000 characters." });

  const stripTags = (s) => (typeof s === "string" ? s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");
  const rawSections = safeParse(guide.sections || "[]", []);
  const summary = safeParse(guide.summary, []);
  const keyTerms = safeParse(guide.key_terms, []);

  let contextParts = [`Title: ${guide.title}`];
  if (rawSections.length > 0) {
    rawSections.slice(0, 4).forEach((s, i) => {
      contextParts.push(`Section ${i + 1}: ${s.title}`);
      if (s.overview) contextParts.push(`  ${stripTags(s.overview).slice(0, 200)}`);
      if (Array.isArray(s.keyPoints) && s.keyPoints.length)
        contextParts.push(`  Key points: ${s.keyPoints.slice(0, 3).map(p => stripTags(p)).join("; ")}`);
    });
  } else {
    if (summary.length) contextParts.push(`Summary: ${summary.slice(0, 5).map(stripTags).join(" ")}`);
    if (keyTerms.length) contextParts.push(`Key terms: ${keyTerms.slice(0, 8).map(t => t.term).join(", ")}`);
  }

  const context = contextParts.join("\n").slice(0, 6000);
  const prompt = `A student studied this guide and explained what they learned in their own words.

Study guide:
${context}

Student's explanation:
${explanation.trim().slice(0, 2000)}

Evaluate their understanding. Return ONLY a JSON object with:
- "score": integer 1-10
- "grade": one of "Excellent", "Good", "Needs Work", or "Try Again"
- "strengths": array of 1-3 strings (what they got right, be specific)
- "gaps": array of 1-3 strings (key concepts missed or wrong, be specific and actionable)
- "encouragement": one short encouraging sentence

Return ONLY the JSON object.`;

  try {
    const client = makeAnthropicClient();
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      system: "You are an educational evaluator. Return ONLY a valid JSON object. No markdown, no code fences.",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.content[0].text.trim();
    const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Invalid AI response");
    const result = JSON.parse(raw.slice(start, end + 1));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Could not evaluate explanation. Please try again." });
  }
});

export default router;
