import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart2, Clock, BookOpen, Trophy, Flame, Zap,
  Star, TrendingUp, AlertCircle, CheckCircle, Lock
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
  return (
    <div className="flex gap-1 flex-wrap">
      {days.map(({ date, seconds }) => {
        const intensity = seconds / max;
        const bg = seconds === 0
          ? "bg-white/5"
          : intensity < 0.33 ? "bg-indigo-900/60"
          : intensity < 0.66 ? "bg-indigo-600/70"
          : "bg-indigo-500";
        return (
          <div key={date} title={`${date}: ${fmtTime(seconds)}`}
            className={`w-7 h-7 rounded-md ${bg} cursor-default`} />
        );
      })}
    </div>
  );
}

export default function Progress() {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.progress.get().then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar onLogout={logout} />
      <main className="flex-1 md:ml-64 flex items-center justify-center pt-14 md:pt-0">
        <div className="text-indigo-400 animate-pulse text-lg">Loading progress...</div>
      </main>
    </div>
  );

  const { user, guides, achievements, activity } = data;
  const earnedTypes = new Set(achievements.map(a => a.type));
  const xpNext = user.level * user.level * 100;
  const xpProgress = Math.min(((user.xp % xpNext) / xpNext) * 100, 100);

  const needsReview = guides.filter(g => {
    const days = daysSince(g.last_studied_at);
    return days === null || days >= 7;
  });

  const totalQuizzes = guides.reduce((s, g) => s + g.quiz_attempts, 0);
  const avgScore = (() => {
    const all = guides.flatMap(g => g.attempts);
    if (!all.length) return null;
    const pct = all.map(a => a.total > 0 ? (a.score / a.total) * 100 : 0);
    return Math.round(pct.reduce((s, v) => s + v, 0) / pct.length);
  })();

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar onLogout={logout} />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart2 className="text-indigo-400" size={28} /> Your Progress
          </h1>
          <p className="text-gray-400 mt-1">Everything you've learned at a glance.</p>
        </div>

        {/* Level + XP */}
        <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-500/30">
                {user.level}
              </div>
              <div>
                <p className="text-white font-bold text-lg">Level {user.level}</p>
                <p className="text-gray-400 text-sm">{user.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-indigo-300 font-bold text-xl">{user.xp.toLocaleString()} XP</p>
              <p className="text-gray-500 text-sm">{xpNext - (user.xp % xpNext)} XP to Level {user.level + 1}</p>
            </div>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <Clock size={18} className="text-blue-400" />, label: "Study Time", value: fmtTime(user.total_study_time), bg: "from-blue-500/10 to-blue-600/5 border-blue-500/20" },
            { icon: <BookOpen size={18} className="text-indigo-400" />, label: "Guides Created", value: user.total_guides, bg: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20" },
            { icon: <Trophy size={18} className="text-yellow-400" />, label: "Quizzes Taken", value: totalQuizzes, bg: "from-yellow-500/10 to-yellow-600/5 border-yellow-500/20" },
            { icon: <Flame size={18} className="text-orange-400" />, label: "Day Streak", value: `${user.streak} 🔥`, bg: "from-orange-500/10 to-orange-600/5 border-orange-500/20" },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.bg} border rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-gray-400 text-xs font-medium">{s.label}</span></div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Avg Score */}
        {avgScore !== null && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: avgScore >= 80 ? "rgba(34,197,94,0.15)" : avgScore >= 60 ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)", color: avgScore >= 80 ? "#4ade80" : avgScore >= 60 ? "#facc15" : "#f87171" }}>
              {avgScore}%
            </div>
            <div>
              <p className="text-white font-bold">Overall Quiz Average</p>
              <p className="text-gray-400 text-sm">Across {totalQuizzes} quiz attempt{totalQuizzes !== 1 ? "s" : ""}</p>
            </div>
            <TrendingUp size={20} className="ml-auto text-indigo-400 opacity-50" />
          </div>
        )}

        {/* 30-Day Activity Heatmap */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold mb-1 flex items-center gap-2"><Zap size={16} className="text-indigo-400" /> 30-Day Study Activity</h2>
          <p className="text-gray-500 text-xs mb-4">Darker = more time studied that day</p>
          <ActivityHeatmap activity={activity} />
        </div>

        {/* Achievements */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold mb-1 flex items-center gap-2">
            <Star size={16} className="text-yellow-400" /> Achievements
            <span className="ml-auto text-sm text-gray-400 font-normal">{earnedTypes.size}/{ACHIEVEMENT_DEFS.length} earned</span>
          </h2>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-5 mt-2">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
              style={{ width: `${(earnedTypes.size / ACHIEVEMENT_DEFS.length) * 100}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ACHIEVEMENT_DEFS.map(a => {
              const earned = earnedTypes.has(a.type);
              const earnedAt = achievements.find(e => e.type === a.type)?.earned_at;
              return (
                <div key={a.type}
                  className={`rounded-xl p-3 border transition-all ${earned ? "bg-yellow-500/10 border-yellow-500/30" : "bg-white/3 border-white/5 opacity-50"}`}>
                  <div className="text-2xl mb-1.5">{earned ? a.emoji : "🔒"}</div>
                  <p className={`font-semibold text-xs ${earned ? "text-yellow-300" : "text-gray-500"}`}>{a.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-tight">{a.desc}</p>
                  {earnedAt && <p className="text-yellow-600 text-xs mt-1">{new Date(earnedAt).toLocaleDateString()}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Needs Review */}
        {needsReview.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-6">
            <h2 className="text-amber-300 font-bold mb-4 flex items-center gap-2">
              <AlertCircle size={16} /> Needs Review ({needsReview.length})
            </h2>
            <div className="space-y-2">
              {needsReview.slice(0, 5).map(g => {
                const days = daysSince(g.last_studied_at);
                return (
                  <Link key={g.id} to={`/guide/${g.id}`}
                    className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 transition-colors group">
                    <span className="text-white text-sm font-medium group-hover:text-amber-300 transition-colors">{g.title}</span>
                    <span className="text-amber-400 text-xs font-medium">
                      {days === null ? "Never studied" : `${days}d ago`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Guide Performance Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-5 flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-400" /> Guide Performance
          </h2>
          {guides.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No guides yet. Create one from the dashboard!</p>
          ) : (
            <div className="space-y-4">
              {guides.map(g => {
                const best = g.best_quiz_score;
                const total = g.attempts[0]?.total || 5;
                const bestPct = total > 0 ? Math.round((best / total) * 100) : 0;
                const days = daysSince(g.last_studied_at);
                return (
                  <div key={g.id} className="border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-4">
                        <Link to={`/guide/${g.id}`}
                          className="text-white font-semibold text-sm hover:text-indigo-300 transition-colors truncate block">
                          {g.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-gray-500 text-xs flex items-center gap-1">
                            <Clock size={10} /> {fmtTime(g.study_time_seconds)}
                          </span>
                          <span className="text-gray-500 text-xs flex items-center gap-1">
                            <Trophy size={10} /> {g.quiz_attempts} attempt{g.quiz_attempts !== 1 ? "s" : ""}
                          </span>
                          {days !== null && (
                            <span className={`text-xs flex items-center gap-1 ${days >= 7 ? "text-amber-400" : "text-green-400"}`}>
                              {days >= 7 ? <AlertCircle size={10} /> : <CheckCircle size={10} />}
                              {days === 0 ? "Today" : `${days}d ago`}
                            </span>
                          )}
                        </div>
                      </div>
                      {g.quiz_attempts > 0 && (
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-bold ${bestPct >= 80 ? "text-green-400" : bestPct >= 60 ? "text-yellow-400" : "text-red-400"}`}>{bestPct}%</p>
                          <p className="text-gray-500 text-xs">best score</p>
                        </div>
                      )}
                    </div>
                    {g.attempts.length > 0 && (
                      <div className="flex items-end gap-1 mt-2">
                        <span className="text-gray-600 text-xs mr-1">History:</span>
                        {g.attempts.slice(-10).map((a, i) => (
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
