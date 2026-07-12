import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Sparkles, FileText, Brain, Trophy, ArrowRight, Check, RefreshCw, Mail } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { api } from "../api.js";
import ThemeToggle from "../components/ThemeToggle.jsx";

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
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resent, setResent] = useState(false);

  // Show errors passed back from Google OAuth redirect
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));
  }, []);

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setUnverifiedEmail(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      if (err.code === "EMAIL_NOT_VERIFIED" || err.message?.includes("verify your email")) {
        setUnverifiedEmail(form.email);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResent(false);
    await api.auth.resendVerificationPublic(unverifiedEmail);
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  // ── "Check your email" screen (unverified login attempt) ─────────────────────
  if (unverifiedEmail) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="fixed top-4 right-4 z-20"><ThemeToggle size="md" variant="pill" /></div>
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
            <Mail size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Check your inbox</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-1">
            We sent a verification link to
          </p>
          <p className="text-indigo-300 font-semibold text-sm mb-6">{unverifiedEmail}</p>
          <p className="text-gray-500 text-xs mb-8 leading-relaxed max-w-xs mx-auto">
            Click the link in the email to verify your account and log in. Check your spam folder if you don't see it.
          </p>
          <button
            onClick={resend}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-xl text-gray-300 hover:text-white text-sm font-medium transition-all">
            <RefreshCw size={14} className={resent ? "text-green-400" : ""} />
            {resent ? "Sent! Check your inbox" : "Resend verification email"}
          </button>
          <p className="text-gray-600 text-xs mt-8">
            Wrong account?{" "}
            <button onClick={() => setUnverifiedEmail("")} className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Go back
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

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
        {/* Theme toggle — top-right */}
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle size="md" variant="pill" />
        </div>

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
            {/* Google sign-in */}
            <a
              href={`${import.meta.env.VITE_API_URL || ""}/api/auth/google`}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/12 bg-white/4 hover:bg-white/8 transition-all text-sm font-semibold text-white mb-4">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </a>

            {/* Microsoft sign-in — required for institutions (e.g. SSU) whose SSO policy mandates it */}
            <a
              href={`${import.meta.env.VITE_API_URL || ""}/api/auth/microsoft`}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/12 bg-white/4 hover:bg-white/8 transition-all text-sm font-semibold text-white mb-4">
              <svg width="18" height="18" viewBox="0 0 23 23">
                <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
                <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
                <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
              </svg>
              Continue with Microsoft
            </a>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-gray-600 text-xs">or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

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
