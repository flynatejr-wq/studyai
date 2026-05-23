/**
 * ClassManage — teacher's detail view for a single class.
 * Route (add to App.jsx when ready):
 *   <Route path="/teacher/classes/:id" element={<TeacherRoute><ClassManage /></TeacherRoute>} />
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, UserX, BookOpen, Plus, Trash2, Copy, Check } from "lucide-react";

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

function ShareGuideModal({ classId, onClose, onShare }) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(null);

  useEffect(() => {
    // Fetch teacher's own guides to pick from
    fetch(`${API}/guides`, { headers: headers() })
      .then(r => r.json())
      .then(d => setGuides(d.guides || []))
      .finally(() => setLoading(false));
  }, []);

  const share = async (guideId) => {
    setSharing(guideId);
    try {
      await apiFetch(`/classes/${classId}/guides`, {
        method: "POST",
        body: JSON.stringify({ guide_id: guideId }),
      });
      onShare(guideId, guides.find(g => g.id === guideId));
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSharing(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#13131f] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
        <h2 className="text-white font-bold text-lg mb-4">Share a guide</h2>
        <div className="overflow-y-auto flex-1 space-y-2">
          {loading ? <p className="text-gray-500 text-sm">Loading…</p>
            : guides.length === 0 ? <p className="text-gray-500 text-sm">No guides yet. Create one first.</p>
            : guides.map(g => (
              <div key={g.id} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{g.title}</p>
                  <p className="text-gray-500 text-xs">{new Date(g.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => share(g.id)} disabled={sharing === g.id}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50">
                  {sharing === g.id ? "Sharing…" : "Share"}
                </button>
              </div>
            ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2.5 border border-white/10 rounded-xl text-gray-400 text-sm hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ClassManage() {
  const { id } = useParams();
  const [cls, setCls]         = useState(null);
  const [members, setMembers] = useState([]);
  const [guides, setGuides]   = useState([]);
  const [tab, setTab]         = useState("guides");
  const [showShare, setShowShare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch(`/classes`).then(d => d.classes.find(c => c.id === id)),
      apiFetch(`/classes/${id}/members`).then(d => d.members),
      apiFetch(`/classes/${id}/guides`).then(d => d.guides),
    ]).then(([c, m, g]) => { setCls(c); setMembers(m); setGuides(g); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const removeStudent = async (studentId, name) => {
    if (!confirm(`Remove ${name} from this class?`)) return;
    await apiFetch(`/classes/${id}/members/${studentId}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.id !== studentId));
  };

  const unshareGuide = async (guideId) => {
    if (!confirm("Remove this guide from the class?")) return;
    await apiFetch(`/classes/${id}/guides/${guideId}`, { method: "DELETE" });
    setGuides(prev => prev.filter(g => g.id !== guideId));
  };

  const onShare = (guideId, guide) => {
    setGuides(prev => [{ ...guide, shared_at: new Date().toISOString() }, ...prev]);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(cls.join_code);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center text-gray-500">Loading…</div>;
  if (!cls)    return <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center text-gray-500">Class not found.</div>;

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-300 p-4 sm:p-8 max-w-4xl mx-auto">
      <Link to="/teacher" className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to classes
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{cls.name}</h1>
          {cls.description && <p className="text-gray-500 text-sm mt-1">{cls.description}</p>}
        </div>
        {/* Join code badge */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <span className="text-gray-400 text-xs">Join code</span>
          <span className="font-mono font-bold text-indigo-300 tracking-widest text-sm">{cls.join_code}</span>
          <button onClick={copyCode} className="text-gray-500 hover:text-white transition-colors">
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6">
        {["guides", "students"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${tab === t ? "text-indigo-300 border-b-2 border-indigo-500" : "text-gray-500 hover:text-white"}`}>
            {t === "guides" ? `Guides (${guides.length})` : `Students (${members.length})`}
          </button>
        ))}
      </div>

      {tab === "guides" && (
        <div>
          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-semibold mb-4 transition-colors">
            <Plus size={15} /> Share a guide
          </button>
          {guides.length === 0 ? (
            <p className="text-gray-500 text-sm">No guides shared yet. Click "Share a guide" to get started.</p>
          ) : (
            <div className="space-y-2">
              {guides.map(g => (
                <div key={g.id} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <BookOpen size={15} className="text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-white text-sm font-medium">{g.title}</p>
                      <p className="text-gray-500 text-xs">Shared {new Date(g.shared_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => unshareGuide(g.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "students" && (
        <div>
          {members.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No students yet.</p>
              <p className="text-gray-600 text-xs mt-1">Share the join code <span className="font-mono text-indigo-400">{cls.join_code}</span> with your class.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{m.name}</p>
                    <p className="text-gray-500 text-xs">{m.email} · joined {new Date(m.joined_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => removeStudent(m.id, m.name)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <UserX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showShare && <ShareGuideModal classId={id} onClose={() => setShowShare(false)} onShare={onShare} />}
    </div>
  );
}
