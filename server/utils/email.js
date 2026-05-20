import nodemailer from "nodemailer";

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: parseInt(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendPasswordReset(toEmail, resetLink) {
  const transport = createTransport();
  if (!transport) throw new Error("EMAIL_NOT_CONFIGURED");

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({
    from: `"StudyBuddi" <${from}>`,
    to: toEmail,
    subject: "Reset your StudyBuddi password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
        <h1 style="color:#818cf8;font-size:24px;margin-bottom:8px;">StudyBuddi</h1>
        <h2 style="color:#f1f5f9;font-size:20px;margin-bottom:16px;">Reset your password</h2>
        <p style="color:#94a3b8;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong style="color:#e2e8f0;">1 hour</strong>.</p>
        <a href="${resetLink}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">Reset Password â†’</a>
        <p style="color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email â€” your password won't change.</p>
        <p style="color:#64748b;font-size:12px;margin-top:24px;border-top:1px solid #1e293b;padding-top:16px;">Â© ${new Date().getFullYear()} StudyBuddi. All rights reserved.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(toEmail, verifyLink) {
  const transport = createTransport();
  if (!transport) throw new Error("EMAIL_NOT_CONFIGURED");

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({
    from: `"StudyBuddi" <${from}>`,
    to: toEmail,
    subject: "Verify your StudyBuddi email address",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
        <h1 style="color:#818cf8;font-size:24px;margin-bottom:8px;">StudyBuddi</h1>
        <h2 style="color:#f1f5f9;font-size:20px;margin-bottom:16px;">Verify your email</h2>
        <p style="color:#94a3b8;line-height:1.6;">Thanks for signing up! Click the button below to verify your email address and unlock all features. This link expires in <strong style="color:#e2e8f0;">24 hours</strong>.</p>
        <a href="${verifyLink}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">Verify Email →</a>
        <p style="color:#64748b;font-size:13px;">If you didn't create a StudyBuddi account, you can safely ignore this email.</p>
        <p style="color:#64748b;font-size:12px;margin-top:24px;border-top:1px solid #1e293b;padding-top:16px;">© ${new Date().getFullYear()} StudyBuddi. All rights reserved.</p>
      </div>
    `,
  });
}

export function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

