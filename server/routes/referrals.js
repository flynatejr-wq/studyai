import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// ── GET /api/referrals — get referral info + stats ────────────────────────────
router.get("/", (req, res) => {
  const user = db.prepare(
    "SELECT referral_code, referral_credits FROM users WHERE id = ?"
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  const referrals = db.prepare(`
    SELECT r.id, r.status, r.created_at, r.converted_at,
           u.name as referred_name, u.email as referred_email,
           u.plan as referred_plan
    FROM referrals r
    LEFT JOIN users u ON u.id = r.referred_id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
    LIMIT 50
  `).all(req.user.id);

  // Mask email — referrers should see that someone signed up but not their full address
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
router.post("/redeem", (req, res) => {
  const user = db.prepare(
    "SELECT id, referral_credits, guides_created_ever, plan FROM users WHERE id = ?"
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.plan === "pro") return res.status(400).json({ error: "Pro users already have unlimited guides." });
  if ((user.referral_credits ?? 0) < 1) return res.status(400).json({ error: "No referral credits available." });

  // Decrement a credit, and reset the guides_created_ever counter by 1
  // so they can save one more guide (permanent credit effectively)
  db.transaction(() => {
    db.prepare("UPDATE users SET referral_credits = referral_credits - 1 WHERE id = ?").run(user.id);
    // Reduce ever-created counter by 1 so the free-limit gate allows one more save
    db.prepare("UPDATE users SET guides_created_ever = MAX(0, guides_created_ever - 1) WHERE id = ?").run(user.id);
  })();

  res.json({ success: true, referral_credits: (user.referral_credits ?? 0) - 1 });
});

// ── Webhook helper (called internally by stripe webhook handler) ───────────────
// When a referred user upgrades to Pro, mark the referral as converted.
export function markReferralConverted(userId) {
  const referral = db.prepare("SELECT id FROM referrals WHERE referred_id = ? AND status = 'pending'").get(userId);
  if (!referral) return;
  db.prepare("UPDATE referrals SET status = 'converted', converted_at = datetime('now') WHERE id = ?").run(referral.id);
}

export default router;
