import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageCircle, X, Send, RotateCcw, Trophy,
  ChevronDown, ChevronUp, Zap, RefreshCw, ChevronLeft,
  ChevronRight, CheckCircle, XCircle, Clock, BarChart2,
  Share2, Printer, Check, Link2Off, BookOpen, List,
  Star, Target, Eye, EyeOff, Circle, CheckSquare, Brain, Crown,
  Volume2, VolumeX, Timer, PenLine,
} from "lucide-react";
import { api, getToken } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import RichText from "../components/RichText.jsx";
import ChatMessage from "../components/ChatMessage.jsx";
import UpgradeModal from "../components/UpgradeModal.jsx";
import { useLimits } from "../hooks/useLimits.js";

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

// ── Study Timer ───────────────────────────────────────────────────────────────
function useStudyTimer(guideId) {
  // startRef is initialised once at mount; NOT reset inside the effect so
  // React Strict Mode's double-invocation doesn't reset the clock to zero.
  const startRef = useRef(Date.now());
  useEffect(() => {
    // Only reset the clock when guideId actually changes (navigation between guides)
    startRef.current = Date.now();
    return () => {
      const secs = Math.floor((Date.now() - startRef.current) / 1000);
      const token = getToken();
      if (secs < 10 || !guideId || !token) return; // don't fire if logged out
      fetch(`${API_BASE}/guides/${guideId}/session`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ duration_seconds: secs }),
      }).catch(() => {});
    };
  }, [guideId]);
}

