import express from "express";
import { v4 as uuid } from "uuid";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  const { rating, message } = req.body;
  const ratingNum = parseInt(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5)
    return res.status(400).json({ error: "Rating must be an integer from 1 to 5." });

  const safeMessage = typeof message === "string" ? message.trim().slice(0, 2000) : null;

  await pool.query(
    "INSERT INTO feedback (id, user_id, rating, message) VALUES ($1, $2, $3, $4)",
    [uuid(), req.user.id, ratingNum, safeMessage || null]
  );

  res.json({ success: true });
});

export default router;
