import { Link } from "react-router-dom";
import { Home, ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md relative z-10">

        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2 mb-10 opacity-60 hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-black text-white tracking-tight">StudyBuddi</span>
        </Link>

        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
          className="text-9xl font-black bg-gradient-to-br from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent mb-4 select-none leading-none">
          404
        </motion.div>

        <h1 className="text-2xl font-black text-white mb-3">Page not found</h1>
        <p className="text-gray-500 mb-10 text-sm leading-relaxed">
          The page you're looking for doesn't exist, has been moved, or you don't have access to it.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/8 hover:bg-white/8 rounded-xl text-gray-300 font-medium text-sm transition-all">
            <ArrowLeft size={15} /> Go Back
          </button>
          <Link to="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-white font-bold text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20">
            <Home size={15} /> Go to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
