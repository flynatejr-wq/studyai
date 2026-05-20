import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Sparkles, Brain, Trophy, ArrowRight,
  FileText, Youtube, Image, Mic, File, X, CheckCircle,
} from "lucide-react";
import { analytics, Events } from "../lib/analytics.js";

const STEPS = [
  {
    id: "welcome",
    emoji: "👋",
    title: "Welcome to StudyBuddi!",
    subtitle: "Your AI-powered study companion",
    content: WelcomeStep,
  },
  {
    id: "how",
    emoji: "⚡",
    title: "Upload anything",
    subtitle: "5 ways to create a study guide",
    content: HowStep,
  },
  {
    id: "output",
    emoji: "🧠",
    title: "AI does the heavy lifting",
    subtitle: "See what gets generated instantly",
    content: OutputStep,
  },
  {
    id: "ready",
    emoji: "🚀",
    title: "You're ready to study!",
    subtitle: "Let's create your first guide",
    content: ReadyStep,
  },
];

// ── Step content components ───────────────────────────────────────────────────

function WelcomeStep() {
  return (
    <div className="text-center space-y-5">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
        <Brain size={36} className="text-white" />
      </div>
      <div>
        <p className="text-gray-300 text-sm leading-relaxed max-w-xs mx-auto">
          Turn your lecture notes, YouTube videos, PDFs, or audio recordings into
          a complete study guide — with summaries, flashcards, quizzes, and an AI tutor —
          in under 30 seconds.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { emoji: "📚", label: "Study guides" },
          { emoji: "🎯", label: "Auto quizzes" },
          { emoji: "🤖", label: "AI tutor" },
        ].map(f => (
          <div key={f.label} className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">{f.emoji}</div>
            <p className="text-xs text-gray-400 font-medium">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowStep() {
  const sources = [
    { icon: FileText, label: "Paste notes",     desc: "Copy-paste lecture text",     color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { icon: Youtube,  label: "YouTube URL",     desc: "Auto-fetches transcript",     color: "text-red-400",    bg: "bg-red-500/10" },
    { icon: Image,    label: "Photo",           desc: "Whiteboard, slides, notes",   color: "text-emerald-400",bg: "bg-emerald-500/10" },
    { icon: Mic,      label: "Audio recording", desc: "Lecture, podcast, voice memo",color: "text-amber-400",  bg: "bg-amber-500/10" },
    { icon: File,     label: "Upload file",     desc: "PDF, DOCX, PPTX, TXT",        color: "text-violet-400", bg: "bg-violet-500/10" },
  ];
  return (
    <div className="space-y-2">
      {sources.map(s => (
        <div key={s.label} className="flex items-center gap-3 p-3 bg-white/3 border border-white/6 rounded-xl">
          <div className={`w-9 h-9 shrink-0 rounded-lg ${s.bg} flex items-center justify-center`}>
            <s.icon size={16} className={s.color} />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">{s.label}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OutputStep() {
  const outputs = [
    {
      title: "Structured study guide",
      desc: "Sections, key points, and definitions — organised like a textbook.",
      preview: (
        <div className="bg-white/4 rounded-lg p-3 space-y-1.5">
          <div className="h-2.5 bg-indigo-500/40 rounded w-3/4" />
          <div className="h-2 bg-white/10 rounded w-full" />
          <div className="h-2 bg-white/10 rounded w-5/6" />
          <div className="h-2 bg-white/10 rounded w-4/6" />
        </div>
      ),
    },
    {
      title: "Auto-generated quizzes",
      desc: "Multiple choice and self-grade questions — test yourself instantly.",
      preview: (
        <div className="bg-white/4 rounded-lg p-3 space-y-1.5">
          <div className="h-2.5 bg-violet-500/40 rounded w-5/6" />
          {["bg-white/10", "bg-emerald-500/25", "bg-white/10", "bg-white/10"].map((c, i) => (
            <div key={i} className={`h-2 ${c} rounded w-full`} />
          ))}
        </div>
      ),
    },
    {
      title: "AI tutor chat",
      desc: "Ask anything about your guide — get instant, context-aware answers.",
      preview: (
        <div className="bg-white/4 rounded-lg p-3 space-y-2">
          <div className="flex gap-2 items-end">
            <div className="h-2 bg-white/15 rounded w-2/3" />
          </div>
          <div className="flex gap-2 items-end justify-end">
            <div className="h-2 bg-indigo-500/40 rounded w-1/2" />
          </div>
          <div className="flex gap-2 items-end">
            <div className="h-2 bg-white/15 rounded w-3/4" />
          </div>
        </div>
      ),
    },
  ];
  return (
    <div className="space-y-3">
      {outputs.map(o => (
        <div key={o.title} className="bg-white/3 border border-white/6 rounded-xl p-3">
          <div className="flex items-start gap-3">
            <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-none">{o.title}</p>
              <p className="text-gray-500 text-xs mt-0.5 mb-2">{o.desc}</p>
              {o.preview}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReadyStep() {
  return (
    <div className="text-center space-y-5">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
        <Trophy size={36} className="text-white" />
      </div>
      <div>
        <p className="text-gray-300 text-sm leading-relaxed max-w-xs mx-auto">
          You're all set! Create your first study guide — it takes less than 30 seconds.
          Your streak, XP, and achievements will track your progress over time.
        </p>
      </div>
      <div className="space-y-2 text-left">
        {[
          "Create your first guide",
          "Take a quiz on it",
          "Chat with your AI tutor",
          "Hit a 3-day streak",
        ].map((t, i) => (
          <div key={t} className="flex items-center gap-2.5 p-2.5 bg-white/3 border border-white/6 rounded-xl">
            <div className="w-5 h-5 rounded-full border border-white/15 flex items-center justify-center text-xs text-gray-600 font-bold shrink-0">
              {i + 1}
            </div>
            <span className="text-gray-300 text-sm">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "studybuddi_onboarding_done";

export function useOnboarding(user) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem(STORAGE_KEY);
    // Show for new users who haven't completed onboarding and have no guides yet
    if (!done && (user.guides_created_ever ?? 0) === 0) {
      // Small delay so the dashboard renders first
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, [user]);

  const complete = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
    analytics.track(Events.ONBOARDING_COMPLETED);
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
    analytics.track(Events.ONBOARDING_SKIPPED);
  };

  return { show, complete, skip };
}

export default function OnboardingModal({ onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const StepContent = current.content;
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    analytics.track(Events.ONBOARDING_STARTED);
  }, []);

  useEffect(() => {
    analytics.track("onboarding_step_viewed", { step: current.id, index: step });
  }, [step, current.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onSkip}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-sm bg-[#0d0d1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-4 sm:my-auto">

        {/* Skip button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 transition-colors z-10">
          <X size={18} />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-1">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${i === step ? "w-5 h-1.5 bg-indigo-500" : "w-1.5 h-1.5 bg-white/15 hover:bg-white/25"}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}>

              <div className="text-center mb-5">
                <span className="text-3xl">{current.emoji}</span>
                <h2 className="text-white font-black text-lg mt-2 leading-tight">{current.title}</h2>
                <p className="text-gray-500 text-xs mt-0.5">{current.subtitle}</p>
              </div>

              <div className="max-h-80 overflow-y-auto pr-0.5">
                <StepContent />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl text-gray-400 hover:text-white text-sm font-medium transition-all">
              Back
            </button>
          )}
          <button
            onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25">
            {isLast ? (
              <>Create First Guide <Sparkles size={14} /></>
            ) : (
              <>Next <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
