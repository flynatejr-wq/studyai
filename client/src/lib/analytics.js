// ── Analytics wrapper (Mixpanel + LogRocket) ──────────────────────────────────
// • Gracefully no-ops when tokens are not set so dev works without keys.
// • LogRocket session URLs are piped into Mixpanel for cross-referencing
//   (click any Mixpanel event → open the exact LogRocket replay).

const MIXPANEL_TOKEN   = import.meta.env.VITE_MIXPANEL_TOKEN;
const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID;

let mp = null;  // mixpanel instance
let lr = null;  // logrocket instance

export async function initAnalytics() {
  // ── LogRocket (session recordings) ─────────────────────────────────────────
  if (LOGROCKET_APP_ID && import.meta.env.PROD) {
    try {
      const LogRocket = (await import("logrocket")).default;
      LogRocket.init(LOGROCKET_APP_ID, {
        // Don't record sensitive fields
        dom: {
          inputSanitizer: true,
          textSanitizer:  false,
        },
        network: {
          requestSanitizer: (req) => {
            // Strip auth headers from recorded network requests
            if (req.headers.Authorization) req.headers.Authorization = "[REDACTED]";
            return req;
          },
          responseSanitizer: (res) => res,
        },
      });
      lr = LogRocket;
    } catch (e) {
      console.warn("[analytics] LogRocket init failed:", e?.message);
    }
  }

  // ── Mixpanel (product analytics) ───────────────────────────────────────────
  if (MIXPANEL_TOKEN) {
    try {
      const mixpanel = (await import("mixpanel-browser")).default;
      mixpanel.init(MIXPANEL_TOKEN, {
        track_pageview:    false,  // manual via analytics.page()
        persistence:       "localStorage",
        autocapture:       false,  // precision over noise
        ignore_dnt:        false,
        batch_requests:    true,
        // Don't fire in dev unless token explicitly set for dev environment
        loaded: (mpInstance) => {
          // After Mixpanel is ready, attach the LogRocket session URL
          // so every Mixpanel event links back to the exact session replay
          if (lr) {
            lr.getSessionURL((sessionURL) => {
              mpInstance.register({ logrocket_session: sessionURL });
            });
          }
        },
      });
      mp = mixpanel;
    } catch (e) {
      console.warn("[analytics] Mixpanel init failed:", e?.message);
    }
  }
}

export const analytics = {
  /**
   * Identify a user — call after login/signup.
   * Ties all future events to this user ID in Mixpanel and LogRocket.
   */
  identify(userId, traits = {}) {
    mp?.identify(userId);
    if (traits && Object.keys(traits).length) {
      mp?.people.set({
        $name:        traits.name,
        $email:       traits.email,
        plan:         traits.plan,
        created_at:   traits.created_at,
      });
    }
    // LogRocket identity (PII is stored only in LogRocket, not Mixpanel)
    if (lr && userId) {
      lr.identify(userId, {
        name:  traits.name  || "",
        email: traits.email || "",
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
    // LogRocket sessions are immutable; just stop identifying future sessions
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
