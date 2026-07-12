// Shared usage-limit constants — imported by both the /api/tts route (index.js)
// and the /api/progress/limits route (routes/progress.js) so the enforced cap
// and the number shown to the user can never drift apart.

// TTS monthly character quotas. tts-1 runs ~$15/million chars; these bound
// worst-case cost to a small, predictable slice of the flat-price Pro plan
// instead of leaving the one metered-cost feature uncapped.
export const TTS_MONTHLY_CHARS_FREE = 20_000;
export const TTS_MONTHLY_CHARS_PRO  = 150_000;
// Pilot accounts (free institutional access, e.g. SSU) reuse the Pro voice
// quota — it was already sized with margin in mind, no need for a third tier.
export const TTS_MONTHLY_CHARS_PILOT = TTS_MONTHLY_CHARS_PRO;

// Pilot plan daily caps — generous enough that genuine studying never hits
// them, tight enough to bound worst-case cost on an account that pays
// StudyBuddi nothing directly (unlike a real Pro subscriber, whose cost is
// offset by their own subscription revenue).
export const PILOT_GUIDES_PER_DAY = 15;
export const PILOT_QUIZZES_PER_DAY = 30;
// Matches the existing safety cap already applied to paying Pro subscribers —
// pilot accounts shouldn't be *less* restricted than customers who pay you.
export const PILOT_CHAT_PER_DAY = 50;
