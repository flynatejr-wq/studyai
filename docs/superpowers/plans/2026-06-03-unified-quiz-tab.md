# Unified Quiz Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three separate quiz tabs (Adaptive, Multiple Choice, Self-Grade) with one unified Quiz tab that lets the user pick from four question types: Multiple Choice, True/False, Fill in the Blank, and Adaptive (which mixes all three).

**Architecture:** The backend `/generate-quiz` endpoint gains two new `mode` values (`true-false`, `fill-blank`) with their own prompt templates and response shapes. The frontend replaces `MCQMode`, `AdaptiveQuizMode`, and the self-grade section with a single `UnifiedQuizMode` component that owns a type selector, a question count picker, and renders the appropriate quiz UI based on the selected type. Adaptive now calls `mode=adaptive-mixed` and receives a mix of all three question types.

**Tech Stack:** React (JSX), Node/Express, Anthropic SDK (`claude-opus-4-5`), SQLite via better-sqlite3, Tailwind CSS, Framer Motion

---

## File Map

| File | Action | What changes |
|---|---|---|
| `server/routes/guides.js` | Modify | Add `true-false` and `fill-blank` prompt branches; update mode validation; add `adaptive-mixed` that requests mixed types |
| `client/src/pages/GuideView.jsx` | Modify | Remove `MCQMode`, `AdaptiveQuizMode`, self-grade section; add `UnifiedQuizMode` component and type selector; update tab list to single "Quiz" tab |

---

## Task 1: Backend — True/False and Fill in the Blank question generation

**Files:**
- Modify: `server/routes/guides.js` (around line 374)

- [ ] **Step 1: Update mode validation to accept new types**

Find line 374:
```js
const mode = req.body.mode === "mcq" ? "mcq" : "self-grade";
```
Replace with:
```js
const VALID_MODES = ["mcq", "self-grade", "true-false", "fill-blank", "adaptive-mixed"];
const mode = VALID_MODES.includes(req.body.mode) ? req.body.mode : "mcq";
```

- [ ] **Step 2: Add True/False prompt branch**

After the existing `if (mode === "mcq") { ... } else { ... }` block (around line 381–386), replace the entire prompt-building block with:

```js
let prompt;
if (mode === "mcq") {
  prompt = `Based on this study guide, generate exactly ${count} multiple-choice questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects. Each object must have:\n- "question": the question text\n- "options": array of exactly 4 answer choices (strings)\n- "correctIndex": 0-based index of the correct option (0, 1, 2, or 3)\n- "explanation": one sentence explaining why the answer is correct\n\nVary the difficulty. Make wrong options plausible but clearly incorrect on reflection.\nReturn ONLY the JSON array, no extra text.`;
} else if (mode === "true-false") {
  prompt = `Based on this study guide, generate exactly ${count} true/false questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects. Each object must have:\n- "statement": a factual statement that is either true or false\n- "answer": boolean true or false\n- "explanation": one sentence explaining why the statement is true or false\n\nMix true and false statements roughly equally. Avoid trick questions.\nReturn ONLY the JSON array, no extra text.`;
} else if (mode === "fill-blank") {
  prompt = `Based on this study guide, generate exactly ${count} fill-in-the-blank questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects. Each object must have:\n- "sentence": a sentence with exactly one blank represented as "___"\n- "answer": the single word or short phrase that fills the blank\n- "hint": a 3-5 word hint (e.g. the category or type of answer)\n\nThe blank should always replace a key term or important concept.\nReturn ONLY the JSON array, no extra text.`;
} else if (mode === "adaptive-mixed") {
  prompt = `Based on this study guide, generate exactly ${count} quiz questions as a mix of multiple-choice, true/false, and fill-in-the-blank types.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects. Each object must have a "type" field that is one of "mcq", "true-false", or "fill-blank", plus the fields for that type:\n\nFor "mcq": "question", "options" (array of 4 strings), "correctIndex" (number 0-3), "explanation" (string)\nFor "true-false": "statement" (string), "answer" (boolean), "explanation" (string)\nFor "fill-blank": "sentence" (string with "___"), "answer" (string), "hint" (string)\n\nAim for roughly equal distribution of all three types. Vary difficulty.\nReturn ONLY the JSON array, no extra text.`;
} else {
  prompt = `Based on this study guide, generate exactly ${count} quiz questions.\n\n${context}\n\nReturn ONLY a valid JSON array with exactly ${count} objects, each with "question" and "answer" fields.\nReturn ONLY the JSON array, no extra text.`;
}
```

