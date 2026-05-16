import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, BarChart2, LogOut, Zap, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/guides",    icon: BookOpen,         label: "All Guides" },
  { to: "/progress",  icon: BarChart2,        label: "Progress" },
];

export default function Sidebar({ onLogout }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const xpNext = level * level * 100;
  const xpProgress = Math.min(((xp % xpNext) / xpNext) * 100, 100);

  const close = () => setOpen(false);

  const sidebarContent = (
    <aside className={`
      fixed left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-white/10 flex flex-col z-50
      transition-transform duration-300 ease-in-out
      ${open ? "translate-x-0" : "-translate-x-full"}
      md:translate-x-0
    `}>
      {/* Logo + mobile close */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <Link to="/dashboard" onClick={close} className="flex items-center gap-2 text-lg font-bold">
          <BookOpen className="text-indigo-400" size={22} />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">StudyAI</span>
        </Link>
        <button onClick={close} className="md:hidden text-gray-400 hover:text-white p-1">
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
          return (
            <Link key={to} to={to} onClick={close}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                active
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Level */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="bg-white/5 rounded-2xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Level {level}</span>
            <span className="text-xs text-indigo-400 flex items-center gap-1"><Zap size={11} /> {xp.toLocaleString()} XP</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
              style={{ width: `${xpProgress}%` }} />
          </div>
          {user?.streak > 0 && (
            <p className="text-center text-xs text-orange-400 mt-2 font-medium">🔥 {user.streak} day streak!</p>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-white text-sm font-semibold truncate max-w-[140px]">{user?.name}</p>
            <p className="text-gray-500 text-xs truncate max-w-[140px]">{user?.email}</p>
          </div>
          <button onClick={onLogout} className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 z-40">
        <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-white p-1">
          <Menu size={22} />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2 font-bold">
          <BookOpen className="text-indigo-400" size={18} />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent text-base">StudyAI</span>
        </Link>
        <div className="flex items-center gap-1">
          <span className="text-xs text-indigo-400 font-medium">Lv.{level}</span>
          <Zap size={12} className="text-indigo-400" />
        </div>
      </header>

      {/* Backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={close} />
      )}

      {sidebarContent}
    </>
  );
}
