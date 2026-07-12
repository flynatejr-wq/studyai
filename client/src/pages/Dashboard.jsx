import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, BookOpen, ChevronRight, ArrowRight,
  Trophy, Clock, Zap, Flame, Sparkles, Crown,
  TrendingUp, BarChart2, Layers,
} from "lucide-react";

const TYPE_LABEL = { text: "📝 Notes", youtube: "🎥 YouTube", image: "🖼️ Photo", audio: "🎙️ Audio", file: "📄 File" };

const CARD_COLORS = {
  indigo:  { text: "text-indigo-400",  border: "hover:border-indigo-500/20",  glow: "group-hover:text-indigo-300" },
  violet:  { text: "text-violet-400",  border: "hover:border-violet-500/20",  glow: "group-hover:text-violet-300" },
  emerald: { text: "text-emerald-400", border: "hover:border-emerald-500/20", glow: "group-hover:text-emerald-300" },
  amber:   { text: "text-amber-400",   border: "hover:border-amber-500/20",   glow: "group-hover:text-amber-300"  },
  rose:    { text: "text-rose-400",    border: "hover:border-rose-500/20",    glow: "group-hover:text-rose-300"   },
  sky:     { text: "text-sky-400",     border: "hover:border-sky-500/20",     glow: "group-hover:text-sky-300"    },
  pink:    { text: "text-pink-400",    border: "hover:border-pink-500/20",    glow: "group-hover:text-pink-300"   },
};
const guideTypeLabel = (type) => TYPE_LABEL[type] || "📝 Notes";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { api } from "../api.js";
import UploadForm from "../components/UploadForm.jsx";
import Results from "../components/Results.jsx";
import Sidebar from "../components/Sidebar.jsx";
import UpgradeModal from "../components/UpgradeModal.jsx";
import OnboardingModal, { useOnboarding } from "../components/OnboardingModal.jsx";
import DailyWidgets from "../components/DailyWidgets.jsx";
import PlanUsageCard from "../components/PlanUsageCard.jsx";
import { analytics, Events } from "../lib/analytics.js";

