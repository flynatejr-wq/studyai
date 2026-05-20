import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, BookOpen, ChevronRight, ArrowRight,
  Trophy, Clock, Zap, Flame, Sparkles, Crown,
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

  const [folders,       setFolders]       = useState([]);
  const [recentGuides,  setRecentGuides]  = useState([]);
  const [results,       setResults]       = useState(null);
  const [loading,       setLoading]       = useState(false);
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
      if ((err.message || "").includes("FREE_LIMIT")) {
        const reason = err.message.includes("QUIZZES") ? "FREE_LIMIT_QUIZZES" : "FREE_LIMIT_GUIDES";
        setUpgradeReason(reason); setUpgradeOpen(true);
      } else {
        setError(err.message);
      }
    } finally { setLoading(false); }
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
      toast({ message: "Guide saved!", type: "success" });
      navigate(`/guide/${guide.id}`);
    } catch (err) {
      setError(err.message);
      toast({ message: err.message, type: "error" });
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  const isPro = user?.plan === "pro";

  const handleUpgrade = async () => {
    try {
      const { url } = await api.stripe.checkout();
      window.location.href = url;
    } catch (err) {
      toast({ message: err.message || "Could not start checkout. Please try again.", type: "error" });
    }
  };
  const stats = [
    { icon: BookOpen, value: user?.total_guides ?? 0, label: "Guides",     bg: "bg-indigo-500/15", text: "text-indigo-400" },
    { icon: Flame,    value: user?.streak ?? 0,       label: "Day Streak", bg: "bg-orange-500/15", text: "text-orange-400" },
    { icon: Zap,      value: user?.xp ?? 0,           label: "XP Earned",  bg: "bg-violet-500/15", text: "text-violet-400" },
  ];

  return (
    <div className="flex min-h-dvh bg-[#0a0a12] w-full overflow-x-hidden">
      <Sidebar onLogout={logout} />

      <main className="flex-1 min-w-0 overflow-x-hidden md:ml-64 p-4 md:p-8 main-pt">

        {/* ── Compact header ── */}
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400 shrink-0" />
              Generate Study Notes
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              Hey {firstName} 👋 — paste text, upload a file, or drop a YouTube link
            </p>
          </div>
          {/* Stats pills — compact, desktop only */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {stats.map(s => (
              <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${s.bg} border border-white/5`}>
                <s.icon size={12} className={s.text} />
                <span className="text-white text-xs font-bold">{s.value.toLocaleString()}</span>
                <span className="text-gray-500 text-xs">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── HERO: Create Guide ── always visible ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
          )}
          {!results ? (
            <UploadForm onSubmit={handleSubmit} loading={loading} dark />
          ) : (
            <div className="bg-white/4 border border-white/10 rounded-2xl p-5 md:p-6">
              <Results results={results} onReset={() => { setResults(null); try { localStorage.removeItem("studybuddi_draft"); } catch (_) {} }} dark />
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
                <button
                  onClick={() => { setResults(null); try { localStorage.removeItem("studybuddi_draft"); } catch (_) {} }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white text-sm transition-all">
                  <Plus size={14} /> New
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Mobile stats row ── */}
        <div className="grid grid-cols-3 gap-2 mb-6 md:hidden">
          {stats.map(s => (
            <div key={s.label} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl ${s.bg} border border-white/5`}>
              <s.icon size={13} className={s.text} />
              <p className="text-white text-sm font-black leading-none">{s.value.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Pro upgrade banner — only for free users ── */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600/15 to-violet-600/15 border border-indigo-500/25 hover:border-indigo-500/45 transition-all cursor-pointer group"
            onClick={handleUpgrade}>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Crown size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none mb-0.5">Upgrade to Pro — $9.99/month</p>
              <p className="text-indigo-300/80 text-xs">Unlimited guides, unlimited AI quiz generations, priority support</p>
            </div>
            <span className="shrink-0 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/30 whitespace-nowrap group-hover:shadow-indigo-500/50">
              Upgrade ✨
            </span>
          </motion.div>
        )}

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
            <div className="text-center py-10 border border-dashed border-white/8 rounded-2xl">
              <BookOpen size={28} className="mx-auto mb-3 text-indigo-400/40" />
              <p className="text-white font-semibold text-sm mb-1">No guides yet</p>
              <p className="text-xs text-gray-600">Generate your first guide above ↑</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentGuides.map((guide, i) => (
                <motion.div key={guide.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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
