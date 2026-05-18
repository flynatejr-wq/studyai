import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderOpen, BookOpen, Flame, Star, Zap, Trash2, X, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { api } from "../api.js";
import UploadForm from "../components/UploadForm.jsx";
import Results from "../components/Results.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

const FOLDER_COLORS = {
  indigo: "from-indigo-500 to-indigo-700", violet: "from-violet-500 to-violet-700",
  pink: "from-pink-500 to-pink-700", rose: "from-rose-500 to-rose-700",
  orange: "from-orange-500 to-orange-700", amber: "from-amber-500 to-amber-700",
  green: "from-green-500 to-green-700", teal: "from-teal-500 to-teal-700",
  sky: "from-sky-500 to-sky-700", blue: "from-blue-500 to-blue-700",
};

function xpForNextLevel(level) { return level * level * 100; }

export default function Dashboard() {
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [recentGuides, setRecentGuides] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState("📁");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      if (type === "text") data = await api.summarize.text(transcript);
      else if (type === "image") data = await api.summarize.image(file);
      else if (type === "audio") data = await api.summarize.audio(file);
      else data = await api.summarize.file(file);
      setResults(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSave = async (folderId) => {
    if (!results) return;
    try {
      const guide = await api.guides.save({
        title: results.title || "Untitled Guide",
        folder_id: folderId || null,
        type: "text",
        summary: results.summary,
        key_terms: results.keyTerms || results.key_terms,
        quiz_questions: results.quizQuestions || results.quiz_questions,
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.folders.create({ name: newFolderName, icon: newFolderIcon });
      setNewFolderName(""); setNewFolderIcon("📁"); setShowNewFolder(false);
      toast({ message: `Folder "${newFolderName}" created!`, type: "success" });
      loadData();
    } catch (err) {
      toast({ message: err.message, type: "error" });
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      await api.folders.delete(deleteFolderTarget.id);
      toast({ message: `Folder deleted.`, type: "success" });
      loadData();
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setDeleteFolderTarget(null);
    }
  };

  const xpNext = xpForNextLevel(user?.level || 1);
  const xpProgress = Math.min(((user?.xp || 0) % xpNext) / xpNext * 100, 100);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar onLogout={logout} />

      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate">Hey, {user?.name?.split(" ")[0]} 👋</h1>
            <p className="text-gray-400 mt-0.5 text-sm">Ready to study? Let's go.</p>
          </div>
          <button onClick={() => { setShowCreate(true); setResults(null); }}
            className="flex items-center gap-1.5 px-3 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-semibold text-white transition-all shadow-lg shadow-indigo-500/20 text-sm shrink-0 whitespace-nowrap">
            <Plus size={16} /> <span className="hidden sm:inline">New Study Guide</span><span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 md:mb-8">
          <StatCard icon={<Flame className="text-orange-400" size={20} />} label="Day Streak" value={`${user?.streak || 0} 🔥`} bg="from-orange-500/10 to-orange-600/5 border-orange-500/20" />
          <StatCard icon={<Zap className="text-yellow-400" size={20} />} label="Total XP" value={user?.xp || 0} bg="from-yellow-500/10 to-yellow-600/5 border-yellow-500/20" />
          <StatCard icon={<BookOpen className="text-indigo-400" size={20} />} label="Guides Created" value={user?.total_guides || 0} bg="from-indigo-500/10 to-indigo-600/5 border-indigo-500/20" />
          <StatCard icon={<Star className="text-violet-400" size={20} />} label="Quizzes Taken" value={user?.total_quizzes || 0} bg="from-violet-500/10 to-violet-600/5 border-violet-500/20" />
        </div>

        {/* XP / Level Bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span className="text-white font-bold">Level {user?.level || 1}</span>
            </div>
            <span className="text-gray-400 text-sm">{user?.xp || 0} / {xpNext} XP to Level {(user?.level || 1) + 1}</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }} transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
          </div>
        </div>

        {/* Create Guide Panel */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Create New Study Guide</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}
              {!results ? (
                <UploadForm onSubmit={handleSubmit} loading={loading} dark />
              ) : (
                <div>
                  <Results results={results} onReset={() => setResults(null)} dark />
                  <div className="mt-6 flex items-center gap-3 flex-wrap">
                    <select value={saveFolder} onChange={e => setSaveFolder(e.target.value)}
                      className="bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500">
                      <option value="">📂 No folder</option>
                      {folders.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
                    </select>
                    <button onClick={() => handleSave(saveFolder)}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-semibold text-white text-sm transition-all">
                      💾 Save Guide
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Folders */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><FolderOpen size={20} className="text-indigo-400" /> Folders</h2>
            <button onClick={() => setShowNewFolder(!showNewFolder)} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1">
              <Plus size={15} /> New Folder
            </button>
          </div>

          {showNewFolder && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 mb-4 flex-wrap">
              <input value={newFolderIcon} onChange={e => setNewFolderIcon(e.target.value)}
                className="w-14 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-center focus:outline-none focus:border-indigo-500" placeholder="📁" />
              <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name..."
                onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 min-w-40" />
              <button onClick={handleCreateFolder} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm">Create</button>
              <button onClick={() => setShowNewFolder(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 text-sm">Cancel</button>
            </motion.div>
          )}

          {folders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              <FolderOpen size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No folders yet. Create one to organize your guides.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {folders.map(folder => (
                <Link key={folder.id} to={`/folder/${folder.id}`}
                  className="group relative bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-4 transition-all hover:bg-white/8">
                  <button
                    onClick={e => { e.stopPropagation(); e.preventDefault(); setDeleteFolderTarget({ id: folder.id, name: folder.name }); }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1">
                    <Trash2 size={14} />
                  </button>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${FOLDER_COLORS[folder.color] || FOLDER_COLORS.indigo} flex items-center justify-center text-xl mb-3`}>
                    {folder.icon}
                  </div>
                  <p className="text-white font-semibold text-sm truncate pr-4">{folder.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{folder.guide_count} guide{folder.guide_count !== 1 ? "s" : ""}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Guides */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><BookOpen size={20} className="text-indigo-400" /> Recent Guides</h2>
            <Link to="/guides" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1">View all <ChevronRight size={15} /></Link>
          </div>

          {recentGuides.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No guides yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentGuides.map(guide => (
                <Link key={guide.id} to={`/guide/${guide.id}`}
                  className="bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-4 transition-all hover:bg-white/8 group">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">{guide.type}</span>
                    {guide.best_quiz_score > 0 && (
                      <span className="text-xs text-yellow-400 font-medium">⭐ {guide.best_quiz_score}/{guide.quiz_questions?.length || 5}</span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm leading-tight mb-2 group-hover:text-indigo-300 transition-colors">{guide.title}</h3>
                  <p className="text-gray-500 text-xs">{new Date(guide.created_at).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
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

function StatCard({ icon, label, value, bg }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${bg} border rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-gray-400 text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </motion.div>
  );
}
