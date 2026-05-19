import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Trash2, Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

export default function FolderView() {
  const { id } = useParams();
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [folder, setFolder] = useState(null);
  const [guides, setGuides] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [folders, g] = await Promise.all([api.folders.list(), api.guides.list(id)]);
      setFolder((Array.isArray(folders) ? folders : []).find(f => f.id === id));
      setGuides(Array.isArray(g) ? g : []);
    } catch (err) {
      setLoadError(err.message || "Failed to load folder.");
    } finally {
      setLoading(false);
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.guides.delete(deleteTarget.id);
      setGuides(g => g.filter(x => x.id !== deleteTarget.id));
      toast({ message: "Guide deleted.", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a12] w-full overflow-x-hidden">
      <Sidebar onLogout={logout} />
      <main className="flex-1 min-w-0 md:ml-64 p-4 md:p-8 main-pt">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {folder?.icon} {folder?.name}
            </h1>
            <p className="text-gray-400 mt-1">{guides.length} guide{guides.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors self-start sm:self-auto">
            <Plus size={16} /> New Guide
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-indigo-400 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-2xl">
            <p className="font-medium text-red-400">{loadError}</p>
            <button onClick={load} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Try again</button>
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-2xl">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No guides in this folder yet.</p>
            <p className="text-sm mt-1">Create a new guide from the dashboard and save it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map((guide, i) => (
              <motion.div key={guide.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/guide/${guide.id}`}
                  className="group relative bg-white/4 border border-white/8 hover:border-indigo-500/30 rounded-2xl p-5 transition-all hover:bg-white/6 hover:-translate-y-0.5 block">
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: guide.id, title: guide.title }); }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1">
                    <Trash2 size={15} />
                  </button>
                  <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-2 block">{guide.type}</span>
                  <h3 className="text-white font-semibold leading-tight mb-3 group-hover:text-indigo-300 transition-colors pr-6">{guide.title}</h3>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(guide.created_at).toLocaleDateString()}</span>
                    {guide.best_quiz_score > 0 && <span className="text-yellow-400">⭐ Best: {guide.best_quiz_score}/{guide.quiz_questions?.length || 5}</span>}
                  </div>
                  {guide.quiz_attempts > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Best score</span>
                        <span>{Math.round((guide.best_quiz_score / (guide.quiz_questions?.length || 5)) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                          style={{ width: `${Math.round((guide.best_quiz_score / (guide.quiz_questions?.length || 5)) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
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
