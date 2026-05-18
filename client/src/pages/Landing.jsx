import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Zap, FolderOpen, MessageCircle, TrendingUp, ArrowRight, Sparkles, Brain, Trophy } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Study Guides",
    desc: "Paste notes, upload PDFs, photos, or audio â€” get summaries, key terms, and quizzes in seconds.",
    gradient: "from-yellow-500/20 to-orange-500/10",
    border: "border-yellow-500/20",
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
  },
  {
    icon: Brain,
    title: "AI Tutor Chat",
    desc: "Ask anything about your lecture. Your AI tutor gives clear explanations and examples around the clock.",
    gradient: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-500/20",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: FolderOpen,
    title: "Organize by Class",
    desc: "Color-coded folders for every subject. Keep every guide, quiz, and note exactly where you need it.",
    gradient: "from-sky-500/20 to-blue-500/10",
    border: "border-sky-500/20",
    iconBg: "bg-sky-500/20",
    iconColor: "text-sky-400",
  },
  {
    icon: TrendingUp,
    title: "Track & Level Up",
    desc: "Earn XP, build streaks, and unlock achievements as you study. Turn boring revision into a game.",
    gradient: "from-green-500/20 to-emerald-500/10",
    border: "border-green-500/20",
    iconBg: "bg-green-500/20",
    iconColor: "text-green-400",
  },
];

const steps = [
  { n: "01", label: "Add your content", desc: "Paste text, upload a PDF, photo, or voice recording" },
  { n: "02", label: "AI does the work", desc: "Get a full summary, key terms, and quiz questions instantly" },
  { n: "03", label: "Study & improve", desc: "Take quizzes, chat with your AI tutor, track your progress" },
];

const stats = [
  { value: "10 sec", label: "Average guide time" },
  { value: "4 modes", label: "Study methods" },
  { value: "âˆž", label: "Guides you can create" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-violet-600/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-indigo-800/20 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-5 sm:px-10 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            StudyBuddi
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-medium text-sm rounded-xl hover:bg-white/5">
            Log in
          </Link>
          <Link to="/signup" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-semibold text-sm shadow-lg shadow-indigo-500/25">
            Get started free <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-5 pt-16 sm:pt-24 pb-20 sm:pb-28 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 rounded-full px-4 py-1.5 text-xs font-semibold mb-7 backdrop-blur-sm">
            <Sparkles size={12} className="text-indigo-400" />
            AI-powered study assistant
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.08] tracking-tight mb-6">
            Turn any lecture into a{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              perfect study guide
            </span>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload audio, snap a photo, or paste your notes. StudyBuddi creates summaries, flashcards, quizzes, and gives you an AI tutor â€” in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link to="/signup"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-bold text-base sm:text-lg shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5">
              Start studying free
              <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all font-semibold text-base sm:text-lg backdrop-blur-sm">
              I have an account
            </Link>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-16">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Mock UI card */}
        <motion.div initial={{ opacity: 0, y: 32, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
          className="mt-16 mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden shadow-2xl shadow-indigo-900/50">
          {/* Fake title bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs text-gray-500 font-mono">StudyBuddi â€” Biology Lecture</span>
          </div>
          <div className="p-5 space-y-3 text-left">
            <div className="flex items-center gap-2 mb-4">
              {["ðŸ“ Notes", "ðŸƒ Flashcards", "ðŸŽ¯ MCQ", "âœï¸ Self-Grade"].map(tab => (
                <span key={tab} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${tab === "ðŸ“ Notes" ? "bg-indigo-600 text-white" : "text-gray-500 bg-white/5"}`}>{tab}</span>
              ))}
            </div>
            <div className="space-y-2">
              {["Cell membranes control what enters and exits the cell through selective permeability.", "Mitochondria generate ATP through oxidative phosphorylation.", "DNA replication is semi-conservative â€” each new strand keeps one original strand."].map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <span className="text-indigo-400 mt-0.5 shrink-0 font-bold">â€¢</span>
                  <span className="leading-relaxed">{s}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[{ term: "Mitosis", def: "Cell division producing identical daughter cells" }, { term: "ATP", def: "Primary energy currency of the cell" }].map(item => (
                <div key={item.term} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5">
                  <p className="text-xs font-bold text-indigo-300">{item.term}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.def}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-5 pb-24 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-black mb-3">From lecture to mastery in 3 steps</h2>
          <p className="text-gray-400">No setup. No complexity. Just results.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative bg-white/4 border border-white/8 rounded-2xl p-6 hover:bg-white/6 hover:border-white/15 transition-all group">
              <span className="text-4xl font-black text-white/8 group-hover:text-indigo-500/20 transition-colors select-none mb-4 block">{s.n}</span>
              <h3 className="font-bold text-white mb-2">{s.label}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-5 pb-24 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-black mb-3">Everything you need to study smarter</h2>
          <p className="text-gray-400">One app. Every tool you need to master any subject.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              className={`bg-gradient-to-br ${f.gradient} border ${f.border} rounded-2xl p-6 hover:scale-[1.02] transition-all group cursor-default`}>
              <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center mb-4`}>
                <f.icon className={f.iconColor} size={20} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Gamification teaser */}
      <section className="relative z-10 px-5 pb-24 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-indigo-600/15 via-violet-600/10 to-pink-600/5 border border-indigo-500/20 rounded-3xl p-8 sm:p-12 text-center backdrop-blur-sm">
          <div className="flex justify-center gap-3 mb-6">
            {[["âš¡", "XP System"], ["ðŸ”¥", "Streaks"], ["ðŸ†", "Achievements"]].map(([e, l]) => (
              <div key={l} className="flex flex-col items-center gap-1.5">
                <span className="text-2xl">{e}</span>
                <span className="text-xs text-gray-400 font-medium">{l}</span>
              </div>
            ))}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Studying feels like a game</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Earn XP for every guide you create, every quiz you take. Level up, maintain your streak, and unlock achievements as you go.
          </p>
          <Link to="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-bold text-base shadow-xl shadow-indigo-600/25 hover:-translate-y-0.5">
            <Trophy size={16} /> Start for free
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/8 px-5 py-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <BookOpen size={12} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-400">StudyBuddi</span>
        </div>
        <div className="flex gap-4 text-xs text-gray-600">
          <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
