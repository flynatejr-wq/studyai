import express from "express";
import { v4 as uuid } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParse(str, fallback = []) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// Strip HTML tags from plain-text fields so raw tags never reach the client,
// regardless of whether the guide was created before or after the server-side fix.
function stripHtml(s) {
  return typeof s === "string" ? s.replace(/<[^>]+>/g, "").trim() : s;
}

function parseGuide(g) {
  const rawSections = safeParse(g.sections || "[]", []);
  const cleanSections = rawSections.map(s => ({
    ...s,
    // overview keeps HTML — it is always rendered via RichText
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

function updateLevel(userId) {
  const user = db.prepare("SELECT xp FROM users WHERE id = ?").get(userId);
  if (!user) return; // guard: user may have been deleted mid-request
  const level = Math.min(Math.floor(Math.sqrt(user.xp / 100)) + 1, 50);
  db.prepare("UPDATE users SET level = ? WHERE id = ?").run(level, userId);
}

function checkAchievements(userId) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const studyTime = db.prepare(
    "SELECT COALESCE(SUM(duration_seconds),0) as total FROM study_sessions WHERE user_id = ?"
  ).get(userId)?.total || 0;
  const perfectQuiz = db.prepare(
    "SELECT 1 FROM quiz_attempts WHERE user_id = ? AND score = total AND total > 0 LIMIT 1"
  ).get(userId);

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

  const insert = db.prepare(
    "INSERT OR IGNORE INTO achievements (id, user_id, type) VALUES (?, ?, ?)"
  );
  for (const type of candidates) insert.run(uuid(), userId, type);
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Get guides — supports ?folder_id for legacy, ?limit+?offset+?search for AllGuides
router.get("/", (req, res) => {
  const { folder_id, limit, offset, search } = req.query;

  if (limit !== undefined) {
    // Paginated + searchable response (used by AllGuides)
    const limitNum = Math.min(Math.max(parseInt(limit) || 24, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    const searchTerm = search ? `%${search}%` : null;

    let guides, total;
    if (searchTerm) {
      guides = db.prepare(
        "SELECT * FROM guides WHERE user_id = ? AND title LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
      ).all(req.user.id, searchTerm, limitNum, offsetNum);
      total = db.prepare(
        "SELECT COUNT(*) as c FROM guides WHERE user_id = ? AND title LIKE ?"
      ).get(req.user.id, searchTerm).c;
    } else {
      guides = db.prepare(
        "SELECT * FROM guides WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
      ).all(req.user.id, limitNum, offsetNum);
      total = db.prepare(
        "SELECT COUNT(*) as c FROM guides WHERE user_id = ?"
      ).get(req.user.id).c;
    }

    return res.json({
      guides: guides.map(parseGuide),
      total,
      hasMore: offsetNum + limitNum < total,
    });
  }

  // Legacy: return plain array (used by Dashboard, FolderView)
  const guides = folder_id
    ? db.prepare("SELECT * FROM guides WHERE user_id = ? AND folder_id = ? ORDER BY created_at DESC").all(req.user.id, folder_id)
    : db.prepare("SELECT * FROM guides WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(guides.map(parseGuide));
});

// Get single guide
router.get("/:id", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  res.json(parseGuide(guide));
});

// Save a guide
router.post("/", (req, res) => {
  const { title, folder_id, type, summary, key_terms, quiz_questions, sections } = req.body;
  if (!title?.trim() || !summary || !key_terms || !quiz_questions)
    return res.status(400).json({ error: "Missing required fields." });
  if (title.trim().length > 200)
    return res.status(400).json({ error: "Title is too long." });

  const id = uuid();
  const today = new Date().toISOString().split("T")[0];
  // Build initial section_progress: one false per section
  const sectionsArr = Array.isArray(sections) ? sections : [];
  const initialProgress = sectionsArr.map(() => false);

  db.transaction(() => {
    db.prepare(
      `INSERT INTO guides (id, user_id, folder_id, title, type, summary, key_terms, quiz_questions, sections, section_progress)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.user.id, folder_id || null, title.trim(), type || "text",
      JSON.stringify(summary), JSON.stringify(key_terms), JSON.stringify(quiz_questions),
      JSON.stringify(sectionsArr), JSON.stringify(initialProgress));
    db.prepare("UPDATE users SET total_guides = total_guides + 1, xp = xp + 50, last_study_date = ? WHERE id = ?")
      .run(today, req.user.id);
  })();
  updateLevel(req.user.id);
  checkAchievements(req.user.id);

  res.json(parseGuide(db.prepare("SELECT * FROM guides WHERE id = ?").get(id)));
});

// Update section progress
router.patch("/:id/section-progress", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const { progress } = req.body;
  if (!Array.isArray(progress)) return res.status(400).json({ error: "Invalid progress data." });

  // Validate: must be array of booleans, length must match stored sections
  const sections = safeParse(guide.sections, []);
  if (progress.length !== sections.length)
    return res.status(400).json({ error: "Progress length mismatch." });
  if (!progress.every(v => typeof v === "boolean"))
    return res.status(400).json({ error: "Progress entries must be booleans." });

  db.prepare("UPDATE guides SET section_progress = ? WHERE id = ?")
    .run(JSON.stringify(progress), guide.id);
  res.json({ success: true });
});

// Move guide to folder
router.patch("/:id/move", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  // L-4: Validate that the target folder belongs to this user (prevents cross-user folder assignment)
  const targetFolderId = req.body.folder_id || null;
  if (targetFolderId) {
    const folder = db.prepare("SELECT id FROM folders WHERE id = ? AND user_id = ?").get(targetFolderId, req.user.id);
    if (!folder) return res.status(400).json({ error: "Invalid folder." });
  }

  db.prepare("UPDATE guides SET folder_id = ? WHERE id = ?").run(targetFolderId, guide.id);
  res.json({ success: true });
});

// Delete guide
router.delete("/:id", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  db.transaction(() => {
    db.prepare("DELETE FROM guides WHERE id = ?").run(guide.id);
    // L-6: Keep total_guides in sync so stat cards and achievement thresholds stay accurate
    db.prepare("UPDATE users SET total_guides = MAX(0, total_guides - 1) WHERE id = ?").run(req.user.id);
  })();
  res.json({ success: true });
});

// Submit quiz attempt — with server-side score validation
router.post("/:id/quiz", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  // M-3: Use the authoritative question count from the DB — never trust the client's total
  const actualQuestions = safeParse(guide.quiz_questions, []);
  if (!actualQuestions.length)
    return res.status(500).json({ error: "Guide quiz data is unavailable." });
  const totalNum = actualQuestions.length;
  const scoreNum = parseInt(req.body.score);
  if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > totalNum || totalNum < 1)
    return res.status(400).json({ error: "Invalid quiz score." });

  const xpGained = scoreNum * 10;

  db.transaction(() => {
    db.prepare("INSERT INTO quiz_attempts (id, guide_id, user_id, score, total) VALUES (?, ?, ?, ?, ?)")
      .run(uuid(), guide.id, req.user.id, scoreNum, totalNum);
    if (scoreNum > guide.best_quiz_score) {
      db.prepare("UPDATE guides SET best_quiz_score = ?, quiz_attempts = quiz_attempts + 1 WHERE id = ?")
        .run(scoreNum, guide.id);
    } else {
      db.prepare("UPDATE guides SET quiz_attempts = quiz_attempts + 1 WHERE id = ?").run(guide.id);
    }
    db.prepare("UPDATE users SET xp = xp + ?, total_quizzes = total_quizzes + 1 WHERE id = ?")
      .run(xpGained, req.user.id);
  })();
  updateLevel(req.user.id);
  checkAchievements(req.user.id);

  res.json({ success: true, xpGained });
});

// Log a study session
router.post("/:id/session", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  const duration = Math.max(0, Math.min(parseInt(req.body.duration_seconds) || 0, 7200));
  if (duration < 10) return res.json({ success: true });

  db.prepare("INSERT INTO study_sessions (id, guide_id, user_id, duration_seconds) VALUES (?, ?, ?, ?)")
    .run(uuid(), guide.id, req.user.id, duration);

  const now = new Date().toISOString();
  db.prepare("UPDATE guides SET last_studied_at = ? WHERE id = ?").run(now, guide.id);
  db.prepare("UPDATE users SET total_study_time = COALESCE(total_study_time, 0) + ? WHERE id = ?")
    .run(duration, req.user.id);

  checkAchievements(req.user.id);
  res.json({ success: true });
});

// Get quiz history
router.get("/:id/quiz-history", (req, res) => {
  const attempts = db.prepare(
    "SELECT score, total, created_at FROM quiz_attempts WHERE guide_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 20"
  ).all(req.params.id, req.user.id);
  res.json(attempts);
});

// Get or create a public share link
router.post("/:id/share", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  let token = guide.share_token;
  if (!token) {
    token = uuid();
    db.prepare("UPDATE guides SET share_token = ? WHERE id = ?").run(token, guide.id);
  }

  res.json({ token });
});

// Revoke share link
router.delete("/:id/share", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  db.prepare("UPDATE guides SET share_token = NULL WHERE id = ?").run(guide.id);
  res.json({ success: true });
});

// Generate quiz
router.post("/:id/generate-quiz", async (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  // Free-tier limit: 3 quiz generations per day
  const user = db.prepare("SELECT plan, quiz_gen_count, quiz_gen_date FROM users WHERE id = ?").get(req.user.id);
  const today = new Date().toISOString().slice(0, 10);
  const isFreeTier = user && user.plan !== "pro";
  if (isFreeTier) {
    const genCount = user.quiz_gen_date === today ? (user.quiz_gen_count || 0) : 0;
    if (genCount >= 3) {
      return res.status(403).json({
        error: "FREE_LIMIT_QUIZZES",
        message: "Free accounts are limited to 3 AI quiz generations per day. Upgrade to Pro for unlimited quizzes.",
      });
    }
  }

  const count = Math.min(Math.max(parseInt(req.body.count) || 5, 3), 30);
  const mode = req.body.mode === "mcq" ? "mcq" : "self-grade";

  const summary  = safeParse(guide.summary,   []);
  const keyTerms = safeParse(guide.key_terms, []);

  const context = `Title: ${guide.title}\n\nSummary:\n${summary.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nKey Terms:\n${keyTerms.map((t) => `- ${t.term}: ${t.definition}`).join("\n")}`;

  let prompt;
  if (mode === "mcq") {
    prompt = `Based on this study guide, generate exactly ${count} multiple-choice questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects. Each object must have:\n- "question": the question text\n- "options": array of exactly 4 answer choices (strings)\n- "correctIndex": 0-based index of the correct option (0, 1, 2, or 3)\n- "explanation": one sentence explaining why the answer is correct\n\nVary the difficulty. Make wrong options plausible but clearly incorrect on reflection.\nReturn ONLY the JSON array, no extra text.`;
  } else {
    prompt = `Based on this study guide, generate exactly ${count} quiz questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects, each with "question" and "answer" fields.\nReturn ONLY the JSON array, no extra text.`;
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].text.trim();
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("Invalid AI response");

    const questions = JSON.parse(raw.slice(start, end + 1));

    // Bug 19: Validate that we got a proper array of question objects before returning
    if (!Array.isArray(questions) || questions.length === 0)
      throw new Error("AI returned no questions.");
    for (const q of questions) {
      if (typeof q.question !== "string") throw new Error("Malformed question object.");
      if (mode === "mcq") {
        if (!Array.isArray(q.options) || q.options.length !== 4)
          throw new Error("MCQ question missing options.");
        if (typeof q.correctIndex !== "number")
          throw new Error("MCQ question missing correctIndex.");
      }
    }

    // Bug 18: Only increment the daily quota after a successful AI response
    if (isFreeTier) {
      if (user.quiz_gen_date !== today) {
        db.prepare("UPDATE users SET quiz_gen_count = 1, quiz_gen_date = ? WHERE id = ?").run(today, req.user.id);
      } else {
        db.prepare("UPDATE users SET quiz_gen_count = quiz_gen_count + 1 WHERE id = ?").run(req.user.id);
      }
    }

    res.json({ questions, mode });
  } catch (err) {
    console.error("[generate-quiz error]", err?.message);
    res.status(500).json({ error: "Could not generate quiz. Please try again." });
  }
});

export default router;
