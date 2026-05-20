import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, BookOpen, X, ChevronRight, ArrowRight,
  Trophy, Clock, Zap, Flame, Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { api } from "../api.js";
import UploadForm from "../components/UploadForm.jsx";
import Results from "../components/Results.jsx";
import Sidebar from "../components/Sidebar.jsx";
import UpgradeModal from "../components/UpgradeModal.jsx";

export default function Dashboard() {
  const { user, refreshUser, logout } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();

  const [folders,      setFolders]      = useState([]);
  const [recentGuides, setRecentGuides] = useState([]);
  const [showCreate,   setShowCreate]   = useState(true);
  const [results,      setResults]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [saveFolder,   setSaveFolder]   = useState("");
  const [upgradeOpen,  setUpgradeOpen]  = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  useEffect(() => {
    loadData();
    // Restore any unsaved draft from a previous session
    try {
      const raw = localStorage.getItem("studybuddi_draft");
      if (raw) { setResults(JSON.parse(raw)); setShowCreate(true); }
    } catch (_) {}
  }, []);

  async function loadData() {
    try {
      const [f, gRes] = await Promise.all([api.folders.list(), api.guides.listPaged(0, "")]);
      setFolders(Array.isArray(f) ? f : []);
      setRecentGuides(Array.isArray(gRes.guides) ? gRes.guides.slice(0, 6) : []);
    } catch (_) {}
  }

  const handleSubmit = async ({ type, transcript, youtubeUrl, file, difficulty = "standard", style = "detailed" }) => {
    setLoading(true); setError(""); setResults(null);
    try {
      let data;
      if (type === "text")         data = await api.summarize.text(transcript, difficulty, style);
      else if (type === "youtube") data = await api.summarize.youtube(youtubeUrl, difficulty, style);
      else if (type === "image")   data = await api.summarize.image(file, difficulty, style);
      else if (type === "audio")   data = await api.summarize.audio(file, difficulty, style);
      else                         data = await api.summarize.file(file, difficulty, style);
      setResults({ ...data, type });
      try { localStorage.setItem("studybuddi_draft", JSON.stringify({ ...data, type })); } catch (_) {}
    } catch (err) {
      // Show upgrade modal for free-tier limit errors instead of a generic message
      if (err.message === "FREE_LIMIT_GUIDES" || (err.message || "").includes("FREE_LIMIT")) {
        const reason = err.message.includes("QUIZZES") ? "FREE_LIMIT_QUIZZES" : "FREE_LIMIT_GUIDES";
        setUpgradeReason(reason); setUpgradeOpen(true);
      } else {
        setError(err.message);
      }
    }
    finally { setLoading(false); }
  };

  const handleSave = async (folderId) => {
    if (!results) return;
    try {
      const guide = await api.guides.save({
        title:          results.title || "Untitled Guide",
        folder_id:      folderId || null,
        type:           results.type || "text",
        summary:        results.summary,
        key_terms:      results.keyTerms || results.key_terms,
        quiz_questions: results.quizQuestions || results.quiz_questions,
        sections:       results.sections || [],
      });
      await refreshUser();
      await loadData();
      try { localStorage.removeItem("studybuddi_draft"); } catch (_) {}
      setResults(null);
      setShowCreate(false);
      toast({ message: "Guide saved!", type: "success" });
      navigate(`/guide/${guide.id}`);
    } catch (err) {
      setError(err.message);
      toast({ message: err.message, type: "error" });
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  const hourNow   = new Date().getHours();
  const greeting  = hourNow < 12 ? "Good morning" : hourNow < 18 ? "Good afternoon" : "Good evening";

  const stats = [
    { icon: BookOpen, value: user?.total_guides ?? 0,  label: "Guides",     color: "indigo", bg: "bg-indigo-500/15", text: "text-indigo-400" },
    { icon: Flame,    value: user?.streak ?? 0,        label: "Day Streak", color: "orange", bg: "bg-orange-500/15", text: "text-orange-400" },
    { icon: Zap,      value: user?.xp ?? 0,            label: "XP Earned",  color: "violet", bg: "bg-violet-500/15", text: "text-violet-400" },
  ];

  return (
    <div className="flex min-h-dvh bg-[#0a0a12] w-full overflow-x-hidden">
      <Sidebar onLogout={logout} />

      <main className="flex-1 min-w-0 overflow-x-hidden md:ml-64 p-4 md:p-8 main-pt">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mb-0.5">{greeting}</p>
            <h1 className="text-xl md:text-2xl font-black text-white truncate">
              {firstName} <span className="text-2xl">👋</span>
            </h1>
          </div>
          <button
            onClick={() => { setShowCreate(true); setResults(null); }}
            className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-bold text-white transition-all shadow-lg shadow-indigo-500/25 text-sm shrink-0 hover:-translate-y-0.5">
            <Plus size={15} />
            <span className="hidden sm:inline">Generate Notes</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map(s => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white/4 border border-white/8 rounded-2xl p-3.5 md:p-4 flex flex-col gap-2">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={14} className={s.text} />
              </div>
              <div>
                <p className="text-white text-lg md:text-xl font-black leading-none">{s.value.toLocaleString()}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Generate Notes CTA (shown when not creating) ── */}
        <AnimatePresence>
          {!showCreate && !results && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="relative overflow-hidden rounded-2xl mb-6 cursor-pointer group"
              onClick={() => setShowCreate(true)}>
              {/* gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent" />
              <div className="absolute inset-0 border border-indigo-500/20 rounded-2xl" />
              {/* decorative orb */}
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative p-5 md:p-6 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles size={15} className="text-indigo-400 shrink-0" />
                    <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">AI-Powered</p>
                  </div>
                  <h2 className="text-white font-bold text-base md:text-lg mb-1">Generate Study Notes</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Turn any lecture, PDF, YouTube video, or audio into organized notes in seconds.
                  </p>
                </div>
                <div className="shrink-0 w-11 h-11 rounded-xl bg-indigo-600 group-hover:bg-indigo-500 flex items-center justify-center transition-colors shadow-lg shadow-indigo-600/30">
                  <Plus size={20} className="text-white" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Create Guide Panel ── */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-white/4 border border-white/10 rounded-2xl p-5 md:p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles size={15} className="text-indigo-400" /> Generate Study Notes
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Choose your source, format & depth — AI does the rest</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/8">
                  <X size={18} />
                </button>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
              )}
              {!results ? (
                <UploadForm onSubmit={handleSubmit} loading={loading} dark />
              ) : (
                <div>
                  <Results results={results} onReset={() => setResults(null)} dark />
                  <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                      value={saveFolder}
                      onChange={e => setSaveFolder(e.target.value)}
                      className="flex-1 sm:flex-none bg-white/8 border border-white/12 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors">
                      <option value="">📂 No folder</option>
                      {folders.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
                    </select>
                    <button
                      onClick={() => handleSave(saveFolder)}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-bold text-white text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20">
                      💾 Save Guide
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Recent Guides ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={15} className="text-indigo-400" /> Recent Guides
            </h2>
            <Link to="/guides" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-indigo-400 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500/30 transition-all">
              See All Guides <ChevronRight size={13} />
            </Link>
          </div>

          {recentGuides.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/8 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={24} className="text-indigo-400" />
              </div>
              <p className="text-white font-semibold mb-1">No guides yet</p>
              <p className="text-sm text-gray-600 mb-5">Create your first study guide to get started</p>
              <button
                onClick={() => { setShowCreate(true); setResults(null); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5">
                <Sparkles size={14} /> Generate Notes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentGuides.map((guide, i) => (
                <motion.div key={guide.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Link to={`/guide/${guide.id}`}
                    className="group bg-white/4 border border-white/8 hover:border-indigo-500/30 rounded-2xl p-4 transition-all hover:bg-white/6 hover:-translate-y-0.5 block">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md">{guide.type}</span>
                      {guide.best_quiz_score > 0 && (
                        <span className="text-xs text-yellow-400 font-semibold flex items-center gap-1">
                          <Trophy size={10} /> {guide.best_quiz_score}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-semibold text-sm leading-snug mb-3 group-hover:text-indigo-300 transition-colors line-clamp-2">{guide.title}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-gray-600 text-xs flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(guide.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <ArrowRight size={13} className="text-gray-700 group-hover:text-indigo-400 transition-colors" />
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
    </div>
  );
}