- [ ] **Step 3: Update response validation to handle new shapes**

Find the validation loop (around line 406–414):
```js
for (const q of questions) {
  if (typeof q.question !== "string") throw new Error("Malformed question object.");
  if (mode === "mcq") {
    if (!Array.isArray(q.options) || q.options.length !== 4)
      throw new Error("MCQ question missing options.");
    if (typeof q.correctIndex !== "number")
      throw new Error("MCQ question missing correctIndex.");
  }
}
```
Replace with:
```js
for (const q of questions) {
  if (mode === "mcq") {
    if (typeof q.question !== "string") throw new Error("Malformed MCQ question.");
    if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error("MCQ question missing options.");
    if (typeof q.correctIndex !== "number") throw new Error("MCQ question missing correctIndex.");
  } else if (mode === "true-false") {
    if (typeof q.statement !== "string") throw new Error("Malformed true/false question.");
    if (typeof q.answer !== "boolean") throw new Error("True/false answer must be boolean.");
  } else if (mode === "fill-blank") {
    if (typeof q.sentence !== "string" || !q.sentence.includes("___")) throw new Error("Fill-blank missing sentence with ___.");
    if (typeof q.answer !== "string") throw new Error("Fill-blank missing answer.");
  } else if (mode === "adaptive-mixed") {
    const validTypes = ["mcq", "true-false", "fill-blank"];
    if (!validTypes.includes(q.type)) throw new Error(`Unknown adaptive question type: ${q.type}`);
    if (q.type === "mcq") {
      if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error("Adaptive MCQ missing options.");
      if (typeof q.correctIndex !== "number") throw new Error("Adaptive MCQ missing correctIndex.");
    } else if (q.type === "true-false") {
      if (typeof q.statement !== "string") throw new Error("Adaptive T/F missing statement.");
      if (typeof q.answer !== "boolean") throw new Error("Adaptive T/F answer must be boolean.");
    } else if (q.type === "fill-blank") {
      if (typeof q.sentence !== "string" || !q.sentence.includes("___")) throw new Error("Adaptive fill-blank missing sentence.");
      if (typeof q.answer !== "string") throw new Error("Adaptive fill-blank missing answer.");
    }
  }
}
```

- [ ] **Step 4: Bump max_tokens for adaptive-mixed (more question types = more output)**

Find:
```js
max_tokens: 2500,
```
Replace with:
```js
max_tokens: mode === "adaptive-mixed" ? 4000 : 2500,
```

- [ ] **Step 5: Commit backend changes**

```bash
git add server/routes/guides.js
git commit -m "feat: add true-false, fill-blank, adaptive-mixed quiz modes to backend"
```

---

## Task 2: Frontend — Unified Quiz Mode component

**Files:**
- Modify: `client/src/pages/GuideView.jsx`

- [ ] **Step 1: Add helper sub-components for rendering T/F and Fill-Blank questions**

Find the `// ── MCQ Mode ──` comment (around line 250). Directly above it, add these two new render helpers:

```jsx
// ── True/False Question Renderer ─────────────────────────────────────────────
function TrueFalseQuestion({ q, answered, onAnswer }) {
  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
      <p className="text-white font-medium mb-4">{q.statement}</p>
      {!answered ? (
        <div className="flex gap-3">
          <button onClick={() => onAnswer(true)}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-green-600/20 text-green-400 hover:bg-green-600/40 border border-green-600/30 transition-all">
            ✓ True
          </button>
          <button onClick={() => onAnswer(false)}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 border border-red-600/30 transition-all">
            ✗ False
          </button>
        </div>
      ) : (
        <div className={`rounded-xl p-3 text-sm ${answered === q.answer ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {answered === q.answer ? "✓ Correct!" : `✗ Incorrect — answer is ${q.answer ? "True" : "False"}`}
          {q.explanation && <p className="text-gray-400 mt-1 text-xs">{q.explanation}</p>}
        </div>
      )}
    </div>
  );
}

