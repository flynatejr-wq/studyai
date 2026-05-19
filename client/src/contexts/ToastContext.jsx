import { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={18} className="text-green-400 shrink-0" />,
  error:   <XCircle    size={18} className="text-red-400 shrink-0" />,
  info:    <AlertCircle size={18} className="text-indigo-400 shrink-0" />,
};

const COLORS = {
  success: "border-green-500/30 bg-green-500/10",
  error:   "border-red-500/30 bg-red-500/10",
  info:    "border-indigo-500/30 bg-indigo-500/10",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ message, type = "info", duration = 3500 }) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* right-4 + max-w-sm: never wider than viewport, always anchored to right edge */}
      <div className="fixed bottom-16 sm:bottom-4 right-4 left-4 sm:left-auto z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(({ id, message, type }) => (
            <motion.div key={id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-xl text-sm text-white ${COLORS[type]}`}>
              {ICONS[type]}
              <span className="flex-1 leading-snug">{message}</span>
              <button onClick={() => dismiss(id)} className="text-gray-400 hover:text-white ml-1 shrink-0">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
