import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Sparkles, FileText, Brain, Trophy, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

const FEATURES = [
  { icon: FileText, text: "Upload PDFs, Word docs, PowerPoints & more" },
  { icon: Sparkles, text: "AI generates organized notes, key terms & quizzes" },
  { icon: Brain,    text: "Study with flashcards, adaptive quizzes & AI tutor" },
  { icon: Trophy,   text: "Track progress and earn XP as you learn" },
];

const INPUT_CLS = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm";

function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="lm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#lm)"/>
      <rect x="8" y="9" width="7" height="14" rx="1.5" fill="rgba(255,255,255,0.9)"/>
      <rect x="17" y="9" width="7" height="14" rx="1.5" fill="rgba(255,255,255,0.6)"/>
      <rect x="15" y="9" width="2" height="14" rx="1" fill="rgba(255,255,255,0.4)"/>
      <path d="M20.5 7L21.5 9L23.5 8L22 10L24 11L21.5 11L21.5 13L20.5 11L18.5 12L20 10L18 9L20.5 9Z" fill="#fbbf24" opacity="0.9"/>
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] xl:w-[55%] bg-gradient-to-br from-indigo-950/80 via-[#0c0c1e] to-violet-950/80 p-12 relative overflow-hidden border-r border-white/5">
        {/* Background orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/12 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3 pointer-events-none animate-float-slow" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-600/12 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none animate-float" />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 relative z-10 group">
          <div className="transition-transform group-hover:scale-105">
            <LogoMark size={40} />
          </div>
          <div>
            <span className="text-xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent block leading-none tracking-tight">
              StudyBuddi
            </span>
            <span className="text-xs text-indigo-400 font-semibold">AI Study Assistant</span>
          </div>
        </Link>

        {/* Main copy */}
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1.5 text-xs font-semibold text-indigo-300 mb-5">
              <Sparkles size={11} className="text-indigo-400" /> Trusted by students everywhere
            </div>
            <h1 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
              Turn lectures into<br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                organized study guides
              </span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-md">
              Upload any lecture material — PDFs, videos, audio, or notes — and get structured study guides, key terms, and quiz questions in seconds.
            </p>

            <ul className="space-y-3">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/12 border border-indigo-500/18 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-indigo-400" />
                  </div>
                  <span className="text-gray-300 text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {[["MJ","pink"],["EP","indigo"],["SM","emerald"]].map(([i, c]) => (
            <div key={i} className={`w-8 h-8 rounded-xl bg-gradient-to-br from-${c}-500 to-${c}-600 border-2 border-[#080810] flex items-center justify-center text-xs font-black text-white -ml-2 first:ml-0`}>{i}</div>
          ))}
          <p className="text-gray-600 text-xs ml-1">Join thousands of students studying smarter</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl" />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-8 w-full max-w-sm relative z-10">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <LogoMark size={32} />
            <span className="text-lg font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent tracking-tight">StudyBuddi</span>
          </Link>
          <p className="text-gray-500 text-sm">Turn lectures into perfect study guides — instantly.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-sm relative z-10">

          <div className="mb-7">
            <h2 className="text-2xl font-black text-white">Welcome back</h2>
            <p className="text-gray-500 mt-1 text-sm">Log in to continue studying</p>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/20">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span> {error}
              </div>
            )}
            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email" required maxLength={254} value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="you@university.edu"
                  autoComplete="email" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                  <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={`${INPUT_CLS} pr-11`}
                    placeholder="••••••••"
                    autoComplete="current-password" />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 font-bold text-white transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20 mt-2 text-sm">
                {loading ? "Logging in…" : <><span>Log In</span> <ArrowRight size={15} /></>}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-white/8 text-center">
              <p className="text-gray-500 text-sm">
                Don't have an account?{" "}
                <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                  Sign up free
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-gray-700 text-xs mt-5">
            Protected by enterprise-grade encryption
          </p>
        </motion.div>
      </div>
    </div>
  );
}
