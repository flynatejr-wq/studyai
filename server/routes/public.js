import express from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public guide view by share token (no auth required)
router.get("/guide/:token", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE share_token = ?").get(req.params.token);
  if (!guide) return res.status(404).json({ error: "This shared guide doesn't exist or the link has been revoked." });

  // Return safe subset — no user_id, no share_token
  let summary, key_terms, quiz_questions, sections;
  try { summary       = JSON.parse(guide.summary);        } catch { summary       = []; }
  try { key_terms     = JSON.parse(guide.key_terms);      } catch { key_terms     = []; }
  try { quiz_questions= JSON.parse(guide.quiz_questions); } catch { quiz_questions= []; }
  try { sections      = JSON.parse(guide.sections || "[]"); } catch { sections    = []; }

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

router.post("/guide/:token/save", requireAuth, (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE share_token = ?").get(req.params.token);
  if (!guide) return res.status(404).json({ error: "This shared guide doesn't exist or the link has been revoked." });

  // Can't save your own guide
  if (guide.user_id === req.user.id) {
    return res.status(400).json({ error: "This is already your guide." });
  }

  // Check if user already saved a copy (idempotency: same share_token)
  const existing = db.prepare(
    "SELECT id FROM guides WHERE user_id = ? AND idempotency_key = ?"
  ).get(req.user.id, `share:${guide.id}`);
  if (existing) return res.json({ guide_id: existing.id, already_saved: true });

  const newId = uuid();
  const today = new Date().toISOString().split("T")[0];

  const saveTxn = db.transaction(() => {
    const user = db.prepare("SELECT plan, role, is_whitelisted, guides_created_ever FROM users WHERE id = ?").get(req.user.id);
    if (!user) throw Object.assign(new Error("User not found."), { status: 404 });

    const isUnrestricted = user.plan === "pro" || user.plan === "lifetime" || user.is_whitelisted || user.role === "admin";
    if (!isUnrestricted && (user.guides_created_ever || 0) >= FREE_GUIDE_LIMIT) {
      throw Object.assign(new Error("FREE_LIMIT_GUIDES"), { status: 403 });
    }

    db.prepare(
      `INSERT INTO guides (id, user_id, title, type, summary, key_terms, quiz_questions, sections, section_progress, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId, req.user.id, guide.title, guide.type,
      guide.summary, guide.key_terms, guide.quiz_questions,
      guide.sections || "[]", "[]",
      `share:${guide.id}`
    );

    db.prepare(
      "UPDATE users SET total_guides = total_guides + 1, guides_created_ever = guides_created_ever + 1, xp = xp + 50, last_study_date = ? WHERE id = ?"
    ).run(today, req.user.id);
  });

  try {
    saveTxn.immediate();
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({
        error: "FREE_LIMIT_GUIDES",
        message: `Free accounts are limited to ${FREE_GUIDE_LIMIT} saved guide. Upgrade to Pro for unlimited guides.`,
      });
    }
    if (err.status === 404) return res.status(404).json({ error: err.message });
    console.error("[public save] unexpected error:", err);
    return res.status(500).json({ error: "Something went wrong saving the guide." });
  }

  res.json({ guide_id: newId });
});

export default router;
