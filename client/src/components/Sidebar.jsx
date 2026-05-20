import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, BarChart2, LogOut, Zap,
  Menu, X, Settings, ChevronRight, Crown, Flame, Sparkles, CalendarDays,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { api } from "../api.js";

const navItems = [
  { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard",   desc: "Create & manage" },
  { to: "/guides",      icon: BookOpen,         label: "All Guides",  desc: "Browse your notes" },
  { to: "/study-plans", icon: CalendarDays,     label: "Study Plans", desc: "Exam countdowns" },
  { to: "/progress",    icon: BarChart2,        label: "Progress",    desc: "Stats & achievements" },
  { to: "/settings",    icon: Settings,         label: "Settings",    desc: "Account & billing" },
];

// Minimal SVG logo mark
function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#logo-grad)"/>
      {/* Book pages */}
      <rect x="8" y="9" width="7" height="14" rx="1.5" fill="rgba(255,255,255,0.9)"/>
      <rect x="17" y="9" width="7" height="14" rx="1.5" fill="rgba(255,255,255,0.6)"/>
      {/* Spine */}
      <rect x="15" y="9" width="2" height="14" rx="1" fill="rgba(255,255,255,0.4)"/>
      {/* Spark */}
      <path d="M20.5 7L21.5 9L23.5 8L22 10L24 11L21.5 11L21.5 13L20.5 11L18.5 12L20 10L18 9L20.5 9Z" fill="#fbbf24" opacity="0.9"/>
    </svg>
  );
}

export default function Sidebar({ onLogout }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const level    = user?.level || 1;
  const xp       = user?.xp    || 0;
  const streak   = user?.streak || 0;
  const xpForLevel = n => (n - 1) * (n - 1) * 100;
  const xpCurrent  = xpForLevel(level);
  const xpNextLvl  = xpForLevel(level + 1);
  const xpProgress = Math.min(((xp - xpCurrent) / (xpNextLvl - xpCurrent)) * 100, 100);

  const close = () => setOpen(false);
  const isPro = user?.plan === "pro";

  const handleUpgrade = async () => {
    try {
      const { url } = await api.stripe.checkout();
      window.location.href = url;
    } catch (err) {
      alert(err.message || "Could not start checkout. Please try again.");
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 bg-[#0c0c18]/95 backdrop-blur-xl border-b border-white/6 flex items-center justify-between px-4 z-40"
        style={{ paddingTop: "env(safe-area-inset-top)", minHeight: "calc(3.5rem + env(safe-area-inset-top))" }}>
        <button
          onClick={() => setOpen(true)}
          className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/8 transition-all">
          <Menu size={20} />
        </button>

        <Link to="/dashboard" className="flex items-center gap-2 font-bold" onClick={close}>
          <LogoMark size={28} />
          <span className="font-black text-base bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent tracking-tight">
            StudyBuddi
          </span>
        </Link>

        <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-2.5 py-1.5">
          <Zap size={11} className="text-indigo-400" />
          <span className="text-xs text-indigo-300 font-black">Lv.{level}</span>
        </div>
      </header>

      {/* ── Mobile backdrop ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/75 z-40 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside className={`
        fixed left-0 top-0 bottom-0 w-64 bg-[#0c0c18] border-r border-white/6 flex flex-col z-50
        transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}>

        {/* ── Logo ── */}
        <div className="px-5 py-5 border-b border-white/6 flex items-center justify-between">
          <Link to="/dashboard" onClick={close} className="flex items-center gap-3 group">
            <div className="transition-transform group-hover:scale-105">
              <LogoMark size={36} />
            </div>
            <div>
              <span className="font-black text-base bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight block leading-none">
                StudyBuddi
              </span>
              <span className="text-[10px] text-indigo-400 font-semibold">AI Study Assistant</span>
            </div>
          </Link>
          <button
            onClick={close}
            className="md:hidden text-gray-500 hover:text-white p-1.5 rounded-xl hover:bg-white/8 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, desc }) => {
            const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                onClick={close}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group relative overflow-hidden
                  ${active
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/4 border border-transparent"
                  }`}>
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-full" />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                  active ? "bg-indigo-500/20" : "group-hover:bg-white/6"
                }`}>
                  <Icon size={16} className={active ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block leading-none">{label}</span>
                  <span className={`text-xs leading-none mt-0.5 block ${active ? "text-indigo-400/60" : "text-gray-700"}`}>{desc}</span>
                </div>
                {active && <ChevronRight size={13} className="text-indigo-500/60 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom panel ── */}
        <div
          className="px-3 border-t border-white/6 pt-4 space-y-3"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>

          {/* XP / Level card */}
          <div className="bg-white/3 border border-white/6 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Zap size={13} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-white leading-none">Level {level}</p>
                  <p className="text-[10px] text-gray-600 leading-none mt-0.5">{xpNextLvl - xp} XP to next</p>
                </div>
              </div>
              <span className="text-xs font-black text-indigo-400">{xp.toLocaleString()} XP</span>
            </div>

            {/* XP progress bar */}
            <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${xpProgress}%` }}
              />
            </div>

            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <Flame size={12} className="text-orange-400 animate-fire" />
                <span className="text-xs text-orange-400 font-bold">{streak} day streak</span>
                {streak >= 7 && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-bold">🔥</span>}
              </div>
            )}
          </div>

          {/* Upgrade / Pro badge */}
          {!isPro ? (
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-gradient-to-r from-indigo-600/15 to-violet-600/15 border border-indigo-500/25 hover:from-indigo-600/25 hover:to-violet-600/25 hover:border-indigo-500/45 transition-all group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25">
                <Crown size={13} className="text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-white text-xs font-black leading-none mb-0.5">Upgrade to Pro</p>
                <p className="text-indigo-400 text-[10px] leading-none">$4.99/mo · Unlimited everything</p>
              </div>
              <Sparkles size={13} className="text-indigo-400 group-hover:text-indigo-300 transition-colors shrink-0" />
            </button>
          ) : (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
              <Crown size={14} className="text-yellow-400 shrink-0" />
              <div>
                <p className="text-yellow-400 text-xs font-black leading-none">Pro Plan</p>
                <p className="text-yellow-600 text-[10px] leading-none mt-0.5">Unlimited access</p>
              </div>
            </div>
          )}

          {/* User row */}
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-md shadow-indigo-500/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-none">{user?.name || "User"}</p>
              <p className="text-gray-600 text-xs truncate leading-none mt-1">{user?.email}</p>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              className="text-gray-600 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-400/8 shrink-0">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
