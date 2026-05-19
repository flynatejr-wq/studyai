import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Trash2, Search, Loader2, Trophy, Clock,
  ArrowRight, Plus, FolderOpen, X, ChevronRight,
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

const PAGE = 24;

const FOLDER_COLORS = {
  indigo: "from-indigo-500 to-indigo-700",
  violet: "from-violet-500 to-violet-700",
  pink:   "from-pink-500 to-pink-700",
  rose:   "from-rose-500 to-rose-700",
  orange: "from-orange-500 to-orange-700",
  amber:  "from-amber-500 to-amber-700",
  green:  "from-green-500 to-green-700",
  teal:   "from-teal-500 to-teal-700",
  sky:    "from-sky-500 to-sky-700",
  blue:   "from-blue-500 to-blue-700",
};

export default function AllGuides() {
  const { logout } = useAuth();
  const toast = useToast();

  // ── Guides state ──────────────────────────────────────────────────────────
  const [guides,      setGuides]      = useState([]);
  const [total,       setTotal]       = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const [offset,      setOffset]      = useState(0);
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const searchTimer = useRef(null);

  // ── Folders state ─────────────────────────────────────────────────────────
  const [folders,        setFolders]        = useState([]);
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState("");
  const [newFolderIcon,  setNewFolderIcon]  = useState("📁");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchGuides = useCallback(async (newOffset, query, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const res      = await api.guides.listPaged(newOffset, query);
      const incoming = Array.isArray(res.guides) ? res.guides : [];
      setGuides(g => append ? [...g, ...incoming] : incoming);
      setTotal(res.total   ?? 0);
      setHasMore(res.hasMore ?? false);
      setOffset(newOffset + PAGE);
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const f = await api.folders.list();
      setFolders(Array.isArray(f) ? f : []);
    } catch (_) {}
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    fetchFolders();
    if (isFirstRender.current) { isFirstRender.current = false; fetchGuides(0, search); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setOffset(0); fetchGuides(0, search); }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // ── Guides actions ────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.guides.delete(deleteTarget.id);
      setGuides(g => g.filter(x => x.id !== deleteTarget.id));
      setTotal(t => t - 1);
      toast({ message: "Guide deleted.", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Folder actions ────────────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const f = await api.folders.create({ name: newFolderName.trim(), icon: newFolderIcon });
      setFolders(prev => [...prev, { ...f, guide_count: 0 }]);
      setNewFolderName(""); setNewFolderIcon("📁"); setShowNewFolder(false);
      toast({ message: `Folder "${newFolderName}" created!`, type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      await api.folders.delete(deleteFolderTarget.id);
      setFolders(prev => prev.filter(f => f.id !== deleteFolderTarget.id));
      toast({ message: "Folder deleted.", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setDeleteFolderTarget(null);
    }
  };

  return (
    <div className="flex min-h-dvh bg-[#0a0a12] w-full overflow-x-hidden">
      <Sidebar onLogout={logout} />
      <main className="flex-1 min-w-0 overflow-x-hidden md:ml-64 p-4 md:p-8 main-pt">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">All Guides</h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              {loading ? "Loading…" : `${total} guide${total !== 1 ? "s" : ""} total`}
            </p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              maxLength={100}
              placeholder="Search guides…"
              className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* ── Folders ── */}
        <section className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FolderOpen size={14} className="text-indigo-400" /> Folders
            </h2>
            <button
              onClick={() => setShowNewFolder(v => !v)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/10">
              <Plus size={13} /> New Folder
            </button>
          </div>

          {/* Folder creation form */}
          <AnimatePresence>
            {showNewFolder && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="flex gap-2 mb-3 flex-wrap pb-1">
                  <input
                    value={newFolderIcon}
                    onChange={e => setNewFolderIcon(e.target.value)}
                    className="w-12 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-center focus:outline-none focus:border-indigo-500 transition-colors text-base"
                    placeholder="📁" />
                  <input
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder="Folder name…"
                    onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm min-w-[8rem]" />
                  <button
                    onClick={handleCreateFolder}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-sm transition-all">
                    Create
                  </button>
                  <button
                    onClick={() => { setShowNewFolder(false); setNewFolderName(""); setNewFolderIcon("📁"); }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Folder cards */}
          {folders.length === 0 ? (
            <div className="text-center py-7 border border-dashed border-white/8 rounded-2xl">
              <FolderOpen size={24} className="mx-auto mb-2 text-gray-700" />
              <p className="text-sm text-gray-600">No folders yet — create one to organise your guides.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {folders.map((folder, i) => {
                const grad = FOLDER_COLORS[folder.color] || FOLDER_COLORS.indigo;
                return (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative">
                    <Link
                      to={`/folder/${folder.id}`}
                      className="flex items-center gap-3 bg-white/4 border border-white/8 hover:border-white/15 rounded-xl p-3 transition-all hover:bg-white/6 block">
                      <div className={`w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-base shadow-md`}>
                        {folder.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold text-sm truncate pr-4">{folder.name}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{folder.guide_count ?? 0} guide{(folder.guide_count ?? 0) !== 1 ? "s" : ""}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => setDeleteFolderTarget({ id: folder.id, name: folder.name })}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-red-400/10">
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Guides ── */}
        <section>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-indigo-400" /> Guides
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={22} className="text-indigo-400 animate-spin" />
            </div>
          ) : guides.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/8 rounded-2xl">
              <BookOpen size={36} className="mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 font-medium">
                {search ? "No guides match your search." : "No guides yet."}
              </p>
              {!search && (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 text-sm font-semibold hover:bg-indigo-600/30 transition-colors">
                  <Plus size={14} /> Create your first guide
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {guides.map((guide, i) => (
                  <motion.div
                    key={guide.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.25) }}>
                    <Link
                      to={`/guide/${guide.id}`}
                      className="group relative bg-white/4 border border-white/8 hover:border-indigo-500/30 rounded-2xl p-4 block transition-all hover:bg-white/6 hover:-translate-y-0.5">
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: guide.id, title: guide.title }); }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1.5 rounded-lg hover:bg-red-400/10">
                        <Trash2 size={13} />
                      </button>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md">{guide.type}</span>
                      </div>

                      <h3 className="text-white font-semibold text-sm leading-snug mb-3 group-hover:text-indigo-300 transition-colors pr-6 line-clamp-2">
                        {guide.title}
                      </h3>

                      {guide.quiz_attempts > 0 && (
                        <div className="mb-3">
                          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                              style={{ width: `${Math.round((guide.best_quiz_score / (guide.quiz_questions?.length || 5)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(guide.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <div className="flex items-center gap-2">
                          {guide.best_quiz_score > 0 && (
                            <span className="flex items-center gap-1 text-yellow-500">
                              <Trophy size={10} /> {guide.best_quiz_score}/{guide.quiz_questions?.length || 5}
                            </span>
                          )}
                          <ArrowRight size={12} className="text-gray-700 group-hover:text-indigo-400 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => fetchGuides(offset, search, true)}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-gray-400 text-sm font-medium transition-colors disabled:opacity-50">
                    {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                    {loadingMore ? "Loading…" : `Load more (${total - guides.length} remaining)`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <div aria-hidden="true" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </main>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this guide?"
        message={`"${deleteTarget?.title}" will be permanently deleted along with all quiz history.`}
        confirmText="Delete Guide"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

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
