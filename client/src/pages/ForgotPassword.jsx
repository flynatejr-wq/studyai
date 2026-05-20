import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Mail, ArrowLeft } from "lucide-react";
import { api } from "../api.js";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.auth.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4 relative">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle size="md" variant="pill" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold mb-6">
            <BookOpen className="text-indigo-400" size={24} />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">StudyBuddi</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Reset your password</h1>
          <p className="text-gray-400 mt-2">We'll send a reset link to your email</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-indigo-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-2">Check your inbox</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                If an account exists for <span className="text-white font-medium">{email}</span>, you'll receive a reset link within a few minutes. Check your spam folder if you don't see it.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </motion.div>
          ) : (
            <>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">{error}</div>}
              <form onSubmit={handle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
                  <input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    placeholder="you@college.edu" autoFocus />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 font-semibold text-white transition-all">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
              <p className="text-center text-gray-400 text-sm mt-6">
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center justify-center gap-1">
                  <ArrowLeft size={13} /> Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

