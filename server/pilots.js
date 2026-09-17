import pool from "./db.js";

// Institutional pilot programs — students with a matching email domain get
// the 'pilot' plan automatically at signup, without a manual admin action
// per student. Adjust endDate to match the real pilot start date.
// maxSeats bounds total enrollment per institution (grouped by label, since
// an institution can list more than one matching domain, e.g. a student
// subdomain) — printed materials advertise a hard seat count, so this must
// actually be enforced, not just a marketing claim.
export const PILOT_PROGRAMS = [
  { domain: "savannahstate.edu",         label: "Savannah State University", endDate: "2026-10-12", maxSeats: 200 },
  { domain: "student.savannahstate.edu", label: "Savannah State University", endDate: "2026-10-12", maxSeats: 200 },
];

function matchingPilot(email) {
  const lower = (email || "").toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  return PILOT_PROGRAMS.find(p => lower.endsWith(`@${p.domain}`) && today <= p.endDate) || null;
}

function domainsForLabel(label) {
  return PILOT_PROGRAMS.filter(p => p.label === label).map(p => p.domain);
}

async function pilotSeatsUsed(label) {
  const domains = domainsForLabel(label);
  const conditions = domains.map((_, i) => `email ILIKE $${i + 1}`).join(" OR ");
  const params = domains.map(d => `%@${d}`);
  const { rows } = await pool.query(
    `SELECT COUNT(*) as c FROM users WHERE plan = 'pilot' AND (${conditions})`,
    params
  );
  return Number(rows[0].c);
}

// Call once, right after a brand-new account is created (signup, first Google
// login, or first Microsoft login). Grants the 'pilot' plan automatically if
// the email matches an active institutional pilot with seats remaining — a
// distinct tier from 'pro', with its own daily caps (see limits.js), not
// unlimited like a real paying subscriber or a manually-whitelisted account.
// If the institution's seat cap has been reached, the account simply stays
// on 'free' rather than being blocked from signing up at all.
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
  const pilot = matchingPilot(email);
  if (!pilot) return false;
  try {
    const domains = domainsForLabel(pilot.label);
    const conditions = domains.map((_, i) => `email ILIKE $${i + 3}`).join(" OR ");
    const params = domains.map(d => `%@${d}`);
    // Seat check happens inside the same UPDATE's WHERE clause so the
    // count-and-grant is as close to atomic as a single statement allows,
    // rather than a separate SELECT that a concurrent signup could race.
    const result = await pool.query(
      `UPDATE users
       SET plan = 'pilot'
       WHERE id = $1
         AND plan = 'free'
         AND (SELECT COUNT(*) FROM users WHERE plan = 'pilot' AND (${conditions})) < $2`,
      [userId, pilot.maxSeats, ...params]
    );
    return result.rowCount > 0;
  } catch (err) {
    console.error("[pilots] failed to grant pilot access:", err.message);
    return false;
  }
}

// Admin-facing seat status — "X / maxSeats" claimed per institution.
export async function getPilotSeatStatus() {
  const seenLabels = new Set();
  const results = [];
  for (const p of PILOT_PROGRAMS) {
    if (seenLabels.has(p.label)) continue;
    seenLabels.add(p.label);
    const used = await pilotSeatsUsed(p.label);
    results.push({ label: p.label, used, maxSeats: p.maxSeats, endDate: p.endDate });
  }
  return results;
}
