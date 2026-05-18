import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Trash2, Search, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

const PAGE = 24;

export default function AllGuides() {
  const { logout } = useAuth();
  const toast = useToast();
  const [guides, setGuides] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const searchTimer = useRef(null);

  const fetchGuides = useCallback(async (newOffset, query, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const res = await api.guides.listPaged(newOffset, query);
      const incoming = Array.isArray(res.guides) ? res.guides : [];
      setGuides(g => append ? [...g, ...incoming] : incoming);
      setTotal(res.total ?? 0);
      setHasMore(res.hasMore ?? false);
      setOffset(newOffset + PAGE);
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, []);

  // Debounced search — fires immediately on mount (no delay when search is unchanged from ""),
  // and debounces subsequent keystrokes by 350ms.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchGuides(0, search);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setOffset(0);
      fetchGuides(0, search);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

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

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar onLogout={logout} />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">All Study Guides</h1>
            <p className="text-gray-400 mt-1">{total} guide{total !== 1 ? "s" : ""} total</p>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              maxLength={100}
              placeholder="Search guides..."
              className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-indigo-400 animate-spin" />
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-2xl">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? "No guides match your search." : "No guides yet."}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {guides.map((guide, i) => (
                <motion.div key={guide.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <Link to={`/guide/${guide.id}`}
                    className="group relative bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-5 block transition-all hover:bg-white/8">
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: guide.id, title: guide.title }); }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1">
                      <Trash2 size={15} />
                    </button>
                    <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-2 block">{guide.type}</span>
                    <h3 className="text-white font-semibold leading-tight mb-3 group-hover:text-indigo-300 transition-colors pr-6">{guide.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(guide.created_at).toLocaleDateString()}</span>
                      {guide.best_quiz_score > 0 && <span className="text-yellow-400">⭐ {guide.best_quiz_score}/{guide.quiz_questions?.length || 5}</span>}
                    </div>
                    {guide.quiz_attempts > 0 && (
                      <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                          style={{ width: `${Math.round((guide.best_quiz_score / (guide.quiz_questions?.length || 5)) * 100)}%` }} />
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 text-center">
                <button onClick={() => fetchGuides(offset, search, true)} disabled={loadingMore}
                  className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 text-sm font-medium transition-colors disabled:opacity-50">
                  {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
                  {loadingMore ? "Loading..." : `Load more (${total - guides.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this guide?"
        message={`"${deleteTarget?.title}" will be permanently deleted along with all quiz history.`}
        confirmText="Delete Guide"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
