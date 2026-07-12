import pool from "./db.js";

// Institutional pilot programs — students with a matching email domain get
// the 'pilot' plan automatically at signup, without a manual admin action
// per student. Adjust endDate to match the real pilot start date.
export const PILOT_PROGRAMS = [
  { domain: "savannahstate.edu",         label: "Savannah State University",         endDate: "2026-10-12" },
  { domain: "student.savannahstate.edu", label: "Savannah State University (student)", endDate: "2026-10-12" },
];

function matchingPilot(email) {
  const lower = (email || "").toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  return PILOT_PROGRAMS.find(p => lower.endsWith(`@${p.domain}`) && today <= p.endDate) || null;
}

// Call once, right after a brand-new account is created (signup, first Google
// login, or first Microsoft login). Grants the 'pilot' plan automatically if
// the email matches an active institutional pilot — a distinct tier from
// 'pro', with its own daily caps (see limits.js), not unlimited like a real
// paying subscriber or a manually-whitelisted account.
//
// Intentionally NOT re-checked on every login — an admin may later manually
// change a specific student's plan/access (abuse, upgrade, etc.), and
// re-running this same domain check on every login would silently undo that
// decision. Once granted at signup, plan is fully under normal admin control.
//
// Guarded to only fire when plan is still the default 'free' — never
// downgrades an account that's already 'pro'/'lifetime' (e.g. paid before
// this ran, or was upgraded some other way).
export async function grantPilotAccessOnSignup(userId, email) {
  if (!matchingPilot(email)) return false;
  try {
    const result = await pool.query(
      "UPDATE users SET plan = 'pilot' WHERE id = $1 AND plan = 'free'",
      [userId]
    );
    return result.rowCount > 0;
  } catch (err) {
    console.error("[pilots] failed to grant pilot access:", err.message);
    return false;
  }
}
