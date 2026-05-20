import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  BookOpen, Zap, FolderOpen, MessageCircle, TrendingUp, ArrowRight,
  Sparkles, Brain, Trophy, Check, Star, Play, ChevronDown,
  Flame, Shield, Clock, Users, Crown, BarChart2, Target,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";

// ── Data ──────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: Zap,
    title: "Instant Study Guides",
    desc: "Paste notes, upload PDFs, photos, or audio — get summaries, key terms, and quizzes in under 10 seconds.",
    gradient: "from-yellow-500/20 to-orange-500/10",
    border: "border-yellow-500/20",
    iconBg: "bg-yellow-500/15",
    iconColor: "text-yellow-400",
    glow: "group-hover:shadow-yellow-500/10",
  },
  {
    icon: Brain,
    title: "AI Tutor Chat",
    desc: "Ask anything about your lecture. Your personal AI tutor gives clear explanations and examples 24/7.",
    gradient: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-500/20",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    glow: "group-hover:shadow-violet-500/10",
  },
  {
    icon: FolderOpen,
    title: "Organize by Class",
    desc: "Color-coded folders for every subject. Keep every guide, quiz, and note exactly where you need it.",
    gradient: "from-sky-500/20 to-blue-500/10",
    border: "border-sky-500/20",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-400",
    glow: "group-hover:shadow-sky-500/10",
  },
  {
    icon: TrendingUp,
    title: "Track & Level Up",
    desc: "Earn XP, build study streaks, unlock achievements. Turn boring revision into an addictive game.",
    gradient: "from-green-500/20 to-emerald-500/10",
    border: "border-green-500/20",
    iconBg: "bg-green-500/15",
    iconColor: "text-green-400",
    glow: "group-hover:shadow-green-500/10",
  },
  {
    icon: Target,
    title: "Adaptive Quizzes",
    desc: "Smart quizzes that identify your weak spots and repeat them until you master every concept.",
    gradient: "from-pink-500/20 to-rose-500/10",
    border: "border-pink-500/20",
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-400",
    glow: "group-hover:shadow-pink-500/10",
  },
  {
    icon: BarChart2,
    title: "Progress Analytics",
    desc: "See exactly how you're improving with study heatmaps, quiz history, and performance trends.",
    gradient: "from-indigo-500/20 to-blue-500/10",
    border: "border-indigo-500/20",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-400",
    glow: "group-hover:shadow-indigo-500/10",
  },
];

const steps = [
  {
    n: "01",
    emoji: "📤",
    label: "Add your content",
    desc: "Paste text, upload a PDF, snap a photo of your notes, or drop a YouTube link",
  },
  {
    n: "02",
    emoji: "✨",
    label: "AI does the work",
    desc: "Get a full summary, key terms, flashcards, and quiz questions instantly",
  },
  {
    n: "03",
    emoji: "🚀",
    label: "Study & improve",
    desc: "Take quizzes, chat with your AI tutor, track your streaks and level up",
  },
];

const testimonials = [
  {
    name: "Maya Johnson",
    role: "Pre-Med Student",
    avatar: "MJ",
    color: "from-pink-500 to-rose-600",
    text: "I went from cramming all night to genuinely understanding material. StudyBuddi turned my 3-hour lecture recordings into a perfect study guide in seconds. My GPA jumped a full point.",
    stars: 5,
  },
  {
    name: "Ethan Park",
    role: "Computer Science",
    avatar: "EP",
    color: "from-indigo-500 to-violet-600",
    text: "The adaptive quiz mode is insane. It keeps hammering you on the concepts you don't know until you actually get them. Nothing else works like this.",
    stars: 5,
  },
  {
    name: "Sofia Martinez",
    role: "Law Student",
    avatar: "SM",
    color: "from-emerald-500 to-teal-600",
    text: "I upload case notes and get structured summaries with key terms and practice questions automatically. It's like having a study partner who never sleeps.",
    stars: 5,
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect for trying it out",
    features: [
      "1 AI study guide (lifetime)",
      "3 quizzes per day",
      "15 AI tutor messages per day",
      "Basic progress tracking",
      "3 folders",
    ],
    cta: "Get started free",
    to: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$4.99",
    period: "per month",
    desc: "For serious students",
    features: [
      "Unlimited AI study guides",
      "Unlimited quizzes & AI tutor",
      "Advanced adaptive quizzes",
      "Export & print guides",
      "Unlimited folders",
      "Priority support",
    ],
    cta: "Start Pro",
    to: "/signup",
    highlight: true,
  },
];

