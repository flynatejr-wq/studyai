import express from "express";
import { v4 as uuid } from "uuid";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public guide view by share token (no auth required)
router.get("/guide/:token", async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE share_token = $1",
    [req.params.token]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "This shared guide doesn't exist or the link has been revoked." });

  const stripHtml = (s) => typeof s === "string" ? s.replace(/<[^>]+>/g, "").trim() : s;

  let summary, key_terms, quiz_questions, sections;
  try { summary       = JSON.parse(guide.summary);        } catch { summary       = []; }
  try { key_terms     = JSON.parse(guide.key_terms);      } catch { key_terms     = []; }
  try { quiz_questions= JSON.parse(guide.quiz_questions); } catch { quiz_questions= []; }
  try { sections      = JSON.parse(guide.sections || "[]"); } catch { sections    = []; }

  key_terms      = Array.isArray(key_terms)
    ? key_terms.map(t => ({ term: stripHtml(t.term), definition: stripHtml(t.definition) }))
    : [];
  quiz_questions = Array.isArray(quiz_questions)
    ? quiz_questions.map(q => ({ question: stripHtml(q.question), answer: stripHtml(q.answer) }))
    : [];
  summary        = Array.isArray(summary) ? summary.map(stripHtml) : [];
  sections = Array.isArray(sections) ? sections.map(s => ({
    ...s,
    keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints.map(stripHtml) : [],
    terms:     Array.isArray(s.terms)
      ? s.terms.map(t => ({ term: stripHtml(t.term), definition: stripHtml(t.definition) }))
      : [],
    quiz:      Array.isArray(s.quiz)
      ? s.quiz.map(q => ({ question: stripHtml(q.question), answer: stripHtml(q.answer) }))
      : [],
    content:   Array.isArray(s.content) ? s.content : [],
  })) : [];

  res.json({
    id: guide.id,
    title: guide.title,
    type: guide.type,
    summary,
    key_terms,
    quiz_questions,
    sections,
    created_at: guide.created_at,
  });
});

// Save a shared guide to the logged-in user's own library (requires auth)
const FREE_GUIDE_LIMIT = 1;

router.post("/guide/:token/save", requireAuth, async (req, res) => {
  const guide = (await pool.query(
    "SELECT * FROM guides WHERE share_token = $1",
    [req.params.token]
  )).rows[0] ?? null;
  if (!guide) return res.status(404).json({ error: "This shared guide doesn't exist or the link has been revoked." });

  if (guide.user_id === req.user.id) {
    return res.status(400).json({ error: "This is already your guide." });
  }

  const existing = (await pool.query(
    "SELECT id FROM guides WHERE user_id = $1 AND idempotency_key = $2",
    [req.user.id, `share:${guide.id}`]
  )).rows[0] ?? null;
  if (existing) return res.json({ guide_id: existing.id, already_saved: true });

  const newId = uuid();
  const today = new Date().toISOString().split("T")[0];

  // Atomic limit check + insert
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
      return res.status(403).json({
        error: "FREE_LIMIT_GUIDES",
        message: `Free accounts are limited to ${FREE_GUIDE_LIMIT} saved guide. Upgrade to Pro for unlimited guides.`,
      });
    }

    await client.query(
      `INSERT INTO guides (id, user_id, title, type, summary, key_terms, quiz_questions, sections, section_progress, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        newId, req.user.id, guide.title, guide.type,
        guide.summary, guide.key_terms, guide.quiz_questions,
        guide.sections || "[]", "[]",
        `share:${guide.id}`
      ]
    );

    await client.query(
      "UPDATE users SET total_guides = total_guides + 1, guides_created_ever = guides_created_ever + 1, xp = xp + 50, last_study_date = $1 WHERE id = $2",
      [today, req.user.id]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[public save] unexpected error:", err);
    return res.status(500).json({ error: "Something went wrong saving the guide." });
  } finally {
    client.release();
  }

  res.json({ guide_id: newId });
});

export default router;
