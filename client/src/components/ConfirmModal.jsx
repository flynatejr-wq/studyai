import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={onCancel}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed z-[9999] inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-modal-title"
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl w-full max-w-sm pointer-events-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {danger && <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />}
                  <h3 id="confirm-modal-title" className="text-white font-bold text-lg leading-tight">{title}</h3>
                </div>
                <button onClick={onCancel} aria-label="Close dialog" className="text-gray-500 hover:text-white transition-colors ml-2 shrink-0 p-1.5 rounded-lg hover:bg-white/8 min-h-[36px] min-w-[36px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              {message && <p className="text-gray-400 text-sm mb-6 leading-relaxed">{message}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={onCancel} autoFocus
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors min-h-[44px]">
                  {cancelText}
                </button>
                <button onClick={onConfirm}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                    danger
                      ? "bg-red-600 hover:bg-red-500 text-white"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}>
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
