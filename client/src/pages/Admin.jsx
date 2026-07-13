import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Users, BarChart2, Search, RefreshCw, X, ChevronLeft,
  ChevronRight, Crown, Ban, Star, Zap, Clock, BookOpen, CheckCircle,
  AlertTriangle, Activity, Filter, RotateCcw, Save, ChevronDown,
  Fingerprint, Trash2, Flag, Lock, Unlock, EyeOff, DollarSign, GraduationCap,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { api } from "../api.js";
import Sidebar from "../components/Sidebar.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? "—" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const PLAN_CONFIG = {
  free:     { label: "Free",     bg: "bg-gray-500/20",   text: "text-gray-400",   border: "border-gray-500/30" },
  pro:      { label: "Pro",      bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30" },
  lifetime: { label: "Lifetime", bg: "bg-amber-500/20",  text: "text-amber-400",  border: "border-amber-500/30" },
  pilot:    { label: "Pilot",    bg: "bg-emerald-500/20",text: "text-emerald-400",border: "border-emerald-500/30" }, // deploy-verify-marker-7a3f
};

const ROLE_CONFIG = {
  user:  { label: "User",  bg: "bg-slate-500/20",  text: "text-slate-400"  },
  admin: { label: "Admin", bg: "bg-rose-500/20",   text: "text-rose-400"   },
};

function PlanBadge({ plan }) {
  const c = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
      {plan === "pro" && <Crown size={10} />}
      {plan === "lifetime" && <Star size={10} />}
      {c.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {role === "admin" && <Shield size={10} />}
      {c.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = "indigo" }) {
  const colors = {
    indigo: "from-indigo-500/15 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
    violet: "from-violet-500/15 to-violet-600/5 border-violet-500/20 text-violet-400",
    amber:  "from-amber-500/15  to-amber-600/5  border-amber-500/20  text-amber-400",
    rose:   "from-rose-500/15   to-rose-600/5   border-rose-500/20   text-rose-400",
    emerald:"from-emerald-500/15 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    sky:    "from-sky-500/15    to-sky-600/5    border-sky-500/20    text-sky-400",
    teal:   "from-teal-500/15   to-teal-600/5   border-teal-500/20   text-teal-400",
  };
  const cls = colors[color] || colors.indigo;
  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-2xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <Icon size={14} className={cls.split(" ").find(c => c.startsWith("text-"))} />
      </div>
      <p className="text-2xl font-black text-white">{(value ?? 0).toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, color = "indigo" }) {
  const colors = { indigo: "bg-indigo-600", emerald: "bg-emerald-600", rose: "bg-rose-600", amber: "bg-amber-600" };
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? (colors[color] || colors.indigo) : "bg-white/10"}`}
      role="switch" aria-checked={checked}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

// ── Action log entry ──────────────────────────────────────────────────────────
const ACTION_ICONS = {
  set_plan:      { icon: Crown,       color: "text-indigo-400" },
  set_role:      { icon: Shield,      color: "text-rose-400" },
  set_whitelist: { icon: Star,        color: "text-amber-400" },
  set_ban:       { icon: Ban,         color: "text-rose-400" },
  reset_limits:  { icon: RotateCcw,   color: "text-emerald-400" },
};

function AuditRow({ log }) {
  const { icon: Icon, color } = ACTION_ICONS[log.action] || { icon: Activity, color: "text-gray-400" };
  const actionLabel = {
    set_plan:      `Changed plan: ${log.old_value} → ${log.new_value}`,
    set_role:      `Changed role: ${log.old_value} → ${log.new_value}`,
    set_whitelist: log.new_value === "1" ? "Granted whitelist access" : "Revoked whitelist access",
    set_ban:       log.new_value === "1" ? "Account suspended" : "Account unsuspended",
    reset_limits:  `Reset usage limits (was ${log.old_value})`,
  }[log.action] || log.action;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className={`mt-0.5 shrink-0 ${color}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{actionLabel}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Target: <span className="text-gray-400">{log.target_email}</span>
          {" · "}By: <span className="text-gray-400">{log.admin_email}</span>
        </p>
      </div>
      <p className="text-xs text-gray-600 shrink-0 mt-0.5">{fmtDateTime(log.created_at)}</p>
    </div>
  );
}

