import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Trash2, Search, Loader2, Trophy, Clock,
  ArrowRight, Plus, FolderOpen, X, ChevronRight, Star, FolderInput, Check,
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import UpgradeModal from "../components/UpgradeModal.jsx";

const PAGE = 24;
const TYPE_LABEL = { text: "📝 Notes", youtube: "🎥 YouTube", image: "🖼️ Photo", audio: "🎙️ Audio", file: "📄 File" };
const guideTypeLabel = (type) => TYPE_LABEL[type] || "📝 Notes";

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
  const [movingGuideId,  setMovingGuideId]  = useState(null); // guide whose folder picker is open
  const [movingLoading,  setMovingLoading]  = useState(false);
  const searchTimer   = useRef(null);
  // BUG-18: Sequence counter guards against stale responses from out-of-order search requests
  const fetchSeqRef   = useRef(0);

  // ── Folders state ─────────────────────────────────────────────────────────
  const [folders,        setFolders]        = useState([]);
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState("");
  const [newFolderIcon,  setNewFolderIcon]  = useState("📁");
  const [newFolderColor, setNewFolderColor] = useState("indigo");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [upgradeOpen,   setUpgradeOpen]   = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [sort,           setSort]           = useState("newest"); // newest|oldest|alpha|score

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchGuides = useCallback(async (newOffset, query, append = false) => {
    // BUG-18: Capture sequence at call time; discard response if a newer request has since fired
    const seq = ++fetchSeqRef.current;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const res      = await api.guides.listPaged(newOffset, query);
      if (seq !== fetchSeqRef.current) return; // stale response — discard
      const incoming = Array.isArray(res.guides) ? res.guides : [];
      setGuides(g => append ? [...g, ...incoming] : incoming);
      setTotal(res.total   ?? 0);
      setHasMore(res.hasMore ?? false);
      setOffset(newOffset + PAGE);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      toast({ message: err.message, type: "error" });
    } finally {
      if (seq === fetchSeqRef.current) {
        append ? setLoadingMore(false) : setLoading(false);
      }
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const f = await api.folders.list();
      setFolders(Array.isArray(f) ? f : []);
    } catch (_) {}
  }, []);

  // Bug 9 fix: fetch folders only on mount, not on every search change
  useEffect(() => { fetchFolders(); }, []);

  // Close the folder picker when clicking anywhere outside
  useEffect(() => {
    if (!movingGuideId) return;
    const handler = () => setMovingGuideId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [movingGuideId]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; fetchGuides(0, search); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setOffset(0); fetchGuides(0, search); }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // ── Guides actions ────────────────────────────────────────────────────────
  const toggleFavorite = async (e, guide) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const { is_favorite } = await api.guides.toggleFavorite(guide.id);
      setGuides(prev => prev.map(g => g.id === guide.id ? { ...g, is_favorite } : g));
    } catch (err) {
      toast({ message: err.message, type: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.guides.delete(deleteTarget.id);
      const newGuides = guides.filter(x => x.id !== deleteTarget.id);
      const newTotal  = total - 1;
      setGuides(newGuides);
      setTotal(newTotal);
      setHasMore(newGuides.length < newTotal); // recalculate so "Load more" disappears correctly
      toast({ message: "Guide deleted.", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Move guide to folder ──────────────────────────────────────────────────
  const moveGuide = async (guideId, folderId) => {
    // Snapshot old folder_id BEFORE the await so the optimistic update below
    // isn't affected by stale closure state (reviewer issue #2)
    const oldFolderId = guides.find(g => g.id === guideId)?.folder_id ?? null;
    const targetFolder = folders.find(f => f.id === folderId);
    setMovingLoading(true);
    try {
      await api.guides.move(guideId, folderId);
      setGuides(prev => prev.map(g => g.id === guideId ? { ...g, folder_id: folderId } : g));
      // Update folder guide_count counters using the pre-await snapshot
      setFolders(prev => prev.map(f => {
        if (f.id === folderId)    return { ...f, guide_count: (f.guide_count || 0) + 1 };
        if (f.id === oldFolderId) return { ...f, guide_count: Math.max(0, (f.guide_count || 0) - 1) };
        return f;
      }));
      toast({ message: folderId ? `Moved to "${targetFolder?.name}"` : "Removed from folder", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setMovingLoading(false);
      setMovingGuideId(null);
    }
  };

  // ── Folder actions ────────────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const f = await api.folders.create({ name: newFolderName.trim(), icon: newFolderIcon, color: newFolderColor });
      setFolders(prev => [...prev, { ...f, guide_count: 0 }]);
      setNewFolderName(""); setNewFolderIcon("📁"); setNewFolderColor("indigo"); setShowNewFolder(false);
      toast({ message: `Folder "${newFolderName}" created!`, type: "success" });
    } catch (err) {
      if ((err.message || "").includes("FREE_LIMIT_FOLDERS")) {
        setUpgradeReason("FREE_LIMIT_FOLDERS");
        setUpgradeOpen(true);
        setShowNewFolder(false);
      } else {
        toast({ message: err.message, type: "error" });
      }
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

  // Compute sorted copy without mutating state
  const sortedGuides = (() => {
    const copy = [...guides];
    if (sort === "oldest")    copy.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sort === "alpha")     copy.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "score")     copy.sort((a, b) => (b.best_quiz_score || 0) - (a.best_quiz_score || 0));
    else if (sort === "favorites") copy.sort((a, b) => (b.is_favorite || 0) - (a.is_favorite || 0));
    else copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // newest
    return copy;
  })();

  return (
    <div className="flex min-h-dvh bg-[#080810] w-full">
      <Sidebar onLogout={logout} />
      <main className="flex-1 min-w-0 md:ml-64 p-4 md:p-8 main-pt">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-1">Library</p>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <BookOpen size={22} className="text-indigo-400" /> All Guides
            </h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              {loading ? "Loading…" : `${total} guide${total !== 1 ? "s" : ""} in your library`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sort} onChange={e => setSort(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-300 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alpha">A → Z</option>
              <option value="score">Best Score</option>
              <option value="favorites">⭐ Favorites</option>
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                maxLength={100}
                placeholder="Search guides…"
                className="w-full sm:w-56 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
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
                <div className="space-y-2 mb-3 pb-1">
                  <div className="flex gap-2 flex-wrap">
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
                      onClick={() => { setShowNewFolder(false); setNewFolderName(""); setNewFolderIcon("📁"); setNewFolderColor("indigo"); }}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  {/* Color swatches */}
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.keys(FOLDER_COLORS).map(color => (
                      <button key={color} type="button" onClick={() => setNewFolderColor(color)}
                        className={`w-6 h-6 rounded-full bg-gradient-to-br ${FOLDER_COLORS[color]} transition-all ${newFolderColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "opacity-60 hover:opacity-100"}`}
                        title={color} />
                    ))}
                  </div>
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
                {sortedGuides.map((guide, i) => (
                  <motion.div
                    key={guide.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.25) }}
                    className="relative">
                    <Link
                      to={`/guide/${guide.id}`}
                      className="group relative bg-white/4 border border-white/8 hover:border-indigo-500/30 rounded-2xl p-4 block transition-all hover:bg-white/6 hover:-translate-y-0.5">
                      {/* Favorite star */}
                      <button
                        onClick={e => toggleFavorite(e, guide)}
                        className={`absolute top-3 right-10 p-1.5 rounded-lg transition-all ${guide.is_favorite ? "text-yellow-400 opacity-100" : "opacity-0 group-hover:opacity-100 text-gray-600 hover:text-yellow-400 hover:bg-yellow-400/10"}`}
                        title={guide.is_favorite ? "Remove from favorites" : "Add to favorites"}>
                        <Star size={13} fill={guide.is_favorite ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: guide.id, title: guide.title }); }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1.5 rounded-lg hover:bg-red-400/10">
                        <Trash2 size={13} />
                      </button>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md">{guideTypeLabel(guide.type)}</span>
                        {/* Folder badge — shows which folder this guide is in */}
                        {guide.folder_id && (() => {
                          const f = folders.find(x => x.id === guide.folder_id);
                          return f ? (
                            <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[7rem]">
                              <FolderOpen size={10} className="shrink-0" /> {f.icon} {f.name}
                            </span>
                          ) : null;
                        })()}
                      </div>

                      <h3 className="text-white font-semibold text-sm leading-snug mb-3 group-hover:text-indigo-300 transition-colors pr-6 line-clamp-2">
                        {guide.title}
                      </h3>

                      {guide.quiz_attempts > 0 && (
                        <div className="mb-3">
                          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                              style={{ width: `${Math.round((guide.best_quiz_score / (guide.quiz_questions?.length || guide.best_quiz_score || 1)) * 100)}%` }}
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
                          {/* Move-to-folder button */}
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setMovingGuideId(g => g === guide.id ? null : guide.id); }}
                            className={`opacity-0 group-hover:opacity-100 flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all ${guide.folder_id ? "text-indigo-400 hover:bg-indigo-500/10" : "text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10"}`}
                            title="Move to folder">
                            <FolderInput size={11} />
                          </button>
                          {guide.best_quiz_score > 0 && (
                            <span className="flex items-center gap-1 text-yellow-500">
                              <Trophy size={10} /> {guide.best_quiz_score}/{guide.quiz_questions?.length || guide.best_quiz_score || 1}
                            </span>
                          )}
                          <ArrowRight size={12} className="text-gray-700 group-hover:text-indigo-400 transition-colors" />
                        </div>
                      </div>
                    </Link>

                    {/* ── Folder picker popover ── */}
                    <AnimatePresence>
                      {movingGuideId === guide.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute left-0 right-0 z-30 mt-1 bg-[#13131f] border border-white/12 rounded-2xl shadow-2xl shadow-black/60 p-2 overflow-hidden">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-2 py-1.5">Move to folder</p>

                          {/* No folder option */}
                          <button
                            disabled={movingLoading}
                            onClick={e => { e.stopPropagation(); moveGuide(guide.id, null); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left
                              ${!guide.folder_id ? "bg-indigo-500/15 text-indigo-300" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                            <span className="w-6 h-6 rounded-md bg-white/8 flex items-center justify-center text-gray-500 text-xs">—</span>
                            <span className="flex-1">No folder</span>
                            {!guide.folder_id && <Check size={12} className="text-indigo-400 shrink-0" />}
                          </button>

                          {folders.length === 0 && (
                            <p className="text-xs text-gray-600 px-3 py-2">No folders yet — create one above.</p>
                          )}

                          {folders.map(folder => {
                            const grad = FOLDER_COLORS[folder.color] || FOLDER_COLORS.indigo;
                            const active = guide.folder_id === folder.id;
                            return (
                              <button
                                key={folder.id}
                                disabled={movingLoading}
                                onClick={e => { e.stopPropagation(); moveGuide(guide.id, folder.id); }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left
                                  ${active ? "bg-indigo-500/15 text-indigo-300" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}>
                                <span className={`w-6 h-6 shrink-0 rounded-md bg-gradient-to-br ${grad} flex items-center justify-center text-xs`}>
                                  {folder.icon}
                                </span>
                                <span className="flex-1 truncate">{folder.name}</span>
                                {active
                                  ? <Check size={12} className="text-indigo-400 shrink-0" />
                                  : <span className="text-gray-600 text-xs shrink-0">{folder.guide_count ?? 0}</span>
                                }
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
        message={`"${deleteFolderTarget?.name}" will be deleted. Guides inside it will be moved to 'No folder' and kept.`}
        confirmText="Delete Folder"
        onConfirm={confirmDeleteFolder}
        onCancel={() => setDeleteFolderTarget(null)}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
