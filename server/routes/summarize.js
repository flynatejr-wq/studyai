import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const STUDY_GUIDE_PROMPT = `You are a helpful study assistant. Analyze the following lecture content and return a JSON response with exactly this structure:
{
  "title": "A concise title for this lecture (max 8 words)",
  "summary": ["bullet point 1", "bullet point 2", ...],
  "keyTerms": [{"term": "term name", "definition": "definition"}, ...],
  "quizQuestions": [{"question": "question text", "answer": "answer text"}, ...]
}
Provide 5-8 summary bullet points, 5-8 key terms, and 5 quiz questions. Return only valid JSON, no extra text.`;

async function generateFromText(text) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: `${STUDY_GUIDE_PROMPT}\n\nLecture content:\n${text}` }],
  });
  const raw = message.content[0].text;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Invalid AI response");
  return JSON.parse(match[0]);
}

// ── POST /api/summarize — paste text ────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  const { transcript } = req.body;
  if (!transcript?.trim()) return res.status(400).json({ error: "No transcript provided." });
  try {
    const result = await generateFromText(transcript);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── POST /api/summarize/image — upload a photo ───────────────────────────────
router.post("/image", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image provided." });
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const base64 = req.file.buffer.toString("base64");
    const mediaType = req.file.mimetype;
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `Extract all text and content from this image (lecture slides, whiteboard, notes, textbook). Then create a study guide.\n\n${STUDY_GUIDE_PROMPT}` },
        ],
      }],
    });
    const raw = message.content[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid AI response");
    res.json(JSON.parse(match[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong processing your image." });
  }
});

// ── POST /api/summarize/audio — upload audio ─────────────────────────────────
router.post("/audio", requireAuth, upload.single("audio"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No audio provided." });
  if (!process.env.OPENAI_API_KEY)
    return res.status(400).json({ error: "Audio requires an OpenAI API key in your .env file." });
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const audioFile = new File([req.file.buffer], req.file.originalname, { type: req.file.mimetype });
    const transcription = await openai.audio.transcriptions.create({ file: audioFile, model: "whisper-1" });
    if (!transcription.text?.trim())
      return res.status(400).json({ error: "Could not transcribe audio. Make sure it contains clear speech." });
    res.json(await generateFromText(transcription.text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong processing your audio." });
  }
});

export default router;
