/**
 * email.js — Transactional email via Resend
 *
 * All functions are fire-and-forget safe: they throw on failure so callers
 * can decide whether to propagate or swallow the error. The auth routes
 * wrap calls in try/catch so email failures never block signup/login.
 *
 * Required env var:
 *   RESEND_API_KEY   — from resend.com (starts with "re_")
 *   RESEND_FROM      — sender address on a verified Resend domain
 *                      e.g. "StudyBuddi <noreply@studybuddi.vercel.app>"
 *                      Falls back to "StudyBuddi <onboarding@resend.dev>" for testing.
 *
 * Docs: https://resend.com/docs/send-with-nodejs
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM || "StudyBuddi <onboarding@resend.dev>";

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// ── Shared email chrome ───────────────────────────────────────────────────────
function wrap(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#0a0a12; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    .container { max-width:480px; margin:40px auto; background:#0f0f1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; }
    .header { padding:28px 32px 20px; border-bottom:1px solid rgba(255,255,255,0.06); }
    .logo { font-size:22px; font-weight:800; background:linear-gradient(135deg,#818cf8,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .body { padding:28px 32px; }
    h2 { color:#f1f5f9; font-size:20px; margin:0 0 12px; }
    p { color:#94a3b8; font-size:14px; line-height:1.7; margin:0 0 16px; }
    .btn { display:inline-block; padding:13px 26px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff !important; border-radius:10px; text-decoration:none; font-weight:700; font-size:14px; margin:8px 0 20px; }
    .note { color:#64748b; font-size:12px; line-height:1.6; }
    .footer { padding:16px 32px; border-top:1px solid rgba(255,255,255,0.06); }
    .footer p { color:#475569; font-size:11px; margin:0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><span class="logo">StudyBuddi</span></div>
    <div class="body">${body}</div>
    <div class="footer"><p>© ${new Date().getFullYear()} StudyBuddi. All rights reserved.</p></div>
  </div>
</body>
</html>`;
}

// ── Welcome email ─────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(toEmail, name) {
  await resend.emails.send({
    from:    FROM,
    to:      [toEmail],
    subject: "Welcome to StudyBuddi 🎉",
    html:    wrap(`
      <h2>Welcome aboard, ${name || "there"}!</h2>
      <p>You've just unlocked the fastest way to turn any lecture, note, or document into a complete study system — summaries, flashcards, quizzes, and an AI tutor, all in seconds.</p>
      <p><strong style="color:#e2e8f0;">Here's how to get started:</strong></p>
      <ol style="color:#94a3b8;font-size:14px;line-height:2;padding-left:20px;margin:0 0 20px;">
        <li>Upload a lecture recording, image, or paste your notes</li>
        <li>Get a structured study guide instantly</li>
        <li>Quiz yourself or chat with your AI tutor</li>
      </ol>
      <a href="${process.env.FRONTEND_URL || "https://studybuddi.vercel.app"}/dashboard" class="btn">Open StudyBuddi →</a>
      <p class="note">Your free account includes 1 study guide. Upgrade anytime for unlimited guides, quizzes, and advanced AI features.</p>
    `),
  });
}

// ── Email verification ────────────────────────────────────────────────────────
export async function sendVerificationEmail(toEmail, verifyLink) {
  await resend.emails.send({
    from:    FROM,
    to:      [toEmail],
    subject: "Verify your StudyBuddi email address",
    html:    wrap(`
      <h2>Verify your email</h2>
      <p>Thanks for signing up! Click the button below to verify your email address and unlock all features. This link expires in <strong style="color:#e2e8f0;">24 hours</strong>.</p>
      <a href="${verifyLink}" class="btn">Verify Email →</a>
      <p class="note">If you didn't create a StudyBuddi account, you can safely ignore this email.</p>
    `),
  });
}

// ── Password reset ────────────────────────────────────────────────────────────
export async function sendPasswordReset(toEmail, resetLink) {
  await resend.emails.send({
    from:    FROM,
    to:      [toEmail],
    subject: "Reset your StudyBuddi password",
    html:    wrap(`
      <h2>Reset your password</h2>
      <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong style="color:#e2e8f0;">1 hour</strong>.</p>
      <a href="${resetLink}" class="btn">Reset Password →</a>
      <p class="note">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `),
  });
}

// ── Upgrade prompt (sent when free limit hit, optional) ──────────────────────
export async function sendUpgradePromptEmail(toEmail, name) {
  await resend.emails.send({
    from:    FROM,
    to:      [toEmail],
    subject: "You've hit your free limit on StudyBuddi",
    html:    wrap(`
      <h2>Ready to study without limits?</h2>
      <p>Hey ${name || "there"} — you've used your free study guide. Upgrade to Pro for unlimited guides, quizzes, and your personal AI tutor.</p>
      <a href="${process.env.FRONTEND_URL || "https://studybuddi.vercel.app"}/settings" class="btn">Upgrade to Pro →</a>
      <p class="note">Pro includes unlimited guides, advanced AI features, and priority support.</p>
    `),
  });
}