// ── Skeleton Cards ─────────────────────────────────────────────────────────────
function GuideCardSkeleton() {
  return (
    <div className="bg-white/3 border border-white/6 rounded-2xl p-4 space-y-3">
      <div className="skeleton h-5 w-20 rounded-md" />
      <div className="space-y-1.5">
        <div className="skeleton h-4 w-full rounded-md" />
        <div className="skeleton h-4 w-3/4 rounded-md" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="skeleton h-3 w-16 rounded-md" />
        <div className="skeleton h-3 w-8 rounded-md" />
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, value, label, bg, text, loading }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl ${bg} border border-white/5`}>
      <Icon size={13} className={text} />
      {loading
        ? <div className="skeleton h-3 w-8 rounded" />
        : <span className="text-white text-xs font-black">{typeof value === "number" ? value.toLocaleString() : value}</span>
      }
      <span className="text-gray-500 text-xs hidden lg:block">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user, refreshUser, logout } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const { show: showOnboarding, complete: completeOnboarding, skip: skipOnboarding } = useOnboarding(user);

  const [folders,       setFolders]       = useState([]);
  const [recentGuides,  setRecentGuides]  = useState([]);
  const [results,       setResults]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingStage,  setLoadingStage]  = useState("");
  const loadingTimerRef = useRef(null);
  const [guidesLoading, setGuidesLoading] = useState(true);
  const [error,         setError]         = useState("");
  const [saveFolder,    setSaveFolder]    = useState("");
  const [upgradeOpen,   setUpgradeOpen]   = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  useEffect(() => {
    loadData();
    try {
      const raw = localStorage.getItem("studybuddi_draft");
      if (raw) setResults(JSON.parse(raw));
    } catch (_) {}
  }, []);

  async function loadData() {
    setGuidesLoading(true);
    try {
      const [f, gRes] = await Promise.all([api.folders.list(), api.guides.listPaged(0, "")]);
      setFolders(Array.isArray(f) ? f : []);
      setRecentGuides(Array.isArray(gRes.guides) ? gRes.guides.slice(0, 6) : []);
    } catch (_) {}
    finally { setGuidesLoading(false); }
  }

  const handleSubmit = async ({ type, transcript, youtubeUrl, file, difficulty = "standard", style = "detailed" }) => {
    // Frontend pre-check: block free users who've already used their one guide.
    // Pilot accounts are exempt from this lifetime check — their real limit is
    // a daily cap enforced server-side, not the free tier's lifetime-1 rule.
    const isUnrestrictedOrPilot = user?.plan === "pro" || user?.plan === "lifetime" || user?.plan === "pilot" || user?.is_whitelisted || user?.role === "admin";
    if (!isUnrestrictedOrPilot && (user?.guides_created_ever ?? 0) >= 1) {
      setUpgradeReason("FREE_LIMIT_GUIDES"); setUpgradeOpen(true);
      return;
    }
    setLoading(true); setError(""); setResults(null);
    analytics.track(Events.GENERATION_STARTED, { type });

    // Type-specific loading stages so each input method shows relevant feedback
    const stagesByType = {
      text:    ["Reading your notes…",           "Identifying key concepts…", "Building your study guide…", "Organising sections…",    "Almost done…"],
      youtube: ["Fetching YouTube transcript…",  "Reading the transcript…",   "Building your study guide…", "Organising sections…",    "Almost done…"],
      audio:   ["Transcribing your audio…",      "Reading the transcript…",   "Building your study guide…", "Organising sections…",    "Almost done…"],
      image:   ["Reading your image…",           "Extracting content…",       "Building your study guide…", "Organising sections…",    "Almost done…"],
      file:    ["Extracting text from file…",    "Identifying key concepts…", "Building your study guide…", "Organising sections…",    "Almost done…"],
    };
    const stages = stagesByType[type] ?? stagesByType.text;
    let stageIdx = 0;
    setLoadingStage(stages[0]);
    loadingTimerRef.current = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setLoadingStage(stages[stageIdx]);
    }, 3500);

    try {
      let data;
      if (type === "text")         data = await api.summarize.text(transcript, difficulty, style);
      else if (type === "youtube") data = await api.summarize.youtube(youtubeUrl, difficulty, style);
      else if (type === "image")   data = await api.summarize.image(file, difficulty, style);
      else if (type === "audio")   data = await api.summarize.audio(file, difficulty, style);
      else                         data = await api.summarize.file(file, difficulty, style);
      // Generate a unique idempotency key for this generation result so duplicate saves are safe
      const generation_id = crypto.randomUUID();
      setResults({ ...data, type, style, generation_id });
      analytics.track(Events.GENERATION_COMPLETED, { type });
      try { localStorage.setItem("studybuddi_draft", JSON.stringify({ ...data, type, generation_id })); } catch (_) {}
    } catch (err) {
      if ((err.message || "").includes("FREE_LIMIT")) {
        const reason = err.message.includes("QUIZZES") ? "FREE_LIMIT_QUIZZES" : "FREE_LIMIT_GUIDES";
        analytics.track(Events.FREE_LIMIT_HIT, { reason });
        setUpgradeReason(reason); setUpgradeOpen(true);
      } else {
        analytics.track(Events.GENERATION_FAILED, { type, error: err.message });
        setError(err.message);
      }
    } finally {
      clearInterval(loadingTimerRef.current);
      setLoading(false);
      setLoadingStage("");
    }
  };

  const handleSave = async (folderId) => {
    if (!results) return;
    try {
      const guide = await api.guides.save({
        title:           results.title || "Untitled Guide",
        folder_id:       folderId || null,
        type:            results.type || "text",
        format:          results.style || "detailed",
        summary:         results.summary,
        key_terms:       results.keyTerms || results.key_terms,
        quiz_questions:  results.quizQuestions || results.quiz_questions,
        sections:        results.sections || [],
        idempotency_key: results.generation_id || null,
      });
      await refreshUser();
      await loadData();
      try { localStorage.removeItem("studybuddi_draft"); } catch (_) {}
      setResults(null);
      analytics.track(Events.GUIDE_SAVED, { type: results?.type });
      toast({ message: "Guide saved!", type: "success" });
      navigate(`/guide/${guide.id}`);
    } catch (err) {
      if ((err.message || "").includes("FREE_LIMIT")) {
        setUpgradeReason("FREE_LIMIT_GUIDES"); setUpgradeOpen(true);
      } else {
        setError(err.message);
        toast({ message: err.message, type: "error" });
      }
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  // BUG-10: Include lifetime, whitelisted, and admin as pro-equivalent
  const isPro = user?.plan === "pro" || user?.plan === "lifetime" || user?.is_whitelisted || user?.role === "admin";

  const handleUpgrade = async () => {
    try {
      const { url } = await api.stripe.checkout();
      window.location.href = url;
    } catch (err) {
      toast({ message: err.message || "Could not start checkout. Please try again.", type: "error" });
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const stats = [
    { icon: BookOpen, value: user?.total_guides ?? 0, label: "Guides",     bg: "bg-indigo-500/15", text: "text-indigo-400" },
    { icon: Flame,    value: user?.streak ?? 0,       label: "Day Streak", bg: "bg-orange-500/15", text: "text-orange-400" },
    { icon: Zap,      value: user?.xp ?? 0,           label: "XP",         bg: "bg-violet-500/15", text: "text-violet-400" },
  ];

  return (
    <div className="flex min-h-dvh bg-[#080810] w-full">
      <Sidebar onLogout={logout} />

      <main className="flex-1 min-w-0 md:ml-64 p-4 md:p-8 main-pt">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6 gap-3">
          <div className="min-w-0">
            <p className="text-gray-500 text-xs font-medium mb-0.5">{getGreeting()}</p>
            <h1 className="text-lg md:text-2xl font-black text-white flex items-center gap-2 leading-tight">
              <Sparkles size={18} className="text-indigo-400 shrink-0" />
              {firstName} 👋
            </h1>
            <p className="text-gray-600 text-xs mt-0.5 hidden sm:block">
              What would you like to study today?
            </p>
          </div>
          {/* Stats pills — desktop */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {stats.map(s => (
              <StatPill key={s.label} {...s} loading={!user} />
            ))}
          </div>
        </div>

        {/* ── Mobile stats ── */}
        <div className="grid grid-cols-3 gap-2 mb-5 md:hidden">
          {stats.map(s => (
            <div key={s.label} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl ${s.bg} border border-white/5`}>
              <s.icon size={13} className={s.text} />
              <p className="text-white text-sm font-black leading-none">{s.value.toLocaleString()}</p>
              <p className="text-gray-500 text-xs leading-none">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Create Guide (primary action — kept at the top so it's the first thing you see) ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Plus size={13} className="text-indigo-400" />
            </div>
            <h2 className="text-sm font-bold text-white">Create New Study Guide</h2>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!results ? (
            <UploadForm onSubmit={handleSubmit} loading={loading} loadingStage={loadingStage} dark />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/3 border border-white/8 rounded-2xl p-5 md:p-6">
              <Results results={results} onReset={() => { setResults(null); try { localStorage.removeItem("studybuddi_draft"); } catch (_) {} }} dark />
              <div className="mt-6 pt-5 border-t border-white/8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  value={saveFolder}
                  onChange={e => setSaveFolder(e.target.value)}
                  className="flex-1 sm:flex-none bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors">
                  <option value="">📂 No folder</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
                </select>
                <button
                  onClick={() => handleSave(saveFolder)}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-bold text-white text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20">
                  💾 Save Guide
                </button>
                <button
                  onClick={() => { setResults(null); try { localStorage.removeItem("studybuddi_draft"); } catch (_) {} }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/8 rounded-xl text-gray-400 hover:text-white text-sm transition-all">
                  <Plus size={14} /> New
                </button>
              </div>
            </motion.div>
          )}
        </motion.section>

        {/* ── Plan & Usage (secondary — below the primary action) ── */}
        <div className="mb-6">
          <PlanUsageCard />
        </div>

        {/* ── Daily Widgets (collapsible engagement strip) ── */}
        <DailyWidgets />

        {/* ── Quick actions (for returning users with guides) ── */}
        {!guidesLoading && recentGuides.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { icon: BookOpen, label: "All Guides", to: "/guides", color: "indigo" },
              { icon: BarChart2, label: "Progress", to: "/progress", color: "violet" },
              { icon: Layers, label: "Folders", to: "/guides", color: "sky" },
            ].map(q => (
              <Link key={q.label} to={q.to}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/3 border border-white/6 hover:bg-white/6 ${CARD_COLORS[q.color]?.border} transition-all group`}>
                <q.icon size={16} className={`${CARD_COLORS[q.color]?.text} group-hover:scale-110 transition-transform`} />
                <span className="text-xs text-gray-400 font-medium group-hover:text-white transition-colors">{q.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* ── Continue Studying ── */}
        {(() => {
          const inProgress = recentGuides.filter(g => {
            const sp = g.section_progress;
            if (!Array.isArray(sp) || sp.length === 0) return false;
            return sp.some(Boolean) && sp.some(v => !v);
          }).slice(0, 3);
          if (inProgress.length === 0) return null;
          return (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-bold text-white">📖 Continue Studying</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {inProgress.map((guide, i) => {
                  const sp = guide.section_progress;
                  const total = sp.length;
                  const completed = sp.filter(Boolean).length;
                  const pct = Math.round((completed / total) * 100);
                  return (
                    <motion.div
                      key={guide.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.35 }}>
                      <div className="group relative bg-white/3 border border-white/7 rounded-2xl p-4 hover:bg-white/5 hover:border-indigo-500/20 transition-all">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600/0 to-violet-600/0 group-hover:from-indigo-600/3 group-hover:to-violet-600/3 transition-all" />
                        <div className="relative">
                          <div className="flex items-start justify-between mb-2.5">
                            <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/15">
                              {guideTypeLabel(guide.type)}
                            </span>
                          </div>
                          <h3 className="text-white font-semibold text-sm leading-snug mb-3 group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {guide.title}
                          </h3>
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-gray-500">{completed} of {total} sections</span>
                              <span className="text-xs text-indigo-400 font-semibold">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-indigo-500/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end">
                            <Link
                              to={`/guide/${guide.id}`}
                              className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                              Continue <ArrowRight size={12} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ── Recent Guides ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={14} className="text-indigo-400" />
              Recent Guides
            </h2>
            <Link to="/guides"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/4 border border-white/8 text-indigo-400 hover:text-white hover:bg-indigo-600/15 hover:border-indigo-500/25 transition-all">
              See All <ChevronRight size={13} />
            </Link>
          </div>

          {guidesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <GuideCardSkeleton key={i} />)}
            </div>
          ) : recentGuides.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-14 border border-dashed border-white/8 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-indigo-400/60" />
              </div>
              <p className="text-white font-semibold text-sm mb-1">No guides yet</p>
              <p className="text-xs text-gray-600 mb-5">Create your first study guide above ↑</p>
              <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span>📝</span> Paste text</span>
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-1.5"><span>🎥</span> YouTube</span>
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-1.5"><span>📄</span> Upload file</span>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentGuides.map((guide, i) => (
                <motion.div
                  key={guide.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}>
                  <Link to={`/guide/${guide.id}`}
                    className="card-lift group relative bg-white/3 border border-white/7 rounded-2xl p-4 hover:bg-white/5 block">
                    {/* Subtle glow on hover */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600/0 to-violet-600/0 group-hover:from-indigo-600/3 group-hover:to-violet-600/3 transition-all" />

                    <div className="relative">
                      <div className="flex items-start justify-between mb-2.5">
                        <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/15">
                          {guideTypeLabel(guide.type)}
                        </span>
                        {guide.best_quiz_score > 0 && (
                          <span className="text-xs text-yellow-400 font-semibold flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg">
                            <Trophy size={10} /> {guide.best_quiz_score}
                          </span>
                        )}
                      </div>

                      <h3 className="text-white font-semibold text-sm leading-snug mb-3 group-hover:text-indigo-300 transition-colors line-clamp-2">
                        {guide.title}
                      </h3>

                      {/* Progress bar if quiz attempted */}
                      {guide.best_quiz_score > 0 && guide.quiz_questions?.length > 0 && (
                        <div className="mb-3">
                          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                              style={{ width: `${Math.round((guide.best_quiz_score / guide.quiz_questions.length) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-gray-600 text-xs flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(guide.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        <ArrowRight size={13} className="text-gray-700 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <div aria-hidden="true" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </main>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />

      {/* ── Onboarding modal (first-time users only) ── */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal onComplete={completeOnboarding} onSkip={skipOnboarding} />
        )}
      </AnimatePresence>
    </div>
  );
}
