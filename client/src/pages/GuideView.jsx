import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageCircle, X, Send, RotateCcw, Trophy,
  ChevronDown, ChevronUp, Zap, RefreshCw, ChevronLeft,
  ChevronRight, CheckCircle, XCircle, Clock, BarChart2,
  Share2, Printer, Check, Link2Off, BookOpen, List,
  Star, Target, Eye, EyeOff, Circle, CheckSquare, Brain,
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
                <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", position: "absolute", inset: 0, minHeight: "clamp(180px, 40vw, 260px)" }}
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
                <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", WebkitTransform: "rotateY(180deg)", position: "absolute", inset: 0, minHeight: "clamp(180px, 40vw, 260px)" }}
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

// ── MCQ Mode ──────────────────────────────────────────────────────────────────
function MCQMode({ guideId, onXpEarned }) {
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");
  const { refreshUser } = useAuth();

  const generate = async () => {
    setLoading(true); setError(""); setQuestions(null); setAnswers({}); setSubmitted(false);
    try { const { questions: qs } = await api.guides.generateQuiz(guideId, count, "mcq"); setQuestions(Array.isArray(qs) ? qs : null); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const submit = async () => {
    const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
    setScore(correct); setSubmitted(true);
    try { await api.guides.submitQuiz(guideId, correct, questions.length); await refreshUser(); onXpEarned(correct * 10); } catch (_) {}
  };
  const reset = () => { setQuestions(null); setAnswers({}); setSubmitted(false); setScore(0); };

  if (!questions) return (
    <div className="flex flex-col items-center gap-5 py-8">
      <div className="text-center">
        <p className="text-white font-bold text-lg mb-1">Multiple Choice Quiz</p>
        <p className="text-gray-400 text-sm">AI generates unique questions with 4 options each time.</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="text-gray-400 text-sm">Questions:</span>
        {[5, 10, 15, 20].map(n => (
          <button key={n} onClick={() => setCount(n)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${count === n ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>{n}</button>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={generate} disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-xl text-white font-bold transition-all">
        {loading ? <><span className="animate-spin inline-block">⏳</span> Generating...</> : <><Zap size={16} /> Start Quiz</>}
      </button>
    </div>
  );

  if (submitted) return (
    <div>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-6 mb-6 text-center ${score === questions.length ? "bg-green-500/10 border border-green-500/20" : score >= questions.length * 0.6 ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
        <div className="text-5xl mb-2">{score === questions.length ? "🏆" : score >= questions.length * 0.6 ? "⭐" : "💪"}</div>
        <p className="text-3xl font-bold text-white mb-1">{score}/{questions.length}</p>
        <p className="text-gray-400 mb-1">{Math.round((score / questions.length) * 100)}% correct</p>
        <p className="text-indigo-400 text-sm">+{score * 10} XP earned</p>
      </motion.div>
      <div className="space-y-4 mb-6">
        {questions.map((q, qi) => { const chosen = answers[qi]; const correct = q.correctIndex; return (
          <div key={qi} className={`border rounded-xl p-4 ${chosen === correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <p className="text-white font-medium mb-3">{qi + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className={`px-3 py-2 rounded-lg text-sm ${oi === correct ? "bg-green-500/20 text-green-300 font-medium" : oi === chosen && chosen !== correct ? "bg-red-500/20 text-red-300 line-through" : "text-gray-500"}`}>
                  {["A","B","C","D"][oi]}. {opt}{oi === correct && " ✓"}
                </div>
              ))}
            </div>
            {q.explanation && <p className="text-indigo-300 text-xs mt-3 italic">💡 {q.explanation}</p>}
          </div>
        ); })}
      </div>
      <button onClick={reset} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2">
        <RotateCcw size={14} /> Try Again
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-gray-400 text-sm">{Object.keys(answers).length}/{questions.length} answered</p>
        <div className="flex-1 mx-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div key={qi} className="border border-white/10 rounded-xl p-4">
            <p className="text-white font-medium mb-3">{qi + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <button key={oi} onClick={() => !submitted && setAnswers(a => ({ ...a, [qi]: oi }))}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all break-words ${answers[qi] === oi ? "bg-indigo-600/30 border border-indigo-500/60 text-indigo-200 font-medium" : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"}`}>
                  <span className="text-gray-500 mr-2">{["A","B","C","D"][oi]}.</span> {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {Object.keys(answers).length === questions.length && (
        <button onClick={submit} className="w-full mt-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-bold text-white transition-all">
          Submit & Earn XP ⚡
        </button>
      )}
    </div>
  );
}

// ── Adaptive Quiz Mode ────────────────────────────────────────────────────────
function AdaptiveQuizMode({ guideId, onXpEarned }) {
  const [phase, setPhase]       = useState("setup"); // setup|loading|question|roundbreak|done
  const [count, setCount]       = useState(10);
  const [questions, setQuestions] = useState([]);
  const [queue, setQueue]       = useState([]);   // question indices for current round
  const [queuePos, setQueuePos] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [mastered, setMastered] = useState(new Set());
  const [round, setRound]       = useState(1);
  const [finalScore, setFinalScore] = useState(0);
  const [error, setError]       = useState("");
  const firstPassRef            = useRef(0);
  const { refreshUser }         = useAuth();

  const generate = async () => {
    setPhase("loading"); setError("");
    try {
      const { questions: qs } = await api.guides.generateQuiz(guideId, count, "mcq");
      const allQs = Array.isArray(qs) ? qs : [];
      setQuestions(allQs);
      setQueue(allQs.map((_, i) => i));
      setQueuePos(0); setMastered(new Set());
      firstPassRef.current = 0; setRound(1);
      setSelected(null); setRevealed(false);
      setPhase("question");
    } catch (e) { setError(e.message); setPhase("setup"); }
  };

  const currentQIdx = phase === "question" ? queue[queuePos] : null;
  const currentQ    = currentQIdx != null ? questions[currentQIdx] : null;

  const handleSelect = (oi) => { if (revealed) return; setSelected(oi); setRevealed(true); };

  const handleNext = async () => {
    if (!currentQ) return; // guard against race if button clicked during phase transition
    const isCorrect = selected === currentQ.correctIndex;
    const newMastered = new Set(mastered);
    if (isCorrect) { newMastered.add(currentQIdx); if (round === 1) firstPassRef.current++; }
    setMastered(newMastered);

    if (queuePos < queue.length - 1) {
      setQueuePos(p => p + 1); setSelected(null); setRevealed(false);
    } else {
      const nextQueue = questions.map((_, i) => i).filter(i => !newMastered.has(i));
      if (nextQueue.length === 0) {
        const fp = firstPassRef.current;
        setFinalScore(fp);
        try { await api.guides.submitQuiz(guideId, fp, questions.length); await refreshUser(); onXpEarned(fp * 10); } catch (_) {}
        setPhase("done");
      } else {
        setQueue(nextQueue); setQueuePos(0); setSelected(null); setRevealed(false);
        setRound(r => r + 1); setPhase("roundbreak");
        setTimeout(() => setPhase("question"), 2500);
      }
    }
  };

  const reset = () => {
    setPhase("setup"); setQuestions([]); setQueue([]); setQueuePos(0);
    setSelected(null); setRevealed(false); setMastered(new Set());
    firstPassRef.current = 0; setRound(1); setFinalScore(0);
  };

  // ── Setup / Loading ──
  if (phase === "setup" || phase === "loading") return (
    <div className="flex flex-col items-center gap-5 py-8">
      <div className="text-center">
        <p className="text-white font-bold text-lg mb-1">🧠 Adaptive Quiz</p>
        <p className="text-gray-400 text-sm max-w-xs">One question at a time. Wrong answers come back until you master them.</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="text-gray-400 text-sm">Questions:</span>
        {[5, 10, 15, 20].map(n => (
          <button key={n} onClick={() => setCount(n)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${count === n ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>{n}</button>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={generate} disabled={phase === "loading"}
        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-xl text-white font-bold transition-all">
        {phase === "loading" ? <><span className="animate-spin inline-block">⏳</span> Generating…</> : <><Brain size={16} /> Start Adaptive Quiz</>}
      </button>
    </div>
  );

  // ── Round Break ──
  if (phase === "roundbreak") return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="text-5xl">🔄</div>
      <p className="text-white font-bold text-xl">Round {round}</p>
      <p className="text-gray-400 text-sm">Reviewing the ones you missed…</p>
      <div className="flex items-center gap-3 text-sm mt-2">
        <span className="text-green-400 font-medium">✓ {mastered.size} mastered</span>
        <span className="text-gray-600">•</span>
        <span className="text-yellow-400 font-medium">⟳ {queue.length} to review</span>
      </div>
    </motion.div>
  );

  // ── Done ──
  if (phase === "done") return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
      <div className="text-6xl mb-4">{finalScore === questions.length ? "🏆" : finalScore >= questions.length * 0.7 ? "⭐" : "💪"}</div>
      <p className="text-3xl font-bold text-white mb-1">{finalScore}/{questions.length}</p>
      <p className="text-gray-400 text-sm mb-1">First-attempt correct · +{finalScore * 10} XP</p>
      {round > 1 && <p className="text-green-400 text-sm mb-6">100% mastered after {round} rounds! 🎉</p>}
      {round === 1 && <p className="text-gray-500 text-sm mb-6">Perfect first run!</p>}
      <button onClick={reset}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-white font-semibold text-sm transition-all">
        <RotateCcw size={14} /> Try Again
      </button>
    </motion.div>
  );

  // ── Question ──
  const masteryPct = (mastered.size / questions.length) * 100;
  return (
    <div>
      {/* Mastery bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="text-gray-500">Round {round} · Q {queuePos + 1}/{queue.length}</span>
          <span className="text-green-400 font-semibold">{mastered.size}/{questions.length} mastered</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
            animate={{ width: `${masteryPct}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={`${round}-${queuePos}`}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="border border-white/10 rounded-xl p-5 mb-4">
          <p className="text-white font-semibold mb-4 leading-relaxed">{currentQ.question}</p>
          <div className="space-y-2">
            {currentQ.options.map((opt, oi) => {
              const isSel  = selected === oi;
              const isCorr = oi === currentQ.correctIndex;
              let cls = "w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ";
              if (!revealed) {
                cls += isSel ? "bg-indigo-600/30 border-indigo-500/60 text-indigo-200 font-medium"
                             : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20";
              } else {
                if (isCorr)      cls += "bg-green-500/20 border-green-500/40 text-green-300 font-medium";
                else if (isSel)  cls += "bg-red-500/20 border-red-500/40 text-red-300 line-through";
                else             cls += "bg-white/3 border-white/8 text-gray-600";
              }
              return (
                <button key={oi} onClick={() => handleSelect(oi)} disabled={revealed} className={cls}>
                  <span className="text-gray-500 mr-2">{["A","B","C","D"][oi]}.</span>{opt}
                  {revealed && isCorr && <span className="ml-2 text-green-400">✓</span>}
                </button>
              );
            })}
          </div>
          {revealed && currentQ.explanation && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="text-indigo-300 text-xs mt-3 italic">💡 {currentQ.explanation}</motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      {revealed && (
        <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          onClick={handleNext}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2">
          {selected === currentQ.correctIndex
            ? <><CheckCircle size={16} className="text-green-300" /> Correct — Next Question</>
            : <><XCircle size={16} className="text-red-300" /> Noted — Next Question</>}
        </motion.button>
      )}
    </div>
  );
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
      await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
      setCopied(true); setShared(true);
      toast({ message: "Share link copied to clipboard!", type: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch { toast({ message: "Could not generate share link.", type: "error" }); }
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
function SectionDetail({ section, index, total, isComplete, onMarkComplete, onPrev, onNext }) {
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
        <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">{section.title}</h2>
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
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Deep Dive</h3>
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
      {section.terms?.length > 0 && (
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
function SectionsMode({ guide, guideId, onProgressUpdate }) {
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
    // Bug 8 fix: use crypto.randomUUID() instead of Date.now() to avoid key collisions
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const reply = await api.chat.send(id, msg);
      setMessages(prev => [...prev, reply]);
      refreshLimits(); // update the usage counter
    } catch (err) {
      const errMsg = err?.message || "";
      if (errMsg.includes("FREE_LIMIT_CHAT")) {
        setMessages(prev => prev.filter(m => m.content !== msg));
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
    <div className="flex min-h-dvh bg-[#0a0a12] w-full overflow-x-hidden">
      <Sidebar onLogout={logout} />
      <main className="flex-1 min-w-0 overflow-x-hidden md:ml-64 flex items-center justify-center p-8 main-pt-snug">
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
    <div className="flex min-h-dvh bg-[#0a0a12] w-full overflow-x-hidden items-center justify-center">
      <div className="text-indigo-400 animate-pulse text-lg">Loading guide...</div>
    </div>
  );

  const questions = activeQuestions || guide.quiz_questions || [];
  const terms = guide.key_terms || [];
  const hasSections = guide.sections?.length > 0;

  const MODES = [
    ...(hasSections ? [{ id: "sections", label: "📚 Sections", desc: `${guide.sections.length} sections` }] : []),
    { id: "notes",      label: "📝 Notes",          desc: "Summary & key terms" },
    { id: "flashcards", label: "🃏 Flashcards",      desc: `${terms.length} key terms` },
    { id: "adaptive",   label: "🧠 Adaptive",        desc: "Mastery-based quiz" },
    { id: "mcq",        label: "🎯 Multiple Choice", desc: "AI-generated MCQ" },
    { id: "quiz",       label: "✏️ Self-Grade",      desc: "Reveal & mark answers" },
  ];

  return (
    <div className="flex min-h-dvh bg-[#0a0a12] w-full overflow-x-hidden">
      <Sidebar onLogout={logout} />

      <main className={`flex-1 min-w-0 overflow-x-hidden md:ml-64 transition-[margin] main-pt-snug ${showChat ? "md:mr-96" : ""}`}>
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full min-w-0 overflow-x-hidden">
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
            <SectionsMode guide={guide} guideId={id} onProgressUpdate={(next) => setGuide(g => ({ ...g, section_progress: next }))} />
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

          {/* ── ADAPTIVE QUIZ MODE ── */}
          {studyMode === "adaptive" && (
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 print:hidden">
              <AdaptiveQuizMode guideId={id} onXpEarned={showXpToast} />
            </section>
          )}

          {/* ── MCQ MODE ── */}
          {studyMode === "mcq" && (
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 print:hidden">
              <MCQMode guideId={id} onXpEarned={showXpToast} />
            </section>
          )}

          {/* ── SELF-GRADE QUIZ MODE ── */}
          {studyMode === "quiz" && (
            <section className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 print:hidden">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-white">✏️ Self-Grade Quiz</h2>
                {quizSubmitted && (
                  <button onClick={resetQuiz} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors">
                    <RotateCcw size={13} /> Retry
                  </button>
                )}
              </div>
              {!quizSubmitted && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-5">
                  <p className="text-indigo-300 text-sm font-semibold mb-3 flex items-center gap-2"><RefreshCw size={13} /> Generate Custom Quiz</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-400 text-sm">Questions:</span>
                    {[5, 10, 15, 20].map(n => (
                      <button key={n} onClick={() => setQuizCount(n)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${quizCount === n ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{n}</button>
                    ))}
                    <input type="number" min={3} max={30} value={quizCount}
                      onChange={e => setQuizCount(Math.min(30, Math.max(3, parseInt(e.target.value) || 3)))}
                      className="w-14 bg-white/5 border border-white/10 rounded-lg text-white text-sm text-center focus:outline-none px-2 py-1.5" />
                    <button onClick={generateQuiz} disabled={generatingQuiz}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-lg text-white text-sm font-semibold transition-all">
                      {generatingQuiz ? "Generating..." : <><Zap size={13} /> Generate</>}
                    </button>
                  </div>
                  {quizError && <p className="text-red-400 text-xs mt-2">{quizError}</p>}
                  {activeQuestions && <p className="text-green-400 text-xs mt-2">✓ {activeQuestions.length} fresh questions ready.</p>}
                </div>
              )}
              {quizSubmitted && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-2xl p-5 mb-5 text-center ${score === questions.length ? "bg-green-500/10 border border-green-500/20" : score >= questions.length * 0.6 ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                  <div className="text-4xl mb-2">{score === questions.length ? "🏆" : score >= questions.length * 0.6 ? "⭐" : "💪"}</div>
                  <p className="text-2xl font-bold text-white mb-1">{score}/{questions.length} correct</p>
                  <p className="text-gray-400 text-sm">{score === questions.length ? "Perfect score!" : score >= questions.length * 0.6 ? "Great job!" : "Keep studying!"}</p>
                </motion.div>
              )}
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i} className="border border-white/10 rounded-xl p-4">
                    <p className="text-white font-medium text-sm mb-3">{i + 1}. {q.question}</p>
                    {!quizSubmitted ? (
                      <div className="flex flex-col gap-2">
                        <button onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))} className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2 w-fit transition-colors">
                          {flipped[i] ? "Hide answer" : "Show answer"}
                        </button>
                        {flipped[i] && (
                          <div>
                            <div className="text-gray-300 text-sm mb-3 bg-white/5 rounded-lg px-3 py-2"><RichText html={q.answer} className="rich-text-sm" /></div>
                            {!quizAnswers[i] ? (
                              <div className="flex gap-2">
                                <button onClick={() => setQuizAnswers(a => ({ ...a, [i]: "correct" }))}
                                  className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors">✓ Got it</button>
                                <button onClick={() => setQuizAnswers(a => ({ ...a, [i]: "wrong" }))}
                                  className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors">✗ Missed it</button>
                              </div>
                            ) : (
                              <span className={`text-xs font-medium px-2 py-1 rounded-lg ${quizAnswers[i] === "correct" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                {quizAnswers[i] === "correct" ? "✓ Marked correct" : "✗ Marked wrong"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-gray-400 text-sm flex-1"><RichText html={q.answer} className="rich-text-sm" /></div>
                        <span>{quizAnswers[i] === "correct" ? "✅" : "❌"}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!quizSubmitted && questions.length > 0 && Object.keys(quizAnswers).length === questions.length && (
                <button onClick={submitQuiz} className="w-full mt-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-bold text-white transition-all">
                  Submit Quiz & Earn XP ⚡
                </button>
              )}
            </section>
          )}

          {/* iPhone home indicator clearance */}
          <div aria-hidden="true" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      </main>

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