// ── User edit drawer ──────────────────────────────────────────────────────────
function UserDrawer({ user, onClose, onSaved }) {
  const [form, setForm]       = useState({
    plan:          user.plan || "free",
    role:          user.role || "user",
    is_whitelisted: !!user.is_whitelisted,
    is_banned:     !!user.is_banned,
    admin_notes:   user.admin_notes || "",
  });
  const [saving, setSaving]   = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg]         = useState(null);
  const [detail, setDetail]   = useState(null);
  const [auditLog, setAuditLog] = useState([]);

  useEffect(() => {
    api.admin.getUser(user.id)
      .then(d => { setDetail(d); setAuditLog(d.recentAudit || []); })
      .catch(() => {});
  }, [user.id]);

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const updated = await api.admin.updateUser(user.id, {
        plan:           form.plan,
        role:           form.role,
        is_whitelisted: form.is_whitelisted,
        is_banned:      form.is_banned,
        admin_notes:    form.admin_notes,
      });
      setMsg({ type: "success", text: "Changes saved." });
      onSaved(updated.user);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally { setSaving(false); }
  };

  const handleResetLimits = async () => {
    if (!confirm(`Reset usage limits for ${user.email}? They'll be able to create a free guide again.`)) return;
    setResetting(true); setMsg(null);
    try {
      await api.admin.resetLimits(user.id);
      setMsg({ type: "success", text: "Usage limits reset." });
      onSaved({ ...user, guides_created_ever: 0 });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally { setResetting(false); }
  };

  const avatarColors = ["from-indigo-500 to-violet-600", "from-sky-500 to-blue-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600", "from-rose-500 to-pink-600"];
  const avatarColor  = avatarColors[(user.name || "").charCodeAt(0) % avatarColors.length];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="relative w-full max-w-md bg-[#0d0d1a] border-l border-white/8 flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-xs font-black shadow-lg`}>
              {initials(user.name)}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">{user.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Guides created", value: user.guides_created_ever ?? 0 },
              { label: "Guides saved",   value: user.total_guides ?? 0 },
              { label: "XP",             value: (user.xp ?? 0).toLocaleString() },
            ].map(s => (
              <div key={s.label} className="bg-white/4 rounded-xl p-3 text-center">
                <p className="text-white font-black text-lg leading-none">{s.value}</p>
                <p className="text-gray-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-600">
            Joined {fmtDate(user.created_at)} · Last active {fmtDate(user.last_study_date)}
          </div>

          {/* Feedback message */}
          {msg && (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${msg.type === "success" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/15 text-rose-400 border border-rose-500/20"}`}>
              {msg.type === "success" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {msg.text}
            </div>
          )}

          {/* Plan */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Subscription Plan</label>
            <div className="flex gap-2">
              {["free", "pro", "lifetime", "pilot"].map(p => {
                const c = PLAN_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setForm(f => ({ ...f, plan: p }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.plan === p ? `${c.bg} ${c.text} ${c.border}` : "bg-white/4 text-gray-500 border-white/8 hover:border-white/15"}`}>
                    {p === "pro" && <Crown size={10} className="inline mr-1" />}
                    {p === "lifetime" && <Star size={10} className="inline mr-1" />}
                    {p === "pilot" && <GraduationCap size={10} className="inline mr-1" />}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Account Role</label>
            <div className="flex gap-2">
              {["user", "admin"].map(r => {
                const c = ROLE_CONFIG[r];
                return (
                  <button
                    key={r}
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.role === r ? `${c.bg} ${c.text} border-current` : "bg-white/4 text-gray-500 border-white/8 hover:border-white/15"}`}>
                    {r === "admin" && <Shield size={10} className="inline mr-1" />}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/4 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Star size={13} className="text-amber-400" /> Whitelist Access
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Bypasses all usage limits permanently</p>
              </div>
              <Toggle checked={form.is_whitelisted} onChange={v => setForm(f => ({ ...f, is_whitelisted: v }))} label="Whitelist" color="amber" />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/4 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Ban size={13} className="text-rose-400" /> Account Suspended
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Blocks login until unsuspended</p>
              </div>
              <Toggle checked={form.is_banned} onChange={v => setForm(f => ({ ...f, is_banned: v }))} label="Banned" color="rose" />
            </div>
          </div>

          {/* Reset limits */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Usage Override</label>
            <div className="flex items-center justify-between p-3 bg-white/4 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-white">Free Limit Counter</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user.guides_created_ever ?? 0} guide{(user.guides_created_ever ?? 0) !== 1 ? "s" : ""} created ever
                </p>
              </div>
              <button
                onClick={handleResetLimits}
                disabled={resetting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg transition-all disabled:opacity-50">
                <RotateCcw size={12} className={resetting ? "animate-spin" : ""} />
                Reset
              </button>
            </div>
          </div>

          {/* Admin notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Admin Notes</label>
            <textarea
              value={form.admin_notes}
              onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))}
              rows={3}
              maxLength={1000}
              placeholder="Internal notes about this user…"
              className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors" />
          </div>

          {/* Recent audit */}
          {auditLog.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Recent Changes</label>
              <div className="bg-white/4 rounded-xl px-3 py-1">
                {auditLog.map(log => <AuditRow key={log.id} log={log} />)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 p-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-xl text-white text-sm font-bold transition-all">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cost Analytics Tab ────────────────────────────────────────────────────────
function CostTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setData(null);
    api.admin.costStats()
      .then(d  => { if (!cancelled) { setData(d);          setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [fetchKey]);

  const fmt      = (n) => `$${(n || 0).toFixed(4)}`;
  const fmtShort = (n) => `$${(n || 0).toFixed(2)}`;

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading cost data…
    </div>
  );
  if (error) return (
    <div className="text-red-400 text-sm py-10 text-center">{error}</div>
  );
  if (!data) return null;

  const { summary = {}, topUsers = [] } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setFetchKey(k => k + 1)}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total API Spend (all time)", value: fmtShort(summary.totalCost), sub: `Guides: ${fmtShort(summary.totalGuideCost)} · Quizzes: ${fmtShort(summary.totalQuizCost)}` },
          { label: "Avg Cost / User",            value: fmt(summary.avgCostPerUser),  sub: `Across ${summary.totalUsers} users` },
          { label: "Avg Cost / Paid User",       value: fmt(summary.avgCostPerPaid),  sub: `Across ${summary.paidUsers} paid users` },
        ].map(card => (
          <div key={card.label} className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-white text-2xl font-bold">{card.value}</p>
            <p className="text-gray-500 text-xs mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <DollarSign size={15} className="text-indigo-400" />
          <p className="text-white font-semibold text-sm">Top 25 Users by Estimated Cost</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-right px-4 py-3">Guides</th>
                <th className="text-right px-4 py-3">Quizzes</th>
                <th className="text-right px-5 py-3">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => (
                <tr key={u.id} className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{u.name || "—"}</p>
                    <p className="text-gray-500 text-xs">{u.email}</p>
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                  <td className="px-4 py-3 text-right text-gray-300">{u.guides_created_ever}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{u.total_quizzes}</td>
                  <td className="px-5 py-3 text-right font-mono text-indigo-300 font-semibold">{fmt(u.estimated_cost)}</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-500 py-8">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin page ───────────────────────────────────────────────────────────
export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("users");
  const [stats, setStats]         = useState(null);
  const [users, setUsers]         = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userPage, setUserPage]   = useState(0);
  const [search, setSearch]       = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logPage, setLogPage]     = useState(0);
  const [logSearch, setLogSearch] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const searchTimeout = useRef(null);

  // ── Abuse tab state ──────────────────────────────────────────────────────────
  const [abuseStats,    setAbuseStats]    = useState(null);
  const [abuseTab,      setAbuseTab]      = useState("flags");  // flags | signals | deleted
  const [abuseFlags,    setAbuseFlags]    = useState([]);
  const [abuseFlagsTotal, setAbuseFlagsTotal] = useState(0);
  const [abuseFlagPage, setAbuseFlagPage] = useState(0);
  const [abuseSignals,  setAbuseSignals]  = useState([]);
  const [abuseSignalsTotal, setAbuseSignalsTotal] = useState(0);
  const [abuseSignalPage, setAbuseSignalPage] = useState(0);
  const [abuseSignalType, setAbuseSignalType] = useState("");
  const [deletedAccts,  setDeletedAccts]  = useState([]);
  const [deletedTotal,  setDeletedTotal]  = useState(0);
  const [deletedPage,   setDeletedPage]   = useState(0);
  const [loadingAbuse,  setLoadingAbuse]  = useState(false);

  const PAGE_SIZE = 25;

  // Guard: redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin") navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const loadStats = useCallback(() => {
    api.admin.stats().then(setStats).catch(() => {});
  }, []);

  const loadUsers = useCallback(() => {
    setLoadingUsers(true);
    const params = { limit: PAGE_SIZE, offset: userPage * PAGE_SIZE };
    if (search)     params.search = search;
    if (planFilter) params.plan   = planFilter;
    if (roleFilter) params.role   = roleFilter;
    api.admin.users(params)
      .then(d => { setUsers(d.users || []); setTotalUsers(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [userPage, search, planFilter, roleFilter]);

  const loadLogs = useCallback(() => {
    setLoadingLogs(true);
    const params = { limit: 50, offset: logPage * 50 };
    if (logSearch) params.search = logSearch;
    api.admin.auditLogs(params)
      .then(d => { setAuditLogs(d.logs || []); setTotalLogs(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, [logPage, logSearch]);

  const loadAbuseStats = useCallback(() => {
    api.admin.abuse.stats().then(setAbuseStats).catch(() => {});
  }, []);

  const loadAbuseFlags = useCallback(() => {
    setLoadingAbuse(true);
    api.admin.abuse.flags({ limit: 25, offset: abuseFlagPage * 25 })
      .then(d => { setAbuseFlags(d.rows || []); setAbuseFlagsTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoadingAbuse(false));
  }, [abuseFlagPage]);

  const loadAbuseSignals = useCallback(() => {
    setLoadingAbuse(true);
    const p = { limit: 25, offset: abuseSignalPage * 25 };
    if (abuseSignalType) p.type = abuseSignalType;
    api.admin.abuse.signals(p)
      .then(d => { setAbuseSignals(d.rows || []); setAbuseSignalsTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoadingAbuse(false));
  }, [abuseSignalPage, abuseSignalType]);

  const loadDeletedAccts = useCallback(() => {
    setLoadingAbuse(true);
    api.admin.abuse.deletedAccounts({ limit: 25, offset: deletedPage * 25 })
      .then(d => { setDeletedAccts(d.rows || []); setDeletedTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoadingAbuse(false));
  }, [deletedPage]);

  useEffect(() => { loadStats(); loadAbuseStats(); }, [loadStats, loadAbuseStats]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(loadUsers, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [loadUsers]);

  useEffect(() => {
    if (activeTab === "audit") loadLogs();
  }, [activeTab, loadLogs]);

  useEffect(() => {
    if (activeTab !== "abuse") return;
    if (abuseTab === "flags")   loadAbuseFlags();
    if (abuseTab === "signals") loadAbuseSignals();
    if (abuseTab === "deleted") loadDeletedAccts();
  }, [activeTab, abuseTab, loadAbuseFlags, loadAbuseSignals, loadDeletedAccts]);

  const handleUserSaved = (updatedUser) => {
    setUsers(us => us.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
    setSelectedUser(prev => prev ? { ...prev, ...updatedUser } : null);
    loadStats();
  };

  if (!user || user.role !== "admin") return null;

  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);
  const totalLogPages = Math.ceil(totalLogs / 50);

  return (
    <div className="flex min-h-dvh bg-[#080810] w-full">
      <Sidebar onLogout={logout} />

      <main className="flex-1 min-w-0 md:ml-64 p-4 md:p-8 main-pt">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Shield size={16} className="text-rose-400" />
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Admin</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white">Admin Dashboard</h1>
            <p className="text-gray-600 text-xs mt-0.5">Manage users, permissions, and platform access</p>
          </div>
          <button onClick={() => { loadStats(); loadUsers(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl text-gray-400 hover:text-white text-xs font-medium transition-all">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <StatCard icon={Users}         label="Total Users"     value={stats.totalUsers}    color="indigo" />
            <StatCard icon={Crown}         label="Pro / Lifetime"  value={stats.proUsers + stats.lifetimeUsers} sub={`${stats.lifetimeUsers} lifetime`} color="violet" />
            <StatCard icon={GraduationCap} label="Pilot"           value={stats.pilotUsers ?? 0} color="teal" />
            <StatCard icon={Zap}           label="Free Users"      value={stats.freeUsers}      color="sky" />
            <StatCard icon={Star}          label="Whitelisted"     value={stats.whitelisted}    color="amber" />
            <StatCard icon={Ban}           label="Banned"          value={stats.bannedUsers}    color="rose" />
            <StatCard icon={BookOpen}      label="Total Guides"    value={stats.totalGuides}    color="emerald" />
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-4 border-b border-white/8 overflow-x-auto">
          {[
            { id: "users",  label: "Users",     icon: Users    },
            { id: "audit",  label: "Audit Log", icon: Activity },
            { id: "abuse",  label: "Abuse",     icon: Shield, badge: abuseStats?.activeFlags || null },
            { id: "cost",   label: "Cost",      icon: DollarSign },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${activeTab === t.id ? "border-indigo-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              <t.icon size={14} />
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Users Tab ── */}
        {activeTab === "users" && (
          <div>
            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setUserPage(0); }}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 pr-4 py-2.5 bg-white/4 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
              <select
                value={planFilter}
                onChange={e => { setPlanFilter(e.target.value); setUserPage(0); }}
                className="bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors">
                <option value="">All plans</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="lifetime">Lifetime</option>
                <option value="pilot">Pilot</option>
              </select>
              <select
                value={roleFilter}
                onChange={e => { setRoleFilter(e.target.value); setUserPage(0); }}
                className="bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors">
                <option value="">All roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <p className="text-xs text-gray-600 mb-3">{totalUsers.toLocaleString()} user{totalUsers !== 1 ? "s" : ""} found</p>

            {/* Table */}
            <div className="bg-white/2 border border-white/6 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Plan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Guides</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden xl:table-cell">Joined</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-white/4">
                          <td className="px-4 py-3"><div className="skeleton h-8 w-40 rounded-lg" /></td>
                          <td className="px-4 py-3 hidden md:table-cell"><div className="skeleton h-5 w-16 rounded-full" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><div className="skeleton h-5 w-14 rounded-full" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><div className="skeleton h-4 w-8 rounded" /></td>
                          <td className="px-4 py-3 hidden xl:table-cell"><div className="skeleton h-4 w-24 rounded" /></td>
                          <td className="px-4 py-3"><div className="skeleton h-5 w-16 rounded-full" /></td>
                        </tr>
                      ))
                    ) : users.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">No users found</td></tr>
                    ) : users.map(u => (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="border-b border-white/4 last:border-0 hover:bg-white/3 cursor-pointer transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-600/30 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {initials(u.name)}
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm leading-none">{u.name}</p>
                              <p className="text-gray-500 text-xs mt-0.5">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell"><PlanBadge plan={u.plan} /></td>
                        <td className="px-4 py-3 hidden lg:table-cell"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-gray-300 text-sm font-mono">{u.guides_created_ever ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-gray-500 text-xs">{fmtDate(u.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {u.is_whitelisted ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                                <Star size={9} /> WL
                              </span>
                            ) : null}
                            {u.is_banned ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                                <Ban size={9} /> Banned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                                <CheckCircle size={9} /> Active
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/6">
                  <p className="text-xs text-gray-500">Page {userPage + 1} of {totalPages}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setUserPage(p => Math.max(0, p - 1))}
                      disabled={userPage === 0}
                      className="p-1.5 rounded-lg bg-white/4 hover:bg-white/8 disabled:opacity-30 text-gray-400 hover:text-white transition-all">
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setUserPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={userPage >= totalPages - 1}
                      className="p-1.5 rounded-lg bg-white/4 hover:bg-white/8 disabled:opacity-30 text-gray-400 hover:text-white transition-all">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Audit Log Tab ── */}
        {activeTab === "audit" && (
          <div>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={logSearch}
                onChange={e => { setLogSearch(e.target.value); setLogPage(0); }}
                placeholder="Search by email or action…"
                className="w-full max-w-sm pl-9 pr-4 py-2.5 bg-white/4 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
            </div>

            <div className="bg-white/2 border border-white/6 rounded-2xl">
              {loadingLogs ? (
                <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No audit log entries yet</div>
              ) : (
                <div className="px-4 py-2">
                  {auditLogs.map(log => <AuditRow key={log.id} log={log} />)}
                </div>
              )}

              {totalLogPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/6">
                  <p className="text-xs text-gray-500">Page {logPage + 1} of {totalLogPages}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setLogPage(p => Math.max(0, p - 1))} disabled={logPage === 0}
                      className="p-1.5 rounded-lg bg-white/4 hover:bg-white/8 disabled:opacity-30 text-gray-400 hover:text-white transition-all">
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => setLogPage(p => Math.min(totalLogPages - 1, p + 1))} disabled={logPage >= totalLogPages - 1}
                      className="p-1.5 rounded-lg bg-white/4 hover:bg-white/8 disabled:opacity-30 text-gray-400 hover:text-white transition-all">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* ── Abuse Tab ── */}
        {activeTab === "abuse" && (
          <div>
            {/* Abuse overview stats */}
            {abuseStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Active Flags",       value: abuseStats.activeFlags,      color: "rose",    icon: Flag },
                  { label: "High Severity",       value: abuseStats.highFlags,        color: "amber",   icon: AlertTriangle },
                  { label: "Deleted (w/ usage)",  value: abuseStats.deletedWithUsage, color: "violet",  icon: Trash2 },
                  { label: "Blocked Signals",     value: abuseStats.blockedSignals,   color: "rose",    icon: Lock },
                  { label: "Multi-IP Accounts",   value: abuseStats.multiAccountIps,  color: "amber",   icon: Users },
                  { label: "Fingerprints Seen",   value: abuseStats.fpSignals,        color: "sky",     icon: Fingerprint },
                  { label: "IPs Tracked",         value: abuseStats.ipSignals,        color: "indigo",  icon: EyeOff },
                  { label: "Total Deleted",        value: abuseStats.deletedAccounts,  color: "emerald", icon: Trash2 },
                ].map(s => (
                  <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} />
                ))}
              </div>
            )}

            {/* Sub-tabs */}
            <div className="flex gap-1 mb-4 border-b border-white/8">
              {[
                { id: "flags",   label: "Flags",            icon: Flag },
                { id: "signals", label: "Signals",          icon: Fingerprint },
                { id: "deleted", label: "Deleted Accounts", icon: Trash2 },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setAbuseTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all -mb-px ${abuseTab === t.id ? "border-rose-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
                  <t.icon size={12} /> {t.label}
                </button>
              ))}
            </div>

            {/* ── Flags ── */}
            {abuseTab === "flags" && (
              <div className="bg-white/2 border border-white/6 rounded-2xl overflow-hidden">
                {loadingAbuse ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
                ) : abuseFlags.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-white font-semibold text-sm">No active flags</p>
                    <p className="text-gray-600 text-xs mt-1">All abuse signals are resolved</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/6">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Severity</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Reason</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Target</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">User</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden xl:table-cell">Raised</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {abuseFlags.map(f => {
                          const sevColor = { high: "text-rose-400 bg-rose-500/15 border-rose-500/30", medium: "text-amber-400 bg-amber-500/15 border-amber-500/30", low: "text-gray-400 bg-white/5 border-white/10" }[f.severity] || "text-gray-400 bg-white/5 border-white/10";
                          return (
                            <tr key={f.id} className="border-b border-white/4 last:border-0 hover:bg-white/2">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${sevColor}`}>
                                  {f.severity}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-white text-xs font-mono">{f.reason.replace(/_/g, " ")}</p>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <p className="text-gray-500 text-xs">{f.target_type}</p>
                                <p className="text-gray-700 text-xs font-mono truncate max-w-[140px]">{f.target_value.slice(0, 16)}…</p>
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                <p className="text-gray-400 text-xs">{f.related_user_email || "—"}</p>
                              </td>
                              <td className="px-4 py-3 hidden xl:table-cell">
                                <p className="text-gray-500 text-xs">{fmtDateTime(f.created_at)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={async () => {
                                    if (!confirm("Mark this flag as resolved?")) return;
                                    try {
                                      await api.admin.abuse.resolveFlag(f.id);
                                      loadAbuseFlags();
                                      loadAbuseStats();
                                    } catch (err) { alert(err.message); }
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg transition-all">
                                  <CheckCircle size={11} /> Resolve
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {Math.ceil(abuseFlagsTotal / 25) > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/6">
                    <p className="text-xs text-gray-500">Page {abuseFlagPage + 1} of {Math.ceil(abuseFlagsTotal / 25)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setAbuseFlagPage(p => Math.max(0, p - 1))} disabled={abuseFlagPage === 0} className="p-1.5 rounded-lg bg-white/4 disabled:opacity-30 text-gray-400 hover:text-white"><ChevronLeft size={14} /></button>
                      <button onClick={() => setAbuseFlagPage(p => p + 1)} disabled={(abuseFlagPage + 1) * 25 >= abuseFlagsTotal} className="p-1.5 rounded-lg bg-white/4 disabled:opacity-30 text-gray-400 hover:text-white"><ChevronRight size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Signals ── */}
            {abuseTab === "signals" && (
              <div>
                <div className="flex gap-2 mb-3">
                  {["", "ip", "fp", "email"].map(t => (
                    <button key={t} onClick={() => { setAbuseSignalType(t); setAbuseSignalPage(0); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${abuseSignalType === t ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-white/4 text-gray-500 border border-white/8 hover:text-gray-300"}`}>
                      {t || "All"}
                    </button>
                  ))}
                </div>
                <div className="bg-white/2 border border-white/6 rounded-2xl overflow-hidden">
                  {loadingAbuse ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
                  ) : abuseSignals.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No signals recorded yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/6">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Type</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Signal (preview)</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Accounts</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Guides</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Last Seen</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abuseSignals.map(s => (
                            <tr key={s.id} className="border-b border-white/4 last:border-0 hover:bg-white/2">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  s.signal_type === "fp" ? "bg-violet-500/15 text-violet-400 border-violet-500/30" :
                                  s.signal_type === "ip" ? "bg-sky-500/15 text-sky-400 border-sky-500/30" :
                                  "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                }`}>
                                  {s.signal_type === "fp" ? <Fingerprint size={10} /> : s.signal_type === "ip" ? <EyeOff size={10} /> : <Flag size={10} />}
                                  {s.signal_type}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-gray-500 text-xs font-mono">{s.signal_preview}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-bold ${s.accounts_created >= 3 ? "text-rose-400" : "text-gray-300"}`}>{s.accounts_created}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-bold ${s.guides_generated >= 1 ? "text-amber-400" : "text-gray-300"}`}>{s.guides_generated}</span>
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                <span className="text-gray-500 text-xs">{fmtDate(s.last_seen_at)}</span>
                              </td>
                              <td className="px-4 py-3">
                                {s.is_blocked ? (
                                  <button
                                    onClick={async () => {
                                      try { await api.admin.abuse.blockSignal(s.id, false); loadAbuseSignals(); loadAbuseStats(); }
                                      catch (err) { alert(err.message); }
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg transition-all">
                                    <Unlock size={11} /> Unblock
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      if (!confirm("Block this signal? Any account associated with it will be denied free guide access.")) return;
                                      try { await api.admin.abuse.blockSignal(s.id, true); loadAbuseSignals(); loadAbuseStats(); }
                                      catch (err) { alert(err.message); }
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg transition-all">
                                    <Lock size={11} /> Block
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {Math.ceil(abuseSignalsTotal / 25) > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/6">
                      <p className="text-xs text-gray-500">Page {abuseSignalPage + 1} of {Math.ceil(abuseSignalsTotal / 25)}</p>
                      <div className="flex gap-1">
                        <button onClick={() => setAbuseSignalPage(p => Math.max(0, p - 1))} disabled={abuseSignalPage === 0} className="p-1.5 rounded-lg bg-white/4 disabled:opacity-30 text-gray-400 hover:text-white"><ChevronLeft size={14} /></button>
                        <button onClick={() => setAbuseSignalPage(p => p + 1)} disabled={(abuseSignalPage + 1) * 25 >= abuseSignalsTotal} className="p-1.5 rounded-lg bg-white/4 disabled:opacity-30 text-gray-400 hover:text-white"><ChevronRight size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Deleted Accounts ── */}
            {abuseTab === "deleted" && (
              <div className="bg-white/2 border border-white/6 rounded-2xl overflow-hidden">
                {loadingAbuse ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
                ) : deletedAccts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No deleted accounts on record</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/6">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Email Domain</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Guides Used</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Was Pro</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">FP Stored</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">IP Stored</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Deleted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deletedAccts.map(d => (
                          <tr key={d.id} className="border-b border-white/4 last:border-0 hover:bg-white/2">
                            <td className="px-4 py-3">
                              <span className="text-gray-300 text-xs font-mono">@{d.email_domain || "unknown"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-bold ${d.guides_generated > 0 ? "text-rose-400" : "text-gray-500"}`}>{d.guides_generated}</span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {d.was_pro ? <span className="text-amber-400 text-xs font-semibold flex items-center gap-1"><Crown size={10} /> Yes</span> : <span className="text-gray-600 text-xs">No</span>}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {d.has_fp ? <CheckCircle size={13} className="text-emerald-400" /> : <X size={13} className="text-gray-700" />}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              {d.has_ip ? <CheckCircle size={13} className="text-emerald-400" /> : <X size={13} className="text-gray-700" />}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-500 text-xs">{fmtDate(d.deleted_at)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {Math.ceil(deletedTotal / 25) > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/6">
                    <p className="text-xs text-gray-500">Page {deletedPage + 1} of {Math.ceil(deletedTotal / 25)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setDeletedPage(p => Math.max(0, p - 1))} disabled={deletedPage === 0} className="p-1.5 rounded-lg bg-white/4 disabled:opacity-30 text-gray-400 hover:text-white"><ChevronLeft size={14} /></button>
                      <button onClick={() => setDeletedPage(p => p + 1)} disabled={(deletedPage + 1) * 25 >= deletedTotal} className="p-1.5 rounded-lg bg-white/4 disabled:opacity-30 text-gray-400 hover:text-white"><ChevronRight size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "cost" && <CostTab />}
      </main>

      {/* ── User Edit Drawer ── */}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaved={handleUserSaved}
        />
      )}
    </div>
  );
}
