import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Brain } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading | success | already | error
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setError("No verification token found."); return; }
    api.auth.verifyEmail(token)
      .then(data => {
        // Auto-login the user — server returns a token after verification
        if (data.token && data.user) {
          loginWithToken(data.token, data.user);
          // Brief delay so the success animation plays, then redirect
          setTimeout(() => navigate("/dashboard"), 1800);
        }
        setStatus(data.already ? "already" : "success");
      })
      .catch(err => { setStatus("error"); setError(err.message); });
  // BUG-16: Include loginWithToken and navigate in deps array to satisfy exhaustive-deps lint rule
  // and ensure the effect always uses the current function references
  }, [token, loginWithToken, navigate]);

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center p-6 relative">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle size="md" variant="pill" />
      </div>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Brain size={18} className="text-white" />
        </div>
        <span className="text-white font-black text-lg tracking-tight">StudyBuddi</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white/4 border border-white/10 rounded-2xl p-8 text-center">

        {status === "loading" && (
          <>
            <Loader2 size={44} className="mx-auto mb-4 text-indigo-400 animate-spin" />
            <h1 className="text-white font-black text-xl mb-2">Verifying…</h1>
            <p className="text-gray-500 text-sm">Hang tight while we confirm your email.</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
              <CheckCircle size={52} className="mx-auto mb-4 text-green-400" />
            </motion.div>
            <h1 className="text-white font-black text-xl mb-2">Email verified!</h1>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              You're all set. Taking you to your dashboard…
            </p>
            <div className="flex items-center justify-center gap-2 text-indigo-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Redirecting…
            </div>
          </>
        )}

        {status === "already" && (
          <>
            <CheckCircle size={52} className="mx-auto mb-4 text-indigo-400" />
            <h1 className="text-white font-black text-xl mb-2">Already verified</h1>
            <p className="text-gray-400 text-sm mb-6">Your email is already confirmed. You're good to go!</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-white font-bold text-sm transition-all hover:-translate-y-0.5">
              Go to Dashboard →
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={52} className="mx-auto mb-4 text-red-400" />
            <h1 className="text-white font-black text-xl mb-2">Verification failed</h1>
            <p className="text-gray-400 text-sm mb-2 leading-relaxed">
              {error || "This link is invalid or has already been used."}
            </p>
            <p className="text-gray-600 text-xs mb-6">
              You can request a new verification link from your account settings.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center w-full py-3 bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl text-gray-300 font-bold text-sm transition-colors">
              Go to Settings
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
