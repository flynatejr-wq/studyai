import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Trash2, Search } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";

export default function AllGuides() {
  const { logout } = useAuth();
  const [guides, setGuides] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => { api.guides.list().then(setGuides); }, []);

  const deleteGuide = async (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this guide?")) return;
    await api.guides.delete(id);
    setGuides(g => g.filter(x => x.id !== id));
  };

  const filtered = guides.filter(g => g.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar onLogout={logout} />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">All Study Guides</h1>
            <p className="text-gray-400 mt-1">{guides.length} guide{guides.length !== 1 ? "s" : ""} total</p>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guides..."
              className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56 transition-colors" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-2xl">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? "No guides match your search." : "No guides yet."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((guide, i) => (
              <motion.div key={guide.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/guide/${guide.id}`}
                  className="group relative bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-5 block transition-all hover:bg-white/8">
                  <button onClick={e => deleteGuide(e, guide.id)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all">
                    <Trash2 size={15} />
                  </button>
                  <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-2 block">{guide.type}</span>
                  <h3 className="text-white font-semibold leading-tight mb-3 group-hover:text-indigo-300 transition-colors">{guide.title}</h3>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(guide.created_at).toLocaleDateString()}</span>
                    {guide.best_quiz_score > 0 && <span className="text-yellow-400">⭐ {guide.best_quiz_score}/{guide.quiz_questions?.length || 5}</span>}
                  </div>
                  {guide.quiz_attempts > 0 && (
                    <div className="mt-3">
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
    </div>
  );
}
