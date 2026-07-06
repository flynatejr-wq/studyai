import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Trash2, Search, Loader2, Trophy, Clock,
  ArrowRight, Plus, FolderOpen, X, ChevronRight, Star, FolderInput, Check,
  Layers, PlayCircle, CheckCircle, Circle, Filter,
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
const TYPE_FILTERS = [
  { id: "text",    label: "Text" },
  { id: "youtube", label: "YouTube" },
  { id: "file",    label: "PDF/File" },
  { id: "image",   label: "Image" },
  { id: "audio",   label: "Audio" },
];

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

// Derive study status from a guide's section progress.
// Guides with no sections have no status (null) — they still appear under "All".
function guideProgress(g) {
  const sp = Array.isArray(g.section_progress) ? g.section_progress : [];
  const total = sp.length;
  if (total === 0) return { hasSections: false, status: null, pct: 0, done: 0, total: 0 };
  const done = sp.filter(Boolean).length;
  const status = done === 0 ? "not_started" : done === total ? "completed" : "in_progress";
  return { hasSections: true, status, pct: Math.round((done / total) * 100), done, total };
}

// Small circular progress ring for a guide card
function ProgressRing({ pct, done, total }) {
  const r = 13, c = 2 * Math.PI * r;
  const color = pct === 100 ? "#10b981" : pct > 0 ? "#818cf8" : "#4b5563";
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" className="shrink-0" role="img"
      aria-label={`${done} of ${total} sections complete`}>
      <circle cx="15" cy="15" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
      {pct > 0 && (
        <circle cx="15" cy="15" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 15 15)" />
      )}
      <text x="15" y="16" textAnchor="middle" dominantBaseline="middle" fontSize="8"
        fill={pct === 100 ? "#10b981" : "#9ca3af"} fontFamily="monospace">{pct}</text>
    </svg>
  );
}

