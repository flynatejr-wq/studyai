/**
 * fingerprint.js — Lightweight, privacy-conscious browser fingerprinter
 *
 * Collects stable, non-sensitive browser characteristics, hashes them
 * client-side with SHA-256 via SubtleCrypto, and caches the result.
 *
 * The raw characteristics never leave the browser — only the hash is
 * sent to the server in the X-Client-FP header.
 *
 * Characteristics used (all passive, no user interaction required):
 *   • User-agent string
 *   • Browser language
 *   • Timezone
 *   • Screen dimensions + colour depth
 *   • Hardware concurrency (CPU thread count)
 *   • Platform string
 *   • Canvas rendering fingerprint (last 40 chars of data URL)
 *
 * The canvas component catches browser/GPU variation beyond what headers
 * alone provide, making the fingerprint more stable across sessions.
 */

let _cached = null;
let _initPromise = null;

/** Render a small off-screen canvas and return a slice of its data URL */
function canvasSlice() {
  try {
    const c = document.createElement("canvas");
    c.width = 140; c.height = 32;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#6366f1";
    ctx.fillRect(0, 0, 140, 32);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 13px monospace";
    ctx.fillText("SB\u{1F4DA}2025", 4, 20);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(120, 16, 10, 0, Math.PI * 2);
    ctx.stroke();
    // Return the last 40 chars — unique per GPU/driver/platform combination
    return c.toDataURL().slice(-40);
  } catch {
    return "no-canvas";
  }
}

async function computeFingerprint() {
  const parts = [
    navigator.userAgent          || "",
    navigator.language           || "",
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    `${screen.width}x${screen.height}`,
    String(screen.colorDepth     || 0),
    String(navigator.hardwareConcurrency || 0),
    navigator.platform           || "",
    canvasSlice(),
  ];

  const raw = parts.join("|");

  try {
    const buf  = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    // Return 32 hex chars (first 128 bits) — enough entropy, small on the wire
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
  } catch {
    // SubtleCrypto unavailable (e.g. non-HTTPS dev environment) — fall back to
    // a simple djb2 hash so we always return something.
    let h = 5381;
    for (let i = 0; i < raw.length; i++) h = ((h << 5) + h) ^ raw.charCodeAt(i);
    return (h >>> 0).toString(16).padStart(8, "0");
  }
}

/**
 * Initialise fingerprinting on module import (fire-and-forget).
 * By the time the first network request fires (100ms+ after page load),
 * the promise is usually already resolved.
 */
_initPromise = computeFingerprint().then(fp => { _cached = fp; }).catch(() => {});

/**
 * Synchronous getter — returns cached value or null if init hasn't
 * completed yet.  Safe to call from a synchronous headers() function.
 */
export function getFingerprintSync() {
  return _cached;
}

/**
 * Async getter — always resolves (waits for init if needed).
 * Use this where you can afford an await, e.g. on first page load.
 */
export async function getFingerprint() {
  if (_cached) return _cached;
  await _initPromise;
  return _cached;
}
