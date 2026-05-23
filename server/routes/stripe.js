import express from "express";
import Stripe from "stripe";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { markReferralConverted } from "./referrals.js";

const router = express.Router();

// Stripe is optional — gracefully disabled if STRIPE_SECRET_KEY is not set
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const PRICE_ID      = process.env.STRIPE_PRICE_ID      || null; // monthly Pro price ID from Stripe dashboard
const SSU_COUPON_ID = process.env.STRIPE_SSU_COUPON_ID || null; // $3 off coupon for @savannahstate.edu students
const SSU_DOMAIN    = "savannahstate.edu";

// ── POST /api/stripe/checkout — create a Checkout Session ────────────────────
router.post("/checkout", requireAuth, async (req, res) => {
  if (!stripe || !PRICE_ID) {
    return res.status(503).json({ error: "Payments are not configured yet." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.plan === "pro") return res.status(400).json({ error: "You already have a Pro plan." });

  // Savannah State student discount — requires verified @savannahstate.edu email
  const isSSU = SSU_COUPON_ID &&
    user.email_verified === 1 &&
    user.email.toLowerCase().endsWith(`@${SSU_DOMAIN}`);

  try {
    // Reuse existing Stripe customer or create one
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      db.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?").run(customerId, user.id);
    }

    // If SSU coupon applies, use discounts[] (can't combine with allow_promotion_codes)
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

  const user = db.prepare("SELECT stripe_customer_id FROM users WHERE id = ?").get(req.user.id);
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
router.post("/webhook", (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments not configured." });

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: "Webhook secret not configured." });

  let event;
  try {
    // req.rawBody is set by the verify() callback in express.json() — it's the raw Buffer
    const payload = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err.message);
    return res.status(400).json({ error: "Webhook signature verification failed." });
  }

  const data = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const userId = data.metadata?.userId;
        const subId  = data.subscription;
        if (userId && subId) {
          db.prepare("UPDATE users SET plan = 'pro', stripe_subscription_id = ? WHERE id = ?")
            .run(subId, userId);
          console.log(`[stripe] User ${userId} upgraded to Pro (sub: ${subId})`);
          // Mark referral as converted (no-op if user wasn't referred)
          markReferralConverted(userId);
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.paused": {
        const subId = data.id;
        db.prepare("UPDATE users SET plan = 'free', stripe_subscription_id = NULL WHERE stripe_subscription_id = ?")
          .run(subId);
        console.log(`[stripe] Subscription ${subId} ended — user downgraded to free`);
        break;
      }
      case "customer.subscription.updated": {
        const subId  = data.id;
        const status = data.status;
        if (status === "active" || status === "trialing") {
          db.prepare("UPDATE users SET plan = 'pro' WHERE stripe_subscription_id = ?").run(subId);
          console.log(`[stripe] Subscription ${subId} active (status: ${status})`);
        } else if (status === "past_due" || status === "unpaid" || status === "canceled") {
          db.prepare("UPDATE users SET plan = 'free' WHERE stripe_subscription_id = ?").run(subId);
          console.log(`[stripe] Subscription ${subId} downgraded (status: ${status})`);
        }
        break;
      }
      case "invoice.payment_succeeded": {
        // Ensure plan is restored to pro when payment recovers (e.g. after past_due)
        const subId = data.subscription;
        if (subId) {
          db.prepare("UPDATE users SET plan = 'pro' WHERE stripe_subscription_id = ?").run(subId);
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
        // Stripe will retry automatically and fire customer.subscription.deleted after max retries.
        // We log here for visibility; admins can see the customer ID in Railway logs and look up in Stripe.
        break;
      }
      case "customer.subscription.trial_will_end": {
        // Trial ending in 3 days — logged for future email reminder implementation
        console.log(`[stripe] Trial ending soon for subscription ${data.id}`);
        break;
      }
      default:
        // Unhandled event types — log for debugging
        console.log(`[stripe] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripe webhook handler]", err.message);
    return res.status(500).json({ error: "Webhook handler error." });
  }

  res.json({ received: true });
});

export default router;
