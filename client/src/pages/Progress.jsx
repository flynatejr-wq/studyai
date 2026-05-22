import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, Clock, BookOpen, Trophy, Flame, Zap,
  Star, TrendingUp, AlertCircle, CheckCircle, Target,
  Award, ChevronDown, ChevronUp,
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
      <div className="w-4 h-14 bg-white/8 rounded-full overflow-hidden flex flex-col-reverse">
        <div className={`${color} rounded-full transition-all`} style={{ height: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-600">{pct}%</span>
    </div>
  );
}

function ActivityHeatmap({ activity }) {
  const map = {};
  activity.forEach(a => { map[a.date] = a.seconds; });
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    days.push({ date: key, seconds: map[key] || 0, dayOfWeek: d.getDay() });
  }
  const max = Math.max(...days.map(d => d.seconds), 1);

  return (
    <div>
      <div className="flex gap-1">
        {days.map(({ date, seconds }) => {
          const intensity = seconds / max;
          const bg = seconds === 0 ? "bg-white/5"
            : intensity < 0.25 ? "bg-indigo-900/50"
            : intensity < 0.5  ? "bg-indigo-700/60"
            : intensity < 0.75 ? "bg-indigo-500/70"
            : "bg-indigo-400";
          return (
            <div
              key={date}
              title={`${date}: ${fmtTime(seconds)}`}
              className={`flex-1 h-6 sm:h-7 rounded-sm sm:rounded-md ${bg} cursor-default transition-all hover:opacity-80 min-w-0`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-600">
        <span>30 days ago</span>
        <span className="flex items-center gap-1.5">
          Less
          {["bg-white/5","bg-indigo-900/50","bg-indigo-600/60","bg-indigo-400"].map(c => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          More
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}

function StatCard({ emoji, label, value, gradient, border, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-4 sm:p-5`}>
      <span className="text-2xl">{emoji}</span>
      <p className="text-xl sm:text-2xl font-black text-white mt-3 leading-none truncate">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
    </motion.div>
  );
}

function AchievementGrid({ achievements, earnedTypes }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ACHIEVEMENT_DEFS : ACHIEVEMENT_DEFS.slice(0, 8);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-3">
        {visible.map((a, i) => {
          const earned   = earnedTypes.has(a.type);
          const earnedAt = achievements.find(e => e.type === a.type)?.earned_at;
          return (
            <motion.div
              key={a.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-xl p-3 border transition-all ${
                earned
                  ? "bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/35 hover:bg-yellow-500/15"
                  : "bg-white/2 border-white/5 opacity-40"
              }`}>
              <div className={`text-xl mb-2 ${earned ? "achievement-pop" : ""}`}>
                {earned ? a.emoji : "🔒"}
              </div>
              <p className={`font-bold text-xs ${earned ? "text-yellow-300" : "text-gray-600"}`}>{a.name}</p>
              <p className="text-gray-600 text-xs mt-0.5 leading-tight">{a.desc}</p>
              {earnedAt && (
                <p className="text-yellow-700/70 text-xs mt-1.5">
                  {new Date(earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
      {ACHIEVEMENT_DEFS.length > 8 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
          {showAll ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show all {ACHIEVEMENT_DEFS.length} achievements</>}
        </button>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function ProgressSkeleton() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-28 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-36 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Progress() {
  const { logout } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    api.progress.get()
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message || "Failed to load progress."); setLoading(false); });
  }, []);

  const retry = () => {
    setError(""); setLoading(true);
    api.progress.get()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  return (
    <div className="flex min-h-dvh bg-[#080810] w-full">
      <Sidebar onLogout={logout} />
      <main className="flex-1 min-w-0 md:ml-64 p-4 md:p-8 main-pt max-w-5xl w-full">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-1">Analytics</p>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <BarChart2 size={22} className="text-indigo-400" />
            Your Progress
          </h1>
        </motion.div>

        {loading && <ProgressSkeleton />}

        {error && (
          <div className="text-center max-w-sm mx-auto py-20">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold text-white mb-2">Couldn't load progress</h2>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button onClick={retry}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors">
              Try Again
            </button>
          </div>
        )}

        {data && (() => {
          const user         = data?.user ?? {};
          const guides       = data?.guides ?? [];
          const achievements = data?.achievements ?? [];
          const activity     = data?.activity ?? [];
          const earnedTypes  = new Set(achievements.map(a => a.type));

          const xpForLevel = n => (n - 1) * (n - 1) * 100;
          const lv        = user.level ?? 1;
          const xpCur     = xpForLevel(lv);
          const xpNxt     = xpForLevel(lv + 1);
          const xpPct     = Math.min(((( user.xp ?? 0) - xpCur) / (xpNxt - xpCur)) * 100, 100);

          const totalQuizzes = guides.reduce((s, g) => s + g.quiz_attempts, 0);
          const avgScore = (() => {
            const all = guides.flatMap(g => Array.isArray(g.attempts) ? g.attempts : []);
            if (!all.length) return null;
            const pct = all.map(a => (a?.total > 0 ? (a.score / a.total) * 100 : 0));
            return Math.round(pct.reduce((s, v) => s + v, 0) / pct.length);
          })();
          const needsReview = guides.filter(g => {
            const days = daysSince(g.last_studied_at);
            return days === null || days >= 7;
          });

          return (
            <div className="space-y-5">

              {/* XP / Level hero card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-600/15 to-violet-600/8 border border-indigo-500/20 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-indigo-500/30">
                      {lv}
                    </div>
                    <div>
                      <p className="text-white font-black text-lg leading-none">Level {lv}</p>
                      <p className="text-gray-500 text-xs mt-1">{user.name}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl sm:text-2xl font-black text-indigo-300 tabular-nums">{(user.xp ?? 0).toLocaleString()}</p>
                    <p className="text-gray-600 text-[10px] sm:text-xs">XP · {xpNxt - (user.xp ?? 0)} to next</p>
                  </div>
                </div>

                <div className="h-2.5 bg-white/8 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPct}%` }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 rounded-full"
                  />
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Level {lv}</span>
                  <div className="flex-1 flex items-center">
                    <span className="text-indigo-400 font-bold">{Math.round(xpPct)}%</span>
                  </div>
                  <span>Level {lv + 1} ({xpNxt.toLocaleString()} XP)</span>
                </div>

                {(user.streak ?? 0) > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/8 flex items-center gap-2">
                    <Flame size={16} className="text-orange-400 animate-fire" />
                    <span className="text-orange-400 font-bold text-sm">{user.streak} day streak</span>
                    {user.streak >= 7 && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">🔥 On fire!</span>}
                  </div>
                )}
              </motion.div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard emoji="⏱️" label="Study Time"     value={fmtTime(user.total_study_time)} gradient="from-blue-500/10 to-blue-600/5"     border="border-blue-500/15"   delay={0.05} />
                <StatCard emoji="📚" label="Guides Created" value={user.total_guides ?? 0}         gradient="from-indigo-500/10 to-indigo-600/5" border="border-indigo-500/15" delay={0.1} />
                <StatCard emoji="🎯" label="Quizzes Taken"  value={totalQuizzes}                   gradient="from-yellow-500/10 to-amber-600/5"  border="border-yellow-500/15" delay={0.15} />
                <StatCard emoji="🔥" label="Day Streak"     value={`${user.streak ?? 0}d`}         gradient="from-orange-500/10 to-red-600/5"    border="border-orange-500/15" delay={0.2} />
              </div>

              {/* Avg Score */}
              {avgScore !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                  className="bg-white/3 border border-white/8 rounded-2xl p-5 flex items-center gap-5">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 tabular-nums"
                    style={{
                      background: avgScore >= 80 ? "rgba(34,197,94,0.12)" : avgScore >= 60 ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)",
                      color: avgScore >= 80 ? "#4ade80" : avgScore >= 60 ? "#facc15" : "#f87171",
                      border: `1.5px solid ${avgScore >= 80 ? "rgba(34,197,94,0.2)" : avgScore >= 60 ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)"}`,
                    }}>
                    {avgScore}%
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">Overall Quiz Average</p>
                    <p className="text-gray-500 text-xs mt-0.5">Across {totalQuizzes} quiz attempt{totalQuizzes !== 1 ? "s" : ""}</p>
                    {avgScore >= 80 && <p className="text-green-400 text-xs mt-1 font-medium">Excellent performance! 🏆</p>}
                    {avgScore >= 60 && avgScore < 80 && <p className="text-yellow-400 text-xs mt-1 font-medium">Good — keep practicing! 📈</p>}
                    {avgScore < 60 && <p className="text-red-400 text-xs mt-1 font-medium">More practice needed 💪</p>}
                  </div>
                  <TrendingUp size={20} className="text-indigo-500/30 shrink-0 hidden sm:block" />
                </motion.div>
              )}

              {/* Activity Heatmap */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-sm flex items-center gap-2">
                    <Zap size={14} className="text-indigo-400" /> 30-Day Study Activity
                  </h2>
                  <span className="text-xs text-gray-600 hidden sm:block">Hover for details</span>
                </div>
                <ActivityHeatmap activity={activity} />
              </motion.div>

              {/* Achievements */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
                className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-sm flex items-center gap-2">
                    <Award size={14} className="text-yellow-400" /> Achievements
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{earnedTypes.size}/{ACHIEVEMENT_DEFS.length} earned</span>
                    <div className="w-20 h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                        style={{ width: `${(earnedTypes.size / ACHIEVEMENT_DEFS.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <AchievementGrid achievements={achievements} earnedTypes={earnedTypes} />
              </motion.div>

              {/* Needs Review */}
              {needsReview.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="bg-amber-500/6 border border-amber-500/15 rounded-2xl p-5">
                  <h2 className="text-amber-300 font-bold text-sm mb-3 flex items-center gap-2">
                    <AlertCircle size={14} /> Guides Needing Review ({needsReview.length})
                  </h2>
                  <div className="space-y-2">
                    {needsReview.slice(0, 5).map(g => {
                      const days = daysSince(g.last_studied_at);
                      return (
                        <Link key={g.id} to={`/guide/${g.id}`}
                          className="flex items-center justify-between bg-white/3 hover:bg-white/5 rounded-xl px-4 py-3 transition-colors group">
                          <span className="text-white text-sm font-medium group-hover:text-amber-300 transition-colors truncate mr-4">{g.title}</span>
                          <span className="text-amber-500 text-xs font-medium shrink-0">
                            {days === null ? "Never studied" : `${days}d ago`}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Guide Performance */}
              {guides.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                  className="bg-white/3 border border-white/8 rounded-2xl p-5">
                  <h2 className="text-white font-bold text-sm flex items-center gap-2 mb-4">
                    <Target size={14} className="text-indigo-400" /> Guide Performance
                  </h2>
                  <div className="space-y-3">
                    {guides.map(g => {
                      const best    = g.best_quiz_score ?? 0;
                      const total   = g.attempts?.[0]?.total || 5;
                      const bestPct = total > 0 ? Math.round((best / total) * 100) : 0;
                      const days    = daysSince(g.last_studied_at);
                      return (
                        <div key={g.id} className="border border-white/6 rounded-xl p-4 hover:border-white/10 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-3">
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
                                <p className={`text-lg font-black tabular-nums ${bestPct >= 80 ? "text-green-400" : bestPct >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                                  {bestPct}%
                                </p>
                                <p className="text-gray-600 text-xs">best</p>
                              </div>
                            )}
                          </div>
                          {g.attempts?.length > 0 && (
                            <div className="flex items-end gap-1 mt-3 pt-3 border-t border-white/5">
                              <span className="text-gray-700 text-xs mr-1 self-center">Trend:</span>
                              {g.attempts.slice(-10).map((a, i) => (
                                <ScoreBar key={i} score={a.score} total={a.total} date={a.created_at} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {guides.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-center py-16 border border-dashed border-white/8 rounded-2xl">
                  <BookOpen size={36} className="mx-auto mb-3 text-gray-700" />
                  <p className="text-gray-500 font-medium">No guides yet.</p>
                  <Link to="/dashboard"
                    className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 text-sm font-semibold hover:bg-indigo-600/30 transition-colors">
                    Create your first guide →
                  </Link>
                </motion.div>
              )}
            </div>
          );
        })()}

        <div aria-hidden="true" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </main>
    </div>
  );
}