// ── Flashcard Mode ────────────────────────────────────────────────────────────
function FlashcardMode({ terms }) {
  const [deck, setDeck] = useState(() => terms.map((_, i) => i)); // index order
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [unknown, setUnknown] = useState(new Set());
  const [shuffled, setShuffled] = useState(false);
  const touchStartX = useRef(null);

  const idx = deck[pos];
  const card = terms[idx];
  const total = terms.length;
  const done = known.size + unknown.size === total;

  const shuffle = () => {
    const newDeck = [...deck].sort(() => Math.random() - 0.5);
    setDeck(newDeck); setPos(0); setFlipped(false);
    setKnown(new Set()); setUnknown(new Set());
    setShuffled(true);
  };
  const unShuffle = () => {
    setDeck(terms.map((_, i) => i)); setPos(0); setFlipped(false);
    setKnown(new Set()); setUnknown(new Set());
    setShuffled(false);
  };

  const mark = (correct) => {
    if (correct) setKnown(s => new Set([...s, idx]));
    else setUnknown(s => new Set([...s, idx]));
    setFlipped(false);
    setTimeout(() => setPos(p => (p + 1) % total), 150);
  };
  const reset = () => { setPos(0); setFlipped(false); setKnown(new Set()); setUnknown(new Set()); };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) { setPos(p => (p + 1) % total); setFlipped(false); }
    else           { setPos(p => (p - 1 + total) % total); setFlipped(false); }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { setPos(p => (p + 1) % total); setFlipped(false); }
    if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   { setPos(p => (p - 1 + total) % total); setFlipped(false); }
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped(f => !f); }
  }, [total]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col items-center gap-5 py-2"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Controls row */}
      <div className="flex items-center justify-between w-full max-w-lg gap-3">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-xs font-bold">✓ {known.size}</span>
          <span className="text-gray-600 text-xs">·</span>
          <span className="text-red-400 text-xs font-bold">✗ {unknown.size}</span>
        </div>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden mx-2">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${((known.size + unknown.size) / total) * 100}%` }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">{pos + 1}/{total}</span>
          <button
            onClick={shuffled ? unShuffle : shuffle}
            title={shuffled ? "Restore order" : "Shuffle cards"}
            className={`p-1.5 rounded-lg transition-all text-xs ${shuffled ? "bg-indigo-600/30 border border-indigo-500/40 text-indigo-300" : "bg-white/5 border border-white/10 text-gray-500 hover:text-white"}`}>
            🔀
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-600 -mt-2 select-none pointer-events-none sm:hidden">
        ← swipe · tap to flip · ←→ keys →
      </p>
      <p className="text-xs text-gray-600 -mt-2 select-none pointer-events-none hidden sm:block">
        ← → arrow keys to navigate · Space to flip
      </p>

      {done ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white/5 border border-white/10 rounded-2xl p-10 w-full max-w-lg">
          <div className="text-5xl mb-4">{known.size === total ? "🏆" : known.size >= total * 0.7 ? "⭐" : "💪"}</div>
          <p className="text-2xl font-bold text-white mb-1">{known.size}/{total} cards known</p>
          <p className="text-gray-400 mb-2">{known.size === total ? "Perfect! You know all of them!" : `${unknown.size} card${unknown.size !== 1 ? "s" : ""} to review.`}</p>
          {shuffled && <p className="text-indigo-400 text-xs mb-5">🔀 Shuffle mode was on</p>}
          <div className="flex items-center justify-center gap-3 mt-5">
            <button onClick={reset}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-all">
              <RotateCcw size={14} /> Restart
            </button>
            {unknown.size > 0 && (
              <button onClick={() => {
                const reviewDeck = [...unknown];
                setDeck(reviewDeck); setPos(0);
                setKnown(new Set()); setUnknown(new Set()); setFlipped(false);
              }}
                className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 rounded-xl font-semibold text-sm transition-all">
                Review {unknown.size} missed
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <>
          {/* Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${pos}-${idx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg cursor-pointer"
              onClick={() => setFlipped(f => !f)}
              style={{ perspective: "1000px" }}>
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                style={{ transformStyle: "preserve-3d", WebkitTransformStyle: "preserve-3d", position: "relative", minHeight: "clamp(180px, 40vw, 260px)" }}>
                {/* Front */}
                <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", willChange: "transform", position: "absolute", inset: 0, minHeight: "clamp(180px, 40vw, 260px)" }}
                  className="bg-gradient-to-br from-indigo-600/30 to-violet-600/20 border border-indigo-500/40 rounded-2xl flex flex-col items-center justify-center px-5 sm:px-8 py-6 sm:py-8 text-center">
                  <p className="text-indigo-400/70 text-[10px] uppercase tracking-widest mb-3 font-bold">Term</p>
                  <p className="text-white text-lg sm:text-2xl font-bold leading-snug">{card.term}</p>
                  <p className="text-indigo-400/60 text-xs mt-4 flex items-center gap-1.5">
                    <span>Tap to reveal</span>
                    <span className="w-1 h-1 bg-indigo-500/40 rounded-full" />
                    <span>Space bar</span>
                  </p>
                </div>
                {/* Back */}
                <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", willChange: "transform", transform: "rotateY(180deg)", WebkitTransform: "rotateY(180deg)", position: "absolute", inset: 0, minHeight: "clamp(180px, 40vw, 260px)" }}
                  className="bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/40 rounded-2xl flex flex-col items-center justify-center px-5 sm:px-8 py-6 sm:py-8 text-center overflow-y-auto">
                  <p className="text-violet-400/70 text-[10px] uppercase tracking-widest mb-3 font-bold">Definition</p>
                  <p className="text-white text-sm sm:text-lg leading-relaxed">{card.definition}</p>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap justify-center w-full max-w-lg">
            <button onClick={() => { setPos(p => (p - 1 + total) % total); setFlipped(false); }}
              aria-label="Previous card"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/8 min-h-[44px] min-w-[44px]">
              <ChevronLeft size={20} />
            </button>

            {flipped ? (
              <>
                <button onClick={() => mark(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 rounded-xl font-semibold text-sm transition-all min-h-[44px] flex-1 sm:flex-none">
                  <XCircle size={15} /> Still learning
                </button>
                <button onClick={() => mark(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25 rounded-xl font-semibold text-sm transition-all min-h-[44px] flex-1 sm:flex-none">
                  <CheckCircle size={15} /> Got it!
                </button>
              </>
            ) : (
              <button onClick={() => setFlipped(true)}
                className="px-8 py-3 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 rounded-xl font-semibold text-sm transition-all min-h-[44px] flex-1 sm:flex-none">
                Flip Card
              </button>
            )}

            <button onClick={() => { setPos(p => (p + 1) % total); setFlipped(false); }}
              aria-label="Next card"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/8 min-h-[44px] min-w-[44px]">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Mini dot indicators */}
          <div className="flex gap-1.5 mt-1">
            {deck.slice(Math.max(0, pos - 4), Math.min(total, pos + 5)).map((di, si) => {
              const realPos = Math.max(0, pos - 4) + si;
              const termIdx = deck[realPos];
              const isKnown = known.has(termIdx);
              const isUnknown = unknown.has(termIdx);
              return (
                <div key={realPos}
                  className={`rounded-full transition-all ${realPos === pos ? "w-4 h-2 bg-indigo-400" : isKnown ? "w-2 h-2 bg-green-500/60" : isUnknown ? "w-2 h-2 bg-red-500/60" : "w-2 h-2 bg-white/15"}`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Mind Map Mode ─────────────────────────────────────────────────────────────
function MindMapMode({ guide }) {
  const [tooltip, setTooltip] = useState(null);
  const title = guide.title || "Guide";
  const sections = (guide.sections || []).slice(0, 8);
  const flatTerms = guide.key_terms || [];
  const hasSections = sections.length > 0;

  const cx = 450, cy = 340;
  const sectionR = sections.length <= 3 ? 160 : 178;
  const termR = 72;
  const PAD = 90;

  const nodes = hasSections
    ? sections.map((s, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / sections.length;
        return {
          x: cx + sectionR * Math.cos(angle),
          y: cy + sectionR * Math.sin(angle),
          angle,
          label: s.title,
          terms: (s.terms || []).slice(0, 3).map(t => t.term),
          overview: s.overview,
        };
      })
    : flatTerms.slice(0, 10).map((t, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.min(flatTerms.length, 10);
        return {
          x: cx + sectionR * Math.cos(angle),
          y: cy + sectionR * Math.sin(angle),
          angle,
          label: t.term,
          terms: [],
          overview: t.definition,
        };
      });

  // Compute tight viewBox so nothing clips
  let minX = cx - 68, maxX = cx + 68, minY = cy - 68, maxY = cy + 68;
  nodes.forEach(n => {
    minX = Math.min(minX, n.x - 48); maxX = Math.max(maxX, n.x + 48);
    minY = Math.min(minY, n.y - 48); maxY = Math.max(maxY, n.y + 48);
    const count = n.terms.length;
    n.terms.forEach((_, j) => {
      const ta = n.angle + (j - (count - 1) / 2) * 0.42;
      const tx = n.x + termR * Math.cos(ta);
      const ty = n.y + termR * Math.sin(ta);
      minX = Math.min(minX, tx - 42); maxX = Math.max(maxX, tx + 42);
      minY = Math.min(minY, ty - 14); maxY = Math.max(maxY, ty + 14);
    });
  });
  const vx = minX - PAD, vy = minY - PAD;
  const vw = maxX - minX + PAD * 2, vh = maxY - minY + PAD * 2;

  const short = (s, max) => (!s ? "" : s.length > max ? s.slice(0, max - 1) + "…" : s);

  // Split label into up to 2 lines for section nodes
  const splitLabel = (s, maxChars = 12) => {
    if (!s) return [""];
    if (s.length <= maxChars) return [s];
    const mid = s.lastIndexOf(" ", maxChars);
    if (mid > 0) return [s.slice(0, mid), short(s.slice(mid + 1), maxChars)];
    return [short(s, maxChars)];
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-white">🗺️ Mind Map</h2>
        <p className="text-gray-500 text-xs">{hasSections ? `${sections.length} sections` : `${flatTerms.length} concepts`} — hover to preview</p>
      </div>
      <div className="overflow-auto">
        <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} style={{ width: "100%", minWidth: 480, minHeight: 320 }} className="select-none">
          {/* Lines: center → section */}
          {nodes.map((n, i) => (
            <line key={`cl-${i}`} x1={cx} y1={cy} x2={n.x} y2={n.y}
              stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.35" />
          ))}
          {/* Lines + term chips: section → terms */}
          {nodes.map((n, i) =>
            n.terms.map((term, j) => {
              const count = n.terms.length;
              const ta = n.angle + (j - (count - 1) / 2) * 0.42;
              const tx = n.x + termR * Math.cos(ta);
              const ty = n.y + termR * Math.sin(ta);
              return (
                <g key={`t-${i}-${j}`}>
                  <line x1={n.x} y1={n.y} x2={tx} y2={ty} stroke="#818cf8" strokeWidth="1" strokeOpacity="0.25" />
                  <rect x={tx - 38} y={ty - 12} width="76" height="24" rx="6"
                    fill="#312e81" fillOpacity="0.6" stroke="#6366f1" strokeOpacity="0.3" strokeWidth="1" />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                    fill="#c7d2fe" fontSize="10" fontFamily="Helvetica,Arial,sans-serif">
                    {short(term, 14)}
                  </text>
                </g>
              );
            })
          )}
          {/* Section nodes */}
          {nodes.map((n, i) => {
            const lines = splitLabel(n.label);
            const lineH = 13;
            const totalH = lines.length * lineH;
            const hasTermCount = n.terms.length > 0;
            const labelStartY = n.y - totalH / 2 - (hasTermCount ? 5 : 0);
            return (
              <g key={`n-${i}`} style={{ cursor: "pointer" }}
                onMouseEnter={() => setTooltip({ x: n.x, y: n.y, text: n.label, sub: n.overview })}
                onMouseLeave={() => setTooltip(null)}>
                <circle cx={n.x} cy={n.y} r={44} fill="#4338ca" fillOpacity="0.25" stroke="#6366f1" strokeWidth="1.5" />
                {lines.map((line, li) => (
                  <text key={li} x={n.x} y={labelStartY + li * lineH + lineH / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize="11" fontWeight="600" fontFamily="Helvetica,Arial,sans-serif">
                    {line}
                  </text>
                ))}
                {hasTermCount && (
                  <text x={n.x} y={n.y + totalH / 2 + (hasTermCount ? 8 : 0)}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#a5b4fc" fontSize="9" fontFamily="Helvetica,Arial,sans-serif">
                    {n.terms.length} term{n.terms.length !== 1 ? "s" : ""}
                  </text>
                )}
              </g>
            );
          })}
          {/* Center node */}
          <circle cx={cx} cy={cy} r={70} fill="#4f46e5" fillOpacity="0.35" stroke="#818cf8" strokeWidth="2" />
          {(() => {
            const words = title.split(" ");
            const lines = [];
            let cur = "";
            words.forEach(w => {
              if ((cur + " " + w).trim().length > 14) { lines.push(cur.trim()); cur = w; }
              else cur = (cur + " " + w).trim();
            });
            if (cur) lines.push(cur);
            const display = lines.slice(0, 3);
            const lineH = 15;
            const startY = cy - ((display.length - 1) * lineH) / 2 - (hasSections ? 8 : 0);
            return (
              <>
                {display.map((l, i) => (
                  <text key={i} x={cx} y={startY + i * lineH} textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize="12" fontWeight="bold" fontFamily="Helvetica,Arial,sans-serif">
                    {l}
                  </text>
                ))}
                <text x={cx} y={startY + display.length * lineH} textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.5)" fontSize="9.5" fontFamily="Helvetica,Arial,sans-serif">
                  {hasSections ? `${sections.length} sections` : `${flatTerms.length} concepts`}
                </text>
              </>
            );
          })()}
          {/* Hover tooltip */}
          {tooltip && (() => {
            const ttW = 180, ttH = 64;
            const tx = Math.min(Math.max(tooltip.x - ttW / 2, vx + 4), vx + vw - ttW - 4);
            const ty = tooltip.y - 52 > vy ? tooltip.y - ttH - 8 : tooltip.y + 52;
            const sub = tooltip.sub?.replace(/<[^>]+>/g, "").slice(0, 70);
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect x={tx} y={ty} width={ttW} height={sub ? ttH : 38} rx="8"
                  fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" fillOpacity="0.97" />
                <text x={tx + ttW / 2} y={ty + (sub ? 18 : 20)} textAnchor="middle"
                  fill="white" fontSize="11" fontWeight="bold" fontFamily="Helvetica,Arial,sans-serif">
                  {short(tooltip.text, 24)}
                </text>
                {sub && (
                  <text x={tx + ttW / 2} y={ty + 40} textAnchor="middle"
                    fill="#9ca3af" fontSize="9.5" fontFamily="Helvetica,Arial,sans-serif">
                    {short(sub, 40)}
                  </text>
                )}
              </g>
            );
          })()}
        </svg>
      </div>
      {!hasSections && (
        <p className="text-gray-600 text-xs text-center mt-1">Generate a guide with "Detailed" format to see richer section branches</p>
      )}
    </div>
  );
}

// ── Read Aloud Button ─────────────────────────────────────────────────────────
const TTS_VOICES = [
  { id: "nova",    label: "Nova",    desc: "Warm, friendly female" },
  { id: "alloy",   label: "Alloy",   desc: "Neutral, balanced" },
  { id: "echo",    label: "Echo",    desc: "Deep, clear male" },
  { id: "fable",   label: "Fable",   desc: "Expressive, storytelling" },
  { id: "onyx",    label: "Onyx",    desc: "Rich, authoritative male" },
  { id: "shimmer", label: "Shimmer", desc: "Soft, gentle female" },
];

function ReadAloudButton({ guide, studyMode }) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem("tts-voice-ai") || "nova");
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  useEffect(() => { stop(); }, [studyMode]); // eslint-disable-line

  useEffect(() => () => stop(), []);

  const getText = () => {
    if (studyMode === "notes") {
      const summary = (guide.summary || []).join(" ");
      const terms = (guide.key_terms || []).slice(0, 10).map(t => `${t.term}: ${t.definition}`).join(". ");
      return `${guide.title}. ${summary}. Key terms: ${terms}`;
    }
    if (studyMode === "sections" && guide.sections?.length > 0) {
      return guide.sections.map(s => {
        const parts = [s.title, s.overview?.replace(/<[^>]+>/g, "") || "", (s.keyPoints || []).slice(0, 3).join(". ")];
        return parts.filter(Boolean).join(". ");
      }).join(". Next section: ");
    }
    return `${guide.title}. ${(guide.summary || []).join(" ")}`;
  };

  const stop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSpeaking(false); setLoading(false);
  };

  const toggle = async () => {
    if (speaking || loading) { stop(); return; }
    const text = getText().slice(0, 4000);
    if (!text) return;
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); stop(); };
      audio.onerror = () => { URL.revokeObjectURL(url); stop(); };
      await audio.play();
      setSpeaking(true);
    } catch { stop(); }
    finally { setLoading(false); }
  };

  const pickVoice = async (id) => {
    setSelectedVoice(id);
    localStorage.setItem("tts-voice-ai", id);
    setShowPicker(false);
    // Quick preview
    stop();
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: "Hi, I'm your StudyBuddi voice. How does this sound?", voice: id }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); stop(); };
      audio.onerror = () => stop();
      await audio.play();
      setSpeaking(true);
    } catch { stop(); }
    finally { setLoading(false); }
  };

  const active = speaking || loading;

  return (
    <div className="relative print:hidden" ref={pickerRef}>
      <div className="flex items-center">
        <button onClick={toggle}
          title={active ? "Stop" : "Listen with AI voice"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg font-medium text-xs transition-all ${
            active ? "bg-indigo-600 text-white border border-indigo-500" : "bg-white/5 border border-white/10 text-gray-300 hover:border-indigo-500/40"
          }`}>
          {loading ? <span className="animate-spin inline-block text-[11px]">⏳</span> : active ? <VolumeX size={13} /> : <Volume2 size={13} />}
          <span className="hidden sm:inline">{loading ? "Loading…" : active ? "Stop" : "Listen"}</span>
        </button>
        <button onClick={() => setShowPicker(p => !p)} title="Choose voice"
          className={`flex items-center px-1.5 py-1.5 rounded-r-lg text-xs transition-all ${
            showPicker ? "bg-indigo-600/40 border border-indigo-500 text-indigo-300" : "bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:border-indigo-500/40"
          }`}>
          <ChevronDown size={12} />
        </button>
      </div>

      {showPicker && (
        <div className="absolute right-0 top-9 z-50 bg-[#1a1830] border border-white/15 rounded-xl shadow-2xl p-2 w-64">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider px-2 pb-2">AI Voice — click to preview</p>
          {TTS_VOICES.map(v => (
            <button key={v.id} onClick={() => pickVoice(v.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between gap-2 ${
                selectedVoice === v.id ? "bg-indigo-600/30 text-white" : "text-gray-300 hover:bg-white/8 hover:text-white"
              }`}>
              <div>
                <span className="font-semibold">{v.label}</span>
                <span className="text-gray-500 ml-2">{v.desc}</span>
              </div>
              {selectedVoice === v.id && <Check size={12} className="text-indigo-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-Section Listen Button ─────────────────────────────────────────────────
function SectionListenButton({ section }) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading]   = useState(false);
  const audioRef = useRef(null);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const stop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSpeaking(false); setLoading(false);
  };

  const toggle = async () => {
    if (speaking || loading) { stop(); return; }
    const strip = (s) => (s || "").replace(/<[^>]+>/g, "");
    const parts = [
      section.title,
      strip(section.overview),
      (section.content || []).map(strip).join(" "),
      (section.keyPoints || []).length > 0 ? "Key points: " + section.keyPoints.map(p => strip(p)).join(". ") : "",
    ].filter(Boolean);
    const text = parts.join(". ").slice(0, 4096);
    if (!text) return;
    setLoading(true);
    try {
      const voice = localStorage.getItem("tts-voice-ai") || "nova";
      const token = getToken();
      const res = await fetch(`${API_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); stop(); };
      audio.onerror = () => { URL.revokeObjectURL(url); stop(); };
      await audio.play();
      setSpeaking(true);
    } catch { stop(); }
    finally { setLoading(false); }
  };

  const active = speaking || loading;
  return (
    <button onClick={toggle}
      title={active ? "Stop" : "Listen to this section"}
      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all print:hidden ${
        active ? "bg-indigo-600 text-white border border-indigo-500" : "bg-white/5 border border-white/10 text-gray-400 hover:border-indigo-500/40 hover:text-white"
      }`}>
      {loading ? <span className="animate-spin text-[11px]">⏳</span> : active ? <VolumeX size={13} /> : <Volume2 size={13} />}
      <span>{loading ? "Loading…" : active ? "Stop" : "Listen"}</span>
    </button>
  );
}

// ── Pomodoro Timer ────────────────────────────────────────────────────────────
function PomodoroTimer() {
  const FOCUS = 25 * 60, BREAK = 5 * 60;
  const [remaining, setRemaining] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("focus");
  const [cycles, setCycles] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r > 1) return r - 1;
        clearInterval(intervalRef.current);
        setRunning(false);
        if (phase === "focus") { setCycles(c => c + 1); setPhase("break"); return BREAK; }
        setPhase("focus"); return FOCUS;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase]);

  const reset = () => { clearInterval(intervalRef.current); setRunning(false); setPhase("focus"); setCycles(0); setRemaining(FOCUS); };

  const total = phase === "focus" ? FOCUS : BREAK;
  const pct = Math.round(((total - remaining) / total) * 100);
  const m = Math.floor(remaining / 60), s = remaining % 60;
  const display = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const focusColor = "#6366f1", breakColor = "#10b981";
  const color = phase === "focus" ? focusColor : breakColor;

  if (collapsed) return (
    <button onClick={() => setCollapsed(false)}
      className="fixed bottom-6 right-4 md:right-6 z-40 print:hidden flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border shadow-lg transition-all"
      style={{ background: `${color}22`, borderColor: `${color}66`, color: "white" }}>
      <Timer size={13} style={{ color }} />
      {display}
      {running && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
    </button>
  );

  return (
    <div className="fixed bottom-6 right-4 md:right-6 z-40 print:hidden shadow-2xl shadow-black/50">
      <div className="bg-[#13111f] border border-white/10 rounded-2xl p-4 w-52">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Timer size={13} style={{ color }} />
            <span className="text-xs font-bold" style={{ color }}>{phase === "focus" ? "Focus" : "Break"}</span>
            {cycles > 0 && <span className="text-gray-600 text-xs">#{cycles}</span>}
          </div>
          <button onClick={() => setCollapsed(true)} className="text-gray-600 hover:text-white transition-colors text-sm leading-none">–</button>
        </div>
        <div className="flex items-center justify-center my-2">
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="38" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="6" />
            <circle cx="45" cy="45" r="38" fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 38}`}
              strokeDashoffset={`${2 * Math.PI * 38 * (1 - pct / 100)}`}
              strokeLinecap="round" transform="rotate(-90 45 45)"
              style={{ transition: "stroke-dashoffset 1s linear" }} />
            <text x="45" y="40" textAnchor="middle" fill="white" fontSize="17" fontWeight="bold" fontFamily="monospace">{display}</text>
            <text x="45" y="56" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="Helvetica,Arial,sans-serif">
              {phase === "focus" ? "stay focused" : "take a break"}
            </text>
          </svg>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRunning(r => !r)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={running ? { background: "rgba(255,255,255,0.08)", color: "#d1d5db" } : { background: color, color: "white" }}>
            {running ? "Pause" : "Start"}
          </button>
          <button onClick={reset} className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Writing Prompts Mode ──────────────────────────────────────────────────────
function WritingPromptsMode({ guideId }) {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const { prompts: ps } = await api.guides.writingPrompts(guideId);
      setPrompts(ps || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const copy = async (text, i) => {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    setCopied(i); setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-1">✍️ Writing Prompts</h3>
        <p className="text-gray-400 text-sm mb-4">
          AI-generated essay prompts to deepen your understanding. Writing about what you learned is one of the most powerful retention techniques.
        </p>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white font-semibold text-sm transition-all">
          {loading ? <><span className="animate-spin inline-block">⏳</span> Generating…</> : <><PenLine size={15} /> Generate Prompts</>}
        </button>
      </div>

      {prompts.length > 0 && (
        <div className="flex flex-col gap-3">
          {prompts.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xs font-bold mt-0.5">{i + 1}</span>
                  <p className="text-gray-200 text-sm leading-relaxed">{p}</p>
                </div>
                <button onClick={() => copy(p, i)} title="Copy prompt"
                  className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                  {copied === i ? <Check size={13} className="text-green-400" /> : <CheckSquare size={13} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Teach-It-Back Mode ────────────────────────────────────────────────────────
function TeachBackMode({ guideId }) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (input.trim().length < 30) { setError("Write at least a few sentences to get meaningful feedback."); return; }
    setLoading(true); setError("");
    try {
      const result = await api.guides.teachBack(guideId, input.trim());
      setFeedback(result);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const score = feedback?.score ?? 0;
  const gradeColor = score >= 8 ? "text-green-400" : score >= 6 ? "text-yellow-400" : score >= 4 ? "text-orange-400" : "text-red-400";
  const gradeBg = score >= 8 ? "bg-green-500/10 border-green-500/20" : score >= 6 ? "bg-yellow-500/10 border-yellow-500/20" : score >= 4 ? "bg-orange-500/10 border-orange-500/20" : "bg-red-500/10 border-red-500/20";
  const barColor = score >= 8 ? "bg-green-500" : score >= 6 ? "bg-yellow-500" : score >= 4 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-1">🧠 Teach It Back</h3>
        <p className="text-gray-400 text-sm mb-4">
          The best way to learn is to teach. Explain what you learned from this guide in your own words — as if teaching it to a friend who knows nothing about it. AI will evaluate your understanding.
        </p>
        <textarea
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Start explaining what you learned… (aim for 3–5 sentences covering the main concepts)"
          rows={6}
          className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed" />
        <div className="flex items-center justify-between mt-3">
          <p className={`text-xs ${input.length < 30 ? "text-gray-600" : "text-gray-400"}`}>
            {input.length} chars{input.length < 30 && input.length > 0 ? " — write a bit more" : ""}
          </p>
          <button onClick={submit} disabled={loading || input.trim().length < 30}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-white font-semibold text-sm transition-all">
            {loading ? <><span className="animate-spin inline-block">⏳</span> Evaluating…</> : <><Brain size={15} /> Get Feedback</>}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className={`border rounded-2xl p-5 ${gradeBg}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`text-2xl font-black ${gradeColor}`}>{feedback.grade}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{feedback.encouragement}</p>
                </div>
                <div className={`text-4xl font-black ${gradeColor}`}>{feedback.score}/10</div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score * 10}%`, transition: "width 1s ease" }} />
              </div>
            </div>

            {feedback.strengths?.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
                <p className="text-green-400 font-bold text-sm mb-3">✓ What you got right</p>
                <ul className="space-y-2">
                  {feedback.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                      <CheckCircle size={14} className="text-green-400 shrink-0 mt-0.5" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.gaps?.length > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5">
                <p className="text-orange-400 font-bold text-sm mb-3">⚡ What to review</p>
                <ul className="space-y-2">
                  {feedback.gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                      <Target size={14} className="text-orange-400 shrink-0 mt-0.5" /> {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={() => { setFeedback(null); setInput(""); }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-gray-300 text-sm transition-all">
              <RotateCcw size={14} /> Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MCQ Question Renderer ─────────────────────────────────────────────────────
function MCQQuestion({ q, answered, onAnswer }) {
  if (!q?.question || !Array.isArray(q?.options)) return null;
  // onAnswer being undefined means the quiz is submitted (locked) — show correct/wrong colors.
  // onAnswer being defined means still in progress — show selection highlight only.
  const isLocked   = !onAnswer;
  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
      <p className="text-white font-medium mb-4">{q.question}</p>
      <div className="flex flex-col gap-2">
        {q.options.map((opt, oi) => {
          const isSelected    = answered === oi;
          const isCorrect     = isLocked && oi === q.correctIndex;
          const isWrong       = isLocked && isSelected && oi !== q.correctIndex;
          const isPreSelected = !isLocked && isSelected;
          return (
            <button key={oi}
              onClick={() => !isLocked && onAnswer && onAnswer(oi)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border
                ${isCorrect     ? "bg-green-500/20 border-green-500/50 text-green-400"
                : isWrong       ? "bg-red-500/20 border-red-500/50 text-red-400"
                : isPreSelected ? "bg-indigo-600/30 border-indigo-500 text-white"
                : "bg-white/5 border-white/10 text-gray-300 hover:bg-indigo-600/20 hover:border-indigo-500 hover:text-white"}`}>
              <span className="mr-2 font-bold">{["A","B","C","D"][oi]}.</span>{opt}
            </button>
          );
        })}
      </div>
      {isLocked && answered != null && q.explanation && (
        <p className="text-gray-400 text-xs mt-3">{q.explanation}</p>
      )}
    </div>
  );
}

