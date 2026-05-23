/**
 * StudentClassroom — student's view of their enrolled classes.
 * Route (add to App.jsx when ready):
 *   <Route path="/classroom" element={<ProtectedRoute><StudentClassroom /></ProtectedRoute>} />
 *
 * Any logged-in user (free or pro) can access this — class membership grants
 * read access to shared guides without needing a Pro plan.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, LogOut, Hash } from "lucide-react";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

function headers() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}/classroom${path}`, { headers: headers(), ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function JoinClassModal({ onClose, onJoin }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { class: cls } = await apiFetch("/join", {
        method: "POST",
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      onJoin(cls);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#13131f] border border-white/10 rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-white font-bold text-lg mb-1">Join a class</h2>
        <p className="text-gray-500 text-sm mb-4">Ask your teacher for the 6-character join code.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. XK92PL"
            maxLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xl tracking-widest text-center placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-white/10 rounded-xl text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={loading || code.length < 6}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {loading ? "Joining…" : "Join class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClassCard({ cls, onLeave }) {
  const [guides, setGuides]     = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [leaving, setLeaving]   = useState(false);

  const expand = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (guides.length) return;
    setLoadingGuides(true);
    try {
      const { guides: g } = await apiFetch(`/my-classes/${cls.id}/guides`);
      setGuides(g);
    } catch (e) { console.error(e); }
    finally { setLoadingGuides(false); }
  };

  const leave = async () => {
    if (!confirm(`Leave "${cls.name}"?`)) return;
    setLeaving(true);
    try {
      await apiFetch(`/my-classes/${cls.id}`, { method: "DELETE" });
      onLeave(cls.id);
    } catch (e) { alert(e.message); setLeaving(false); }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white text-base">{cls.name}</h3>
          {cls.description && <p className="text-gray-400 text-xs mt-0.5">{cls.description}</p>}
          <p className="text-gray-600 text-xs mt-1">{cls.guide_count} guides shared</p>
        </div>
        <button onClick={leave} disabled={leaving} title="Leave class" className="text-gray-600 hover:text-red-400 transition-colors mt-0.5">
          <LogOut size={15} />
        </button>
      </div>

      <button onClick={expand}
        className="w-full px-5 py-3 border-t border-white/10 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-white/3 transition-colors text-left">
        {expanded ? "Hide guides ▲" : "Show guides ▼"}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-2">
          {loadingGuides ? <p className="text-gray-500 text-xs">Loading…</p>
            : guides.length === 0 ? <p className="text-gray-500 text-xs">No guides shared yet.</p>
            : guides.map(g => (
              <Link key={g.id} to={`/guide/${g.id}`}
                className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-xl px-4 py-3 transition-colors group">
                <BookOpen size={14} className="text-indigo-400 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium group-hover:text-indigo-300 transition-colors">{g.title}</p>
                  <p className="text-gray-600 text-xs">Shared {new Date(g.shared_at).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

export default function StudentClassroom() {
  const [classes, setClasses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    apiFetch("/my-classes")
      .then(d => setClasses(d.classes))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleJoin  = (cls)  => setClasses(prev => [cls, ...prev]);
  const handleLeave = (id)   => setClasses(prev => prev.filter(c => c.id !== id));

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-300 p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Classes</h1>
          <p className="text-gray-500 text-sm mt-1">Study guides shared by your teachers</p>
        </div>
        <button onClick={() => setShowJoin(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors">
          <Hash size={15} /> Join class
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : classes.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎒</div>
          <p className="text-white font-semibold mb-1">No classes yet</p>
          <p className="text-gray-500 text-sm mb-6">Ask your teacher for a join code</p>
          <button onClick={() => setShowJoin(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors">
            Join a class
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map(cls => <ClassCard key={cls.id} cls={cls} onLeave={handleLeave} />)}
        </div>
      )}

      {showJoin && <JoinClassModal onClose={() => setShowJoin(false)} onJoin={handleJoin} />}
    </div>
  );
}
