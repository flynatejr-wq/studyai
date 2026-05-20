import express from "express";
import Stripe from "stripe";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Stripe is optional — gracefully disabled if STRIPE_SECRET_KEY is not set
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const PRICE_ID = process.env.STRIPE_PRICE_ID || null; // monthly Pro price ID from Stripe dashboard

// ── POST /api/stripe/checkout — create a Checkout Session ────────────────────
router.post("/checkout", requireAuth, async (req, res) => {
  if (!stripe || !PRICE_ID) {
    return res.status(503).json({ error: "Payments are not configured yet." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.plan === "pro") return res.status(400).json({ error: "You already have a Pro plan." });

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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard?upgraded=1`,
      cancel_url:  `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard?cancelled=1`,
      metadata: { userId: user.id },
    });

    res.json({ url: session.url });
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
// Must be registered BEFORE express.json() since Stripe needs the raw body
router.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments not configured." });

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: "Webhook secret not configured." });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
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
        } else if (status === "past_due" || status === "unpaid" || status === "canceled") {
          db.prepare("UPDATE users SET plan = 'free' WHERE stripe_subscription_id = ?").run(subId);
        }
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
