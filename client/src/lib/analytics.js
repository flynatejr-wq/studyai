// ── Analytics wrapper (Mixpanel) ──────────────────────────────────────────────
// Gracefully no-ops when the token is not set so dev works without keys.

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;

let mp = null;  // mixpanel instance

export async function initAnalytics() {
  if (!MIXPANEL_TOKEN) return;

  try {
    const mixpanel = (await import("mixpanel-browser")).default;
    mixpanel.init(MIXPANEL_TOKEN, {
      track_pageview:         false,   // manual via analytics.page()
      // "memory" = zero cookies, zero localStorage writes — eliminates all
      // "rejected for invalid domain" cookie errors on Vercel subdomains.
      // Trade-off: super-properties reset on page reload (acceptable for event tracking).
      persistence:            "memory",
      autocapture:            false,
      ignore_dnt:             false,
      batch_requests:         true,
      cross_subdomain_cookie: false,
    });
    mp = mixpanel;
  } catch (e) {
    // Never let analytics break the app
  }
}

export const analytics = {
  /** Identify a user — call after login/signup */
  identify(userId, traits = {}) {
    mp?.identify(userId);
    if (traits && Object.keys(traits).length) {
      mp?.people.set({
        $name:      traits.name,
        $email:     traits.email,
        plan:       traits.plan,
        created_at: traits.created_at,
      });
    }
  },

  /** Track a named event with optional properties */
  track(event, props = {}) {
    mp?.track(event, props);
  },

  /** Track a page view — called automatically on route change */
  page(path) {
    mp?.track("Page Viewed", { path });
  },

  /** Reset identity on logout */
  reset() {
    mp?.reset();
  },
};

// ── Event catalogue ───────────────────────────────────────────────────────────
// Import this in components for type-safe event names instead of raw strings.
export const Events = {
  // Auth
  SIGNED_UP:            "User Signed Up",
  LOGGED_IN:            "User Logged In",
  LOGGED_OUT:           "User Logged Out",
  EMAIL_VERIFIED:       "Email Verified",
  PASSWORD_RESET:       "Password Reset",

  // Guides
  GENERATION_STARTED:   "Guide Generation Started",
  GENERATION_COMPLETED: "Guide Generation Completed",
  GENERATION_FAILED:    "Guide Generation Failed",
  GUIDE_SAVED:          "Guide Saved",
  GUIDE_DELETED:        "Guide Deleted",
  GUIDE_SHARED:         "Guide Shared",

  // Quiz
  QUIZ_STARTED:         "Quiz Started",
  QUIZ_COMPLETED:       "Quiz Completed",

  // Chat
  CHAT_MESSAGE_SENT:    "Chat Message Sent",

  // Monetization
  UPGRADE_CLICKED:      "Upgrade Clicked",
  UPGRADE_COMPLETED:    "Upgrade Completed",
  FREE_LIMIT_HIT:       "Free Limit Hit",
  CHECKOUT_STARTED:     "Checkout Started",

  // Features
  FLASHCARDS_OPENED:    "Flashcards Opened",
  STUDY_PLAN_CREATED:   "Study Plan Created",
  FOLDER_CREATED:       "Folder Created",
};
