import express from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const COLORS = ["indigo", "violet", "pink", "rose", "orange", "amber", "green", "teal", "sky", "blue"];

// Get all folders with guide counts
router.get("/", (req, res) => {
  const folders = db.prepare(`
    SELECT f.*, COUNT(g.id) as guide_count
    FROM folders f
    LEFT JOIN guides g ON g.folder_id = f.id
    WHERE f.user_id = ?
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json(folders);
});

// Create folder
router.post("/", (req, res) => {
  const { name, color, icon } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Folder name is required." });
  const id = uuid();
  db.prepare("INSERT INTO folders (id, user_id, name, color, icon) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.user.id, name.trim(), color || COLORS[Math.floor(Math.random() * COLORS.length)], icon || "📁");
  const folder = db.prepare("SELECT * FROM folders WHERE id = ?").get(id);
  res.json(folder);
});

// Update folder
router.patch("/:id", (req, res) => {
  const folder = db.prepare("SELECT * FROM folders WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: "Folder not found." });
  const { name, color, icon } = req.body;
  db.prepare("UPDATE folders SET name = ?, color = ?, icon = ? WHERE id = ?")
    .run(name || folder.name, color || folder.color, icon || folder.icon, folder.id);
  res.json(db.prepare("SELECT * FROM folders WHERE id = ?").get(folder.id));
});

// Delete folder
router.delete("/:id", (req, res) => {
  const folder = db.prepare("SELECT * FROM folders WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: "Folder not found." });
  db.prepare("DELETE FROM folders WHERE id = ?").run(folder.id);
  res.json({ success: true });
});

export default router;
