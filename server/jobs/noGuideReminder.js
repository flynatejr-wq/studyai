import pool from "../db.js";
import { isEmailConfigured, sendNoGuideReminder } from "../utils/email.js";

// Nudges users who signed up but never created a study guide — the reactive
// reminders in auth.js only fire on login, which never reaches someone who
// signed up and simply didn't come back. Runs on a timer (see index.js)
// instead, so it reaches dormant accounts too.
//
// Window: 24h-7d after signup. The lower bound gives people a real chance to
// try it themselves first; the upper bound stops the job from ever emailing
// very old dormant accounts (e.g. right after this feature ships).
export async function checkNoGuideReminders() {
  if (!isEmailConfigured()) return;

  const { rows: candidates } = await pool.query(`
    SELECT id, email, name
    FROM users
    WHERE guides_created_ever = 0
      AND no_guide_reminder_sent = 0
      AND email_verified = 1
      AND is_banned = 0
      AND created_at <= NOW() - INTERVAL '24 hours'
      AND created_at >= NOW() - INTERVAL '7 days'
    LIMIT 200
  `);

  for (const user of candidates) {
    try {
      await sendNoGuideReminder(user.email, user.name);
      await pool.query("UPDATE users SET no_guide_reminder_sent = 1 WHERE id = $1", [user.id]);
    } catch (err) {
      console.error("[no-guide-reminder] failed for", user.id, err?.message);
    }
  }

  if (candidates.length > 0) {
    console.log(`[no-guide-reminder] sent ${candidates.length} activation reminder(s)`);
  }
}
