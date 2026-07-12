// Shared usage-limit constants — imported by both the /api/tts route (index.js)
// and the /api/progress/limits route (routes/progress.js) so the enforced cap
// and the number shown to the user can never drift apart.

// TTS monthly character quotas. tts-1 runs ~$15/million chars; these bound
// worst-case cost to a small, predictable slice of the flat-price Pro plan
// instead of leaving the one metered-cost feature uncapped.
export const TTS_MONTHLY_CHARS_FREE = 20_000;
export const TTS_MONTHLY_CHARS_PRO  = 150_000;
