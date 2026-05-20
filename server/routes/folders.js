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

const FREE_FOLDER_LIMIT = 3;

// Create folder
router.post("/", (req, res) => {
  const { name, color, icon } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Folder name is required." });

  // Free-tier folder limit
  const user = db.prepare("SELECT plan, role, is_whitelisted FROM users WHERE id = ?").get(req.user.id);
  if (user && user.plan !== "pro" && user.plan !== "lifetime" && !user.is_whitelisted && user.role !== "admin") {
    const folderCount = db.prepare("SELECT COUNT(*) as c FROM folders WHERE user_id = ?").get(req.user.id)?.c || 0;
    if (folderCount >= FREE_FOLDER_LIMIT) {
      return res.status(403).json({
        error: "FREE_LIMIT_FOLDERS",
        message: `Free accounts are limited to ${FREE_FOLDER_LIMIT} folders. Upgrade to Pro for unlimited organisation.`,
      });
    }
  }
  if (name.trim().length > 80) return res.status(400).json({ error: "Folder name is too long (max 80 characters)." });
  const safeIcon = typeof icon === "string" ? icon.trim().slice(0, 10) : "📁";
  if (safeIcon && !safeIcon.length) return res.status(400).json({ error: "Invalid icon." });
  // M-2: Validate color against allowlist to prevent arbitrary strings being stored and rendered
  const safeColor = COLORS.includes(color) ? color : COLORS[Math.floor(Math.random() * COLORS.length)];
  const id = uuid();
  db.prepare("INSERT INTO folders (id, user_id, name, color, icon) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.user.id, name.trim(), safeColor, safeIcon || "📁");
  const folder = db.prepare("SELECT * FROM folders WHERE id = ?").get(id);
  res.json(folder);
});

// Update folder
router.patch("/:id", (req, res) => {
  const folder = db.prepare("SELECT * FROM folders WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: "Folder not found." });
  const { name, color, icon } = req.body;
  if (name && name.trim().length > 80) return res.status(400).json({ error: "Folder name is too long (max 80 characters)." });
  const safeIcon = typeof icon === "string" ? icon.trim().slice(0, 10) : folder.icon;
  // M-2: Validate updated color against allowlist too
  const safeColor = COLORS.includes(color) ? color : (color === undefined ? folder.color : folder.color);
  db.prepare("UPDATE folders SET name = ?, color = ?, icon = ? WHERE id = ?")
    .run(name?.trim() || folder.name, safeColor, safeIcon || folder.icon, folder.id);
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
