import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, GraduationCap } from "lucide-react";
import { api } from "../api.js";
import { analytics, Events } from "../lib/analytics.js";

const STORAGE_KEY = "studybuddi_pilot_feedback_seen";
const MIN_GUIDES_TO_SHOW = 2;

// Shows once per browser to pilot users who've made real use of the app —
// this feeds the pilot business case, so it only asks users who have
// something to say, and never nags a second time regardless of answer.
export function usePilotFeedback(user) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || user.plan !== "pilot") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if ((user.guides_created_ever ?? 0) < MIN_GUIDES_TO_SHOW) return;

    const t = setTimeout(() => {
      setShow(true);
      analytics.track(Events.PILOT_FEEDBACK_SHOWN);
    }, 1000);
    return () => clearTimeout(t);
  }, [user]);

  const dismiss = (submitted) => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
    if (!submitted) analytics.track(Events.PILOT_FEEDBACK_DISMISSED);
  };

  return { show, dismiss };
}

export default function PilotFeedbackModal({ open, onClose }) {
  const [rating, setRating]   = useState(0);
  const [hover, setHover]     = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);

  const submit = async () => {
    if (!rating) return;
    setSending(true);
    try {
      await api.feedback.submit({ rating, message });
      analytics.track(Events.PILOT_FEEDBACK_SUBMITTED, { rating });
      setDone(true);
      setTimeout(() => onClose(true), 1400);
    } catch (_) {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => onClose(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-[#12121a] border border-white/10 rounded-2xl p-6 relative"
          >
            <button onClick={() => onClose(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X size={18} />
            </button>

            {done ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">🙏</p>
                <p className="text-white font-semibold">Thanks for the feedback!</p>
                <p className="text-gray-400 text-sm mt-1">It genuinely helps the pilot.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap size={18} className="text-emerald-400" />
                  <p className="text-white font-bold text-sm">Quick pilot feedback</p>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  You're on the SSU pilot — how's StudyBuddi working for you so far?
                </p>

                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      className="p-0.5"
                    >
                      <Star
                        size={26}
                        className={(hover || rating) >= n ? "text-amber-400 fill-amber-400" : "text-gray-600"}
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Anything you'd change or that's working well? (optional)"
                  rows={3}
                  maxLength={2000}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none mb-4"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => onClose(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                  >
                    Maybe later
                  </button>
                  <button
                    onClick={submit}
                    disabled={!rating || sending}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black transition-colors"
                  >
                    {sending ? "Sending…" : "Send feedback"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
