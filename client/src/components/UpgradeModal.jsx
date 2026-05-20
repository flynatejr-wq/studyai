import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, BookOpen, Brain, Sparkles, CheckCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../api.js";

const PRO_FEATURES = [
  { icon: BookOpen,  text: "Unlimited guide creation" },
  { icon: Brain,     text: "Unlimited AI quiz generation" },
  { icon: Sparkles,  text: "Priority AI processing" },
  { icon: Zap,       text: "All study modes — flashcards, adaptive, MCQ" },
];

export default function UpgradeModal({ open, onClose, reason }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleUpgrade = async () => {
    setLoading(true); setError("");
    try {
      const { url } = await api.stripe.checkout();
      window.location.href = url;
    } catch (err) {
      setError(err.message || "Could not start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">

            <div className="relative w-full max-w-md bg-[#0f0f1e] border border-white/10 rounded-2xl p-7 shadow-2xl pointer-events-auto">
              {/* Close */}
              <button onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors">
                <X size={16} />
              </button>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30">
                <Zap size={24} className="text-white" />
              </div>

              {/* Copy */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-black text-white mb-2">Upgrade to Pro</h2>
                {reason === "FREE_LIMIT_GUIDES" && (
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Free accounts are limited to <strong className="text-white">1 guide</strong>. Upgrade to Pro for unlimited guide creation and study tools.
                  </p>
                )}
                {reason === "FREE_LIMIT_QUIZZES" && (
                  <p className="text-gray-400 text-sm leading-relaxed">
                    You've used your <strong className="text-white">3 free quiz generations</strong> for today. Upgrade to Pro for unlimited quizzes every day.
                  </p>
                )}
                {!reason && (
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Unlock unlimited guides, quizzes, and premium study tools.
                  </p>
                )}
              </div>

              {/* Feature list */}
              <ul className="space-y-2.5 mb-6">
                {PRO_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-indigo-400" />
                    </div>
                    <span className="text-gray-300 text-sm">{text}</span>
                    <CheckCircle size={13} className="ml-auto text-green-400 shrink-0" />
                  </li>
                ))}
              </ul>

              {/* Price */}
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 text-center mb-4">
                <p className="text-white font-black text-2xl">$9.99<span className="text-gray-400 font-normal text-sm">/month</span></p>
                <p className="text-gray-500 text-xs mt-0.5">Cancel any time</p>
              </div>

              {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}

              <button onClick={handleUpgrade} disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 font-bold text-white text-sm transition-all shadow-lg shadow-indigo-500/20">
                {loading ? "Redirecting to checkout…" : "Upgrade to Pro →"}
              </button>
              <button onClick={onClose} className="w-full mt-2.5 py-2.5 text-gray-500 text-xs hover:text-gray-300 transition-colors">
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
