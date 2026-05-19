import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Trash2, Search, Loader2, Trophy, Clock, ArrowRight, Plus } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

const PAGE = 24;

export default function AllGuides() {
  const { logout } = useAuth();
  const toast = useToast();
  const [guides,       setGuides]       = useState([]);
  const [total,        setTotal]        = useState(0);
  const [hasMore,      setHasMore]      = useState(false);
  const [offset,       setOffset]       = useState(0);
  const [search,       setSearch]       = useState("");
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const searchTimer = useRef(null);

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

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; fetchGuides(0, search); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setOffset(0); fetchGuides(0, search); }, 350);
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
    <div className="flex min-h-dvh bg-[#0a0a12] w-full overflow-x-hidden">
      <Sidebar onLogout={logout} />
      <main className="flex-1 min-w-0 md:ml-64 p-4 md:p-8 main-pt">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">All Study Guides</h1>
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

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={22} className="text-indigo-400 animate-spin" />
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/8 rounded-2xl">
            <BookOpen size={36} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500 font-medium">
              {search ? "No guides match your search." : "No guides yet."}
            </p>
            {!search && (
              <Link to="/dashboard"
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
                  transition={{ delay: Math.min(i * 0.03, 0.25) }}
                >
                  <Link
                    to={`/guide/${guide.id}`}
                    className="group relative bg-white/4 border border-white/8 hover:border-indigo-500/30 rounded-2xl p-4 block transition-all hover:bg-white/6 hover:-translate-y-0.5"
                  >
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
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-gray-400 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                  {loadingMore ? "Loading…" : `Load more (${total - guides.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}

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
    </div>
  );
}