// ── Fill in the Blank Question Renderer ──────────────────────────────────────
function FillBlankQuestion({ q, answered, onAnswer }) {
  const [input, setInput] = React.useState("");
  const isCorrect = answered && input.trim().toLowerCase() === q.answer.toLowerCase();

  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
      <p className="text-white font-medium mb-1">
        {q.sentence.replace("___", "________")}
      </p>
      <p className="text-gray-500 text-xs mb-4">Hint: {q.hint}</p>
      {!answered ? (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && onAnswer(input.trim())}
            placeholder="Type your answer..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={() => input.trim() && onAnswer(input.trim())}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-semibold transition-all">
            Check
          </button>
        </div>
      ) : (
        <div className={`rounded-xl p-3 text-sm ${isCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {isCorrect ? "✓ Correct!" : `✗ The answer is: ${q.answer}`}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the UnifiedQuizMode component**

Directly above the `// ── Adaptive Quiz Mode ──` comment (around line 354), add the new unified component:

```jsx
// ── Unified Quiz Mode ─────────────────────────────────────────────────────────
const QUIZ_TYPES = [
  { id: "mcq",           label: "🎯 Multiple Choice", desc: "4 options per question" },
  { id: "true-false",    label: "✅ True / False",    desc: "Quick true or false" },
  { id: "fill-blank",    label: "✏️ Fill in the Blank", desc: "Type the missing word" },
  { id: "adaptive-mixed",label: "🧠 Adaptive",        desc: "Mixed types, repeats wrong answers" },
];

function UnifiedQuizMode({ guideId, onXpEarned }) {
  const [quizType, setQuizType]   = useState("mcq");
  const [count, setCount]         = useState(10);
  const [phase, setPhase]         = useState("setup"); // setup|loading|question|roundbreak|done
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]     = useState({});       // for non-adaptive: { index: value }
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore]         = useState(0);
  const [error, setError]         = useState("");
  // Adaptive-specific
  const [queue, setQueue]         = useState([]);
  const [queuePos, setQueuePos]   = useState(0);
  const [mastered, setMastered]   = useState(new Set());
  const [round, setRound]         = useState(1);
  const [finalScore, setFinalScore] = useState(0);
  const firstPassRef              = useRef(0);
  const roundBreakTimer           = useRef(null);
  const { refreshUser }           = useAuth();

  useEffect(() => () => { if (roundBreakTimer.current) clearTimeout(roundBreakTimer.current); }, []);

  const isAdaptive = quizType === "adaptive-mixed";
  const countOptions = quizType === "true-false" ? [5, 10, 15, 20, 25, 30] : [5, 10, 15, 20];

  const reset = () => {
    setPhase("setup"); setQuestions([]); setAnswers({}); setSubmitted(false); setScore(0);
    setQueue([]); setQueuePos(0); setMastered(new Set()); setRound(1); setFinalScore(0);
    firstPassRef.current = 0;
  };

  const generate = async () => {
    setPhase("loading"); setError("");
    try {
      const { questions: qs } = await api.guides.generateQuiz(guideId, count, quizType);
      const allQs = Array.isArray(qs) ? qs : [];
      setQuestions(allQs);
      if (isAdaptive) {
        setQueue(allQs.map((_, i) => i));
        setQueuePos(0); setMastered(new Set()); firstPassRef.current = 0; setRound(1);
        setPhase("question");
      } else {
        setAnswers({}); setSubmitted(false); setScore(0);
        setPhase("question");
      }
    } catch (e) { setError(e.message); setPhase("setup"); }
  };

  // ── Check if answer is correct for any type ──
  const isCorrect = (q, answer) => {
    const type = isAdaptive ? q.type : quizType;
    if (type === "mcq")        return answer === q.correctIndex;
    if (type === "true-false") return answer === q.answer;
    if (type === "fill-blank") return typeof answer === "string" && answer.trim().toLowerCase() === q.answer.toLowerCase();
    return false;
  };

  // ── Submit non-adaptive quiz ──
  const submit = async () => {
    const correct = questions.filter((q, i) => isCorrect(q, answers[i])).length;
    setScore(correct); setSubmitted(true);
    try { await api.guides.submitQuiz(guideId, correct, questions.length); await refreshUser(); onXpEarned(correct * 10); } catch (_) {}
  };

  // ── Adaptive: handle answer to current question ──
  const currentQIdx = phase === "question" && isAdaptive ? queue[queuePos] : null;
  const currentQ    = currentQIdx != null ? questions[currentQIdx] : null;

  const handleAdaptiveAnswer = async (answer) => {
    if (!currentQ) return;
    const correct = isCorrect(currentQ, answer);
    const newMastered = new Set(mastered);
    if (correct) { newMastered.add(currentQIdx); if (round === 1) firstPassRef.current++; }
    setMastered(newMastered);

    if (queuePos < queue.length - 1) {
      setQueuePos(p => p + 1);
    } else {
      const nextQueue = questions.map((_, i) => i).filter(i => !newMastered.has(i));
      if (nextQueue.length === 0) {
        const fp = firstPassRef.current;
        setFinalScore(fp);
        try { await api.guides.submitQuiz(guideId, fp, questions.length); await refreshUser(); onXpEarned(fp * 10); } catch (_) {}
        setPhase("done");
      } else {
        setQueue(nextQueue); setQueuePos(0); setRound(r => r + 1); setPhase("roundbreak");
        roundBreakTimer.current = setTimeout(() => setPhase("question"), 2500);
      }
    }
  };

  // ── Setup screen ──
  if (phase === "setup" || phase === "loading") return (
    <div className="flex flex-col gap-6 py-6">
      {/* Type selector */}
      <div className="grid grid-cols-2 gap-3">
        {QUIZ_TYPES.map(t => (
          <button key={t.id} onClick={() => { setQuizType(t.id); reset(); }}
            className={`p-3 rounded-xl text-left transition-all border ${quizType === t.id ? "bg-indigo-600/30 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
            <div className="font-semibold text-sm">{t.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
      {/* Count selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-gray-400 text-sm">Questions:</span>
        {countOptions.map(n => (
          <button key={n} onClick={() => setCount(n)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${count === n ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>{n}</button>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={generate} disabled={phase === "loading"}
        className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-xl text-white font-bold transition-all">
        {phase === "loading" ? <><span className="animate-spin inline-block">⏳</span> Generating…</> : <><Zap size={16} /> Start Quiz</>}
      </button>
    </div>
  );

  // ── Adaptive round break ──
  if (phase === "roundbreak") return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="text-5xl">🔄</div>
      <p className="text-white font-bold text-xl">Round {round}</p>
      <p className="text-gray-400 text-sm">Reviewing the ones you missed…</p>
      <div className="flex items-center gap-3 text-sm mt-2">
        <span className="text-green-400 font-medium">✓ {mastered.size} mastered</span>
        <span className="text-gray-500">·</span>
        <span className="text-orange-400 font-medium">{questions.length - mastered.size} remaining</span>
      </div>
    </motion.div>
  );

  // ── Adaptive: one question at a time ──
  if (phase === "question" && isAdaptive && currentQ) {
    const type = currentQ.type;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Q {queuePos + 1} / {queue.length} · Round {round}</span>
          <span>{mastered.size} mastered</span>
        </div>
        {type === "mcq" && (
          <MCQQuestion q={currentQ} answered={null} onAnswer={handleAdaptiveAnswer} adaptive />
        )}
        {type === "true-false" && (
          <TrueFalseQuestion q={currentQ} answered={null} onAnswer={handleAdaptiveAnswer} />
        )}
        {type === "fill-blank" && (
          <FillBlankQuestion q={currentQ} answered={null} onAnswer={handleAdaptiveAnswer} />
        )}
      </div>
    );
  }

  // ── Done screen (adaptive) ──
  if (phase === "done") return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="text-5xl">🏁</div>
      <p className="text-white font-bold text-2xl">All mastered!</p>
      <p className="text-gray-400 text-sm">First-pass score: {finalScore} / {questions.length}</p>
      <button onClick={reset} className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-all">
        Try Again
      </button>
    </motion.div>
  );

  // ── Non-adaptive: all questions listed, submit at bottom ──
  if (phase === "question") return (
    <div className="flex flex-col gap-4">
      {submitted && (
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <p className="text-white font-bold text-xl">{score} / {questions.length}</p>
          <p className="text-gray-400 text-sm">{Math.round(score / questions.length * 100)}% correct</p>
          <button onClick={reset} className="mt-3 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-semibold transition-all">
            New Quiz
          </button>
        </div>
      )}
      {questions.map((q, i) => {
        const type = quizType;
        const answered = submitted ? (answers[i] ?? null) : null;
        return (
          <div key={i}>
            {type === "mcq" && (
              <MCQQuestion q={q} answered={submitted ? answers[i] : undefined}
                onAnswer={!submitted ? (v) => setAnswers(a => ({ ...a, [i]: v })) : undefined} />
            )}
            {type === "true-false" && (
              <TrueFalseQuestion q={q} answered={submitted ? answers[i] : null}
                onAnswer={!submitted ? (v) => setAnswers(a => ({ ...a, [i]: v })) : undefined} />
            )}
            {type === "fill-blank" && (
              <FillBlankQuestion q={q} answered={submitted ? answers[i] : null}
                onAnswer={!submitted ? (v) => setAnswers(a => ({ ...a, [i]: v })) : undefined} />
            )}
          </div>
        );
      })}
      {!submitted && (
        <button onClick={submit}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 rounded-xl text-white font-bold transition-all">
          Submit Quiz
        </button>
      )}
    </div>
  );

  return null;
}
```

- [ ] **Step 3: Extract MCQQuestion as a named sub-component (required by UnifiedQuizMode)**

The current `MCQMode` renders MCQ questions inline. We need a standalone `MCQQuestion` component for use inside `UnifiedQuizMode`. Add this directly above `TrueFalseQuestion`:

```jsx
// ── MCQ Question Renderer ─────────────────────────────────────────────────────
function MCQQuestion({ q, answered, onAnswer, adaptive }) {
  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
      <p className="text-white font-medium mb-4">{q.question}</p>
      <div className="flex flex-col gap-2">
        {q.options.map((opt, oi) => {
          const isSelected = answered === oi;
          const isCorrect  = answered != null && oi === q.correctIndex;
          const isWrong    = answered != null && isSelected && oi !== q.correctIndex;
          return (
            <button key={oi}
              onClick={() => !answered && onAnswer && onAnswer(oi)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border
                ${answered == null ? "bg-white/5 border-white/10 text-gray-300 hover:bg-indigo-600/20 hover:border-indigo-500 hover:text-white"
                  : isCorrect ? "bg-green-500/20 border-green-500/50 text-green-400"
                  : isWrong   ? "bg-red-500/20 border-red-500/50 text-red-400"
                  : "bg-white/5 border-white/10 text-gray-500"}`}>
              <span className="mr-2 font-bold">{["A","B","C","D"][oi]}.</span>{opt}
            </button>
          );
        })}
      </div>
      {answered != null && q.explanation && (
        <p className="text-gray-400 text-xs mt-3">{q.explanation}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update the tab list to remove Adaptive/MCQ/Self-Grade, add single Quiz tab**

Find (around line 1083–1087):
```js
const modes = [
  ...
  { id: "adaptive", label: "🧠 Adaptive",        desc: "Mastery-based quiz" },
  { id: "mcq",      label: "🎯 Multiple Choice", desc: "AI-generated MCQ" },
  { id: "quiz",     label: "✏️ Self-Grade",      desc: "Reveal & mark answers" },
```

Replace those three entries with a single entry. The exact array will vary — find all three and replace so the modes array includes:
```js
{ id: "unified-quiz", label: "🧩 Quiz",   desc: "Multiple choice, T/F, fill in the blank, adaptive" },
```

- [ ] **Step 5: Replace the three quiz render blocks with UnifiedQuizMode**

Find the adaptive render block:
```jsx
{/* ── ADAPTIVE QUIZ MODE ── */}
{studyMode === "adaptive" && (
```
And the self-grade block:
```jsx
{/* ── SELF-GRADE QUIZ MODE ── */}
{studyMode === "quiz" && (
```
And the MCQ block (look for `studyMode === "mcq"`).

Remove all three blocks and replace with:
```jsx
{/* ── UNIFIED QUIZ MODE ── */}
{studyMode === "unified-quiz" && (
  <div className="px-1">
    <UnifiedQuizMode guideId={id} onXpEarned={showXpToast} />
  </div>
)}
```

- [ ] **Step 6: Commit frontend changes**

```bash
git add client/src/pages/GuideView.jsx
git commit -m "feat: replace separate quiz tabs with unified quiz mode (MC, T/F, fill-blank, adaptive)"
```

---

## Task 3: Smoke test and push

- [ ] **Step 1: Start local dev server**

```bash
cd C:\Users\flyna\lecture-summarizer
npm run dev
```

- [ ] **Step 2: Test each quiz type**

Open a guide on localhost. Click the Quiz tab. Verify:
- Type selector shows all 4 options
- MCQ generates and submits correctly
- True/False shows True/False buttons, marks correct/incorrect
- Fill in the Blank accepts text input and checks answer case-insensitively
- Adaptive mixes question types and repeats wrong answers across rounds

- [ ] **Step 3: Push to production**

```bash
git push
```

---