// ── True/False Question Renderer ─────────────────────────────────────────────
function TrueFalseQuestion({ q, answered, onAnswer }) {
  if (!q?.statement) return null;
  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
      <p className="text-white font-medium mb-4">{q.statement}</p>
      {answered == null ? (
        <div className="flex gap-3">
          <button onClick={() => onAnswer(true)}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-green-600/20 text-green-400 hover:bg-green-600/40 border border-green-600/30 transition-all">
            ✓ True
          </button>
          <button onClick={() => onAnswer(false)}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 border border-red-600/30 transition-all">
            ✗ False
          </button>
        </div>
      ) : (
        <div className={`rounded-xl p-3 text-sm ${answered === q.answer ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {answered === q.answer ? "✓ Correct!" : `✗ Incorrect — answer is ${q.answer ? "True" : "False"}`}
          {q.explanation && <p className="text-gray-400 mt-1 text-xs">{q.explanation}</p>}
        </div>
      )}
    </div>
  );
}

// ── Fill in the Blank Question Renderer ──────────────────────────────────────
function FillBlankQuestion({ q, answered, onAnswer }) {
  if (!q?.sentence || q?.answer == null) return null;
  const [input, setInput] = useState("");
  useEffect(() => { if (answered == null) setInput(""); }, [answered]);
  const isCorrect = answered != null && answered.trim().toLowerCase() === q.answer.toLowerCase();

  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
      <p className="text-white font-medium mb-1">
        {q.sentence.replace("___", "________")}
      </p>
      <p className="text-gray-500 text-xs mb-4">Hint: {q.hint}</p>
      {answered == null ? (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && onAnswer(input.trim())}
            placeholder="Type your answer..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={() => input.trim() && onAnswer(input.trim())}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-semibold transition-all">
            Check
          </button>
        </div>
      ) : (
        <div className={`rounded-xl p-3 text-sm ${isCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {isCorrect ? "✓ Correct!" : `✗ The answer is: ${q.answer}`}
        </div>
      )}
    </div>
  );
}

// ── Unified Quiz Mode ─────────────────────────────────────────────────────────
const QUIZ_TYPES = [
  { id: "mcq",            label: "🎯 Multiple Choice", desc: "4 options per question" },
  { id: "true-false",     label: "✅ True / False",    desc: "Quick true or false" },
  { id: "fill-blank",     label: "✏️ Fill in the Blank", desc: "Type the missing word" },
  { id: "adaptive-mixed", label: "🧠 Adaptive",        desc: "Mixed types, repeats wrong answers" },
];

function UnifiedQuizMode({ guideId, onXpEarned }) {
  const [quizType, setQuizType]     = useState("mcq");
  const [count, setCount]           = useState(10);
  const [phase, setPhase]           = useState("setup");
  const [questions, setQuestions]   = useState([]);
  const [answers, setAnswers]       = useState({});
  const [submitted, setSubmitted]   = useState(false);
  const [score, setScore]           = useState(0);
  const [error, setError]           = useState("");
  const [queue, setQueue]           = useState([]);
  const [queuePos, setQueuePos]     = useState(0);
  const [mastered, setMastered]     = useState(new Set());
  const [round, setRound]           = useState(1);
  const [finalScore, setFinalScore] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState(null);
  const firstPassRef                = useRef(0);
  const roundBreakTimer             = useRef(null);
  const { refreshUser }             = useAuth();

  useEffect(() => () => { if (roundBreakTimer.current) clearTimeout(roundBreakTimer.current); }, []);

  const isAdaptive   = quizType === "adaptive-mixed";
  const countOptions = quizType === "true-false" ? [5, 10, 15, 20, 25, 30] : [5, 10, 15, 20];

  const reset = () => {
    setPhase("setup"); setQuestions([]); setAnswers({}); setSubmitted(false); setScore(0);
    setQueue([]); setQueuePos(0); setMastered(new Set()); setRound(1); setFinalScore(0);
    firstPassRef.current = 0; setPendingAnswer(null);
  };

  const generate = async () => {
    setPhase("loading"); setError("");
    try {
      const { questions: qs } = await api.guides.generateQuiz(guideId, count, quizType);
      const allQs = Array.isArray(qs) ? qs : [];
      if (allQs.length === 0) {
        setError("No questions could be generated. Please try again.");
        setPhase("setup");
        return;
      }
      setQuestions(allQs);
      if (isAdaptive) {
        setQueue(allQs.map((_, i) => i));
        setQueuePos(0); setMastered(new Set()); firstPassRef.current = 0; setRound(1);
      } else {
        setAnswers({}); setSubmitted(false); setScore(0);
      }
      setPhase("question");
    } catch (e) { setError(e.message); setPhase("setup"); }
  };

  const checkCorrect = (q, answer) => {
    const type = isAdaptive ? q.type : quizType;
    if (type === "mcq")        return answer === q.correctIndex;
    if (type === "true-false") return answer === q.answer;
    if (type === "fill-blank") return typeof answer === "string" && answer.trim().toLowerCase() === q.answer.toLowerCase();
    return false;
  };

  const submit = async () => {
    const correct = questions.filter((q, i) => checkCorrect(q, answers[i])).length;
    setScore(correct); setSubmitted(true);
    try { await api.guides.submitQuiz(guideId, correct, questions.length); await refreshUser(); onXpEarned(correct * 10); } catch (_) {}
  };

  const currentQIdx = phase === "question" && isAdaptive ? queue[queuePos] : null;
  const currentQ    = currentQIdx != null ? questions[currentQIdx] : null;

  const handleAdaptiveAnswer = (answer) => {
    if (!currentQ || pendingAnswer != null) return;
    setPendingAnswer(answer);
    setTimeout(async () => {
      setPendingAnswer(null);
      const correct = checkCorrect(currentQ, answer);
      const newMastered = new Set(mastered);
      if (correct) { newMastered.add(currentQIdx); if (round === 1) firstPassRef.current++; }
      setMastered(newMastered);

      if (queuePos < queue.length - 1) {
        setQueuePos(p => p + 1);
      } else {
        const nextQueue = questions.map((_, i) => i).filter(i => !newMastered.has(i));
        if (nextQueue.length === 0) {
          const fp = firstPassRef.current;
          setFinalScore(fp);
          try { await api.guides.submitQuiz(guideId, fp, questions.length); await refreshUser(); onXpEarned(fp * 10); } catch (_) {}
          setPhase("done");
        } else {
          setQueue(nextQueue); setQueuePos(0); setRound(r => r + 1); setPhase("roundbreak");
          roundBreakTimer.current = setTimeout(() => setPhase("question"), 2500);
        }
      }
    }, 1000);
  };

  if (phase === "setup" || phase === "loading") return (
    <div className="flex flex-col gap-6 py-6">
      <div className="grid grid-cols-2 gap-3">
        {QUIZ_TYPES.map(t => (
          <button key={t.id} onClick={() => { setQuizType(t.id); reset(); }}
            className={`p-3 rounded-xl text-left transition-all border ${quizType === t.id ? "bg-indigo-600/30 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
            <div className="font-semibold text-sm">{t.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-gray-400 text-sm">Questions:</span>
        {countOptions.map(n => (
          <button key={n} onClick={() => setCount(n)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${count === n ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>{n}</button>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={generate} disabled={phase === "loading"}
        className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-xl text-white font-bold transition-all">
        {phase === "loading" ? <><span className="animate-spin inline-block">⏳</span> Generating…</> : <><Zap size={16} /> Start Quiz</>}
      </button>
    </div>
  );

  if (phase === "roundbreak") return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="text-5xl">🔄</div>
      <p className="text-white font-bold text-xl">Round {round}</p>
      <p className="text-gray-400 text-sm">Reviewing the ones you missed…</p>
      <div className="flex items-center gap-3 text-sm mt-2">
        <span className="text-green-400 font-medium">✓ {mastered.size} mastered</span>
        <span className="text-gray-500">·</span>
        <span className="text-orange-400 font-medium">{questions.length - mastered.size} remaining</span>
      </div>
    </motion.div>
  );

  if (phase === "question" && isAdaptive && currentQ) {
    const type = currentQ.type;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Q {queuePos + 1} / {queue.length} · Round {round}</span>
          <span>{mastered.size} mastered</span>
        </div>
        {type === "mcq"        && <MCQQuestion      q={currentQ} answered={pendingAnswer} onAnswer={pendingAnswer == null ? handleAdaptiveAnswer : undefined} />}
        {type === "true-false" && <TrueFalseQuestion q={currentQ} answered={pendingAnswer} onAnswer={pendingAnswer == null ? handleAdaptiveAnswer : undefined} />}
        {type === "fill-blank" && <FillBlankQuestion q={currentQ} answered={pendingAnswer} onAnswer={pendingAnswer == null ? handleAdaptiveAnswer : undefined} />}
      </div>
    );
  }

  if (phase === "done") return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="text-5xl">🏁</div>
      <p className="text-white font-bold text-2xl">All mastered!</p>
      <p className="text-gray-400 text-sm">First-pass score: {finalScore} / {questions.length}</p>
      <button onClick={reset} className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-all">
        Try Again
      </button>
    </motion.div>
  );

  if (phase === "question") return (
    <div className="flex flex-col gap-4">
      {submitted && (
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <p className="text-white font-bold text-xl">{score} / {questions.length}</p>
          <p className="text-gray-400 text-sm">{questions.length ? Math.round(score / questions.length * 100) : 0}% correct</p>
          <button onClick={reset} className="mt-3 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-semibold transition-all">
            New Quiz
          </button>
        </div>
      )}
      {questions.map((q, i) => (
        <div key={i}>
          {quizType === "mcq"        && <MCQQuestion      q={q} answered={answers[i] ?? null} onAnswer={!submitted ? (v) => setAnswers(a => ({ ...a, [i]: v })) : undefined} />}
          {quizType === "true-false" && <TrueFalseQuestion q={q} answered={submitted ? answers[i] ?? null : null} onAnswer={!submitted ? (v) => setAnswers(a => ({ ...a, [i]: v })) : undefined} />}
          {quizType === "fill-blank" && <FillBlankQuestion q={q} answered={submitted ? answers[i] ?? null : null} onAnswer={!submitted ? (v) => setAnswers(a => ({ ...a, [i]: v })) : undefined} />}
        </div>
      ))}
      {!submitted && (
        <button onClick={submit}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 rounded-xl text-white font-bold transition-all">
          Submit Quiz
        </button>
      )}
    </div>
  );

  return null;
}

// ── Quiz History Sparkline ────────────────────────────────────────────────────
function QuizHistoryBar({ attempts }) {
  if (!attempts?.length) return null;
  return (
    <div className="flex items-end gap-1">
      {attempts.slice(-10).map((a, i) => {
        const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
        const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
        return <div key={i} title={`${pct}%`} className={`w-4 ${color} rounded-sm`} style={{ height: `${Math.max(4, pct * 0.4)}px` }} />;
      })}
    </div>
  );
}

// ── Share Button ──────────────────────────────────────────────────────────────
function ShareButton({ guideId, initialToken }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(!!initialToken);

  const share = async () => {
    setLoading(true);
    try {
      const { token } = await api.guides.share(guideId);
      const url = `${window.location.origin}/share/${token}`;
      setShared(true);

      // Use the native Share sheet on mobile (iOS/Android) — no clipboard permission needed.
      // Fall back to clipboard copy on desktop or when Web Share API is unavailable.
      if (navigator.share) {
        await navigator.share({ title: "StudyBuddi guide", url });
        toast({ message: "Share link ready!", type: "success" });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast({ message: "Share link copied to clipboard!", type: "success" });
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      // navigator.share throws AbortError when the user dismisses the share sheet — that's fine
      if (err?.name === "AbortError") return;
      toast({ message: "Could not generate share link.", type: "error" });
    }
    finally { setLoading(false); }
  };
  const revoke = async () => {
    setLoading(true);
    try { await api.guides.revokeShare(guideId); setShared(false); toast({ message: "Share link revoked.", type: "success" }); }
    catch { toast({ message: "Could not revoke share link.", type: "error" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center gap-1">
      <button onClick={share} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-lg text-gray-400 hover:text-white text-xs font-medium transition-all disabled:opacity-50">
        {copied ? <Check size={13} className="text-green-400" /> : <Share2 size={13} />}
        {copied ? "Copied!" : "Share"}
      </button>
      {shared && (
        <button onClick={revoke} disabled={loading} title="Revoke share link" className="flex items-center gap-1 px-2 py-1.5 bg-white/5 border border-white/10 hover:border-red-500/40 rounded-lg text-gray-500 hover:text-red-400 text-xs transition-all disabled:opacity-50">
          <Link2Off size={12} />
        </button>
      )}
    </div>
  );
}

// ── Section Quiz (mini per-section quiz) ──────────────────────────────────────
function SectionQuiz({ questions }) {
  const [revealed, setRevealed] = useState({});
  const [marked, setMarked] = useState({});

  if (!questions?.length) return null;

  const allMarked = questions.every((_, i) => marked[i]);
  const score = questions.filter((_, i) => marked[i] === "correct").length;

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="border border-white/10 rounded-xl p-4">
          <p className="text-white font-medium text-sm mb-3">{i + 1}. {q.question}</p>
          {!revealed[i] ? (
            <button onClick={() => setRevealed(r => ({ ...r, [i]: true }))}
              className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-2 transition-colors">
              <Eye size={13} /> Show answer
            </button>
          ) : (
            <div>
              <div className="text-gray-300 text-sm bg-white/5 rounded-lg px-3 py-2.5 mb-3 leading-relaxed">
                <RichText html={q.answer} className="rich-text-sm" />
              </div>
              {!marked[i] ? (
                <div className="flex gap-2">
                  <button onClick={() => setMarked(m => ({ ...m, [i]: "correct" }))}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-semibold transition-colors">
                    <CheckCircle size={13} /> Got it
                  </button>
                  <button onClick={() => setMarked(m => ({ ...m, [i]: "wrong" }))}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-semibold transition-colors">
                    <XCircle size={13} /> Still learning
                  </button>
                </div>
              ) : (
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${marked[i] === "correct" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {marked[i] === "correct" ? <><CheckCircle size={12} /> Marked correct</> : <><XCircle size={12} /> Marked for review</>}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
      {allMarked && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 text-center ${score === questions.length ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
          <p className="text-white font-bold">{score === questions.length ? "🎉 Perfect section score!" : `${score}/${questions.length} correct`}</p>
          <p className="text-gray-400 text-sm mt-1">{score === questions.length ? "You're ready to move on." : "Review the content above, then mark this section complete when ready."}</p>
        </motion.div>
      )}
    </div>
  );
}

// ── Section Detail View ───────────────────────────────────────────────────────
function SectionDetail({ section, index, total, isComplete, onMarkComplete, onPrev, onNext, hideTerms }) {
  const [termFlipped, setTermFlipped] = useState({});
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0 && index < total - 1) onNext();   // swipe left → next section
    else if (delta > 0 && index > 0) onPrev();       // swipe right → prev section
  };

  return (
    <motion.div key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      className="space-y-5">

      {/* Section header */}
      <div className="space-y-2">
        {/* Navigation row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={index === 0}
              className="p-1.5 rounded-lg bg-white/8 border border-white/10 hover:bg-indigo-600/30 hover:border-indigo-500/50 disabled:opacity-25 disabled:cursor-not-allowed transition-all text-gray-300 hover:text-white"
              aria-label="Previous section">
              <ChevronLeft size={16} />
            </button>
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              Section {index + 1} of {total}
            </p>
            <button
              onClick={onNext}
              disabled={index === total - 1}
              className="p-1.5 rounded-lg bg-white/8 border border-white/10 hover:bg-indigo-600/30 hover:border-indigo-500/50 disabled:opacity-25 disabled:cursor-not-allowed transition-all text-gray-300 hover:text-white"
              aria-label="Next section">
              <ChevronRight size={16} />
            </button>
          </div>
          {isComplete && (
            <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-xs font-semibold">
              <CheckCircle size={13} /> Complete
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">{section.title}</h2>
          <SectionListenButton section={section} />
        </div>
      </div>

      {/* Overview */}
      {section.overview && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5">
          <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">Overview</p>
          <RichText html={section.overview} className="text-gray-200 leading-relaxed" />
        </div>
      )}

      {/* Deep Dive content */}
      {section.content?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-indigo-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Notes</h3>
          </div>
          <div className="space-y-1">
            {section.content.map((para, i) => (
              <RichText key={i} html={para} />
            ))}
          </div>
        </div>
      )}

      {/* Key Points */}
      {section.keyPoints?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star size={15} className="text-yellow-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Key Points</h3>
          </div>
          <ul className="space-y-3">
            {section.keyPoints.map((pt, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mt-0.5">
                  <span className="text-yellow-400 text-xs font-bold">{i + 1}</span>
                </span>
                <span className="text-gray-200 text-sm leading-relaxed">{typeof pt === "string" ? pt.replace(/<[^>]+>/g, "") : pt}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Terms */}
      {!hideTerms && section.terms?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={15} className="text-violet-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Key Terms</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.terms.map((t, i) => (
              <button key={i} onClick={() => setTermFlipped(f => ({ ...f, [i]: !f[i] }))}
                className="text-left bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/50 rounded-xl p-4 transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-indigo-300 text-sm">{t.term}</p>
                  {termFlipped[i]
                    ? <EyeOff size={12} className="text-gray-500 shrink-0 mt-0.5" />
                    : <Eye size={12} className="text-gray-500 shrink-0 mt-0.5 group-hover:text-indigo-400" />}
                </div>
                <AnimatePresence>
                  {termFlipped[i] && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-gray-400 text-xs mt-2 leading-relaxed border-t border-indigo-500/20 pt-2">
                      <RichText html={t.definition} className="rich-text-sm" />
                    </motion.p>
                  )}
                </AnimatePresence>
                {!termFlipped[i] && <p className="text-gray-600 text-xs mt-1">Tap to reveal definition</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section Quiz */}
      {section.quiz?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={15} className="text-green-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Section Quiz</h3>
            <span className="text-gray-500 text-xs">{section.quiz.length} question{section.quiz.length !== 1 ? "s" : ""}</span>
          </div>
          <SectionQuiz questions={section.quiz} />
        </div>
      )}

      {/* Navigation */}
      <div className="pt-2 pb-6 space-y-3">
        {/* Mark complete — full width on mobile */}
        {!isComplete ? (
          <button onClick={onMarkComplete}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-green-900/30">
            <CheckCircle size={16} /> Mark Section Complete
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 font-bold text-sm">
            <CheckCircle size={16} /> Section Completed
          </div>
        )}
        {/* Prev / Next */}
        <div className="flex gap-3">
          <button onClick={onPrev} disabled={index === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-gray-300 hover:text-white text-sm font-medium transition-all">
            <ChevronLeft size={16} /> Previous
          </button>
          <button onClick={onNext} disabled={index === total - 1}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-gray-300 hover:text-white text-sm font-medium transition-all">
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Sections Mode ─────────────────────────────────────────────────────────────
function SectionsMode({ guide, guideId, onProgressUpdate, hideTerms }) {
  const sections = guide.sections || [];
  const [progress, setProgress] = useState(
    Array.isArray(guide.section_progress) && guide.section_progress.length === sections.length
      ? guide.section_progress
      : sections.map(() => false)
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [listOpen, setListOpen] = useState(true);
  const completedCount = progress.filter(Boolean).length;

  const markComplete = useCallback(async () => {
    const next = progress.map((v, i) => (i === activeIdx ? true : v));
    setProgress(next);
    try {
      await api.guides.updateSectionProgress(guideId, next);
      onProgressUpdate?.(next);
    } catch (_) {}
    // Auto-advance to next incomplete section
    const nextIncomplete = next.findIndex((v, i) => i > activeIdx && !v);
    if (nextIncomplete !== -1) setTimeout(() => setActiveIdx(nextIncomplete), 400);
  }, [activeIdx, progress, guideId, onProgressUpdate]);

  if (sections.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-white mb-1">No sections yet</p>
        <p className="text-sm">Generate a new guide to get in-depth sectioned content.</p>
      </div>
    );
  }

  const pct = Math.round((completedCount / sections.length) * 100);

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">
            {completedCount === sections.length
              ? "🎉 All sections complete!"
              : `${completedCount} of ${sections.length} sections complete`}
          </p>
          <span className={`text-sm font-bold ${pct === 100 ? "text-green-400" : "text-indigo-400"}`}>{pct}%</span>
        </div>
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
        </div>

        {/* Section pills — horizontally scrollable on mobile */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {sections.map((s, i) => (
            <button key={i} onClick={() => setActiveIdx(i)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                i === activeIdx
                  ? "bg-indigo-600 text-white"
                  : progress[i]
                    ? "bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}>
              {progress[i] ? <CheckCircle size={11} /> : <Circle size={11} />}
              {i + 1}. {s.title.length > 18 ? s.title.slice(0, 18) + "…" : s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Section detail */}
      <SectionDetail
        key={activeIdx}
        section={sections[activeIdx]}
        index={activeIdx}
        total={sections.length}
        isComplete={progress[activeIdx]}
        onMarkComplete={markComplete}
        onPrev={() => setActiveIdx(i => Math.max(0, i - 1))}
        onNext={() => setActiveIdx(i => Math.min(sections.length - 1, i + 1))}
        hideTerms={hideTerms}
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GuideView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, refreshUser } = useAuth();
  const toast = useToast();
  const { limits, isPro, refresh: refreshLimits } = useLimits();
  const [guide, setGuide] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [studyMode, setStudyMode] = useState(null); // null = not yet decided
  const [expandedTerms, setExpandedTerms] = useState(true);
  const [activeQuestions, setActiveQuestions] = useState(null);
  const [quizCount, setQuizCount] = useState(10);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [flipped, setFlipped] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizHistory, setQuizHistory] = useState([]);
  const [xpToast, setXpToast] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [upgradeOpen, setUpgradeOpen]   = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const chatEndRef = useRef(null);
  const xpTimerRef = useRef(null);

  useStudyTimer(id);

  // loadChat must be defined before the useEffect that lists it as a dependency
  const loadChat = useCallback(async () => {
    try { const msgs = await api.chat.history(id); setMessages(Array.isArray(msgs) ? msgs : []); } catch (_) {}
  }, [id]);

  useEffect(() => {
    loadGuide();
    api.guides.quizHistory(id).then(h => setQuizHistory(Array.isArray(h) ? h : [])).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (showChat && messages.length === 0) loadChat();
  }, [showChat, loadChat]); // messages intentionally omitted — loading once on open is correct behaviour

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { if (xpTimerRef.current) clearTimeout(xpTimerRef.current); };
  }, []);

  // Set default mode once guide loads; studyMode in deps prevents resetting after user picks a tab
  useEffect(() => {
    if (guide && studyMode === null) {
      setStudyMode(guide.sections?.length > 0 ? "sections" : "notes");
    }
  }, [guide, studyMode]);

  async function loadGuide() {
    try { const g = await api.guides.get(id); setGuide(g); }
    catch (err) { setLoadError(err.message || "Could not load this guide."); }
  }
  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput; setChatInput("");
    // BUG-5: Store the temp ID so we can roll back by ID, not by content
    // (content match would remove duplicate messages with the same text)
    const tempId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: tempId, role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const reply = await api.chat.send(id, msg);
      setMessages(prev => [...prev, reply]);
      refreshLimits(); // update the usage counter
    } catch (err) {
      const errMsg = err?.message || "";
      if (errMsg.includes("FREE_LIMIT_CHAT")) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setChatInput(msg);
        setUpgradeReason("FREE_LIMIT_CHAT");
        setUpgradeOpen(true);
      } else {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Sorry, couldn't respond. Try again." }]);
      }
    } finally { setChatLoading(false); }
  };
  const showXpToast = useCallback((xp) => {
    if (xpTimerRef.current) clearTimeout(xpTimerRef.current);
    setXpToast(xp);
    xpTimerRef.current = setTimeout(() => setXpToast(null), 3000);
  }, []);
  const resetQuiz = () => { setQuizAnswers({}); setQuizSubmitted(false); setScore(0); setFlipped({}); };
  const generateQuiz = async () => {
    // Bug 7 fix: don't clear current quiz answers until AI responds successfully
    setGeneratingQuiz(true); setQuizError("");
    try {
      const { questions } = await api.guides.generateQuiz(id, quizCount, "self-grade");
      resetQuiz(); // only reset AFTER we have new questions
      setActiveQuestions(Array.isArray(questions) ? questions : []);
    }
    catch (e) {
      if (e.message === "FREE_LIMIT_QUIZZES" || (e.message || "").includes("FREE_LIMIT")) {
        setUpgradeReason("FREE_LIMIT_QUIZZES"); setUpgradeOpen(true);
      } else {
        setQuizError(e.message);
      }
    } finally { setGeneratingQuiz(false); }
  };
  const submitQuiz = async () => {
    const questions = activeQuestions || guide.quiz_questions || [];
    const correct = questions.filter((_, i) => quizAnswers[i] === "correct").length;
    setScore(correct); setQuizSubmitted(true);
    try {
      await api.guides.submitQuiz(id, correct, questions.length);
      await refreshUser(); showXpToast(correct * 10);
      const history = await api.guides.quizHistory(id); setQuizHistory(history);
      await loadGuide();
    } catch (_) {}
  };

  // Error / loading states
  if (loadError) return (
    <div className="flex min-h-dvh bg-[#0a0a12] w-full">
      <Sidebar onLogout={logout} />
      <main className="flex-1 min-w-0 md:ml-64 flex items-center justify-center p-8 main-pt-snug">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-bold text-white mb-2">Guide not found</h2>
          <p className="text-gray-400 text-sm mb-6">{loadError}</p>
          <button onClick={() => navigate("/dashboard")} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors">
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );

  if (!guide || studyMode === null) return (
    <div className="flex min-h-dvh bg-[#0a0a12] w-full items-center justify-center">
      <div className="text-indigo-400 animate-pulse text-lg">Loading guide...</div>
    </div>
  );

  // Per-format display rules — only hides static content sections, never AI-generated quiz tabs.
  // MCQ, Adaptive, and Self-Grade are generated fresh on demand and available for every format.
  const FORMAT_HIDE = {
    bullets: { terms: true },   // bullets = no key terms (content only)
    // brief / terms / guide / detailed: show everything
  };
  const hide = FORMAT_HIDE[guide.format] || {};

  const questions = activeQuestions || guide.quiz_questions || [];
  const terms = hide.terms ? [] : (guide.key_terms || []);
  const hasSections = guide.sections?.length > 0;

  const MODES = [
    ...(hasSections ? [{ id: "sections", label: "📚 Sections", desc: `${guide.sections.length} sections` }] : []),
    { id: "notes",      label: "📝 Notes",          desc: "Summary & key terms" },
    ...(terms.length > 0 ? [{ id: "flashcards", label: "🃏 Flashcards", desc: `${terms.length} key terms` }] : []),
    { id: "unified-quiz",    label: "🧩 Quiz",           desc: "Multiple choice, T/F, fill in the blank, adaptive" },
    { id: "mind-map",        label: "🗺️ Mind Map",       desc: "Visual concept map" },
    { id: "writing-prompts", label: "✍️ Write",          desc: "AI-generated essay prompts" },
    { id: "teach-back",      label: "🧠 Teach It Back",  desc: "Explain what you learned, get AI feedback" },
  ];

  return (
    <div className="flex min-h-dvh bg-[#0a0a12] w-full">
      <Sidebar onLogout={logout} />

      <main className={`flex-1 min-w-0 md:ml-64 transition-[margin] main-pt-snug ${showChat ? "md:mr-96" : ""}`}>
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full min-w-0">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
            <ArrowLeft size={16} /> Back
          </button>

          {/* Title row */}
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight mb-3">{guide.title}</h1>

            {/* Meta + action buttons — wrap naturally, never overflow */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-500 text-xs mr-1">
                {new Date(guide.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              {guide.best_quiz_score > 0 && guide.quiz_questions?.length > 0 && (
                <span className="flex items-center gap-1 text-yellow-400 text-xs font-medium">
                  <Trophy size={11} /> {guide.best_quiz_score}/{guide.quiz_questions.length} ({Math.round(guide.best_quiz_score / guide.quiz_questions.length * 100)}%)
                </span>
              )}
              {quizHistory.length > 1 && (
                <div className="flex items-center gap-1">
                  <BarChart2 size={11} className="text-gray-500" />
                  <QuizHistoryBar attempts={[...quizHistory].reverse()} />
                </div>
              )}

              {/* Spacer pushes buttons to the right when there's room */}
              <div className="flex-1" />

              <ShareButton guideId={id} initialToken={guide.share_token} />
              <ReadAloudButton guide={guide} studyMode={studyMode} />
              <button
                onClick={() => {
                  if (!isPro) { setUpgradeReason("FREE_LIMIT_EXPORT"); setUpgradeOpen(true); return; }
                  window.print();
                }}
                title={isPro ? "Print / Save as PDF" : "Pro feature — upgrade to print"}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-lg text-gray-400 hover:text-white text-xs font-medium transition-all print:hidden">
                <Printer size={13} /> {isPro ? "Print" : <><Crown size={11} className="text-amber-400" /> Print</>}
              </button>
              <button onClick={() => setShowChat(!showChat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all print:hidden ${showChat ? "bg-indigo-600 text-white" : "bg-white/5 border border-white/10 text-gray-300 hover:border-indigo-500/40"}`}>
                <MessageCircle size={13} />
                <span className="hidden xs:inline">AI Tutor</span>
                <span className="xs:hidden">Chat</span>
              </button>
            </div>
          </div>

          {/* Mode Tabs — horizontally scrollable on mobile.
              shrink-0 + min-w-max: each button is at least its content width,
              won't shrink. No flex-1 — that conflicted with min-w-max inside
              an overflow-x:auto container and widened the parent layout. */}
          <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-6 overflow-x-auto scrollbar-hide print:hidden">
            {MODES.map(m => (
              <button key={m.id} onClick={() => { setStudyMode(m.id); resetQuiz(); }}
                className={`shrink-0 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap min-w-max min-h-[40px] ${studyMode === m.id ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* XP Toast */}
          <AnimatePresence>
            {xpToast !== null && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl px-4 py-3 mb-4 text-indigo-300 font-semibold text-sm print:hidden">
                <Zap size={15} className="text-indigo-400" /> +{xpToast} XP earned!
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── SECTIONS MODE ── */}
          {studyMode === "sections" && (
            <SectionsMode guide={guide} guideId={id} onProgressUpdate={(next) => setGuide(g => ({ ...g, section_progress: next }))} hideTerms={!!hide.terms} />
          )}

          {/* ── NOTES MODE ── */}
          {studyMode === "notes" && (
            <>
              <section className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5 print:border-gray-300 print:bg-white print:text-black">
                <h2 className="text-base font-bold text-white mb-4 print:text-black">📝 Summary</h2>
                <ul className="space-y-2">
                  {(guide.summary || []).map((point, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }} className="flex items-start gap-3 text-gray-300 print:text-gray-800">
                      <span className="text-indigo-400 mt-0.5 shrink-0 print:text-indigo-600">•</span>
                      <span className="leading-relaxed text-sm">{typeof point === "string" ? point.replace(/<[^>]+>/g, "") : point}</span>
                    </motion.li>
                  ))}
                </ul>
              </section>

              <section className="bg-white/5 border border-white/10 rounded-2xl p-6 print:border-gray-300 print:bg-white">
                <button className="w-full flex items-center justify-between text-base font-bold text-white print:hidden"
                  onClick={() => setExpandedTerms(!expandedTerms)}>
                  <span>🔑 Key Terms</span>
                  {expandedTerms ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                <h2 className="hidden print:block text-base font-bold text-black mb-4">🔑 Key Terms</h2>
                <AnimatePresence>
                  {expandedTerms && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {terms.map((item, i) => (
                        <div key={i} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 print:border-indigo-200 print:bg-indigo-50">
                          <p className="font-semibold text-indigo-300 text-sm print:text-indigo-700">{typeof item.term === "string" ? item.term.replace(/<[^>]+>/g, "") : item.term}</p>
                          <p className="text-gray-400 text-sm mt-1 leading-relaxed">{typeof item.definition === "string" ? item.definition.replace(/<[^>]+>/g, "") : item.definition}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </>
          )}

          {/* ── FLASHCARD MODE ── */}
          {studyMode === "flashcards" && (
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 print:hidden">
              <h2 className="text-base font-bold text-white mb-5">🃏 Flashcards — {terms.length} terms</h2>
              {terms.length === 0
                ? <p className="text-gray-500 text-sm text-center py-8">No key terms found in this guide.</p>
                : <FlashcardMode terms={terms} />}
            </section>
          )}

          {/* ── UNIFIED QUIZ MODE ── */}
          {studyMode === "unified-quiz" && (
            <div className="px-1">
              <UnifiedQuizMode guideId={id} onXpEarned={showXpToast} />
            </div>
          )}

          {/* ── MIND MAP MODE ── */}
          {studyMode === "mind-map" && (
            <MindMapMode guide={guide} />
          )}

          {/* ── WRITING PROMPTS MODE ── */}
          {studyMode === "writing-prompts" && (
            <WritingPromptsMode guideId={id} />
          )}

          {/* ── TEACH IT BACK MODE ── */}
          {studyMode === "teach-back" && (
            <TeachBackMode guideId={id} />
          )}

          {/* iPhone home indicator clearance */}
          <div aria-hidden="true" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      </main>

      {/* Pomodoro Timer */}
      <PomodoroTimer />

      {/* Chat Clear Confirmation */}
      <ConfirmModal
        open={showClearConfirm}
        title="Clear chat history?"
        message="All messages in this conversation will be permanently deleted."
        confirmText="Clear Chat"
        onConfirm={async () => {
          setShowClearConfirm(false);
          try { await api.chat.clear(id); setMessages([]); } catch { toast({ message: "Failed to clear chat.", type: "error" }); }
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.aside initial={{ x: 384 }} animate={{ x: 0 }} exit={{ x: 384 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-slate-900 border-l border-white/10 flex flex-col z-50 print:hidden">
            {/* Header — paddingTop clears notch / Dynamic Island on mobile */}
            <div className="flex items-center justify-between px-5 border-b border-white/10"
              style={{ paddingTop: "max(1rem, env(safe-area-inset-top))", paddingBottom: "1rem" }}>
              <div>
                <h3 className="font-bold text-white flex items-center gap-2"><MessageCircle size={15} className="text-indigo-400" /> AI Tutor</h3>
                {!isPro && limits?.chat && (
                  <p className={`text-xs mt-0.5 tabular-nums ${limits.chat.used >= limits.chat.max ? "text-red-400" : limits.chat.used >= limits.chat.max * 0.7 ? "text-amber-400" : "text-gray-400"}`}>
                    {limits.chat.max - limits.chat.used} of {limits.chat.max} messages remaining today
                  </p>
                )}
                {isPro && <p className="text-xs text-gray-400 mt-0.5">Ask anything about this lecture</p>}
              </div>
              <div className="flex gap-2 items-center">
                {messages.length > 0 && (
                  <button onClick={() => setShowClearConfirm(true)} className="text-gray-500 hover:text-gray-300 text-xs transition-colors px-2 py-1.5 min-h-[36px]">Clear</button>
                )}
                <button onClick={() => setShowChat(false)} aria-label="Close chat" className="text-gray-500 hover:text-white transition-colors p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-white/8"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
                  <p>Ask me anything about <span className="text-indigo-400">{guide.title}</span>.</p>
                  <div className="mt-4 space-y-2">
                    {["Explain the key concepts simply", "What's most important for the exam?", "Give me a real-world example"].map(s => (
                      <button key={s} onClick={() => setChatInput(s)}
                        className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors">"{s}"</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <ChatMessage key={msg.id} msg={msg} />
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl px-4 py-3 text-sm text-gray-400 animate-pulse">Thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendChat} className="p-3 pb-safe border-t border-white/10 flex gap-2 items-center">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                maxLength={1000} placeholder="Ask about this lecture..."
                enterKeyHint="send"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors min-h-[44px]" />
              <button type="submit" disabled={!chatInput.trim() || chatLoading}
                aria-label="Send message"
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
                <Send size={15} />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
