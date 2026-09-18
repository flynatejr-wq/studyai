import pool from "./db.js";

// Paid institutional site licenses — distinct from PILOT_PROGRAMS (pilots.js).
// A pilot is free and time-boxed to prove the product works; a license is a
// paid contract with its own seat count and term. Add an entry here the day
// a school actually signs, then run convertPilotToLicense() once to move
// their existing pilot-tier students over (see that function's docstring).
export const LICENSED_INSTITUTIONS = [
  // Example — uncomment and fill in once SSU signs:
  // { domain: "savannahstate.edu",         label: "Savannah State University", contractStart: "2026-10-13", contractEnd: "2027-10-12", maxSeats: 3500 },
  // { domain: "student.savannahstate.edu", label: "Savannah State University", contractStart: "2026-10-13", contractEnd: "2027-10-12", maxSeats: 3500 },
];

function matchingLicense(email) {
  const lower = (email || "").toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  return LICENSED_INSTITUTIONS.find(
    l => lower.endsWith(`@${l.domain}`) && today >= l.contractStart && today <= l.contractEnd
  ) || null;
}

function domainsForLabel(label) {
  return LICENSED_INSTITUTIONS.filter(l => l.label === label).map(l => l.domain);
}

async function licenseSeatsUsed(label) {
  const domains = domainsForLabel(label);
  const conditions = domains.map((_, i) => `email ILIKE $${i + 1}`).join(" OR ");
  const params = domains.map(d => `%@${d}`);
  const { rows } = await pool.query(
    `SELECT COUNT(*) as c FROM users WHERE plan = 'licensed' AND (${conditions})`,
    params
  );
  return Number(rows[0].c);
}

// Call once, right after a brand-new account is created (signup, first Google
// login, or first Microsoft login) — same call sites as grantPilotAccessOnSignup,
// and should run BEFORE it, since a licensed institution's students should
// never land on the pilot tier once a paid contract is active for their domain.
// Unlike the pilot tier, 'licensed' is treated as fully unrestricted elsewhere
// in the app (same bucket as 'pro'/'lifetime') — no daily caps, since the
// institution is paying for the seat, not the student.
export async function grantLicenseAccessOnSignup(userId, email) {
  const license = matchingLicense(email);
  if (!license) return false;
  try {
    const domains = domainsForLabel(license.label);
    const conditions = domains.map((_, i) => `email ILIKE $${i + 3}`).join(" OR ");
    const params = domains.map(d => `%@${d}`);
    const result = await pool.query(
      `UPDATE users
       SET plan = 'licensed'
       WHERE id = $1
         AND plan = 'free'
         AND (SELECT COUNT(*) FROM users WHERE plan = 'licensed' AND (${conditions})) < $2`,
      [userId, license.maxSeats, ...params]
    );
    return result.rowCount > 0;
  } catch (err) {
    console.error("[licenses] failed to grant license access:", err.message);
    return false;
  }
}

// Admin-facing seat status — "X / maxSeats" claimed per institution, same
// shape as getPilotSeatStatus() in pilots.js.
export async function getLicenseSeatStatus() {
  const seenLabels = new Set();
  const results = [];
  for (const l of LICENSED_INSTITUTIONS) {
    if (seenLabels.has(l.label)) continue;
    seenLabels.add(l.label);
    const used = await licenseSeatsUsed(l.label);
    results.push({ label: l.label, used, maxSeats: l.maxSeats, contractStart: l.contractStart, contractEnd: l.contractEnd });
  }
  return results;
}

// One-time migration for the day a pilot institution actually signs a paid
// license: moves every existing plan='pilot' student on that institution's
// domain(s) over to plan='licensed', so they don't stay stuck on the pilot
// tier's own (now-irrelevant) rules once the school is a paying customer.
// Call manually (e.g. via a one-off script or an admin route) — this is not
// wired into any request path, since it should only ever run once per signing.
export async function convertPilotToLicense(label) {
  const domains = domainsForLabel(label);
  if (domains.length === 0) throw new Error(`No LICENSED_INSTITUTIONS entry found for label "${label}"`);
  const conditions = domains.map((_, i) => `email ILIKE $${i + 1}`).join(" OR ");
  const params = domains.map(d => `%@${d}`);
  const result = await pool.query(
    `UPDATE users SET plan = 'licensed' WHERE plan = 'pilot' AND (${conditions})`,
    params
  );
  return result.rowCount;
}
