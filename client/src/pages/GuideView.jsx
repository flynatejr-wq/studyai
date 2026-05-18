import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageCircle, X, Send, RotateCcw, Trophy,
  ChevronDown, ChevronUp, Zap, RefreshCw, ChevronLeft,
  ChevronRight, CheckCircle, XCircle, Clock, BarChart2,
  Share2, Printer, Check, Link2Off, BookOpen, List,
  Star, Target, Eye, EyeOff, Circle, CheckSquare
} from "lucide-react";
import { api, getToken } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import RichText from "../components/RichText.jsx";
import ChatMessage from "../components/ChatMessage.jsx";

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

// ── Study Timer ───────────────────────────────────────────────────────────────
function useStudyTimer(guideId) {
  const startRef = useRef(Date.now());
  useEffect(() => {
    startRef.current = Date.now();
    return () => {
      const secs = Math.floor((Date.now() - startRef.current) / 1000);
      if (secs < 10 || !guideId) return;
      const token = getToken();
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
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [unknown, setUnknown] = useState(new Set());
  const card = terms[idx];
  const total = terms.length;

  const mark = (correct) => {
    if (correct) setKnown(s => new Set([...s, idx]));
    else setUnknown(s => new Set([...s, idx]));
    setFlipped(false);
    setTimeout(() => setIdx(i => (i + 1) % total), 150);
  };
  const reset = () => { setIdx(0); setFlipped(false); setKnown(new Set()); setUnknown(new Set()); };
  const done = known.size + unknown.size === total;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center gap-4 text-sm text-gray-400 w-full max-w-lg">
        <span className="text-green-400 font-medium">✓ {known.size} known</span>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
            style={{ width: `${((known.size + unknown.size) / total) * 100}%` }} />
        </div>
        <span className="text-gray-500">{idx + 1}/{total}</span>
      </div>
      {done ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white/5 border border-white/10 rounded-2xl p-10 w-full max-w-lg">
          <div className="text-5xl mb-3">{known.size === total ? "🏆" : "💪"}</div>
          <p className="text-2xl font-bold text-white mb-1">{known.size}/{total} cards known</p>
          <p className="text-gray-400 mb-6">{known.size === total ? "You know all of them!" : `${unknown.size} to review.`}</p>
          <button onClick={reset} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-all">
            <RotateCcw size={14} className="inline mr-2" />Restart
          </button>
        </motion.div>
      ) : (
        <>
          <div className="w-full max-w-lg cursor-pointer" onClick={() => setFlipped(f => !f)} style={{ perspective: 1000 }}>
            <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d", position: "relative", height: "min(240px, 50vw)" }}>
              <div style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
                className="bg-gradient-to-br from-indigo-600/30 to-violet-600/20 border border-indigo-500/40 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Term</p>
                <p className="text-white text-2xl font-bold leading-tight">{card.term}</p>
                <p className="text-indigo-400 text-xs mt-4">Tap to reveal definition</p>
              </div>
              <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0 }}
                className="bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/40 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Definition</p>
                <p className="text-white text-lg leading-relaxed">{card.definition}</p>
              </div>
            </motion.div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => { setIdx(i => (i - 1 + total) % total); setFlipped(false); }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            {flipped ? (
              <>
                <button onClick={() => mark(false)} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-xl font-semibold text-sm transition-all">
                  <XCircle size={15} /> Still learning
                </button>
                <button onClick={() => mark(true)} className="flex items-center gap-2 px-5 py-2.5 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 rounded-xl font-semibold text-sm transition-all">
                  <CheckCircle size={15} /> Got it!
                </button>
              </>
            ) : (
              <button onClick={() => setFlipped(true)} className="px-6 py-2.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 rounded-xl font-semibold text-sm transition-all">
                Reveal
              </button>
            )}
            <button onClick={() => { setIdx(i => (i + 1) % total); setFlipped(false); }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={20} />
            </button>
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

  return (
    <motion.div key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="space-y-5">

      {/* Section header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">Section {index + 1} of {total}</p>
          <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">{section.title}</h2>
        </div>
        {isComplete && (
          <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-xs font-semibold">
            <CheckCircle size={13} /> Complete
          </span>
        )}
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
                <RichText html={pt} className="rich-text-sm text-sm" />
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

        {/* Section pills */}
        <div className="mt-3 flex gap-1.5 flex-wrap">
          {sections.map((s, i) => (
            <button key={i} onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                i === activeIdx
                  ? "bg-indigo-600 text-white"
                  : progress[i]
                    ? "bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}>
              {progress[i] ? <CheckCircle size={11} /> : <Circle size={11} />}
              {i + 1}. {s.title.length > 20 ? s.title.slice(0, 20) + "…" : s.title}
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
  const chatEndRef = useRef(null);
  const xpTimerRef = useRef(null);

  useStudyTimer(id);

  useEffect(() => {
    loadGuide();
    api.guides.quizHistory(id).then(h => setQuizHistory(Array.isArray(h) ? h : [])).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (showChat && messages.length === 0) loadChat();
  }, [showChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { if (xpTimerRef.current) clearTimeout(xpTimerRef.current); };
  }, []);

  // Set default mode once guide loads
  useEffect(() => {
    if (guide && studyMode === null) {
      setStudyMode(guide.sections?.length > 0 ? "sections" : "notes");
    }
  }, [guide]);

  async function loadGuide() {
    try { const g = await api.guides.get(id); setGuide(g); }
    catch (err) { setLoadError(err.message || "Could not load this guide."); }
  }
  async function loadChat() {
    try { const msgs = await api.chat.history(id); setMessages(Array.isArray(msgs) ? msgs : []); } catch (_) {}
  }
  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput; setChatInput("");
    setMessages(prev => [...prev, { id: Date.now(), role: "user", content: msg }]);
    setChatLoading(true);
    try { const reply = await api.chat.send(id, msg); setMessages(prev => [...prev, reply]); }
    catch { setMessages(prev => [...prev, { id: Date.now(), role: "assistant", content: "Sorry, couldn't respond. Try again." }]); }
    finally { setChatLoading(false); }
  };
  const showXpToast = useCallback((xp) => {
    if (xpTimerRef.current) clearTimeout(xpTimerRef.current);
    setXpToast(xp);
    xpTimerRef.current = setTimeout(() => setXpToast(null), 3000);
  }, []);
  const resetQuiz = () => { setQuizAnswers({}); setQuizSubmitted(false); setScore(0); setFlipped({}); };
  const generateQuiz = async () => {
    setGeneratingQuiz(true); setQuizError(""); resetQuiz();
    try { const { questions } = await api.guides.generateQuiz(id, quizCount, "self-grade"); setActiveQuestions(Array.isArray(questions) ? questions : []); }
    catch (e) { setQuizError(e.message); } finally { setGeneratingQuiz(false); }
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
    <div className="flex min-h-screen bg-[#0a0a12]">
      <Sidebar onLogout={logout} />
      <main className="flex-1 md:ml-64 flex items-center justify-center p-8 pt-14 md:pt-0">
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
    <div className="flex min-h-screen bg-[#0a0a12] items-center justify-center">
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
    { id: "mcq",        label: "🎯 Multiple Choice", desc: "AI-generated MCQ" },
    { id: "quiz",       label: "✏️ Self-Grade",      desc: "Reveal & mark answers" },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0a12]">
      <Sidebar onLogout={logout} />

      <main className={`flex-1 md:ml-64 transition-all pt-14 md:pt-0 ${showChat ? "md:mr-96" : ""}`}>
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full min-w-0">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
            <ArrowLeft size={16} /> Back
          </button>

          {/* Title row */}
          <div className="flex items-start justify-between mb-6 gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">{guide.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-gray-500 text-xs">{new Date(guide.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                {guide.best_quiz_score > 0 && guide.quiz_questions?.length > 0 && (
                  <span className="flex items-center gap-1 text-yellow-400 text-xs font-medium">
                    <Trophy size={11} /> Best: {guide.best_quiz_score}/{guide.quiz_questions.length} ({Math.round(guide.best_quiz_score / guide.quiz_questions.length * 100)}%)
                  </span>
                )}
                {quizHistory.length > 1 && (
                  <div className="flex items-center gap-2">
                    <BarChart2 size={11} className="text-gray-500" />
                    <QuizHistoryBar attempts={[...quizHistory].reverse()} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ShareButton guideId={id} initialToken={guide.share_token} />
              <button onClick={() => window.print()} title="Print / Save as PDF"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-lg text-gray-400 hover:text-white text-xs font-medium transition-all print:hidden">
                <Printer size={13} /> Print
              </button>
              <button onClick={() => setShowChat(!showChat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${showChat ? "bg-indigo-600 text-white" : "bg-white/5 border border-white/10 text-gray-300 hover:border-indigo-500/40"}`}>
                <MessageCircle size={13} /> AI Tutor
              </button>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-6 overflow-x-auto print:hidden">
            {MODES.map(m => (
              <button key={m.id} onClick={() => { setStudyMode(m.id); resetQuiz(); }}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${studyMode === m.id ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>
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
            <SectionsMode guide={guide} guideId={id} onProgressUpdate={() => {}} />
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
                      <span className="leading-relaxed text-sm">{point}</span>
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
                          <p className="font-semibold text-indigo-300 text-sm print:text-indigo-700">{item.term}</p>
                          <p className="text-gray-400 text-sm mt-1 leading-relaxed print:text-gray-700">{item.definition}</p>
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
                            <p className="text-gray-300 text-sm mb-3 bg-white/5 rounded-lg px-3 py-2">{q.answer}</p>
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
                        <p className="text-gray-400 text-sm flex-1">{q.answer}</p>
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2"><MessageCircle size={15} className="text-indigo-400" /> AI Tutor</h3>
                <p className="text-xs text-gray-400 mt-0.5">Ask anything about this lecture</p>
              </div>
              <div className="flex gap-2 items-center">
                {messages.length > 0 && (
                  <button onClick={() => setShowClearConfirm(true)} className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Clear</button>
                )}
                <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white transition-colors p-1"><X size={18} /></button>
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
            <form onSubmit={sendChat} className="p-4 border-t border-white/10 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                maxLength={1000} placeholder="Ask about this lecture..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
              <button type="submit" disabled={!chatInput.trim() || chatLoading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-white transition-colors">
                <Send size={15} />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
