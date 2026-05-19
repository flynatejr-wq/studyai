import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FolderOpen, BookOpen, Trash2, X,
  ChevronRight, ArrowRight, Trophy, Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { api } from "../api.js";
import UploadForm from "../components/UploadForm.jsx";
import Results from "../components/Results.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

const FOLDER_COLORS = {
  indigo: { bg: "from-indigo-500 to-indigo-700", glow: "shadow-indigo-500/25" },
  violet: { bg: "from-violet-500 to-violet-700", glow: "shadow-violet-500/25" },
  pink:   { bg: "from-pink-500   to-pink-700",   glow: "shadow-pink-500/25"   },
  rose:   { bg: "from-rose-500   to-rose-700",   glow: "shadow-rose-500/25"   },
  orange: { bg: "from-orange-500 to-orange-700", glow: "shadow-orange-500/25" },
  amber:  { bg: "from-amber-500  to-amber-700",  glow: "shadow-amber-500/25"  },
  green:  { bg: "from-green-500  to-green-700",  glow: "shadow-green-500/25"  },
  teal:   { bg: "from-teal-500   to-teal-700",   glow: "shadow-teal-500/25"   },
  sky:    { bg: "from-sky-500    to-sky-700",    glow: "shadow-sky-500/25"    },
  blue:   { bg: "from-blue-500   to-blue-700",   glow: "shadow-blue-500/25"   },
};

export default function Dashboard() {
  const { user, refreshUser, logout } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();

  const [folders,    setFolders]    = useState([]);
  const [recentGuides, setRecentGuides] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [results,    setResults]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [saveFolder, setSaveFolder] = useState("");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [f, g] = await Promise.all([api.folders.list(), api.guides.list()]);
      setFolders(Array.isArray(f) ? f : []);
      setRecentGuides(Array.isArray(g) ? g.slice(0, 6) : []);
    } catch (_) {}
  }

  const handleSubmit = async ({ type, transcript, file }) => {
    setLoading(true); setError(""); setResults(null);
    try {
      let data;
      if (type === "text")       data = await api.summarize.text(transcript);
      else if (type === "image") data = await api.summarize.image(file);
      else if (type === "audio") data = await api.summarize.audio(file);
      else                       data = await api.summarize.file(file);
      setResults(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSave = async (folderId) => {
    if (!results) return;
    try {
      const guide = await api.guides.save({
        title:          results.title || "Untitled Guide",
        folder_id:      folderId || null,
        type:           "text",
        summary:        results.summary,
        key_terms:      results.keyTerms || results.key_terms,
        quiz_questions: results.quizQuestions || results.quiz_questions,
        sections:       results.sections || [],
      });
      await refreshUser();
      await loadData();
      setResults(null);
      setShowCreate(false);
      toast({ message: "Guide saved!", type: "success" });
      navigate(`/guide/${guide.id}`);
    } catch (err) {
      setError(err.message);
      toast({ message: err.message, type: "error" });
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      await api.folders.delete(deleteFolderTarget.id);
      toast({ message: "Folder deleted.", type: "success" });
      loadData();
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setDeleteFolderTarget(null);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  const hourNow   = new Date().getHours();
  const greeting  = hourNow < 12 ? "Good morning" : hourNow < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex min-h-dvh bg-[#0a0a12] w-full overflow-x-hidden">
      <Sidebar onLogout={logout} />

      <main className="flex-1 min-w-0 overflow-x-hidden md:ml-64 p-4 md:p-8 main-pt">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-7 gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mb-0.5">{greeting}</p>
            <h1 className="text-xl md:text-2xl font-black text-white truncate">
              {firstName} <span className="text-2xl">👋</span>
            </h1>
          </div>
          <button
            onClick={() => { setShowCreate(true); setResults(null); }}
            className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-bold text-white transition-all shadow-lg shadow-indigo-500/25 text-sm shrink-0 hover:-translate-y-0.5">
            <Plus size={16} />
            <span className="hidden sm:inline">New Guide</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* ── Create Guide Panel ── */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-white/4 border border-white/10 rounded-2xl p-5 md:p-6 mb-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-white">Create New Study Guide</h2>
                  <p className="text-xs text-gray-500 mt-0.5">AI generates summary, key terms & quiz questions</p>
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

        {/* ── Folders ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FolderOpen size={15} className="text-indigo-400" /> Folders
            </h2>
            <Link
              to="/guides"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/10">
              Manage <ChevronRight size={13} />
            </Link>
          </div>

          {folders.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/8 rounded-2xl">
              <FolderOpen size={28} className="mx-auto mb-2.5 text-gray-700" />
              <p className="text-sm text-gray-600">No folders yet.</p>
              <Link to="/guides" className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                <Plus size={12} /> Create one in All Guides
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {folders.map((folder, i) => {
                const colors = FOLDER_COLORS[folder.color] || FOLDER_COLORS.indigo;
                return (
                  <motion.div key={folder.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <Link to={`/folder/${folder.id}`}
                      className="group relative bg-white/4 border border-white/8 hover:border-white/15 rounded-2xl p-4 transition-all hover:bg-white/6 hover:-translate-y-0.5 block">
                      <button
                        onClick={e => { e.stopPropagation(); e.preventDefault(); setDeleteFolderTarget({ id: folder.id, name: folder.name }); }}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-red-400/10">
                        <Trash2 size={13} />
                      </button>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center text-lg mb-3 shadow-lg ${colors.glow}`}>
                        {folder.icon}
                      </div>
                      <p className="text-white font-semibold text-sm truncate pr-5">{folder.name}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{folder.guide_count} guide{folder.guide_count !== 1 ? "s" : ""}</p>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Recent Guides ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={15} className="text-indigo-400" /> Recent Guides
            </h2>
            <Link to="/guides" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/10">
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {recentGuides.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/8 rounded-2xl">
              <BookOpen size={28} className="mx-auto mb-2.5 text-gray-700" />
              <p className="text-sm text-gray-600 mb-4">No guides yet. Create your first one above!</p>
              <button
                onClick={() => { setShowCreate(true); setResults(null); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 text-sm font-semibold hover:bg-indigo-600/30 transition-colors">
                <Plus size={14} /> Create a guide
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

      <ConfirmModal
        open={!!deleteFolderTarget}
        title="Delete this folder?"
        message={`"${deleteFolderTarget?.name}" and all guides inside it will be permanently deleted.`}
        confirmText="Delete Folder"
        onConfirm={confirmDeleteFolder}
        onCancel={() => setDeleteFolderTarget(null)}
      />
    </div>
  );
}
