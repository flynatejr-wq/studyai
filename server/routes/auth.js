import express from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields are required." });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });

  try {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return res.status(400).json({ error: "An account with that email already exists." });

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuid();
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)"
    ).run(id, name.trim(), email.toLowerCase().trim(), password_hash);

    const user = db.prepare("SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, created_at FROM users WHERE id = ?").get(id);
    const token = signToken({ id, email });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
    if (!user) return res.status(400).json({ error: "No account found with that email." });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Incorrect password." });

    // Update streak
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    let newStreak = user.streak;
    if (user.last_study_date === yesterday) newStreak = user.streak + 1;
    else if (user.last_study_date !== today) newStreak = 1;

    db.prepare("UPDATE users SET streak = ?, last_study_date = ? WHERE id = ?")
      .run(newStreak, today, user.id);

    const token = signToken({ id: user.id, email: user.email });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, streak: newStreak } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Get current user
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare(
    "SELECT id, name, email, streak, xp, level, total_guides, total_quizzes, last_study_date, created_at FROM users WHERE id = ?"
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json(user);
});

export default router;
