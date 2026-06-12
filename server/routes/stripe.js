import express from "express";
import Stripe from "stripe";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { markReferralConverted } from "./referrals.js";

const router = express.Router();

// Stripe is optional — gracefully disabled if STRIPE_SECRET_KEY is not set
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const PRICE_ID      = process.env.STRIPE_PRICE_ID      || null;
const SSU_COUPON_ID = process.env.STRIPE_SSU_COUPON_ID || null;
const SSU_DOMAIN    = "savannahstate.edu";

// ── POST /api/stripe/checkout — create a Checkout Session ────────────────────
router.post("/checkout", requireAuth, async (req, res) => {
  if (!stripe || !PRICE_ID) {
    return res.status(503).json({ error: "Payments are not configured yet." });
  }

  const user = (await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id])).rows[0] ?? null;
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.plan === "pro") return res.status(400).json({ error: "You already have a Pro plan." });

  const emailDomain = user.email.toLowerCase().split("@")[1] || "";
  const isSSU = SSU_COUPON_ID &&
    (emailDomain === SSU_DOMAIN || emailDomain.endsWith(`.${SSU_DOMAIN}`));

  try {
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await pool.query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [customerId, user.id]);
    }

    const discountOptions = isSSU
      ? { discounts: [{ coupon: SSU_COUPON_ID }] }
      : { allow_promotion_codes: true };

    if (isSSU) console.log(`[stripe] Applying SSU coupon for ${user.email}`);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      mode: "subscription",
      ...discountOptions,
      success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard?upgraded=1`,
      cancel_url:  `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard?cancelled=1`,
      metadata: { userId: user.id },
    });

    res.json({ url: session.url, isSsuStudent: isSSU });
  } catch (err) {
    console.error("[stripe/checkout]", err.message);
    res.status(500).json({ error: "Could not create checkout session. Please try again." });
  }
});

// ── POST /api/stripe/portal — billing portal for subscription management ──────
router.post("/portal", requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments are not configured yet." });

  const user = (await pool.query("SELECT stripe_customer_id FROM users WHERE id = $1", [req.user.id])).rows[0] ?? null;
  if (!user?.stripe_customer_id) return res.status(400).json({ error: "No billing account found." });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/portal]", err.message);
    res.status(500).json({ error: "Could not open billing portal. Please try again." });
  }
});

// ── POST /api/stripe/webhook — handle subscription events ─────────────────────
// Raw body is preserved via the express.json verify() function in index.js (req.rawBody).
router.post("/webhook", async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments not configured." });

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: "Webhook secret not configured." });

  let event;
  try {
    if (!req.rawBody) {
      throw new Error("Raw body not available — ensure express.json verify() is configured");
    }
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err.message);
    return res.status(400).json({ error: "Webhook signature verification failed." });
  }

  // Idempotency — skip already-processed events
  const alreadyProcessed = (await pool.query(
    "SELECT 1 FROM stripe_events WHERE id = $1",
    [event.id]
  )).rows[0] ?? null;
  if (alreadyProcessed) {
    console.log(`[stripe] duplicate event skipped: ${event.id}`);
    return res.json({ received: true });
  }
  // Mark as processed before handling
  await pool.query(
    "INSERT INTO stripe_events (id) VALUES ($1) ON CONFLICT DO NOTHING",
    [event.id]
  );

  const data = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        if (data.payment_status !== "paid") {
          console.log(`[stripe] checkout.session.completed skipped — payment_status=${data.payment_status}`);
          return res.json({ received: true });
        }
        const userId = data.metadata?.userId;
        const subId  = data.subscription;
        if (userId && subId) {
          await pool.query(
            "UPDATE users SET plan = 'pro', stripe_subscription_id = $1 WHERE id = $2",
            [subId, userId]
          );
          console.log(`[stripe] User ${userId} upgraded to Pro (sub: ${subId})`);
          await markReferralConverted(userId);
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.paused": {
        const subId = data.id;
        await pool.query(
          "UPDATE users SET plan = 'free', stripe_subscription_id = NULL WHERE stripe_subscription_id = $1",
          [subId]
        );
        console.log(`[stripe] Subscription ${subId} ended — user downgraded to free`);
        break;
      }
      case "customer.subscription.updated": {
        const subId  = data.id;
        const status = data.status;
        const priceId = data.items?.data?.[0]?.price?.id;
        if (priceId !== PRICE_ID) {
          console.log(`[stripe] subscription.updated skipped — unexpected price ${priceId}`);
          return res.json({ received: true });
        }
        if (status === "active" || status === "trialing") {
          await pool.query(
            "UPDATE users SET plan = 'pro' WHERE stripe_subscription_id = $1",
            [subId]
          );
          console.log(`[stripe] Subscription ${subId} active (status: ${status})`);
        } else if (status === "past_due" || status === "unpaid" || status === "canceled") {
          await pool.query(
            "UPDATE users SET plan = 'free' WHERE stripe_subscription_id = $1",
            [subId]
          );
          console.log(`[stripe] Subscription ${subId} downgraded (status: ${status})`);
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const subId = data.subscription;
        if (subId) {
          await pool.query(
            "UPDATE users SET plan = 'pro' WHERE stripe_subscription_id = $1",
            [subId]
          );
          console.log(`[stripe] Payment succeeded for subscription ${subId} — plan restored to pro`);
        }
        break;
      }
      case "invoice.payment_failed": {
        const customerId  = data.customer;
        const attemptCount = data.attempt_count || 1;
        const subId        = data.subscription;
        const amountDue    = (data.amount_due / 100).toFixed(2);
        console.warn(`[stripe] ⚠️  Payment failed — customer: ${customerId}, sub: ${subId}, attempt: ${attemptCount}, amount: $${amountDue}`);
        break;
      }
      case "customer.subscription.trial_will_end": {
        console.log(`[stripe] Trial ending soon for subscription ${data.id}`);
        break;
      }
      default:
        console.log(`[stripe] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripe webhook handler]", err.message);
    return res.status(500).json({ error: "Webhook handler error." });
  }

  res.json({ received: true });
});

export default router;
