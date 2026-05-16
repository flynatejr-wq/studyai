import express from "express";
import { v4 as uuid } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// Get chat history for a guide
router.get("/:guideId", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.guideId, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  const messages = db.prepare(
    "SELECT * FROM chat_messages WHERE guide_id = ? ORDER BY created_at ASC"
  ).all(req.params.guideId);
  res.json(messages);
});

// Send a chat message
router.post("/:guideId", async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message is required." });

  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.guideId, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });

  // Save user message
  const userMsgId = uuid();
  db.prepare("INSERT INTO chat_messages (id, guide_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)")
    .run(userMsgId, guide.id, req.user.id, "user", message);

  // Get chat history for context
  const history = db.prepare(
    "SELECT role, content FROM chat_messages WHERE guide_id = ? ORDER BY created_at ASC LIMIT 20"
  ).all(guide.id);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `You are a helpful study assistant. The student is studying the following lecture guide:

Title: ${guide.title}

Summary:
${JSON.parse(guide.summary).map((s, i) => `${i + 1}. ${s}`).join("\n")}

Key Terms:
${JSON.parse(guide.key_terms).map(t => `- ${t.term}: ${t.definition}`).join("\n")}

Help the student understand the material. Be encouraging, clear, and concise. If they ask about something not in the guide, you can still help with general knowledge on the topic.`;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 600,
      system: systemPrompt,
      messages: history.map(m => ({ role: m.role, content: m.content })),
    });

    const aiContent = response.content[0].text;

    // Save AI message
    const aiMsgId = uuid();
    db.prepare("INSERT INTO chat_messages (id, guide_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)")
      .run(aiMsgId, guide.id, req.user.id, "assistant", aiContent);

    res.json({
      id: aiMsgId,
      role: "assistant",
      content: aiContent,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed to respond. Please try again." });
  }
});

// Clear chat history
router.delete("/:guideId", (req, res) => {
  const guide = db.prepare("SELECT * FROM guides WHERE id = ? AND user_id = ?").get(req.params.guideId, req.user.id);
  if (!guide) return res.status(404).json({ error: "Guide not found." });
  db.prepare("DELETE FROM chat_messages WHERE guide_id = ?").run(guide.id);
  res.json({ success: true });
});

export default router;
