/**
 * DailyWidgets.jsx — Daily engagement strip for the StudyBuddi dashboard
 *
 * Shows four rotating cards:
 *   • Word of the Day     (indigo)
 *   • Daily Quote         (violet)
 *   • Study Tip           (sky)
 *   • Daily Challenge     (amber)
 *
 * Content rotates by day-of-year, so every user sees the same card on the
 * same day — reinforcing the sense of a "shared study world."
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, MessageSquareQuote, Lightbulb, Trophy, Zap, ChevronDown } from "lucide-react";

// ─── Word of the Day data ─────────────────────────────────────────────────────
const WORDS = [
  { word: "Epistemology",    pos: "noun",     def: "The branch of philosophy concerned with the nature, origin, and scope of knowledge.", example: "Her study of epistemology changed how she evaluated scientific evidence." },
  { word: "Heuristic",       pos: "adj/noun", def: "A practical problem-solving approach that is not guaranteed optimal but is sufficient.", example: "The teacher's heuristic method helped students grasp abstract calculus concepts." },
  { word: "Synthesis",       pos: "noun",     def: "The combination of ideas or elements to form a coherent new whole.", example: "Her essay demonstrated a brilliant synthesis of three competing theories." },
  { word: "Empirical",       pos: "adj",      def: "Based on observation, experiment, or experience rather than theory or logic alone.", example: "The empirical evidence strongly supported the original hypothesis." },
  { word: "Dialectic",       pos: "noun",     def: "A method of inquiry using logical discussion between opposing viewpoints to reach truth.", example: "The Socratic dialectic remains one of the most powerful teaching methods." },
  { word: "Paradigm",        pos: "noun",     def: "A typical example, pattern, or model; a framework through which we understand the world.", example: "The discovery caused a complete paradigm shift in modern physics." },
  { word: "Axiom",           pos: "noun",     def: "A statement accepted as self-evidently true, used as a basis for deductive reasoning.", example: "Euclid built all of geometry on five simple axioms." },
  { word: "Inference",       pos: "noun",     def: "A conclusion reached by logical reasoning from evidence and premises.", example: "From the available clues, the analyst made a sharp inference." },
  { word: "Pedagogy",        pos: "noun",     def: "The art, science, or profession of teaching and the methods of instruction.", example: "Modern pedagogy emphasises active learning over passive memorisation." },
  { word: "Juxtapose",       pos: "verb",     def: "To place two things side by side for comparison or to emphasise contrast.", example: "The essay juxtaposed nineteenth-century and contemporary economic theory." },
  { word: "Elucidate",       pos: "verb",     def: "To make something clear; to explain or shed light on a difficult concept.", example: "The professor elucidated the theorem with a single clear diagram." },
  { word: "Assiduous",       pos: "adj",      def: "Showing great care, attention, and persistent diligence in one's work.", example: "Her assiduous revision habits consistently earned top results." },
  { word: "Perspicacious",   pos: "adj",      def: "Having a ready insight into things; showing a deep and accurate understanding.", example: "The perspicacious student spotted the flaw in the argument immediately." },
  { word: "Mnemonic",        pos: "noun/adj", def: "A pattern, phrase, or device used as a memory aid to recall information.", example: "'ROY G BIV' is a classic mnemonic for the colours of the rainbow." },
  { word: "Cogent",          pos: "adj",      def: "Clear, logical, and convincing; powerfully appealing to the intellect.", example: "She made a cogent argument for restructuring the research methodology." },
  { word: "Iterate",         pos: "verb",     def: "To repeat a process or sequence, often refining it with each cycle.", example: "Scientists iterate through experiments to gradually improve their models." },
  { word: "Lucid",           pos: "adj",      def: "Expressed clearly; easy to understand; showing clear, rational thought.", example: "His lucid explanation made even quantum mechanics feel approachable." },
  { word: "Tenacious",       pos: "adj",      def: "Holding firmly to a purpose or view; persistent and determined in one's goals.", example: "Her tenacious study ethic helped her conquer the most challenging subjects." },
  { word: "Salient",         pos: "adj",      def: "Most noticeable or important; standing out prominently; highly relevant.", example: "The professor highlighted the most salient points before the final exam." },
  { word: "Pragmatic",       pos: "adj",      def: "Dealing with things sensibly and practically based on real conditions.", example: "A pragmatic approach to revision means focusing effort where it matters most." },
  { word: "Cognizant",       pos: "adj",      def: "Having knowledge or awareness of a fact or situation; conscious and informed.", example: "Good learners are cognizant of their own gaps in understanding." },
  { word: "Proliferate",     pos: "verb",     def: "To increase rapidly in number; to spread or multiply widely.", example: "Online learning resources have proliferated dramatically in recent years." },
  { word: "Didactic",        pos: "adj",      def: "Intended to teach; inclined to instruct with moral or educational purpose.", example: "The textbook's didactic style made complex topics accessible to beginners." },
  { word: "Circumspect",     pos: "adj",      def: "Wary and unwilling to take risks; carefully considering all consequences.", example: "Be circumspect when citing sources you have not independently verified." },
  { word: "Ostensible",      pos: "adj",      def: "Stated or appearing to be true, but not necessarily so upon closer inspection.", example: "The ostensible purpose was academic research, but the agenda was political." },
  { word: "Rigorous",        pos: "adj",      def: "Extremely thorough, careful, and demanding; applied with exacting precision.", example: "Scientific research requires rigorous methodology to produce valid results." },
  { word: "Analogous",       pos: "adj",      def: "Comparable in certain respects; similar in function though different in origin.", example: "The professor used an analogous problem to clarify the abstract theorem." },
  { word: "Sanguine",        pos: "adj",      def: "Optimistic, especially in a difficult situation; confident about the future.", example: "Despite a tough first exam, he remained sanguine about his final grade." },
  { word: "Nuanced",         pos: "adj",      def: "Characterised by subtle distinctions, shades of meaning, or fine differences.", example: "Her nuanced analysis revealed layers of complexity others had overlooked." },
  { word: "Perpetuate",      pos: "verb",     def: "To make something continue indefinitely; to preserve from being forgotten.", example: "Effective note-taking perpetuates understanding long after the lecture ends." },
];

// ─── Motivational quotes ──────────────────────────────────────────────────────
const QUOTES = [
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.",              author: "Mahatma Gandhi" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.",                   author: "W.B. Yeats" },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.",                author: "Benjamin Franklin" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.",          author: "B.B. King" },
  { text: "Learning never exhausts the mind.",                                                      author: "Leonardo da Vinci" },
  { text: "An investment in knowledge pays the best interest.",                                    author: "Benjamin Franklin" },
  { text: "The expert in anything was once a beginner.",                                           author: "Helen Hayes" },
  { text: "Study hard what interests you the most in the most undisciplined, original manner.",    author: "Richard Feynman" },
  { text: "You don't have to be great to start, but you have to start to be great.",               author: "Zig Ziglar" },
  { text: "It does not matter how slowly you go as long as you do not stop.",                      author: "Confucius" },
  { text: "The mind is not a vessel to be filled, but a fire to be ignited.",                      author: "Plutarch" },
  { text: "Success is the sum of small efforts, repeated day in and day out.",                     author: "Robert Collier" },
  { text: "Develop a passion for learning. If you do, you will never cease to grow.",             author: "Anthony J. D'Angelo" },
  { text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert" },
  { text: "Curiosity is the engine of achievement.",                                               author: "Ken Robinson" },
  { text: "Every accomplishment starts with the decision to try.",                                 author: "John F. Kennedy" },
  { text: "Genius is one percent inspiration and ninety-nine percent perspiration.",               author: "Thomas Edison" },
  { text: "The secret of getting ahead is getting started.",                                       author: "Mark Twain" },
  { text: "The more you know, the more you realise you don't know.",                               author: "Aristotle" },
  { text: "Education is the most powerful weapon you can use to change the world.",                author: "Nelson Mandela" },
];

// ─── Evidence-based study tips ────────────────────────────────────────────────
const TIPS = [
  { tip: "Active Recall",          detail: "Close your notes and write down everything you remember. Self-testing consistently outperforms re-reading for long-term retention." },
  { tip: "Spaced Repetition",      detail: "Review material at increasing intervals: today, tomorrow, in 3 days, then a week. Each review strengthens the memory trace." },
  { tip: "The Pomodoro Technique", detail: "Study for 25 focused minutes, then take a 5-minute break. After 4 rounds, take 20 minutes off. Rhythm beats marathon sessions." },
  { tip: "The Feynman Technique",  detail: "Explain a concept in plain language as if teaching a 12-year-old. Where you struggle, you've found your knowledge gap." },
  { tip: "Interleaved Practice",   detail: "Mix different topics or problem types in one session instead of blocking. It's harder, but studies show it improves transfer." },
  { tip: "Eliminate Distractions", detail: "Phone notifications can halve effective concentration. Use Do Not Disturb and a dedicated study space for your deepest work." },
  { tip: "Write by Hand",          detail: "Handwriting notes activates deeper processing than typing. The slight effort forces synthesis rather than transcription." },
  { tip: "Sleep on It",            detail: "Your brain consolidates memories during sleep. Reviewing material just before bed and right after waking maximises retention." },
  { tip: "Teach Someone Else",     detail: "Explaining concepts to a peer forces you to organise your thinking and almost always reveals gaps you didn't know you had." },
  { tip: "Mind Mapping",           detail: "Draw visual diagrams connecting related concepts. Spatial organisation activates memory pathways that linear notes miss." },
  { tip: "Study in Order",         detail: "Tackle the hardest material when your energy is highest. Save lighter review for when mental fatigue naturally sets in." },
  { tip: "Multiple Modalities",    detail: "Read, listen, watch, and practise writing the same concept. Multiple input channels create richer, more durable memories." },
  { tip: "Walk Before Studying",   detail: "A 10-minute brisk walk before a study session increases focus, creativity, and working memory — backed by solid research." },
  { tip: "Preview First",          detail: "Skim headings, summaries, and diagrams before reading in depth. This gives your brain a framework to slot new facts into." },
  { tip: "Turn Notes into Questions", detail: "Rewrite each fact as a question: 'What causes X?' Active questioning transforms passive notes into revision fuel." },
  { tip: "Review Within 24 Hours", detail: "About 70% of new information is forgotten within a day without review. A 10-minute revisit the next morning changes everything." },
  { tip: "Use the 80/20 Rule",     detail: "In most exams, 20% of the content generates 80% of the marks. Identify those high-yield concepts and master them first." },
  { tip: "Embrace Mistakes",       detail: "Errors are the fastest path to improvement. Analysing what went wrong deepens understanding more than getting it right." },
  { tip: "Track Your Study Time",  detail: "Simply measuring how long you study each day increases the time you spend studying. What gets measured gets managed." },
  { tip: "Optimise Your Space",    detail: "A tidy, well-lit environment with a comfortable temperature signals focus to your brain. Environment shapes behaviour." },
];

// ─── Daily challenges ─────────────────────────────────────────────────────────
const CHALLENGES = [
  { title: "Flashcard Sprint",     desc: "Create 10 flashcards from your most recent guide",                          xp: 50,  emoji: "🃏" },
  { title: "Blind Recall Quiz",    desc: "Test yourself on yesterday's material without looking at any notes",         xp: 55,  emoji: "🎯" },
  { title: "Teach It Out Loud",    desc: "Explain one concept from your guides aloud, as if teaching a friend",        xp: 60,  emoji: "🗣️" },
  { title: "5-Bullet Summary",     desc: "Write a concise 5-bullet summary of a topic entirely from memory",           xp: 45,  emoji: "⚡" },
  { title: "Deep Read",            desc: "Find and read one article or watch one video related to today's topic",      xp: 35,  emoji: "🔍" },
  { title: "Pomodoro Session",     desc: "Complete one full 25-minute focused session on your weakest subject",        xp: 70,  emoji: "⏱️" },
  { title: "Question Bank",        desc: "Write 5 exam-style questions from your notes, then answer them",             xp: 55,  emoji: "❓" },
  { title: "Concept Map",          desc: "Draw a visual map connecting at least 8 related concepts from one guide",   xp: 65,  emoji: "🗺️" },
  { title: "Error Analysis",       desc: "Review your last quiz and fully understand every question you got wrong",    xp: 50,  emoji: "🔬" },
  { title: "Voice Replay",         desc: "Record yourself explaining a complex topic, then listen back critically",    xp: 45,  emoji: "🎙️" },
  { title: "Comparison Table",     desc: "Build a compare/contrast table for two related concepts or theories",        xp: 55,  emoji: "📊" },
  { title: "Streak Guard",         desc: "Complete at least 20 minutes of focused study today to protect your streak", xp: 40,  emoji: "🔥" },
  { title: "Vocabulary Drill",     desc: "Look up and use today's Word of the Day in three different sentences",       xp: 35,  emoji: "📚" },
  { title: "Deep Work Block",      desc: "Do a 45-minute session with all notifications silenced — total focus",       xp: 80,  emoji: "🧠" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDayIndex() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  return Math.floor((Date.now() - start.getTime()) / 86_400_000);
}

// ─── Word Card ────────────────────────────────────────────────────────────────
function WordCard({ item, i }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07 + 0.05, duration: 0.4 }}
      className="shrink-0 w-52 sm:w-[220px] rounded-2xl p-4 cursor-pointer select-none overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.16) 0%, rgba(79,70,229,0.07) 100%)",
        border: "1px solid rgba(99,102,241,0.22)",
      }}
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0">
          <BookOpen size={11} className="text-indigo-400" />
        </div>
        <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Word of the Day</span>
      </div>
      <p className="text-white font-black text-base leading-tight">{item.word}</p>
      <p className="text-indigo-400/60 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">{item.pos}</p>
      <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-2">{item.def}</p>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-indigo-300/65 text-[11px] italic mt-2 pt-2 border-t border-indigo-500/18"
          >
            "{item.example}"
          </motion.p>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-1 mt-2">
        <ChevronDown
          size={11}
          className="text-indigo-500/50 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
        <span className="text-indigo-500/50 text-[10px]">{open ? "Less" : "Example"}</span>
      </div>
    </motion.div>
  );
}

// ─── Quote Card ───────────────────────────────────────────────────────────────
function QuoteCard({ item, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07 + 0.05, duration: 0.4 }}
      className="shrink-0 w-56 sm:w-[240px] rounded-2xl p-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(109,40,217,0.07) 100%)",
        border: "1px solid rgba(139,92,246,0.20)",
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center shrink-0">
          <MessageSquareQuote size={11} className="text-violet-400" />
        </div>
        <span className="text-violet-400 text-[10px] font-bold uppercase tracking-widest">Daily Quote</span>
      </div>
      <p className="text-gray-200 text-[11px] leading-relaxed italic line-clamp-4">"{item.text}"</p>
      <p className="text-violet-400/65 text-[10px] font-semibold mt-2">— {item.author}</p>
    </motion.div>
  );
}

// ─── Tip Card ─────────────────────────────────────────────────────────────────
function TipCard({ item, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07 + 0.05, duration: 0.4 }}
      className="shrink-0 w-52 sm:w-[220px] rounded-2xl p-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(14,165,233,0.13) 0%, rgba(2,132,199,0.06) 100%)",
        border: "1px solid rgba(14,165,233,0.17)",
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-md bg-sky-500/20 flex items-center justify-center shrink-0">
          <Lightbulb size={11} className="text-sky-400" />
        </div>
        <span className="text-sky-400 text-[10px] font-bold uppercase tracking-widest">Study Tip</span>
      </div>
      <p className="text-white font-bold text-sm leading-tight mb-1.5">{item.tip}</p>
      <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-3">{item.detail}</p>
    </motion.div>
  );
}

// ─── Challenge Card ───────────────────────────────────────────────────────────
function ChallengeCard({ item, i }) {
  const [done, setDone] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07 + 0.05, duration: 0.4 }}
      className="shrink-0 w-52 sm:w-[220px] rounded-2xl p-4 overflow-hidden cursor-pointer"
      style={{
        background: done
          ? "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(22,163,74,0.06) 100%)"
          : "linear-gradient(135deg, rgba(245,158,11,0.13) 0%, rgba(217,119,6,0.06) 100%)",
        border: `1px solid ${done ? "rgba(34,197,94,0.28)" : "rgba(245,158,11,0.20)"}`,
        transition: "background 0.35s, border-color 0.35s",
      }}
      onClick={() => setDone(v => !v)}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center shrink-0">
          <Trophy size={11} className="text-amber-400" />
        </div>
        <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Daily Challenge</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5 shrink-0">{item.emoji}</span>
        <div>
          <p className={`text-sm font-bold leading-tight mb-1 transition-all ${done ? "line-through text-gray-600" : "text-white"}`}>
            {item.title}
          </p>
          <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-2">{item.desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2.5">
        <Zap size={10} className={done ? "text-green-400" : "text-amber-400"} />
        <span className={`text-[10px] font-black ${done ? "text-green-400" : "text-amber-400"}`}>
          {done ? "✓ Completed!" : `+${item.xp} XP`}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function DailyWidgets() {
  const day = getDayIndex();

  const word      = WORDS[day % WORDS.length];
  const quote     = QUOTES[day % QUOTES.length];
  const tip       = TIPS[day % TIPS.length];
  const challenge = CHALLENGES[day % CHALLENGES.length];

  const cards = [
    { key: "word",      el: <WordCard      item={word}      i={0} /> },
    { key: "quote",     el: <QuoteCard     item={quote}     i={1} /> },
    { key: "tip",       el: <TipCard       item={tip}       i={2} /> },
    { key: "challenge", el: <ChallengeCard item={challenge} i={3} /> },
  ];

  return (
    <section className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-400"
          style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
        />
        <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Today's Learning</h2>
      </div>

      {/* Horizontal scroll strip — peek of next card signals scrollability */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
        {cards.map(({ key, el }) => (
          <div key={key}>{el}</div>
        ))}
        {/* Ghost spacer so last card never hugs the edge */}
        <div className="shrink-0 w-2" aria-hidden="true" />
      </div>
    </section>
  );
}
