// ── Analytics wrapper (PostHog) ───────────────────────────────────────────────
// Gracefully no-ops when VITE_POSTHOG_KEY is not set so dev/staging work fine.

const KEY  = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let ph = null;

export async function initAnalytics() {
  if (!KEY || ph) return;
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(KEY, {
      api_host:          HOST,
      person_profiles:   "identified_only",
      capture_pageview:  false, // manual via trackPage()
      capture_pageleave: true,
      autocapture:       false, // manual events only for precision
    });
    ph = posthog;
  } catch (e) {
    // Non-fatal — analytics should never break the app
    console.warn("[analytics] init failed:", e?.message);
  }
}

export const analytics = {
  /** Associate subsequent events with a user */
  identify(userId, traits = {}) {
    ph?.identify(userId, traits);
  },

  /** Track a named event with optional properties */
  track(event, props = {}) {
    ph?.capture(event, props);
  },

  /** Track a page view (call on route change) */
  page(path) {
    ph?.capture("$pageview", { path });
  },

  /** Reset identity on logout */
  reset() {
    ph?.reset();
  },
};

// ── Key events (kept here for easy reference / autocomplete) ─────────────────
export const Events = {
  // Auth
  SIGNED_UP:              "user_signed_up",
  LOGGED_IN:              "user_logged_in",

  // Guides
  GENERATION_STARTED:     "guide_generation_started",
  GENERATION_COMPLETED:   "guide_generation_completed",
  GENERATION_FAILED:      "guide_generation_failed",
  GUIDE_SAVED:            "guide_saved",
  GUIDE_DELETED:          "guide_deleted",

  // Quiz
  QUIZ_STARTED:           "quiz_started",
  QUIZ_COMPLETED:         "quiz_completed",

  // Chat
  CHAT_MESSAGE_SENT:      "chat_message_sent",

  // Monetization
  UPGRADE_CLICKED:        "upgrade_clicked",
  UPGRADE_COMPLETED:      "upgrade_completed",
  FREE_LIMIT_HIT:         "free_limit_hit",

  // Onboarding
  ONBOARDING_STARTED:     "onboarding_started",
  ONBOARDING_COMPLETED:   "onboarding_completed",
  ONBOARDING_SKIPPED:     "onboarding_skipped",
};
