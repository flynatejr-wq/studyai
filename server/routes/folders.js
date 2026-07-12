import express from "express";
import { v4 as uuid } from "uuid";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const COLORS = ["indigo", "violet", "pink", "rose", "orange", "amber", "green", "teal", "sky", "blue"];

// Get all folders with guide counts
router.get("/", async (req, res) => {
  const folders = (await pool.query(`
    SELECT f.*, COUNT(g.id) as guide_count
    FROM folders f
    LEFT JOIN guides g ON g.folder_id = f.id
    WHERE f.user_id = $1
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `, [req.user.id])).rows;
  res.json(folders);
});

const FREE_FOLDER_LIMIT = 3;

// Create folder
router.post("/", async (req, res) => {
  const { name, color, icon } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Folder name is required." });

  // Free-tier folder limit
  const user = (await pool.query(
    "SELECT plan, role, is_whitelisted FROM users WHERE id = $1",
    [req.user.id]
  )).rows[0] ?? null;
  if (user && user.plan !== "pro" && user.plan !== "lifetime" && user.plan !== "pilot" && !user.is_whitelisted && user.role !== "admin") {
    const folderCount = Number((await pool.query(
      "SELECT COUNT(*) as c FROM folders WHERE user_id = $1",
      [req.user.id]
    )).rows[0]?.c) || 0;
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
  const safeColor = COLORS.includes(color) ? color : COLORS[Math.floor(Math.random() * COLORS.length)];
  const id = uuid();
  await pool.query(
    "INSERT INTO folders (id, user_id, name, color, icon) VALUES ($1, $2, $3, $4, $5)",
    [id, req.user.id, name.trim(), safeColor, safeIcon || "📁"]
  );
  const folder = (await pool.query("SELECT * FROM folders WHERE id = $1", [id])).rows[0] ?? null;
  res.json(folder);
});

// Update folder
router.patch("/:id", async (req, res) => {
  const folder = (await pool.query(
    "SELECT * FROM folders WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!folder) return res.status(404).json({ error: "Folder not found." });
  const { name, color, icon } = req.body;
  if (name && name.trim().length > 80) return res.status(400).json({ error: "Folder name is too long (max 80 characters)." });
  const safeIcon = typeof icon === "string" ? icon.trim().slice(0, 10) : folder.icon;
  const safeColor = COLORS.includes(color) ? color : (color === undefined ? folder.color : folder.color);
  await pool.query(
    "UPDATE folders SET name = $1, color = $2, icon = $3 WHERE id = $4",
    [name?.trim() || folder.name, safeColor, safeIcon || folder.icon, folder.id]
  );
  const updated = (await pool.query("SELECT * FROM folders WHERE id = $1", [folder.id])).rows[0] ?? null;
  res.json(updated);
});

// Delete folder
router.delete("/:id", async (req, res) => {
  const folder = (await pool.query(
    "SELECT * FROM folders WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  )).rows[0] ?? null;
  if (!folder) return res.status(404).json({ error: "Folder not found." });
  await pool.query("DELETE FROM folders WHERE id = $1", [folder.id]);
  res.json({ success: true });
});

export default router;
