import express from "express";
import db from "../db.js";

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

export default router;
