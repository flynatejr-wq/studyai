import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Eye, EyeOff, Sparkles, FileText, Brain, Trophy } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

const FEATURES = [
  { icon: FileText, text: "Upload PDFs, Word docs, PowerPoints & more" },
  { icon: Sparkles, text: "AI generates organized notes, key terms & quiz questions" },
  { icon: Brain,    text: "Study with flashcards, adaptive quizzes & an AI tutor" },
  { icon: Trophy,   text: "Track your progress and earn XP as you learn" },
];

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
    <div className="min-h-screen bg-[#0a0a12] flex">

      {/* ── Left panel — intro (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] xl:w-[55%] bg-gradient-to-br from-indigo-950 via-[#0f0f1e] to-violet-950 p-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BookOpen size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            StudyBuddi
          </span>
        </Link>

        {/* Main copy */}
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">AI Study Assistant</p>
            <h1 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
              Turn lectures into<br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                organized study guides
              </span>
            </h1>
            <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-md">
              Upload any lecture material — PDFs, videos, audio recordings, or notes — and get structured study guides, key terms, and quiz questions in seconds.
            </p>

            {/* Feature list */}
            <ul className="space-y-3.5">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-indigo-400" />
                  </div>
                  <span className="text-gray-300 text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Footer quote */}
        <p className="text-gray-600 text-xs relative z-10">
          Helping students study smarter, not harder.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 bg-[#0a0a12]">

        {/* Mobile logo + intro */}
        <div className="lg:hidden text-center mb-8 w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">StudyBuddi</span>
          </Link>
          <p className="text-gray-400 text-sm leading-relaxed">
            Turn lectures, PDFs, and study materials into organized notes and study guides in seconds.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm">

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-gray-400 mt-1 text-sm">Log in to continue studying</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">{error}</div>
            )}
            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input type="email" required maxLength={254} value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                  placeholder="you@college.edu" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-300">Password</label>
                  <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 font-semibold text-white transition-all mt-2 text-sm">
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>
            <p className="text-center text-gray-400 text-sm mt-5">
              Don't have an account?{" "}
              <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign up free</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
