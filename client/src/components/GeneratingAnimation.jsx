import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";

// Full-card animated loading state shown in place of the upload form while a
// guide is being generated. Orbiting sparkles + a pulsing book icon give
// visual feedback for what can be a 10-30s wait; the stage text underneath
// rotates on its own timer (see Dashboard.jsx's handleSubmit).
export default function GeneratingAnimation({ stage }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 px-6 text-center">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-indigo-500/15"
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles size={16} className="absolute -top-1 left-1/2 -translate-x-1/2 text-violet-400" />
        </motion.div>
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles size={12} className="absolute top-1/2 -right-1 -translate-y-1/2 text-indigo-400" />
        </motion.div>

        <motion.div
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <BookOpen size={24} className="text-white" />
        </motion.div>
      </div>

      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={stage}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-sm font-medium text-gray-300"
        >
          {stage || "Building your study guide…"}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