export default function AllGuides() {
  const { logout } = useAuth();
  const toast = useToast();

  // ── Guides state ──────────────────────────────────────────────────────────
  const [guides,      setGuides]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [movingGuideId,  setMovingGuideId]  = useState(null);
  const [movingLoading,  setMovingLoading]  = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("all"); // all|in_progress|completed|not_started|favorites
  const [folderFilter, setFolderFilter] = useState("all"); // all|none|<folderId>
  const [typeFilter,   setTypeFilter]   = useState(() => new Set()); // empty = all types
  const [showFilters,  setShowFilters]  = useState(false); // mobile drawer

  // ── Folders state ─────────────────────────────────────────────────────────
  const [folders,        setFolders]        = useState([]);
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState("");
  const [newFolderIcon,  setNewFolderIcon]  = useState("📁");
  const [newFolderColor, setNewFolderColor] = useState("indigo");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [upgradeOpen,   setUpgradeOpen]   = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [sort,           setSort]           = useState("newest");

  // ── Bulk selection state ──────────────────────────────────────────────────
  const [selectedIds,        setSelectedIds]        = useState(new Set());
  const [selectMode,         setSelectMode]         = useState(false);
  const [bulkDeleteOpen,     setBulkDeleteOpen]     = useState(false);
  const [bulkMoveOpen,       setBulkMoveOpen]       = useState(false);
  const [bulkActionLoading,  setBulkActionLoading]  = useState(false);
  const bulkMoveRef = useRef(null);

  // ── Data fetching — load all guides once, then filter client-side ─────────
  const fetchGuides = useCallback(async () => {
    setLoading(true);
    try {
      const all = await api.guides.list();
      setGuides(Array.isArray(all) ? all : []);
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchFolders = useCallback(async () => {
    try {
      const f = await api.folders.list();
      setFolders(Array.isArray(f) ? f : []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchGuides(); fetchFolders(); }, [fetchGuides, fetchFolders]);

  // Reset how many are shown whenever filters/search change
  useEffect(() => { setVisibleCount(PAGE); }, [statusFilter, folderFilter, typeFilter, search, sort]);

  // Close the folder picker when clicking anywhere outside
  useEffect(() => {
    if (!movingGuideId) return;
    const handler = () => setMovingGuideId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [movingGuideId]);

  // Close the bulk move dropdown when clicking outside
  useEffect(() => {
    if (!bulkMoveOpen) return;
    const handler = (e) => {
      if (bulkMoveRef.current && !bulkMoveRef.current.contains(e.target)) setBulkMoveOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bulkMoveOpen]);

  // ── Facet counts (computed from the full set) ─────────────────────────────
  const facets = useMemo(() => {
    const byStatus = { all: guides.length, in_progress: 0, completed: 0, not_started: 0, favorites: 0 };
    const byType = {};
    const byFolder = {};
    for (const g of guides) {
      const { status } = guideProgress(g);
      if (status) byStatus[status]++;
      if (g.is_favorite) byStatus.favorites++;
      const t = g.type || "text";
      byType[t] = (byType[t] || 0) + 1;
      const fid = g.folder_id || "none";
      byFolder[fid] = (byFolder[fid] || 0) + 1;
    }
    return { byStatus, byType, byFolder };
  }, [guides]);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const filteredGuides = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = guides.filter(g => {
      // Folder
      if (folderFilter === "none") { if (g.folder_id) return false; }
      else if (folderFilter !== "all") { if (g.folder_id !== folderFilter) return false; }
      // Type
      if (typeFilter.size > 0 && !typeFilter.has(g.type || "text")) return false;
      // Status
      if (statusFilter === "favorites") { if (!g.is_favorite) return false; }
      else if (statusFilter !== "all") { if (guideProgress(g).status !== statusFilter) return false; }
      // Search
      if (q && !(g.title || "").toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "oldest")         list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sort === "alpha")     list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "score")     list.sort((a, b) => (b.best_quiz_score || 0) - (a.best_quiz_score || 0));
    else if (sort === "favorites") list.sort((a, b) => (b.is_favorite || 0) - (a.is_favorite || 0));
    else                           list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [guides, folderFilter, typeFilter, statusFilter, search, sort]);

  const visibleGuides = filteredGuides.slice(0, visibleCount);
  const hasMore = filteredGuides.length > visibleCount;

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (folderFilter !== "all" ? 1 : 0) + typeFilter.size;
  const clearFilters = () => { setStatusFilter("all"); setFolderFilter("all"); setTypeFilter(new Set()); };

  // ── Guide actions ─────────────────────────────────────────────────────────
  const toggleFavorite = async (e, guide) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const { is_favorite } = await api.guides.toggleFavorite(guide.id);
      setGuides(prev => prev.map(g => g.id === guide.id ? { ...g, is_favorite } : g));
    } catch (err) { toast({ message: err.message, type: "error" }); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.guides.delete(deleteTarget.id);
      setGuides(prev => prev.filter(x => x.id !== deleteTarget.id));
      toast({ message: "Guide deleted.", type: "success" });
    } catch (err) { toast({ message: err.message, type: "error" }); }
    finally { setDeleteTarget(null); }
  };

  const moveGuide = async (guideId, folderId) => {
    const oldFolderId = guides.find(g => g.id === guideId)?.folder_id ?? null;
    const targetFolder = folders.find(f => f.id === folderId);
    setMovingLoading(true);
    try {
      await api.guides.move(guideId, folderId);
      setGuides(prev => prev.map(g => g.id === guideId ? { ...g, folder_id: folderId } : g));
      setFolders(prev => prev.map(f => {
        if (f.id === folderId)    return { ...f, guide_count: (f.guide_count || 0) + 1 };
        if (f.id === oldFolderId) return { ...f, guide_count: Math.max(0, (f.guide_count || 0) - 1) };
        return f;
      }));
      toast({ message: folderId ? `Moved to "${targetFolder?.name}"` : "Removed from folder", type: "success" });
    } catch (err) { toast({ message: err.message, type: "error" }); }
    finally { setMovingLoading(false); setMovingGuideId(null); }
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
        setUpgradeReason("FREE_LIMIT_FOLDERS"); setUpgradeOpen(true); setShowNewFolder(false);
      } else { toast({ message: err.message, type: "error" }); }
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      await api.folders.delete(deleteFolderTarget.id);
      setFolders(prev => prev.filter(f => f.id !== deleteFolderTarget.id));
      if (folderFilter === deleteFolderTarget.id) setFolderFilter("all");
      toast({ message: "Folder deleted.", type: "success" });
    } catch (err) { toast({ message: err.message, type: "error" }); }
    finally { setDeleteFolderTarget(null); }
  };

  // ── Bulk selection helpers ────────────────────────────────────────────────
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); setBulkMoveOpen(false); };

  const toggleSelectCard = (e, guideId) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(guideId) ? next.delete(guideId) : next.add(guideId);
      setSelectMode(next.size > 0);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === visibleGuides.length) exitSelectMode();
    else { setSelectedIds(new Set(visibleGuides.map(g => g.id))); setSelectMode(true); }
  };

  const confirmBulkDelete = async () => {
    setBulkActionLoading(true);
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(id => api.guides.delete(id)));
      setGuides(prev => prev.filter(g => !ids.includes(g.id)));
      toast({ message: `${ids.length} guide${ids.length !== 1 ? "s" : ""} deleted.`, type: "success" });
      exitSelectMode();
    } catch (err) { toast({ message: err.message, type: "error" }); }
    finally { setBulkActionLoading(false); setBulkDeleteOpen(false); }
  };

  const handleBulkMove = async (folderId) => {
    setBulkMoveOpen(false); setBulkActionLoading(true);
    const ids = [...selectedIds];
    const targetFolder = folders.find(f => f.id === folderId);
    try {
      await Promise.all(ids.map(id => api.guides.move(id, folderId)));
      setGuides(prev => prev.map(g => ids.includes(g.id) ? { ...g, folder_id: folderId } : g));
      setFolders(prev => {
        const fromCounts = {};
        ids.forEach(id => {
          const oldFid = guides.find(g => g.id === id)?.folder_id ?? null;
          if (oldFid !== folderId) fromCounts[oldFid] = (fromCounts[oldFid] || 0) + 1;
        });
        const movingToTarget = ids.filter(id => guides.find(x => x.id === id)?.folder_id !== folderId).length;
        return prev.map(f => {
          if (folderId && f.id === folderId) return { ...f, guide_count: (f.guide_count || 0) + movingToTarget };
          if (fromCounts[f.id])              return { ...f, guide_count: Math.max(0, (f.guide_count || 0) - fromCounts[f.id]) };
          return f;
        });
      });
      toast({
        message: folderId
          ? `${ids.length} guide${ids.length !== 1 ? "s" : ""} moved to "${targetFolder?.name}"`
          : `${ids.length} guide${ids.length !== 1 ? "s" : ""} removed from folder`,
        type: "success",
      });
      exitSelectMode();
    } catch (err) { toast({ message: err.message, type: "error" }); }
    finally { setBulkActionLoading(false); }
  };

  const allVisibleSelected = visibleGuides.length > 0 && selectedIds.size === visibleGuides.length;

  // ── Filter rail (shared by desktop sidebar + mobile drawer) ───────────────
  const STATUS_ITEMS = [
    { id: "all",         label: "All guides",  icon: Layers,      count: facets.byStatus.all },
    { id: "in_progress", label: "In progress", icon: PlayCircle,  count: facets.byStatus.in_progress },
    { id: "completed",   label: "Completed",   icon: CheckCircle, count: facets.byStatus.completed },
    { id: "not_started", label: "Not started", icon: Circle,      count: facets.byStatus.not_started },
    { id: "favorites",   label: "Favorites",   icon: Star,        count: facets.byStatus.favorites },
  ];

  const toggleType = (id) => setTypeFilter(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const Rail = () => (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-2 px-1">Status</p>
        <div className="space-y-0.5">
          {STATUS_ITEMS.map(({ id, label, icon: Icon, count }) => {
            const active = statusFilter === id;
            return (
              <button key={id} onClick={() => setStatusFilter(id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                  active ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                         : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"}`}>
                <Icon size={15} className={active ? "text-indigo-400" : "text-gray-500"} />
                <span className="flex-1 text-left">{label}</span>
                <span className={`text-xs ${active ? "text-indigo-400" : "text-gray-600"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Folders */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Folders</p>
          <button onClick={() => setShowNewFolder(v => !v)}
            className="text-indigo-400 hover:text-indigo-300 transition-colors" title="New folder">
            <Plus size={14} />
          </button>
        </div>

        <AnimatePresence>
          {showNewFolder && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-2">
              <div className="space-y-2 px-1">
                <div className="flex gap-1.5">
                  <input value={newFolderIcon} onChange={e => setNewFolderIcon(e.target.value)}
                    className="w-9 bg-white/5 border border-white/10 rounded-lg px-1 py-1.5 text-white text-center text-sm focus:outline-none focus:border-indigo-500" placeholder="📁" />
                  <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    placeholder="Folder name…" onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {Object.keys(FOLDER_COLORS).map(color => (
                    <button key={color} type="button" onClick={() => setNewFolderColor(color)}
                      className={`w-5 h-5 rounded-full bg-gradient-to-br ${FOLDER_COLORS[color]} transition-all ${newFolderColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-black scale-110" : "opacity-60 hover:opacity-100"}`}
                      title={color} />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleCreateFolder} className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold text-xs transition-all">Create</button>
                  <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"><X size={14} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-0.5">
          <button onClick={() => setFolderFilter("all")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
              folderFilter === "all" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                                     : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"}`}>
            <FolderOpen size={15} className={folderFilter === "all" ? "text-indigo-400" : "text-gray-500"} />
            <span className="flex-1 text-left">All folders</span>
          </button>
          <button onClick={() => setFolderFilter("none")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
              folderFilter === "none" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"}`}>
            <span className="w-[15px] text-center text-gray-500">—</span>
            <span className="flex-1 text-left">No folder</span>
            <span className="text-xs text-gray-600">{facets.byFolder.none || 0}</span>
          </button>
          {folders.map(folder => {
            const active = folderFilter === folder.id;
            const grad = FOLDER_COLORS[folder.color] || FOLDER_COLORS.indigo;
            return (
              <div key={folder.id} className="group/f relative">
                <button onClick={() => setFolderFilter(folder.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                    active ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                           : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"}`}>
                  <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${grad} shrink-0`} />
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  <span className={`text-xs ${active ? "text-indigo-400" : "text-gray-600"} group-hover/f:opacity-0`}>{facets.byFolder[folder.id] || 0}</span>
                </button>
                <button onClick={() => setDeleteFolderTarget({ id: folder.id, name: folder.name })}
                  className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover/f:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1"
                  title="Delete folder"><Trash2 size={12} /></button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Type */}
      <div>
        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-2 px-1">Type</p>
        <div className="flex flex-wrap gap-1.5 px-1">
          {TYPE_FILTERS.map(({ id, label }) => {
            const active = typeFilter.has(id);
            return (
              <button key={id} onClick={() => toggleType(id)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  active ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-300"
                         : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button onClick={clearFilters}
          className="w-full text-xs text-gray-500 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-left">
          Clear filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-[#080810] w-full">
      <Sidebar onLogout={logout} />
      <main className="flex-1 min-w-0 md:ml-64 p-4 md:p-8 main-pt">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-1">Library</p>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <BookOpen size={22} className="text-indigo-400" /> Your Library
            </h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              {loading ? "Loading…" : `${filteredGuides.length} of ${guides.length} guide${guides.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mobile filter toggle */}
            <button onClick={() => setShowFilters(true)}
              className="md:hidden flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-300 text-sm">
              <Filter size={14} /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-300 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alpha">A → Z</option>
              <option value="score">Best Score</option>
              <option value="favorites">⭐ Favorites</option>
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} maxLength={100} placeholder="Search guides…"
                className="w-full sm:w-56 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* ── Two-pane: rail + grid ── */}
        <div className="flex gap-6">
          {/* Desktop rail */}
          <aside className="hidden md:block w-52 shrink-0">
            <Rail />
          </aside>

          {/* Content */}
          <section className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 min-h-[28px]">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={14} className="text-indigo-400" /> Guides
              </h2>
              {selectMode && visibleGuides.length > 0 && (
                <button onClick={handleSelectAll}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/10">
                  {allVisibleSelected ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={22} className="text-indigo-400 animate-spin" /></div>
            ) : filteredGuides.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/8 rounded-2xl">
                <BookOpen size={36} className="mx-auto mb-3 text-gray-700" />
                <p className="text-gray-500 font-medium">
                  {guides.length === 0 ? "No guides yet." : "No guides match these filters."}
                </p>
                {guides.length === 0 ? (
                  <Link to="/dashboard" className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 text-sm font-semibold hover:bg-indigo-600/30 transition-colors">
                    <Plus size={14} /> Create your first guide
                  </Link>
                ) : activeFilterCount > 0 || search ? (
                  <button onClick={() => { clearFilters(); setSearch(""); }}
                    className="mt-4 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-sm font-semibold hover:bg-white/10 transition-colors">
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {visibleGuides.map((guide, i) => {
                    const isSelected = selectedIds.has(guide.id);
                    const prog = guideProgress(guide);
                    return (
                      <motion.div key={guide.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.25) }} className="relative">
                        <button onClick={e => toggleSelectCard(e, guide.id)}
                          aria-label={isSelected ? "Deselect guide" : "Select guide"}
                          className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-md border flex items-center justify-center transition-all
                            ${selectMode ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"}
                            ${isSelected ? "bg-indigo-600 border-indigo-500" : "bg-black/40 border-white/20 hover:border-indigo-400"}`}>
                          {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                        </button>

                        <Link to={selectMode ? "#" : `/guide/${guide.id}`}
                          onClick={selectMode ? e => toggleSelectCard(e, guide.id) : undefined}
                          className={`card-lift group/card relative bg-white/4 border rounded-2xl p-4 block hover:bg-white/6 transition-all
                            ${isSelected ? "border-indigo-500/60 ring-2 ring-indigo-500/60 bg-indigo-500/5" : "border-white/8"}`}>
                          {!selectMode && (
                            <button onClick={e => toggleFavorite(e, guide)}
                              className={`absolute top-3 right-10 p-1.5 rounded-lg transition-all ${guide.is_favorite ? "text-yellow-400 opacity-100" : "opacity-0 group-hover/card:opacity-100 text-gray-600 hover:text-yellow-400 hover:bg-yellow-400/10"}`}
                              title={guide.is_favorite ? "Remove from favorites" : "Add to favorites"}>
                              <Star size={13} fill={guide.is_favorite ? "currentColor" : "none"} />
                            </button>
                          )}
                          {!selectMode && (
                            <button onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: guide.id, title: guide.title }); }}
                              className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1.5 rounded-lg hover:bg-red-400/10">
                              <Trash2 size={13} />
                            </button>
                          )}

                          <div className={`flex items-center gap-2 mb-3 ${selectMode ? "pl-5" : ""}`}>
                            <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md">{guideTypeLabel(guide.type)}</span>
                            {guide.folder_id && (() => {
                              const f = folders.find(x => x.id === guide.folder_id);
                              return f ? (
                                <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[7rem]">
                                  <FolderOpen size={10} className="shrink-0" /> {f.icon} {f.name}
                                </span>
                              ) : null;
                            })()}
                          </div>

                          <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className={`text-white font-semibold text-sm leading-snug group-hover/card:text-indigo-300 transition-colors line-clamp-2 ${selectMode ? "pl-5" : "pr-6"}`}>
                              {guide.title}
                            </h3>
                            {prog.hasSections && <ProgressRing pct={prog.pct} done={prog.done} total={prog.total} />}
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(guide.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <div className="flex items-center gap-2">
                              {!selectMode && (
                                <button onClick={e => { e.preventDefault(); e.stopPropagation(); setMovingGuideId(g => g === guide.id ? null : guide.id); }}
                                  className={`opacity-0 group-hover/card:opacity-100 flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all ${guide.folder_id ? "text-indigo-400 hover:bg-indigo-500/10" : "text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10"}`}
                                  title="Move to folder"><FolderInput size={11} /></button>
                              )}
                              {guide.best_quiz_score > 0 && (
                                <span className="flex items-center gap-1 text-yellow-500">
                                  <Trophy size={10} /> {guide.best_quiz_score}/{guide.quiz_questions?.length || guide.best_quiz_score || 1}
                                </span>
                              )}
                              {!selectMode && <ArrowRight size={12} className="text-gray-700 group-hover/card:text-indigo-400 transition-colors" />}
                            </div>
                          </div>
                        </Link>

                        {/* Folder picker popover */}
                        <AnimatePresence>
                          {movingGuideId === guide.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.12 }}
                              className="absolute left-0 right-0 z-30 mt-1 bg-[#13131f] border border-white/12 rounded-2xl shadow-2xl shadow-black/60 p-2 overflow-hidden">
                              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-2 py-1.5">Move to folder</p>
                              <button disabled={movingLoading} onClick={e => { e.stopPropagation(); moveGuide(guide.id, null); }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${!guide.folder_id ? "bg-indigo-500/15 text-indigo-300" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                                <span className="w-6 h-6 rounded-md bg-white/8 flex items-center justify-center text-gray-500 text-xs">—</span>
                                <span className="flex-1">No folder</span>
                                {!guide.folder_id && <Check size={12} className="text-indigo-400 shrink-0" />}
                              </button>
                              {folders.length === 0 && <p className="text-xs text-gray-600 px-3 py-2">No folders yet — create one in the rail.</p>}
                              {folders.map(folder => {
                                const grad = FOLDER_COLORS[folder.color] || FOLDER_COLORS.indigo;
                                const active = guide.folder_id === folder.id;
                                return (
                                  <button key={folder.id} disabled={movingLoading} onClick={e => { e.stopPropagation(); moveGuide(guide.id, folder.id); }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${active ? "bg-indigo-500/15 text-indigo-300" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}>
                                    <span className={`w-6 h-6 shrink-0 rounded-md bg-gradient-to-br ${grad} flex items-center justify-center text-xs`}>{folder.icon}</span>
                                    <span className="flex-1 truncate">{folder.name}</span>
                                    {active ? <Check size={12} className="text-indigo-400 shrink-0" /> : <span className="text-gray-600 text-xs shrink-0">{folder.guide_count ?? 0}</span>}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="mt-8 text-center">
                    <button onClick={() => setVisibleCount(c => c + PAGE)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-gray-400 text-sm font-medium transition-colors">
                      Load more ({filteredGuides.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <div aria-hidden="true" style={{ height: selectMode ? "80px" : "env(safe-area-inset-bottom, 0px)" }} />
      </main>

      {/* ── Mobile filter drawer ── */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="md:hidden fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" />
            <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 26 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[#0c0c18] border-r border-white/10 z-50 overflow-y-auto p-4"
              style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2"><Filter size={15} className="text-indigo-400" /> Filters</h3>
                <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white p-2"><X size={18} /></button>
              </div>
              <Rail />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bulk action bar ── */}
      <AnimatePresence>
        {selectMode && selectedIds.size > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-[#0c0c1e] border-t border-white/10 backdrop-blur-xl md:left-64">
            <span className="text-white font-semibold text-sm whitespace-nowrap">
              {selectedIds.size} guide{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="relative" ref={bulkMoveRef}>
                <button disabled={bulkActionLoading} onClick={() => setBulkMoveOpen(v => !v)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50">
                  <FolderInput size={14} /> Move to folder
                  <ChevronRight size={12} className={`transition-transform ${bulkMoveOpen ? "rotate-90" : ""}`} />
                </button>
                <AnimatePresence>
                  {bulkMoveOpen && (
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 4 }} transition={{ duration: 0.12 }}
                      className="absolute bottom-full mb-2 right-0 min-w-[180px] bg-[#13131f] border border-white/12 rounded-2xl shadow-2xl shadow-black/60 p-2 overflow-hidden z-10">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-2 py-1.5">Move to folder</p>
                      <button onClick={() => handleBulkMove(null)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-left">
                        <span className="w-6 h-6 rounded-md bg-white/8 flex items-center justify-center text-gray-500 text-xs">—</span> No folder
                      </button>
                      {folders.length === 0 && <p className="text-xs text-gray-600 px-3 py-2">No folders yet.</p>}
                      {folders.map(folder => {
                        const grad = FOLDER_COLORS[folder.color] || FOLDER_COLORS.indigo;
                        return (
                          <button key={folder.id} onClick={() => handleBulkMove(folder.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left">
                            <span className={`w-6 h-6 shrink-0 rounded-md bg-gradient-to-br ${grad} flex items-center justify-center text-xs`}>{folder.icon}</span>
                            <span className="flex-1 truncate">{folder.name}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button disabled={bulkActionLoading} onClick={() => setBulkDeleteOpen(true)}
                className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50">
                <Trash2 size={14} /> Delete
              </button>
              <button onClick={exitSelectMode} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors" title="Cancel selection">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal open={!!deleteTarget} title="Delete this guide?"
        message={`"${deleteTarget?.title}" will be permanently deleted along with all quiz history.`}
        confirmText="Delete Guide" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      <ConfirmModal open={!!deleteFolderTarget} title="Delete this folder?"
        message={`"${deleteFolderTarget?.name}" will be deleted. Guides inside it will be moved to 'No folder' and kept.`}
        confirmText="Delete Folder" onConfirm={confirmDeleteFolder} onCancel={() => setDeleteFolderTarget(null)} />

      <ConfirmModal open={bulkDeleteOpen} title={`Delete ${selectedIds.size} guide${selectedIds.size !== 1 ? "s" : ""}?`}
        message={`${selectedIds.size} guide${selectedIds.size !== 1 ? "s" : ""} will be permanently deleted along with all quiz history. This cannot be undone.`}
        confirmText={`Delete ${selectedIds.size} Guide${selectedIds.size !== 1 ? "s" : ""}`}
        onConfirm={confirmBulkDelete} onCancel={() => setBulkDeleteOpen(false)} />

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </div>
  );
}
