import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import summarizeRoute from "./routes/summarize.js";
import authRoute from "./routes/auth.js";
import foldersRoute from "./routes/folders.js";
import guidesRoute from "./routes/guides.js";
import chatRoute from "./routes/chat.js";
import progressRoute from "./routes/progress.js";
import publicRoute from "./routes/public.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait a moment." },
});

app.use(generalLimiter);
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authLimiter, authRoute);
app.use("/api/summarize", aiLimiter, summarizeRoute);
app.use("/api/folders", foldersRoute);
app.use("/api/guides", guidesRoute);
app.use("/api/chat", aiLimiter, chatRoute);
app.use("/api/progress", progressRoute);
app.use("/api/public", publicRoute);

app.get("/health", (_, res) => res.json({ status: "ok" }));

// Client-side error reporting (no auth — ErrorBoundary sends here)
app.post("/api/client-error", (req, res) => {
  const { message, componentStack, url, userAgent } = req.body || {};
  console.error("=== CLIENT ERROR REPORT ===");
  console.error("URL:", url);
  console.error("UA:", userAgent);
  console.error("Error:", message);
  console.error("Component stack:", componentStack);
  console.error("===========================");
  res.json({ ok: true });
});

// Global error handler — catches multer "File too large" and any other unhandled errors
// Must have 4 arguments for Express to treat it as an error handler
app.use((err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Maximum size is 50MB." });
  }
  if (err?.code?.startsWith("LIMIT_")) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err?.message || "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
