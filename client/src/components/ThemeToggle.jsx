import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext.jsx";

/**
 * ThemeToggle — animated Sun ↔ Moon pill button.
 *
 * Props:
 *   size      "sm" | "md" (default "md")
 *   variant   "pill" | "icon" (default "pill" — shows label on md+)
 */
export default function ThemeToggle({ size = "md", variant = "pill" }) {
  const { isDark, toggle } = useTheme();

  const isSmall = size === "sm";
  const isPill  = variant === "pill";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        group relative inline-flex items-center gap-1.5 font-semibold transition-all duration-200 select-none
        ${isSmall
          ? "p-2 rounded-xl min-h-[36px] min-w-[36px]"
          : "px-3 py-2 rounded-xl min-h-[40px]"
        }
        ${isDark
          ? "bg-white/6 hover:bg-white/10 border border-white/8 hover:border-white/16 text-gray-400 hover:text-white"
          : "bg-black/5 hover:bg-black/10 border border-black/8 hover:border-black/16 text-slate-500 hover:text-slate-800"
        }
      `}>

      {/* Animated icon */}
      <div className="relative w-4 h-4 shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0,   scale: 1   }}
              exit={{    opacity: 0, rotate:  30,  scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center">
              <Moon size={15} className="text-indigo-400" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ opacity: 0, rotate: 30,  scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0,   scale: 1   }}
              exit={{    opacity: 0, rotate: -30,  scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center">
              <Sun size={15} className="text-amber-500" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Label — visible on pill variant when not small */}
      {isPill && !isSmall && (
        <span className="text-xs hidden sm:block whitespace-nowrap">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </button>
  );
}
