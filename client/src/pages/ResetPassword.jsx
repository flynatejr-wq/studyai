import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Eye, EyeOff, CheckCircle } from "lucide-react";
import { api } from "../api.js";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const redirectTimer = useRef(null);

  useEffect(() => () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); }, []);

  useEffect(() => {
    if (!token) setError("Missing reset token. Please request a new reset link.");
  }, [token]);

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await api.auth.resetPassword({ token, password });
      setDone(true);
      redirectTimer.current = setTimeout(() => navigate("/login"), 3000);
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
          <h1 className="text-3xl font-bold text-white">Choose a new password</h1>
          <p className="text-gray-400 mt-2">Make it something you'll remember</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          {done ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-white font-bold text-lg mb-2">Password updated!</h2>
              <p className="text-gray-400 text-sm">Redirecting you to login...</p>
            </motion.div>
          ) : (
            <>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">{error}</div>}
              <form onSubmit={handle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} required minLength={8} maxLength={72} value={password}
                      onChange={e => setPassword(e.target.value)} disabled={!token}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-40"
                      placeholder="At least 8 characters" autoFocus />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
                  <input type={showPw ? "text" : "password"} required value={confirm}
                    onChange={e => setConfirm(e.target.value)} disabled={!token}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-40"
                    placeholder="Repeat your password" />
                </div>
                <button type="submit" disabled={loading || !token}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 font-semibold text-white transition-all">
                  {loading ? "Updating..." : "Set New Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