const stats = [
  { value: "10s", label: "Average guide time", icon: Clock },
  { value: "6+", label: "Study modes", icon: Brain },
  { value: "∞", label: "Guides on Pro", icon: BookOpen },
  { value: "4.9★", label: "Student rating", icon: Star },
];

// ── Components ────────────────────────────────────────────────────────────────
function StarRating({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />
      ))}
    </div>
  );
}

function MockUI() {
  const [active, setActive] = useState(0);
  const tabs = ["📚 Sections", "📝 Notes", "🃏 Cards", "🎯 MCQ"];
  const sections = ["✅ 1. Intro", "✅ 2. Methods", "▶ 3. Results", "○ 4. Conclusion"];

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % 4), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0e1a]/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-indigo-900/50">
      {/* Fake title bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-white/2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-3 text-xs text-gray-500 font-mono flex items-center gap-1.5">
          <Sparkles size={10} className="text-indigo-400" />
          StudyBuddi — Biology 101
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/4 rounded-xl">
          {tabs.map((tab, i) => (
            <span key={tab} className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all flex-1 text-center ${i === 0 ? "bg-indigo-600 text-white" : "text-gray-500"}`}>
              {tab}
            </span>
          ))}
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400 font-medium">2 of 4 sections complete</span>
            <span className="text-xs text-indigo-400 font-bold">50%</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "50%" }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.8 }}
            />
          </div>
        </div>

        {/* Section pills */}
        <div className="flex gap-1.5 flex-wrap">
          {sections.map((s, i) => (
            <span key={i} className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap ${
              i === 2 ? "bg-indigo-600 text-white"
              : i < 2 ? "bg-green-500/20 text-green-400"
              : "bg-white/5 text-gray-500"
            }`}>{s}</span>
          ))}
        </div>

        {/* Active section */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
          <p className="text-xs font-bold text-indigo-300 mb-1.5">Section 3: Results &amp; Analysis</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Mitochondria generate ATP through oxidative phosphorylation across the inner membrane. The electron transport chain creates a proton gradient...
          </p>
        </div>

        {/* Key terms row */}
        <div className="grid grid-cols-2 gap-2">
          {[["ATP Synthesis", "Energy production via proton gradient"], ["Electron Chain", "Transfers electrons to generate energy"]].map(([term, def]) => (
            <div key={term} className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-2.5">
              <p className="text-xs font-bold text-violet-300 mb-0.5">{term}</p>
              <p className="text-xs text-gray-500 leading-tight">{def}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Landing Component ────────────────────────────────────────────────────
export default function Landing() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.4]);

  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-x-hidden">

      {/* ── Animated background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -left-60 w-[600px] h-[600px] bg-indigo-600/12 rounded-full blur-[140px] animate-float-slow" />
        <div className="absolute top-1/3 -right-48 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] animate-float-delay" />
        <div className="absolute -bottom-40 left-1/4 w-[400px] h-[400px] bg-indigo-800/12 rounded-full blur-[100px] animate-float" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-20 flex items-center justify-between px-5 sm:px-8 lg:px-12 py-5 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
            <Sparkles size={17} className="text-white" />
          </div>
          <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            StudyBuddi
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <a href="#features" className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-medium text-sm rounded-xl hover:bg-white/5">Features</a>
          <a href="#how-it-works" className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-medium text-sm rounded-xl hover:bg-white/5">How it works</a>
          <a href="#pricing" className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-medium text-sm rounded-xl hover:bg-white/5">Pricing</a>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle size="md" variant="pill" />
          <Link to="/login" className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-medium text-sm rounded-xl hover:bg-white/5 hidden sm:block">
            Log in
          </Link>
          <Link to="/signup"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-bold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5">
            Get started free
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 text-center px-5 pt-16 sm:pt-20 pb-24 sm:pb-32 max-w-5xl mx-auto">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 rounded-full px-4 py-1.5 text-xs font-semibold mb-8 backdrop-blur-sm">
            <Sparkles size={11} className="text-indigo-400" />
            AI-powered study assistant — free to start
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          </div>

          <h1 className="text-3xl xs:text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Turn any lecture into a{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent animated-gradient">
                perfect study guide
              </span>
              <svg className="absolute -bottom-1 left-0 w-full" height="4" viewBox="0 0 300 4" fill="none" preserveAspectRatio="none">
                <path d="M0 2 Q150 0 300 2" stroke="url(#underline-grad)" strokeWidth="2.5" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="underline-grad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#818cf8"/>
                    <stop offset="100%" stopColor="#f472b6"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload audio, snap a photo, paste your notes, or drop a YouTube link.
            StudyBuddi creates summaries, flashcards, quizzes, and an AI tutor — in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <Link to="/signup"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-black text-base shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/50 hover:-translate-y-1 pulse-ring">
              Start studying free
              <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all font-semibold text-base backdrop-blur-sm">
              <Play size={15} className="text-indigo-400" />
              See how it works
            </a>
          </div>

          <p className="text-gray-600 text-xs">No credit card required · Free forever plan available</p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-x-8 gap-y-5 mt-16 mb-16">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* App mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl relative">
          {/* Glow behind mockup */}
          <div className="absolute inset-0 -m-8 bg-gradient-to-b from-indigo-600/20 to-violet-600/10 blur-3xl rounded-full" />
          <div className="relative">
            <MockUI />
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex flex-col items-center gap-2 mt-12 text-gray-600">
          <span className="text-xs">Scroll to explore</span>
          <ChevronDown size={16} className="animate-bounce" />
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative z-10 px-5 pb-28 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-16">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-2xl sm:text-4xl font-black mb-4">From lecture to mastery in 3 steps</h2>
          <p className="text-gray-400 max-w-lg mx-auto">No setup. No complexity. Just drop your content and let the AI handle the rest.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden sm:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-indigo-500/0" />

          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="relative bg-white/3 border border-white/8 rounded-2xl p-7 hover:bg-white/5 hover:border-indigo-500/20 transition-all group text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-violet-600/20 border border-indigo-500/20 flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition-transform">
                {s.emoji}
              </div>
              <span className="text-xs font-black text-indigo-500/60 tracking-widest">{s.n}</span>
              <h3 className="font-bold text-white mb-2 mt-1">{s.label}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className="relative z-10 px-5 pb-28 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-16">
          <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-2xl sm:text-4xl font-black mb-4">Everything you need to ace your exams</h2>
          <p className="text-gray-400 max-w-lg mx-auto">One app. Every tool you need to master any subject, any time.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              className={`bg-gradient-to-br ${f.gradient} border ${f.border} rounded-2xl p-6 hover:scale-[1.02] hover:shadow-2xl ${f.glow} transition-all group cursor-default`}>
              <div className={`w-11 h-11 rounded-xl ${f.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className={f.iconColor} size={21} />
              </div>
              <h3 className="text-base font-bold mb-2 text-white">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Gamification ── */}
      <section className="relative z-10 px-5 pb-28 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="bg-gradient-to-br from-indigo-600/15 via-violet-600/10 to-pink-600/5 border border-indigo-500/20 rounded-3xl p-8 sm:p-14 text-center backdrop-blur-sm relative overflow-hidden">

          {/* Background decoration */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl" />

          <div className="relative">
            <div className="flex justify-center gap-3 sm:gap-6 mb-8">
              {[["⚡", "XP System", "indigo"], ["🔥", "Streaks", "orange"], ["🏆", "Achievements", "yellow"], ["🧠", "Levels", "violet"]].map(([e, l, c]) => (
                <div key={l} className="flex flex-col items-center gap-2">
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-${c}-500/15 border border-${c}-500/25 flex items-center justify-center text-lg sm:text-xl`}>
                    {e}
                  </div>
                  <span className="text-xs text-gray-400 font-medium hidden sm:block">{l}</span>
                </div>
              ))}
            </div>
            <h2 className="text-2xl sm:text-4xl font-black mb-4">Studying feels like a game</h2>
            <p className="text-gray-400 mb-10 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
              Earn XP for every guide you create, every quiz you take. Level up, build daily streaks, and unlock achievements as you master every topic.
            </p>
            <Link to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-bold text-base shadow-xl shadow-indigo-600/25 hover:-translate-y-0.5">
              <Trophy size={17} /> Start leveling up — free
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-10 px-5 pb-28 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-14">
          <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-3">Testimonials</p>
          <h2 className="text-2xl sm:text-4xl font-black mb-4">Students love it</h2>
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <div className="flex -space-x-1">
              {["MJ","EP","SM","KL","AR"].map((i, idx) => (
                <div key={idx} className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 border-2 border-[#080810] flex items-center justify-center text-xs font-bold text-white">{i[0]}</div>
              ))}
            </div>
            <span className="text-sm">Joined by <span className="text-white font-semibold">thousands</span> of students</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-all">
              <StarRating count={t.stars} />
              <p className="text-gray-300 text-sm leading-relaxed my-4 break-words">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-3 border-t border-white/8">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-xs font-black text-white shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-white text-sm font-bold">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 px-5 pb-28 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-14">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-2xl sm:text-4xl font-black mb-4">Simple, student-friendly pricing</h2>
          <p className="text-gray-400">Start free. Upgrade whenever you're ready.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative rounded-2xl p-5 sm:p-7 ${
                plan.highlight
                  ? "bg-gradient-to-br from-indigo-600/20 to-violet-600/15 border-2 border-indigo-500/50 shadow-xl shadow-indigo-500/10"
                  : "bg-white/3 border border-white/10"
              }`}>
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
                    <Crown size={11} /> Most popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <p className="text-gray-400 text-sm font-medium mb-1">{plan.name}</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm mb-1">/{plan.period}</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check size={14} className={plan.highlight ? "text-indigo-400" : "text-green-400"} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to={plan.to}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5"
                    : "bg-white/8 hover:bg-white/12 text-white border border-white/10"
                }`}>
                {plan.cta} <ArrowRight size={14} />
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6 flex items-center justify-center gap-2">
          <Shield size={12} className="text-gray-600" />
          Secure payments via Stripe · Cancel anytime · No hidden fees
        </p>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 px-5 pb-24 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30">
            <Sparkles size={28} className="text-white" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black mb-5 leading-tight">
            Ready to study smarter?
          </h2>
          <p className="text-gray-400 mb-10 max-w-lg mx-auto">
            Join thousands of students already using StudyBuddi to turn lectures into mastery. No credit card, no commitment.
          </p>
          <Link to="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-black text-lg shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/50 hover:-translate-y-1">
            Start for free — no card needed
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/6 px-5 py-10 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <span className="font-black text-white">StudyBuddi</span>
              <p className="text-gray-600 text-xs">AI-powered study assistant</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-600">
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
            <a href="mailto:support@studybuddi.app" className="hover:text-gray-400 transition-colors">Support</a>
          </div>

          <p className="text-gray-700 text-xs">© 2025 StudyBuddi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
