import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Plus, Trash2, Clock, BookOpen, Edit3,
  CheckCircle, AlertTriangle, Flame, Target, X, Save,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  const exam = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((exam - today) / (1000 * 60 * 60 * 24));
}

function urgencyStyle(days) {
  if (days < 0)  return { color: "text-gray-500",  bg: "bg-gray-500/10",  border: "border-gray-500/20",  label: "Passed" };
  if (days <= 3) return { color: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/20",   label: "Urgent" };
  if (days <= 7) return { color: "text-orange-400",bg: "bg-orange-500/10",border: "border-orange-500/20",label: "Soon" };
  if (days <= 14)return { color: "text-yellow-400",bg: "bg-yellow-500/10",border: "border-yellow-500/20",label: "Coming up" };
  return           { color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  label: "On track" };
}

const INPUT_CLS = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm";
const MIN_DATE = new Date(Date.now() + 86400000).toISOString().slice(0, 10); // tomorrow

// ── Plan form (create / edit) ─────────────────────────────────────────────────
function PlanForm({ initial = null, guides = [], onSave, onCancel, loading }) {
  const [title,   setTitle]   = useState(initial?.title ?? "");
  const [date,    setDate]    = useState(initial?.exam_date ?? "");
  const [goal,    setGoal]    = useState(initial?.daily_goal_minutes ?? 30);
  const [notes,   setNotes]   = useState(initial?.notes ?? "");
  const [linked,  setLinked]  = useState(initial?.guide_ids ?? []);
  const [showGuides, setShowGuides] = useState(false);

  const toggleGuide = (id) =>
    setLinked(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ title: title.trim(), exam_date: date, daily_goal_minutes: Number(goal), notes: notes.trim(), guide_ids: linked });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Exam / Goal Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Calculus Final" className={INPUT_CLS} maxLength={120} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Exam Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} min={MIN_DATE} className={INPUT_CLS} required />
        </div>
        <div>
          <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Daily Goal (min)</label>
          <input type="number" value={goal} onChange={e => setGoal(e.target.value)} min={5} max={480} step={5} className={INPUT_CLS} />
        </div>
      </div>

      {/* Guide linker */}
      <div>
        <button
          type="button"
          onClick={() => setShowGuides(v => !v)}
          className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider hover:text-white transition-colors mb-2">
          <BookOpen size={12} />
          Link Guides {linked.length > 0 && `(${linked.length} selected)`}
          {showGuides ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <AnimatePresence>
          {showGuides && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-2">
                {guides.length === 0 ? (
                  <p className="text-gray-600 text-xs py-2">No guides saved yet.</p>
                ) : guides.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGuide(g.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${linked.includes(g.id) ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300" : "bg-white/3 border border-white/6 text-gray-400 hover:bg-white/6"}`}>
                    <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${linked.includes(g.id) ? "bg-indigo-500 border-indigo-500" : "border-white/20"}`}>
                      {linked.includes(g.id) && <CheckCircle size={10} className="text-white" />}
                    </div>
                    <span className="truncate">{g.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Topics to focus on, reminders…" className={`${INPUT_CLS} resize-none`} maxLength={1000} />
      </div>

      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors min-h-[44px]">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-xl text-white font-bold text-sm transition-all min-h-[44px]">
          <Save size={14} /> {loading ? "Saving…" : (initial ? "Save Changes" : "Create Plan")}
        </button>
      </div>
    </form>
  );
}

// ── Countdown ring ────────────────────────────────────────────────────────────
function CountdownRing({ days }) {
  const u = urgencyStyle(days);
  return (
    <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 ${u.border} ${u.bg} shrink-0`}>
      <p className={`text-2xl font-black leading-none ${u.color}`}>{Math.max(days, 0)}</p>
      <p className={`text-xs font-semibold ${u.color} opacity-70`}>{days === 1 ? "day" : "days"}</p>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, guides, onEdit, onDelete }) {
  const days = daysUntil(plan.exam_date);
  const u    = urgencyStyle(days);
  const linkedGuides = guides.filter(g => plan.guide_ids.includes(g.id));
  const today = new Date().toISOString().slice(0, 10);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/4 border ${u.border} rounded-2xl overflow-hidden`}>
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <CountdownRing days={days} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${u.bg} ${u.color} mb-1.5`}>
                {days < 0 ? "📅 Exam passed" : days === 0 ? "🔥 Today!" : `📅 ${u.label}`}
              </span>
              <h3 className="text-white font-bold text-base leading-tight">{plan.title}</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(plan)} className="p-2.5 text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center" title="Edit" aria-label="Edit plan">
                <Edit3 size={13} />
              </button>
              <button onClick={() => onDelete(plan)} className="p-2.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center" title="Delete" aria-label="Delete plan">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {new Date(plan.exam_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1">
              <Target size={11} /> {plan.daily_goal_minutes} min/day
            </span>
            {linkedGuides.length > 0 && (
              <span className="flex items-center gap-1">
                <BookOpen size={11} /> {linkedGuides.length} guide{linkedGuides.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Study schedule strip */}
      {days > 0 && (
        <div className="px-5 pb-4">
          <div className="bg-white/3 border border-white/6 rounded-xl p-3">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Study schedule</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Today's goal", value: `${plan.daily_goal_minutes}m`, icon: <Flame size={12} className="text-orange-400" /> },
                { label: "Total sessions", value: `${days}d`, icon: <CalendarDays size={12} className="text-indigo-400" /> },
                { label: "Total study", value: `${Math.round((plan.daily_goal_minutes * days) / 60)}h`, icon: <Clock size={12} className="text-violet-400" /> },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">{s.icon}<span className="text-white font-black text-sm">{s.value}</span></div>
                  <p className="text-gray-600 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Linked guides */}
      {linkedGuides.length > 0 && (
        <div className="px-5 pb-4">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors font-medium mb-2">
            <BookOpen size={11} /> Study materials {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-1.5">
                  {linkedGuides.map(g => (
                    <Link
                      key={g.id}
                      to={`/guide/${g.id}`}
                      className="flex items-center gap-2 px-3 py-2 bg-white/3 hover:bg-white/6 border border-white/6 rounded-lg text-xs text-gray-400 hover:text-white transition-colors group">
                      <BookOpen size={11} className="shrink-0 group-hover:text-indigo-400" />
                      <span className="truncate">{g.title}</span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Notes */}
      {plan.notes && (
        <div className="px-5 pb-5">
          <p className="text-gray-600 text-xs italic leading-relaxed">"{plan.notes}"</p>
        </div>
      )}
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudyPlans() {
  const { logout } = useAuth();
  const toast = useToast();

  const [plans,   setPlans]   = useState([]);
  const [guides,  setGuides]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);  // plan object being edited
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, guidesData] = await Promise.all([
        api.studyPlans.list(),
        api.guides.list(),
      ]);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setGuides(Array.isArray(guidesData) ? guidesData : []);
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async (body) => {
    setSaving(true);
    try {
      const plan = await api.studyPlans.create(body);
      setPlans(prev => [...prev, plan].sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date)));
      setShowForm(false);
      toast({ message: "Study plan created!", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally { setSaving(false); }
  };

  const handleUpdate = async (body) => {
    setSaving(true);
    try {
      const updated = await api.studyPlans.update(editing.id, body);
      setPlans(prev => prev.map(p => p.id === updated.id ? updated : p).sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date)));
      setEditing(null);
      toast({ message: "Plan updated!", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.studyPlans.delete(deleteTarget.id);
      setPlans(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast({ message: "Plan deleted.", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally { setDeleteTarget(null); }
  };

  // Separate upcoming vs past
  const upcoming = plans.filter(p => daysUntil(p.exam_date) >= 0);
  const past     = plans.filter(p => daysUntil(p.exam_date) <  0);

  return (
    <div className="flex min-h-dvh bg-[#080810] w-full overflow-x-hidden">
      <Sidebar onLogout={logout} />
      <main className="flex-1 min-w-0 overflow-x-hidden md:ml-64 p-4 md:p-8 main-pt max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-1">Planner</p>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <CalendarDays size={18} className="text-indigo-400" />
            </div>
            Study Plans
          </h1>
          <p className="text-gray-500 text-sm mt-1.5">Set exam dates and track your daily study goals.</p>
        </div>

        {/* Create / Edit form */}
        <AnimatePresence>
          {(showForm || editing) && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white/4 border border-indigo-500/20 rounded-2xl p-6 mb-6">
              <h2 className="text-white font-bold mb-5 text-sm flex items-center gap-2">
                {editing ? <Edit3 size={14} className="text-indigo-400" /> : <Plus size={14} className="text-indigo-400" />}
                {editing ? "Edit Plan" : "New Study Plan"}
              </h2>
              <PlanForm
                initial={editing}
                guides={guides}
                onSave={editing ? handleUpdate : handleCreate}
                onCancel={() => { setShowForm(false); setEditing(null); }}
                loading={saving}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add button */}
        {!showForm && !editing && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 mb-6 border border-dashed border-white/15 hover:border-indigo-500/40 rounded-2xl text-gray-500 hover:text-indigo-400 text-sm font-medium transition-all hover:bg-indigo-500/5">
            <Plus size={16} /> New Study Plan
          </button>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-16 text-gray-600 text-sm">Loading plans…</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/8 rounded-2xl">
            <CalendarDays size={36} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500 font-medium">No study plans yet.</p>
            <p className="text-gray-700 text-sm mt-1">Add your first exam date to start tracking.</p>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Flame size={13} className="text-orange-400" /> Upcoming
                </h2>
                <div className="space-y-4">
                  {upcoming.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      guides={guides}
                      onEdit={(p) => { setEditing(p); setShowForm(false); }}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Past exams */}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle size={13} /> Past Exams
                </h2>
                <div className="space-y-3 opacity-50">
                  {past.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      guides={guides}
                      onEdit={(p) => { setEditing(p); setShowForm(false); }}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div aria-hidden="true" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </main>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this plan?"
        message={`"${deleteTarget?.title}" will be permanently deleted.`}
        confirmText="Delete Plan"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
