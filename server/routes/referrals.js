import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// ── GET /api/referrals — get referral info + stats ────────────────────────────
router.get("/", async (req, res) => {
  const user = (await pool.query(
    "SELECT referral_code, referral_credits FROM users WHERE id = $1",
    [req.user.id]
  )).rows[0] ?? null;
  if (!user) return res.status(404).json({ error: "User not found." });

  const referrals = (await pool.query(`
    SELECT r.id, r.status, r.created_at, r.converted_at,
           u.name as referred_name, u.email as referred_email,
           u.plan as referred_plan
    FROM referrals r
    LEFT JOIN users u ON u.id = r.referred_id
    WHERE r.referrer_id = $1
    ORDER BY r.created_at DESC
    LIMIT 50
  `, [req.user.id])).rows;

  // Mask email
  const maskedReferrals = referrals.map(r => {
    let masked = null;
    if (r.referred_email) {
      const [local, domain] = r.referred_email.split("@");
      masked = local.slice(0, 2) + "***@" + domain;
    }
    const { referred_email, ...rest } = r;
    return { ...rest, referred_email: masked };
  });

  const total      = referrals.length;
  const converted  = referrals.filter(r => r.status === "converted").length;
  const pending    = total - converted;

  res.json({
    referral_code:    user.referral_code,
    referral_credits: user.referral_credits ?? 0,
    stats: { total, converted, pending },
    referrals: maskedReferrals,
  });
});

// ── POST /api/referrals/redeem — spend a referral credit for an extra guide ──
router.post("/redeem", async (req, res) => {
  const user = (await pool.query(
    "SELECT id, referral_credits, guides_created_ever, plan FROM users WHERE id = $1",
    [req.user.id]
  )).rows[0] ?? null;
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.plan === "pro") return res.status(400).json({ error: "Pro users already have unlimited guides." });
  if ((user.referral_credits ?? 0) < 1) return res.status(400).json({ error: "No referral credits available." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE users SET referral_credits = referral_credits - 1 WHERE id = $1",
      [user.id]
    );
    await client.query(
      "UPDATE users SET guides_created_ever = GREATEST(0, guides_created_ever - 1) WHERE id = $1",
      [user.id]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  res.json({ success: true, referral_credits: (user.referral_credits ?? 0) - 1 });
});

// ── Webhook helper (called internally by stripe webhook handler) ───────────────
export async function markReferralConverted(userId) {
  const referral = (await pool.query(
    "SELECT id FROM referrals WHERE referred_id = $1 AND status = 'pending'",
    [userId]
  )).rows[0] ?? null;
  if (!referral) return;
  await pool.query(
    "UPDATE referrals SET status = 'converted', converted_at = NOW() WHERE id = $1",
    [referral.id]
  );
}

export default router;
