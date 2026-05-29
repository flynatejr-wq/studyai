// Load .env FIRST — before any other import reads process.env at module-init time
import "dotenv/config";

import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
// v2
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import summarizeRoute from "./routes/summarize.js";
import authRoute from "./routes/auth.js";
import foldersRoute from "./routes/folders.js";
import guidesRoute from "./routes/guides.js";
import chatRoute from "./routes/chat.js";
import progressRoute from "./routes/progress.js";
import publicRoute from "./routes/public.js";
import stripeRoute from "./routes/stripe.js";
import adminRoute from "./routes/admin.js";
import exportRoute from "./routes/export.js";
import studyPlansRoute from "./routes/studyPlans.js";
import referralsRoute from "./routes/referrals.js";

// ── Sentry (only when SENTRY_DSN is configured) ───────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0.1,
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Railway (and most cloud platforms) sit behind a reverse proxy that sets X-Forwarded-For.
// Without trust proxy, express-rate-limit throws a ValidationError on every request.
app.set("trust proxy", 1);

// Security headers — crossOriginResourcePolicy must be "cross-origin" because the API and frontend
// are on different origins (Railway + Vercel). "same-origin" would block browsers from reading responses.
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Auth is Bearer-token based (not cookies), so reflecting the request origin is safe —
// there is no CSRF risk. `origin: true` echoes the caller's Origin header back, which
// is compatible with credentials:true and works for every deployment environment
// (localhost, Vercel, Railway previews) without needing FRONTEND_URL to be configured.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman, same-origin server calls)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

// Handle CORS preflight (OPTIONS) for every route BEFORE rate limiting
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// Rate limiting — disabled in test mode so Jest suites don't hit 429s
const IS_TEST = process.env.NODE_ENV === "test";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_TEST ? 100_000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_TEST ? 100_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." },
});

// Tighter limiter for password-reset flows — prevents reset-email spam and
// user-existence enumeration via timing. 5 requests per 15 min per IP.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_TEST ? 100_000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset attempts. Please wait 15 minutes and try again." },
});

// One-shot admin bootstrap endpoint — extremely tight limit.
const adminSetupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: IS_TEST ? 100_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin setup attempts." },
});

// H-5: Per-user AI rate limit — keyed on authenticated user ID so rotating IPs can't bypass it
// keyGenerator decodes the JWT to extract the user ID; falls back to IP for unauthenticated requests
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: IS_TEST ? 100_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait a moment." },
  keyGenerator: (req) => {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ") && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
        if (decoded?.id) return `user:${decoded.id}`;
      } catch {}
    }
    // All AI routes require auth, so unauthenticated requests are rejected by requireAuth anyway.
    // Use a fixed key so they share one bucket rather than triggering the IPv6 keyGenerator warning.
    return "unauthenticated";
  },
});

app.use(generalLimiter);
// Preserve the raw body for Stripe webhook signature verification.
// express.json() must NOT consume the raw buffer before stripe.webhooks.constructEvent() sees it.
app.use(express.json({
  limit: "10mb",
  verify: (req, _res, buf) => {
    if (req.originalUrl === "/api/stripe/webhook") req.rawBody = buf;
  },
}));

app.use("/api/auth/forgot-password",             passwordResetLimiter);
app.use("/api/auth/reset-password",              passwordResetLimiter);
app.use("/api/auth/resend-verification-public",  passwordResetLimiter);
app.use("/api/auth/resend-verification",         passwordResetLimiter); // authenticated resend — same tight limit
app.delete("/api/auth/account",                  passwordResetLimiter); // brute-force guard on password check
app.use("/api/auth", authLimiter, authRoute);
app.use("/api/summarize", aiLimiter, summarizeRoute);
app.use("/api/folders", foldersRoute);
app.use("/api/guides", guidesRoute);
app.use("/api/chat", aiLimiter, chatRoute);
app.use("/api/progress", progressRoute);
app.use("/api/public", publicRoute);
// Stripe webhook must come before express.json() body parser — raw body needed for signature verification
app.use("/api/stripe", stripeRoute);
app.use("/api/admin/setup", adminSetupLimiter);
app.use("/api/admin", adminRoute);
app.use("/api/export", exportRoute);
app.use("/api/study-plans", studyPlansRoute);
app.use("/api/referrals", referralsRoute);

app.get("/health", (_, res) => res.json({ status: "ok" }));

// Client-side error reporting (no auth — ErrorBoundary sends here)
// H-1: Tight rate limit + field length caps to prevent log flooding / log injection
const clientErrorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 error reports per minute per IP is more than enough
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many error reports." },
});

function sanitizeLogField(val, max = 500) {
  if (typeof val !== "string") return "(none)";
  // Strip control characters and newlines to prevent log injection
  return val.replace(/[\x00-\x1F\x7F]/g, " ").slice(0, max);
}

app.post("/api/client-error", clientErrorLimiter, (req, res) => {
  const { message, componentStack, url, userAgent } = req.body || {};
  console.error("=== CLIENT ERROR REPORT ===");
  console.error("URL:", sanitizeLogField(url, 200));
  console.error("UA:", sanitizeLogField(userAgent, 200));
  console.error("Error:", sanitizeLogField(message, 500));
  console.error("Stack:", sanitizeLogField(componentStack, 1000));
  console.error("===========================");
  res.json({ ok: true });
});

// 404 catch-all — must be after all routes; always returns JSON (never Express plain-text)
// L-8: Generic message — don't echo method/path back to the caller
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Global error handler — catches multer "File too large" and any other unhandled errors
// Must have 4 arguments for Express to treat it as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Always set JSON content-type so the client can parse the error body
  res.setHeader("Content-Type", "application/json");

  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS: origin not allowed." });
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Maximum size is 50MB." });
  }
  if (err?.code?.startsWith("LIMIT_")) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  console.error("Unhandled error:", err);
  // Never send internal error details to the client — log them server-side only.
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

// Export the app for Supertest integration tests.
// Only bind to a port when not running under Jest (process.env.NODE_ENV === "test").
export default app;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}
