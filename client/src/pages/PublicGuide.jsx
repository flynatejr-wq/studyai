import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { api } from "../api.js";

export default function PublicGuide() {
  const { token } = useParams();
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState("");
  const [expandedTerms, setExpandedTerms] = useState(true);

  useEffect(() => {
    api.public.getGuide(token)
      .then(setGuide)
      .catch(err => setError(err.message));
  }, [token]);

  if (error) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="text-xl font-bold text-white mb-2">Link not found</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link to="/" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors">
          Go to StudyBuddi
        </Link>
      </div>
    </div>
  );

  if (!guide) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <div className="text-indigo-400 animate-pulse text-lg">Loading guide...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Nav */}
      <nav className="border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="text-indigo-400" size={22} />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">StudyBuddi</span>
        </Link>
        <Link to="/signup"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-semibold transition-colors">
          <UserPlus size={14} /> Get it free
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">{guide.type} · shared study guide</span>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-1 leading-tight">{guide.title}</h1>
          <p className="text-gray-500 text-sm">{new Date(guide.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </motion.div>

        {/* Summary */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
          <h2 className="text-base font-bold text-white mb-4">📝 Summary</h2>
          <ul className="space-y-2">
            {(guide.summary || []).map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300">
                <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                <span className="leading-relaxed text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Key Terms */}
        {guide.key_terms?.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <button className="w-full flex items-center justify-between text-base font-bold text-white"
              onClick={() => setExpandedTerms(e => !e)}>
              <span>🔑 Key Terms</span>
              {expandedTerms ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {expandedTerms && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {guide.key_terms.map((item, i) => (
                  <div key={i} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                    <p className="font-semibold text-indigo-300 text-sm">{item.term}</p>
                    <p className="text-gray-400 text-sm mt-1 leading-relaxed">{item.definition}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/30 rounded-2xl p-6 text-center">
          <p className="text-white font-bold text-lg mb-1">Want to quiz yourself on this?</p>
          <p className="text-gray-400 text-sm mb-5">Create a free account to take flashcards, MCQ quizzes, and chat with an AI tutor about any study guide.</p>
          <Link to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-white font-bold transition-all shadow-lg shadow-indigo-500/20">
            <UserPlus size={16} /> Start studying free →
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

