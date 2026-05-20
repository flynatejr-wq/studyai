import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.jsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics.js";

// ── Sentry (only initialises when VITE_SENTRY_DSN is set) ────────────────────
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn:              import.meta.env.VITE_SENTRY_DSN,
    environment:      import.meta.env.MODE,
    tracesSampleRate: 0.1,   // 10 % of transactions traced — keeps quota low
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Don't send errors in development even if DSN is set
    enabled: import.meta.env.PROD,
  });
}

// ── PostHog (only initialises when VITE_POSTHOG_KEY is set) ──────────────────
initAnalytics();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
