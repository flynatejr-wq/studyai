/**
 * TeacherDashboard — NOT wired into App.jsx yet.
 * To activate, add this route in App.jsx:
 *   <Route path="/teacher" element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
 *
 * Requires plan = 'teacher'. Shows all classes, lets teacher create/manage them.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, BookOpen, Copy, Check, Trash2, Archive, RotateCcw } from "lucide-react";

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

function JoinCodeChip({ code, classId, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [regen, setRegen] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    if (!confirm("Generate a new join code? The old one will stop working.")) return;
    setRegen(true);
    try {
      const { join_code } = await apiFetch(`/classes/${classId}/regenerate-code`, { method: "POST" });
      onRegenerate(classId, join_code);
    } finally { setRegen(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-lg font-bold tracking-widest text-indigo-300">{code}</span>
      <button onClick={copy} title="Copy code" className="p-1 text-gray-500 hover:text-white transition-colors">
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
      <button onClick={regenerate} disabled={regen} title="New code" className="p-1 text-gray-500 hover:text-yellow-400 transition-colors">
        <RotateCcw size={13} />
      </button>
    </div>
  );
}

function ClassCard({ cls, onDelete, onRegenerate }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${cls.name}"? This will remove all students and shared guides.`)) return;
    setDeleting(true);
    try { await apiFetch(`/classes/${cls.id}`, { method: "DELETE" }); onDelete(cls.id); }
    catch (e) { alert(e.message); setDeleting(false); }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white text-base">{cls.name}</h3>
          {cls.description && <p className="text-gray-400 text-xs mt-0.5">{cls.description}</p>}
        </div>
        <button onClick={handleDelete} disabled={deleting} className="text-gray-600 hover:text-red-400 transition-colors mt-0.5">
          <Trash2 size={15} />
        </button>
      </div>

      <div className="flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Users size={12} /> {cls.student_count} students</span>
        <span className="flex items-center gap-1"><BookOpen size={12} /> {cls.guide_count} guides</span>
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="text-xs text-gray-500 mb-1">Join code</p>
        <JoinCodeChip code={cls.join_code} classId={cls.id} onRegenerate={onRegenerate} />
      </div>

      <Link to={`/teacher/classes/${cls.id}`}
        className="text-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl py-2 transition-colors">
        Manage class →
      </Link>
    </div>
  );
}

function CreateClassModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { class: cls } = await apiFetch("/classes", {
        method: "POST",
        body: JSON.stringify({ name, description: desc }),
      });
      onCreate(cls);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#13131f] border border-white/10 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-white font-bold text-lg mb-4">Create a class</h2>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Class name (e.g. Biology 101 – Period 3)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={100} required />
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {loading ? "Creating…" : "Create class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    apiFetch("/classes")
      .then(d => setClasses(d.classes))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = (cls) => setClasses(prev => [cls, ...prev]);
  const handleDelete = (id) => setClasses(prev => prev.filter(c => c.id !== id));
  const handleRegenerate = (classId, newCode) =>
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, join_code: newCode } : c));

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-300 p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Classes</h1>
          <p className="text-gray-500 text-sm mt-1">Share study guides with your students</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors">
          <Plus size={16} /> New class
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : classes.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏫</div>
          <p className="text-white font-semibold mb-1">No classes yet</p>
          <p className="text-gray-500 text-sm mb-6">Create your first class and share your study guides with students</p>
          <button onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors">
            Create a class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <ClassCard key={cls.id} cls={cls} onDelete={handleDelete} onRegenerate={handleRegenerate} />
          ))}
        </div>
      )}

      {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
