import pool from "./db.js";

// Institutional pilot programs — students with a matching email domain get
// full (whitelisted) access automatically at signup, without a manual admin
// action per student. Adjust endDate to match the real pilot start date.
export const PILOT_PROGRAMS = [
  { domain: "savannahstate.edu", label: "Savannah State University", endDate: "2026-10-12" },
];

function matchingPilot(email) {
  const lower = (email || "").toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  return PILOT_PROGRAMS.find(p => lower.endsWith(`@${p.domain}`) && today <= p.endDate) || null;
}

// Call once, right after a brand-new account is created (signup or first
// Google login). Grants whitelisted (Pro-equivalent) access automatically if
// the email matches an active institutional pilot.
//
// Intentionally NOT re-checked on every login — an admin may later manually
// revoke a specific student's access (abuse, etc.), and re-running this same
// domain check on every login would silently undo that decision. Once
// granted at signup, access is fully under normal admin control from then on.
export async function grantPilotAccessOnSignup(userId, email) {
  if (!matchingPilot(email)) return false;
  try {
    await pool.query("UPDATE users SET is_whitelisted = 1 WHERE id = $1", [userId]);
    return true;
  } catch (err) {
    console.error("[pilots] failed to grant pilot access:", err.message);
    return false;
  }
}
