/**
 * SplashScreen.jsx — Cinematic startup screen for StudyBuddi
 *
 * Architecture
 * ────────────
 * • Renders as a fixed full-viewport overlay (z-9999) on top of the already-
 *   mounted app — so auth checks and data fetching start in the background
 *   immediately rather than being blocked behind the animation.
 * • AnimatePresence + onExitComplete fires onComplete only after the exit
 *   animation fully finishes, eliminating any flash between splash and app.
 * • finishedRef prevents double-fire from the auto-timer racing with Skip.
 *
 * Animation sequence (~2.65 s total)
 * ────────────────────────────────────
 *   0.12 s  Book fades + scales in
 *   0.40 s  Pages begin opening (CSS 3D rotateY)
 *   0.80 s  Skip button appears
 *   1.30 s  Brand wordmark slides up
 *   1.70 s  Tagline + progress bar animates to full
 *   2.65 s  Exit: opacity→0, scale→1.05, blur→12px (0.55 s)
 *   3.20 s  onComplete fires → splash unmounts
 *
 * Accessibility
 * ─────────────
 * useReducedMotion → instant reveal, 1.2 s hold, fade out.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// ─── Deterministic particles — no Math.random() at render time ────────────────
const PARTICLES = [
  { id:  0, x: 47, size: 3, dur: 2.4, delay: 0.70, drift:  5, rise: 110 },
  { id:  1, x: 53, size: 2, dur: 2.1, delay: 0.90, drift: -8, rise:  90 },
  { id:  2, x: 44, size: 2, dur: 2.7, delay: 1.10, drift:  3, rise: 130 },
  { id:  3, x: 56, size: 4, dur: 2.3, delay: 0.80, drift:-12, rise: 100 },
  { id:  4, x: 50, size: 2, dur: 2.0, delay: 1.30, drift:  7, rise:  85 },
  { id:  5, x: 42, size: 3, dur: 2.6, delay: 0.60, drift: -4, rise: 120 },
  { id:  6, x: 58, size: 2, dur: 2.2, delay: 1.00, drift:  9, rise:  95 },
  { id:  7, x: 49, size: 3, dur: 2.5, delay: 1.40, drift: -6, rise: 115 },
  { id:  8, x: 54, size: 2, dur: 2.8, delay: 0.75, drift: 11, rise: 105 },
  { id:  9, x: 46, size: 2, dur: 2.1, delay: 1.20, drift: -3, rise:  88 },
  { id: 10, x: 61, size: 3, dur: 2.4, delay: 0.95, drift:  6, rise: 125 },
  { id: 11, x: 39, size: 2, dur: 2.6, delay: 1.55, drift:-10, rise:  92 },
  { id: 12, x: 52, size: 4, dur: 2.2, delay: 0.50, drift:  2, rise: 140 },
  { id: 13, x: 43, size: 2, dur: 2.3, delay: 1.65, drift:  8, rise:  98 },
  { id: 14, x: 57, size: 3, dur: 2.7, delay: 1.05, drift: -7, rise: 118 },
];

function particleColor(id) {
  const m = id % 3;
  if (m === 0) return { bg: "rgba(99,102,241,0.75)",  glow: "rgba(99,102,241,0.50)" };
  if (m === 1) return { bg: "rgba(139,92,246,0.65)",  glow: "rgba(139,92,246,0.45)" };
  return           { bg: "rgba(251,191,36,0.55)",  glow: "rgba(251,191,36,0.40)" };
}

// ─── CSS-3D animated book ──────────────────────────────────────────────────────
function Book3D({ isOpen }) {
  return (
    <div
      className="relative select-none"
      style={{ width: 120, height: 156, perspective: "900px", perspectiveOrigin: "50% 40%" }}
      aria-hidden="true"
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          filter: "blur(36px)",
          background: "radial-gradient(ellipse, rgba(99,102,241,0.55) 0%, rgba(139,92,246,0.28) 42%, transparent 70%)",
          zIndex: 0,
        }}
        animate={isOpen ? { opacity: 1, scale: 2.1 } : { opacity: 0.2, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.35 }}
      />

      {/* Hard cover */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "linear-gradient(150deg, #3730a3 0%, #4c1d95 60%, #2e1065 100%)",
          boxShadow: "0 28px 72px rgba(99,102,241,0.40), 0 8px 24px rgba(0,0,0,0.75)",
          zIndex: 1,
        }}
      />

      {/* Page-stack edges */}
      <div className="absolute rounded-2xl"
        style={{ top: 5, left: 7, right: 7, bottom: 1, background: "linear-gradient(to bottom, #c7d2fe, #a5b4fc)", zIndex: 2 }} />
      <div className="absolute rounded-2xl"
        style={{ top: 3, left: 8, right: 8, bottom: 2, background: "linear-gradient(to bottom, #e0e7ff, #ddd6fe)", zIndex: 3 }} />

      {/* Inner "knowledge" light */}
      <motion.div
        className="absolute rounded-2xl overflow-hidden"
        style={{ top: 6, left: 8, right: 8, bottom: 2, zIndex: 4 }}
        initial={{ opacity: 0 }}
        animate={isOpen ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
      >
        <div style={{
          width: "100%", height: "100%",
          background: "radial-gradient(ellipse at 50% 38%, rgba(255,255,255,0.96) 0%, rgba(199,210,254,0.82) 32%, rgba(167,139,250,0.38) 62%, transparent 88%)",
        }} />
      </motion.div>

      {/* Left page — swings left on right-edge pivot */}
      <motion.div
        className="absolute rounded-l-2xl overflow-hidden"
        style={{
          top: 6, left: 8, bottom: 2,
          width: "calc(50% - 2px)",
          transformOrigin: "right center",
          transformStyle: "preserve-3d",
          background: "linear-gradient(135deg, #eef2ff 0%, #ddd6fe 100%)",
          zIndex: 5,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
        animate={isOpen ? { rotateY: -162 } : { rotateY: 0 }}
        transition={{ duration: 0.96, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="p-3 pt-5 space-y-1.5">
          {[72, 85, 60, 78, 65, 82, 55, 70, 48].map((w, i) => (
            <div key={i} className="rounded-full" style={{ height: 3, width: `${w}%`, background: "rgba(99,102,241,0.22)" }} />
          ))}
        </div>
        <div className="absolute right-0 inset-y-0 w-6"
          style={{ background: "linear-gradient(to left, rgba(79,46,229,0.28), transparent)" }} />
      </motion.div>

      {/* Right page — swings right on left-edge pivot */}
      <motion.div
        className="absolute rounded-r-2xl overflow-hidden"
        style={{
          top: 6, right: 8, bottom: 2,
          width: "calc(50% - 2px)",
          transformOrigin: "left center",
          transformStyle: "preserve-3d",
          background: "linear-gradient(225deg, #eef2ff 0%, #ddd6fe 100%)",
          zIndex: 5,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
        animate={isOpen ? { rotateY: 162 } : { rotateY: 0 }}
        transition={{ duration: 0.96, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="p-3 pt-5 space-y-1.5">
          {[65, 80, 70, 75, 85, 58, 73, 62, 50].map((w, i) => (
            <div key={i} className="rounded-full" style={{ height: 3, width: `${w}%`, background: "rgba(124,58,237,0.20)" }} />
          ))}
        </div>
        <div className="absolute left-0 inset-y-0 w-6"
          style={{ background: "linear-gradient(to right, rgba(79,46,229,0.28), transparent)" }} />
      </motion.div>

      {/* Spine */}
      <div
        className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: 10,
          background: "linear-gradient(to bottom, #4338ca, #6d28d9)",
          zIndex: 10,
          boxShadow: "0 0 18px rgba(99,102,241,0.65), inset 0 1px 0 rgba(255,255,255,0.18)",
        }}
      />

      {/* Gold spark — springs onto the spine after pages open */}
      <motion.div
        className="absolute z-20 flex items-center justify-center"
        style={{ top: "11%", left: "50%", transform: "translateX(-50%)" }}
        initial={{ opacity: 0, scale: 0, rotate: -24 }}
        animate={isOpen ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0, rotate: -24 }}
        transition={{ duration: 0.45, delay: 1.05, type: "spring", stiffness: 190, damping: 13 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L14.2 8.2L20.8 8.2L15.4 12.1L17.6 18.2L12 14.3L6.4 18.2L8.6 12.1L3.2 8.2L9.8 8.2Z"
            fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.6" strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      {/* Cover corner glint */}
      <div
        className="absolute top-0 left-0 w-12 h-12 pointer-events-none rounded-tl-2xl"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)", zIndex: 12 }}
      />
    </div>
  );
}

// ─── Logo mark ────────────────────────────────────────────────────────────────
function BrandMark({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sb-splash-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#sb-splash-grad)" />
      <rect x="8"  y="9"  width="7" height="14" rx="1.5" fill="rgba(255,255,255,0.9)" />
      <rect x="17" y="9"  width="7" height="14" rx="1.5" fill="rgba(255,255,255,0.6)" />
      <rect x="15" y="9"  width="2" height="14" rx="1"   fill="rgba(255,255,255,0.4)" />
      <path
        d="M20.5 7L21.5 9L23.5 8L22 10L24 11L21.5 11L21.5 13L20.5 11L18.5 12L20 10L18 9L20.5 9Z"
        fill="#fbbf24" opacity="0.9"
      />
    </svg>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SplashScreen({ onComplete }) {
  const prefersReduced = useReducedMotion();

  const [bookOpen,    setBookOpen]    = useState(false);
  const [showBrand,   setShowBrand]   = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showSkip,    setShowSkip]    = useState(false);
  const [exiting,     setExiting]     = useState(false);

  // Prevent double-fire from timer + skip racing
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);
    // onComplete fires via AnimatePresence onExitComplete — no setTimeout needed
  };

  useEffect(() => {
    // ── Reduced-motion path: instant reveal, 1.2 s hold ──
    if (prefersReduced) {
      setBookOpen(true); setShowBrand(true); setShowTagline(true);
      const t = setTimeout(finish, 1200);
      return () => clearTimeout(t);
    }

    // ── Full animation sequence ──
    const timers = [
      setTimeout(() => setBookOpen(true),     400),
      setTimeout(() => setShowSkip(true),     800),
      setTimeout(() => setShowBrand(true),   1300),
      setTimeout(() => setShowTagline(true), 1700),
      setTimeout(finish,                     2650),
    ];
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence onExitComplete={() => onComplete?.()}>
      {!exiting && (
        <motion.div
          key="sb-splash"
          role="status"
          aria-label="Loading StudyBuddi"
          className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "#080810",
            zIndex: 9999,
            willChange: "opacity, transform, filter",
          }}
          // Exit: fade + slight zoom + blur — app is already rendered beneath
          exit={{
            opacity: 0,
            scale: 1.05,
            filter: "blur(12px)",
            transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
          }}
        >
          {/* ── Deep background radial glow ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.2 }}
            style={{
              background:
                "radial-gradient(ellipse 72% 56% at 50% 52%, rgba(67,56,202,0.22) 0%, rgba(109,40,217,0.10) 46%, transparent 76%)",
            }}
          />

          {/* ── Subtle grid overlay ── */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.018,
              backgroundImage:
                "linear-gradient(rgba(99,102,241,0.9) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(99,102,241,0.9) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />

          {/* ── Floating particles ── */}
          {!prefersReduced && PARTICLES.map(p => {
            const c = particleColor(p.id);
            return (
              <motion.div
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left:   `${p.x}%`,
                  bottom: "48%",
                  width:  p.size,
                  height: p.size,
                  background: c.bg,
                  boxShadow:  `0 0 ${p.size * 4}px ${c.glow}`,
                  willChange: "transform, opacity",
                }}
                initial={{ opacity: 0, y: 0, x: 0 }}
                animate={{ opacity: [0, 0.85, 0.6, 0], y: -p.rise, x: p.drift }}
                transition={{
                  duration:    p.dur,
                  delay:       p.delay,
                  ease:        "easeOut",
                  repeat:      Infinity,
                  repeatDelay: 0.9 + (p.id * 0.13) % 1.0,
                }}
              />
            );
          })}

          {/* ── Book ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.78, y: 12 }}
            animate={{ opacity: 1,  scale: 1,    y: 0  }}
            transition={{ duration: 0.68, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: "transform, opacity" }}
          >
            <Book3D isOpen={bookOpen} />
          </motion.div>

          {/* ── Brand wordmark ── */}
          <motion.div
            className="flex items-center gap-3 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showBrand ? 1 : 0, y: showBrand ? 0 : 20 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: "transform, opacity" }}
          >
            <BrandMark size={38} />
            <div>
              <span className="block text-2xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                StudyBuddi
              </span>
              <motion.span
                className="block text-xs text-indigo-400 font-semibold mt-0.5 leading-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: showTagline ? 1 : 0 }}
                transition={{ duration: 0.45 }}
              >
                AI Study Assistant
              </motion.span>
            </div>
          </motion.div>

          {/* ── Progress bar ── */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 overflow-hidden rounded-full"
            style={{ width: 144, height: 2, background: "rgba(255,255,255,0.06)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: showBrand ? 0.9 : 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: showBrand ? 1 : 0 }}
              style={{ originX: 0 }}
              transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>

          {/* ── Skip button ── */}
          <motion.button
            className="absolute top-5 right-5 text-xs text-gray-600 hover:text-gray-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 min-h-[36px]"
            style={{ touchAction: "manipulation" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: showSkip ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            onClick={finish}
            aria-label="Skip intro"
          >
            Skip
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
