import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Brain } from "lucide-react";
import { api } from "../api.js";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState("loading"); // loading | success | already | error
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setError("No verification token found."); return; }
    api.auth.verifyEmail(token)
      .then(data => setStatus(data.already ? "already" : "success"))
      .catch(err  => { setStatus("error"); setError(err.message); });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center p-6">
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
              Your email address has been confirmed. You now have full access to StudyBuddi.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-white font-bold text-sm transition-all hover:-translate-y-0.5">
              Go to Dashboard →
            </Link>
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
