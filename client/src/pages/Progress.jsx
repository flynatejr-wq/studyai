import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart2, Clock, BookOpen, Trophy, Flame, Zap,
  Star, TrendingUp, AlertCircle, CheckCircle
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { ACHIEVEMENT_DEFS } from "../constants/achievements.js";

function fmtTime(seconds) {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function ScoreBar({ score, total, date }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-1" title={`${pct}% — ${new Date(date).toLocaleDateString()}`}>
      <div className="w-5 h-16 bg-white/10 rounded-full overflow-hidden flex flex-col-reverse">
        <div className={`${color} rounded-full transition-all`} style={{ height: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{pct}%</span>
    </div>
  );
}

function ActivityHeatmap({ activity }) {
  // Build last 30 days map
  const map = {};
  activity.forEach(a => { map[a.date] = a.seconds; });
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    days.push({ date: key, seconds: map[key] || 0 });
  }
  const max = Math.max(...days.map(d => d.seconds), 1);
  // Split into 2 rows of 15 on mobile, single row on larger screens
  return (
    <div className="space-y-1 sm:space-y-0">
      {/* Mobile: 2 rows of 15 */}
      <div className="flex gap-1 sm:hidden">
        {days.slice(0, 15).map(({ date, seconds }) => {
          const intensity = seconds / max;
          const bg = seconds === 0 ? "bg-white/5"
            : intensity < 0.33 ? "bg-indigo-900/60"
            : intensity < 0.66 ? "bg-indigo-600/70"
            : "bg-indigo-500";
          return <div key={date} title={`${date}: ${fmtTime(seconds)}`} className={`flex-1 h-6 rounded ${bg} cursor-default min-w-0`} />;
        })}
      </div>
      <div className="flex gap-1 sm:hidden">
        {days.slice(15).map(({ date, seconds }) => {
          const intensity = seconds / max;
          const bg = seconds === 0 ? "bg-white/5"
            : intensity < 0.33 ? "bg-indigo-900/60"
            : intensity < 0.66 ? "bg-indigo-600/70"
            : "bg-indigo-500";
          return <div key={date} title={`${date}: ${fmtTime(seconds)}`} className={`flex-1 h-6 rounded ${bg} cursor-default min-w-0`} />;
        })}
      </div>
      {/* Desktop: single row */}
      <div className="hidden sm:flex gap-1 flex-wrap">
        {days.map(({ date, seconds }) => {
          const intensity = seconds / max;
          const bg = seconds === 0 ? "bg-white/5"
            : intensity < 0.33 ? "bg-indigo-900/60"
            : intensity < 0.66 ? "bg-indigo-600/70"
            : "bg-indigo-500";
          return <div key={date} title={`${date}: ${fmtTime(seconds)}`} className={`w-7 h-7 rounded-md ${bg} cursor-default`} />;
        })}
      </div>
    </div>
  );
}

export default function Progress() {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.progress.get()
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message || "Failed to load progress."); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex min-h-screen bg-[#0a0a12]">
      <Sidebar onLogout={logout} />
      <main className="flex-1 md:ml-64 flex items-center justify-center pt-14 md:pt-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading progress…</p>
        </div>
      </main>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen bg-[#0a0a12]">
      <Sidebar onLogout={logout} />
      <main className="flex-1 md:ml-64 flex items-center justify-center p-8 pt-14 md:pt-0">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">Couldn't load progress</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => { setError(""); setLoading(true); api.progress.get().then(d => { setData(d); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors">
            Try Again
          </button>
        </div>
      </main>
    </div>
  );

  const user = data?.user ?? {};
  const guides = data?.guides ?? [];
  const achievements = data?.achievements ?? [];
  const activity = data?.activity ?? [];
  const earnedTypes = new Set(achievements.map(a => a.type));
  const xpNext = Math.max((user.level ?? 1) * (user.level ?? 1) * 100, 1);
  const xpProgress = Math.min((((user.xp ?? 0) % xpNext) / xpNext) * 100, 100);

  const needsReview = guides.filter(g => {
    const days = daysSince(g.last_studied_at);
    return days === null || days >= 7;
  });

  const totalQuizzes = guides.reduce((s, g) => s + g.quiz_attempts, 0);
  const avgScore = (() => {
    const all = guides.flatMap(g => Array.isArray(g.attempts) ? g.attempts : []);
    if (!all.length) return null;
    const pct = all.map(a => (a?.total > 0 ? (a.score / a.total) * 100 : 0));
    return Math.round(pct.reduce((s, v) => s + v, 0) / pct.length);
  })();

  return (
    <div className="flex min-h-screen bg-[#0a0a12]">
      <Sidebar onLogout={logout} />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 max-w-5xl w-full min-w-0">

        {/* Header */}
        <div className="mb-7">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mb-0.5">Dashboard</p>
          <h1 className="text-xl md:text-2xl font-black text-white">Your Progress</h1>
        </div>

        {/* Level + XP */}
        <div className="bg-gradient-to-br from-indigo-600/15 to-violet-600/8 border border-indigo-500/20 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-indigo-500/30">
                {user.level ?? 1}
              </div>
              <div>
                <p className="text-white font-bold text-sm">Level {user.level ?? 1}</p>
                <p className="text-gray-500 text-xs">{user.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-indigo-300 font-black text-lg">{(user.xp ?? 0).toLocaleString()} <span className="text-xs font-normal text-gray-500">XP</span></p>
              <p className="text-gray-600 text-xs">{xpNext - ((user.xp ?? 0) % xpNext)} to Level {(user.level ?? 1) + 1}</p>
            </div>
          </div>
          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 rounded-full" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { emoji: "⏱️", label: "Study Time",     value: fmtTime(user.total_study_time), grad: "from-blue-500/12 to-blue-600/5",     border: "border-blue-500/18"   },
            { emoji: "📚", label: "Guides Created", value: user.total_guides ?? 0,         grad: "from-indigo-500/12 to-indigo-600/5", border: "border-indigo-500/18" },
            { emoji: "🎯", label: "Quizzes Taken",  value: totalQuizzes,                   grad: "from-yellow-500/12 to-amber-600/5",  border: "border-yellow-500/18" },
            { emoji: "🔥", label: "Day Streak",     value: `${user.streak ?? 0}d`,         grad: "from-orange-500/12 to-red-600/5",   border: "border-orange-500/18" },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.grad} border ${s.border} rounded-2xl p-4`}>
              <span className="text-xl">{s.emoji}</span>
              <p className="text-lg sm:text-xl font-black text-white mt-2 truncate">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Avg Score */}
        {avgScore !== null && (
          <div className="bg-white/4 border border-white/8 rounded-2xl p-5 mb-5 flex items-center gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0"
              style={{
                background: avgScore >= 80 ? "rgba(34,197,94,0.15)" : avgScore >= 60 ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)",
                color: avgScore >= 80 ? "#4ade80" : avgScore >= 60 ? "#facc15" : "#f87171",
                border: `1px solid ${avgScore >= 80 ? "rgba(34,197,94,0.2)" : avgScore >= 60 ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
              {avgScore}%
            </div>
            <div>
              <p className="text-white font-bold text-sm">Overall Quiz Average</p>
              <p className="text-gray-500 text-xs mt-0.5">Across {totalQuizzes} quiz attempt{totalQuizzes !== 1 ? "s" : ""}</p>
            </div>
            <TrendingUp size={18} className="ml-auto text-indigo-500/40" />
          </div>
        )}

        {/* Activity Heatmap */}
        <div className="bg-white/4 border border-white/8 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-indigo-400" />
            <h2 className="text-white font-bold text-sm">30-Day Activity</h2>
            <span className="ml-auto text-xs text-gray-600">Darker = more time</span>
          </div>
          <ActivityHeatmap activity={activity} />
        </div>

        {/* Achievements */}
        <div className="bg-white/4 border border-white/8 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-yellow-400" />
            <h2 className="text-white font-bold text-sm">Achievements</h2>
            <span className="ml-auto text-xs text-gray-500">{earnedTypes.size}/{ACHIEVEMENT_DEFS.length}</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all"
              style={{ width: `${(earnedTypes.size / ACHIEVEMENT_DEFS.length) * 100}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {ACHIEVEMENT_DEFS.map(a => {
              const earned   = earnedTypes.has(a.type);
              const earnedAt = achievements.find(e => e.type === a.type)?.earned_at;
              return (
                <div key={a.type}
                  className={`rounded-xl p-3 border transition-all ${
                    earned
                      ? "bg-yellow-500/10 border-yellow-500/25 hover:border-yellow-500/40"
                      : "bg-white/2 border-white/5 opacity-40"
                  }`}>
                  <div className="text-xl mb-1.5">{earned ? a.emoji : "🔒"}</div>
                  <p className={`font-bold text-xs ${earned ? "text-yellow-300" : "text-gray-600"}`}>{a.name}</p>
                  <p className="text-gray-600 text-xs mt-0.5 leading-tight">{a.desc}</p>
                  {earnedAt && <p className="text-yellow-700 text-xs mt-1">{new Date(earnedAt).toLocaleDateString()}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Needs Review */}
        {needsReview.length > 0 && (
          <div className="bg-amber-500/8 border border-amber-500/18 rounded-2xl p-5 mb-5">
            <h2 className="text-amber-300 font-bold text-sm mb-3 flex items-center gap-2">
              <AlertCircle size={14} /> Needs Review ({needsReview.length})
            </h2>
            <div className="space-y-1.5">
              {needsReview.slice(0, 5).map(g => {
                const days = daysSince(g.last_studied_at);
                return (
                  <Link key={g.id} to={`/guide/${g.id}`}
                    className="flex items-center justify-between bg-white/4 hover:bg-white/6 rounded-xl px-4 py-2.5 transition-colors group">
                    <span className="text-white text-sm font-medium group-hover:text-amber-300 transition-colors truncate mr-4">{g.title}</span>
                    <span className="text-amber-500 text-xs font-medium shrink-0">
                      {days === null ? "Never" : `${days}d ago`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Guide Performance */}
        <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} className="text-indigo-400" />
            <h2 className="text-white font-bold text-sm">Guide Performance</h2>
          </div>
          {guides.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No guides yet. Create one from the dashboard!</p>
          ) : (
            <div className="space-y-3">
              {guides.map(g => {
                const best    = g.best_quiz_score ?? 0;
                const total   = g.attempts?.[0]?.total || 5;
                const bestPct = total > 0 ? Math.round((best / total) * 100) : 0;
                const days    = daysSince(g.last_studied_at);
                return (
                  <div key={g.id} className="border border-white/8 rounded-xl p-4 hover:border-white/12 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-4">
                        <Link to={`/guide/${g.id}`}
                          className="text-white font-semibold text-sm hover:text-indigo-300 transition-colors truncate block">
                          {g.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-gray-600 text-xs flex items-center gap-1">
                            <Clock size={9} /> {fmtTime(g.study_time_seconds)}
                          </span>
                          <span className="text-gray-600 text-xs flex items-center gap-1">
                            <Trophy size={9} /> {g.quiz_attempts} quiz{g.quiz_attempts !== 1 ? "zes" : ""}
                          </span>
                          {days !== null && (
                            <span className={`text-xs flex items-center gap-1 ${days >= 7 ? "text-amber-500" : "text-green-500"}`}>
                              {days >= 7 ? <AlertCircle size={9} /> : <CheckCircle size={9} />}
                              {days === 0 ? "Today" : `${days}d ago`}
                            </span>
                          )}
                        </div>
                      </div>
                      {g.quiz_attempts > 0 && (
                        <div className="text-right shrink-0">
                          <p className={`text-base font-black ${bestPct >= 80 ? "text-green-400" : bestPct >= 60 ? "text-yellow-400" : "text-red-400"}`}>{bestPct}%</p>
                          <p className="text-gray-600 text-xs">best</p>
                        </div>
                      )}
                    </div>
                    {g.attempts?.length > 0 && (
                      <div className="flex items-end gap-1 mt-3">
                        <span className="text-gray-700 text-xs mr-1">History:</span>
                        {(g.attempts || []).slice(-10).map((a, i) => (
                          <ScoreBar key={i} score={a.score} total={a.total} date={a.created_at} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
