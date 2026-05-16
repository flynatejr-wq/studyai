import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import summarizeRoute from "./routes/summarize.js";
import authRoute from "./routes/auth.js";
import foldersRoute from "./routes/folders.js";
import guidesRoute from "./routes/guides.js";
import chatRoute from "./routes/chat.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoute);
app.use("/api/summarize", summarizeRoute);
app.use("/api/folders", foldersRoute);
app.use("/api/guides", guidesRoute);
app.use("/api/chat", chatRoute);

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
