import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Zap, FolderOpen, MessageCircle, TrendingUp, Star } from "lucide-react";

const features = [
  { icon: Zap, title: "Instant Study Guides", desc: "Paste notes, upload photos, or drop in audio â€” get a full study guide in seconds.", color: "text-yellow-500" },
  { icon: FolderOpen, title: "Organize Everything", desc: "Create color-coded folders for each class. Keep your materials structured and easy to find.", color: "text-blue-500" },
  { icon: MessageCircle, title: "AI Tutor Chat", desc: "Ask your AI tutor anything about your lecture. Get explanations, examples, and help 24/7.", color: "text-purple-500" },
  { icon: TrendingUp, title: "Track Your Progress", desc: "Earn XP, level up, and maintain study streaks. Watch yourself grow topic by topic.", color: "text-green-500" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-lg sm:text-xl font-bold">
          <BookOpen className="text-indigo-400" size={24} />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">StudyBuddi</span>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link to="/login" className="px-3 sm:px-5 py-2 rounded-xl text-gray-300 hover:text-white transition-colors font-medium text-sm sm:text-base">Log in</Link>
          <Link to="/signup" className="px-3 sm:px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold text-sm sm:text-base">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 sm:px-6 pt-14 sm:pt-20 pb-20 sm:pb-24 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-block bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium mb-5 sm:mb-6">
            âœ¨ AI-powered study assistant
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 sm:mb-6">
            Turn any lecture into{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              a perfect study guide
            </span>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 mb-8 sm:mb-10 max-w-2xl mx-auto">
            Upload audio, snap a photo, or paste your notes. StudyBuddi creates summaries, flashcards, quizzes, and an AI tutor â€” instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link to="/signup" className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-bold text-base sm:text-lg shadow-lg shadow-indigo-500/25">
              Start Studying Free â†’
            </Link>
            <Link to="/login" className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all font-semibold text-base sm:text-lg">
              I have an account
            </Link>
          </div>
        </motion.div>

        {/* Floating stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-6 mt-16 text-sm text-gray-400">
          {[["ðŸ“š", "Summarize instantly"], ["ðŸ§ ", "Quiz yourself"], ["ðŸ”¥", "Build streaks"], ["ðŸ’¬", "AI tutor included"]].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2">
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
              <f.icon className={`${f.color} mb-3`} size={28} />
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 pb-24">
        <div className="bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border border-indigo-500/20 rounded-3xl p-12 max-w-2xl mx-auto">
          <Star className="text-yellow-400 mx-auto mb-4" size={32} />
          <h2 className="text-3xl font-bold mb-3">Ready to study smarter?</h2>
          <p className="text-gray-400 mb-8">Join students who turned their study game around with AI.</p>
          <Link to="/signup" className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-bold text-lg">
            Create Free Account â†’
          </Link>
        </div>
      </section>
    </div>
  );
}

