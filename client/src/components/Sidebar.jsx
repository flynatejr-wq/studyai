import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, LayoutDashboard, BarChart2, LogOut, Zap, Menu, X, Settings, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/guides",    icon: BookOpen,         label: "All Guides" },
  { to: "/progress",  icon: BarChart2,        label: "Progress"   },
  { to: "/settings",  icon: Settings,         label: "Settings"   },
];

export default function Sidebar({ onLogout }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const level = user?.level || 1;
  const xp    = user?.xp    || 0;
  const xpNext     = Math.max(level * level * 100, 1);
  const xpProgress = Math.min(((xp % xpNext) / xpNext) * 100, 100);

  const close = () => setOpen(false);

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <>
      {/* ── Mobile top bar ──────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0e0e18]/95 backdrop-blur-md border-b border-white/8 flex items-center justify-between px-4 z-40">
        <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/8 transition-all">
          <Menu size={20} />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2 font-bold">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <BookOpen size={12} className="text-white" />
          </div>
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent text-base font-bold">StudyBuddi</span>
        </Link>
        <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1">
          <Zap size={11} className="text-indigo-400" />
          <span className="text-xs text-indigo-300 font-bold">Lv.{level}</span>
        </div>
      </header>

      {/* ── Mobile backdrop ─────────────────────────────────────── */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm touch-none" onClick={close} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`
        fixed left-0 top-0 bottom-0 w-64 bg-[#0e0e18] border-r border-white/8 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8 flex items-center justify-between">
          <Link to="/dashboard" onClick={close} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-bold text-base bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              StudyBuddi
            </span>
          </Link>
          <button onClick={close} className="md:hidden text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/8 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto touch-pan-y">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
            return (
              <Link key={to} to={to} onClick={close}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group relative
                  ${active
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/5 border border-transparent"
                  }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${active ? "bg-indigo-500/20" : "group-hover:bg-white/8"}`}>
                  <Icon size={16} className={active ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"} />
                </div>
                <span>{label}</span>
                {active && <ChevronRight size={13} className="ml-auto text-indigo-500/60" />}
              </Link>
            );
          })}
        </nav>

        {/* XP + User */}
        <div className="px-3 pb-4 border-t border-white/8 pt-4 space-y-3">
          {/* Level card */}
          <div className="bg-white/4 border border-white/8 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <Zap size={11} className="text-white" />
                </div>
                <span className="text-xs font-bold text-white">Level {level}</span>
              </div>
              <span className="text-xs text-indigo-400 font-semibold">{xp.toLocaleString()} XP</span>
            </div>
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${xpProgress}%` }} />
            </div>
            <p className="text-xs text-gray-600 mt-1.5">{xpNext - (xp % xpNext)} XP to Level {level + 1}</p>
            {user?.streak > 0 && (
              <p className="text-xs text-orange-400 font-semibold mt-1.5 flex items-center gap-1">
                🔥 {user.streak} day streak
              </p>
            )}
          </div>

          {/* User row */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md shadow-indigo-500/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name || "User"}</p>
              <p className="text-gray-600 text-xs truncate">{user?.email}</p>
            </div>
            <button onClick={onLogout} title="Sign out"
              className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/8 shrink-0">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
