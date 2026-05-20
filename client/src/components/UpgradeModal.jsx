import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, BookOpen, Brain, Sparkles, Check, Crown, Shield, ArrowRight } from "lucide-react";
import { useState } from "react";
import { api } from "../api.js";

const PRO_FEATURES = [
  { emoji: "📚", text: "Unlimited AI study guides — no daily limits" },
  { emoji: "🎯", text: "Unlimited quiz generations every day" },
  { emoji: "🧠", text: "Full AI tutor — unlimited conversations" },
  { emoji: "⚡", text: "Priority AI processing — faster results" },
  { emoji: "📤", text: "Export & print any guide as PDF" },
  { emoji: "🏆", text: "Advanced analytics & study insights" },
];

const REASONS = {
  FREE_LIMIT_GUIDES: {
    emoji: "📚",
    title: "You've used your free guide",
    desc: "Free accounts include <strong class='text-white'>1 study guide</strong>. Upgrade to Pro for unlimited guide creation — no restrictions, ever.",
  },
  FREE_LIMIT_QUIZZES: {
    emoji: "🎯",
    title: "Daily quiz limit reached",
    desc: "Free accounts get <strong class='text-white'>3 AI quiz generations per day</strong>. Upgrade to Pro for unlimited quizzes every day.",
  },
  FREE_LIMIT_CHAT: {
    emoji: "🧠",
    title: "Daily AI tutor limit reached",
    desc: "Free accounts get <strong class='text-white'>15 AI tutor messages per day</strong>. Upgrade to Pro for unlimited conversations with your AI tutor.",
  },
  FREE_LIMIT_FOLDERS: {
    emoji: "📁",
    title: "Folder limit reached",
    desc: "Free accounts can create up to <strong class='text-white'>3 folders</strong>. Upgrade to Pro to organise your guides with unlimited folders.",
  },
  FREE_LIMIT_EXPORT: {
    emoji: "📤",
    title: "Export is a Pro feature",
    desc: "Downloading your data is available on <strong class='text-white'>Pro</strong>. Upgrade to export all your guides, quiz history, and study sessions.",
  },
  default: {
    emoji: "✨",
    title: "Upgrade to Pro",
    desc: "Unlock unlimited guides, quizzes, AI tutor access, and more for just $4.99/month.",
  },
};

export default function UpgradeModal({ open, onClose, reason }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const info = REASONS[reason] || REASONS.default;

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 pointer-events-none overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 24 }}
              transition={{ type: "spring", damping: 24, stiffness: 340 }}
              className="relative w-full max-w-md pointer-events-auto my-4 sm:my-auto">

              <div className="relative bg-[#0e0e1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">

                {/* Top gradient bar */}
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500" />

                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative p-7">
                  {/* Close */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/8 transition-all">
                    <X size={16} />
                  </button>

                  {/* Header */}
                  <div className="text-center mb-6">
                    <motion.div
                      initial={{ scale: 0.5, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30 text-2xl">
                      {info.emoji}
                    </motion.div>
                    <h2 className="text-xl font-black text-white mb-2">{info.title}</h2>
                    <p
                      className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto"
                      dangerouslySetInnerHTML={{ __html: info.desc }}
                    />
                  </div>

                  {/* Features */}
                  <div className="bg-white/3 border border-white/6 rounded-xl p-4 mb-5 space-y-2.5">
                    {PRO_FEATURES.map(({ emoji, text }) => (
                      <div key={text} className="flex items-center gap-3">
                        <span className="text-base leading-none shrink-0">{emoji}</span>
                        <span className="text-gray-300 text-sm flex-1">{text}</span>
                        <Check size={13} className="text-green-400 shrink-0" />
                      </div>
                    ))}
                  </div>

                  {/* Price */}
                  <div className="bg-gradient-to-r from-indigo-600/15 to-violet-600/10 border border-indigo-500/20 rounded-xl p-4 text-center mb-5">
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-3xl font-black text-white">$4.99</span>
                      <span className="text-gray-400 text-sm mb-1">/month</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">Cancel anytime · No commitments</p>
                  </div>

                  {error && (
                    <p className="text-red-400 text-xs text-center mb-3">{error}</p>
                  )}

                  {/* CTA */}
                  <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 font-black text-white text-sm transition-all hover:-translate-y-0.5 shadow-xl shadow-indigo-500/25 mb-3">
                    <Crown size={16} />
                    {loading ? "Opening checkout…" : "Upgrade to Pro — $4.99/mo"}
                    {!loading && <ArrowRight size={15} />}
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full py-2.5 text-gray-600 text-xs hover:text-gray-400 transition-colors font-medium">
                    Maybe later
                  </button>

                  <p className="text-center text-gray-700 text-xs mt-3 flex items-center justify-center gap-1.5">
                    <Shield size={10} /> Secure payment via Stripe
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
