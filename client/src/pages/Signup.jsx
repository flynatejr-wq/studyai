import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Sparkles, ArrowRight, Check, Zap, Trophy, Brain } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INPUT_CLS = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm";

const PERKS = [
  { icon: Zap,     color: "yellow",  text: "Get started in 60 seconds" },
  { icon: Brain,   color: "violet",  text: "AI-powered study tools" },
  { icon: Trophy,  color: "orange",  text: "Track progress & earn XP" },
];

const FREE_FEATURES = [
  "1 AI study guide (lifetime)",
  "Flashcard & quiz modes",
  "Progress tracking & XP",
  "AI tutor chat (limited)",
];

function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="lm2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#lm2)"/>
      <rect x="8" y="9" width="7" height="14" rx="1.5" fill="rgba(255,255,255,0.9)"/>
      <rect x="17" y="9" width="7" height="14" rx="1.5" fill="rgba(255,255,255,0.6)"/>
      <rect x="15" y="9" width="2" height="14" rx="1" fill="rgba(255,255,255,0.4)"/>
      <path d="M20.5 7L21.5 9L23.5 8L22 10L24 11L21.5 11L21.5 13L20.5 11L18.5 12L20 10L18 9L20.5 9Z" fill="#fbbf24" opacity="0.9"/>
    </svg>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref"); // referral code from share link

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(form.email)) return setError("Please enter a valid email address.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, refCode);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = form.password.length === 0 ? 0
    : form.password.length < 8 ? 1
    : form.password.length < 12 ? 2
    : 3;

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] animate-float-slow" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/8 rounded-full blur-[140px] animate-float" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-5 group">
            <div className="transition-transform group-hover:scale-105">
              <LogoMark size={40} />
            </div>
            <div className="text-left">
              <span className="text-xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent block leading-none tracking-tight">StudyBuddi</span>
              <span className="text-xs text-indigo-400 font-semibold">AI Study Assistant</span>
            </div>
          </Link>

          <div className="flex items-center justify-center gap-4 mb-2">
            {PERKS.map(({ icon: Icon, color, text }) => (
              <div key={text} className="flex flex-col items-center gap-1 text-center">
                <div className={`w-9 h-9 rounded-xl bg-${color}-500/12 border border-${color}-500/18 flex items-center justify-center`}>
                  <Icon size={16} className={`text-${color}-400`} />
                </div>
                <span className="text-[10px] text-gray-500 max-w-[60px] leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/30 mb-4">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-white mb-1">Create your account</h1>
            <p className="text-gray-500 text-sm">Start studying smarter — free forever plan included</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text" required maxLength={80} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={INPUT_CLS}
                placeholder="Alex Johnson"
                autoComplete="name" />
            </div>

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
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} required minLength={8} maxLength={72} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className={`${INPUT_CLS} pr-11`}
                  placeholder="At least 8 characters"
                  autoComplete="new-password" />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength */}
              {form.password.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                      pwStrength >= i
                        ? i === 1 ? "bg-red-500" : i === 2 ? "bg-yellow-500" : "bg-green-500"
                        : "bg-white/10"
                    }`} />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">
                    {pwStrength === 1 ? "Weak" : pwStrength === 2 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 font-black text-white transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/25 mt-2 text-sm">
              {loading ? "Creating your account…" : <><span>Create Account — It's Free</span> <ArrowRight size={15} /></>}
            </button>
          </form>

          {/* Free plan callout */}
          <div className="mt-5 pt-5 border-t border-white/8">
            <p className="text-xs text-gray-500 font-semibold mb-2.5 uppercase tracking-wider">Free plan includes:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FREE_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Check size={11} className="text-green-400 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mb-3">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
            Log in
          </Link>
        </p>
        <p className="text-center text-gray-700 text-xs">
          By signing up you agree to our{" "}
          <Link to="/terms" className="text-gray-600 hover:text-gray-400 underline transition-colors">Terms</Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-gray-600 hover:text-gray-400 underline transition-colors">Privacy Policy</Link>
        </p>
      </motion.div>
    </div>
  );
}
